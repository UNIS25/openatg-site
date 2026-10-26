"""Deterministic discovery only. Untrusted titles/PDF bytes never change warnings."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from html import escape
from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.parse import parse_qs, quote, unquote, urlencode, urljoin, urlsplit, urlunsplit

SLST = timezone(timedelta(hours=5, minutes=30))
STREAMS = {'flood': 6, 'landslide': 5, 'weather': 2}
PAGE_SIZE = 100
MAX_PAGES = 5
DOCUMENT_LIMIT = 24


def clean(value):
    return ' '.join(''.join(c for c in value if c >= ' ' and c != '\x7f').split())[:500]


def instant(value):
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return parsed if parsed.tzinfo else None
    except (ValueError, AttributeError, TypeError):
        return None


def pdf_url(href, base):
    """Only public DMC report PDFs; never follow arbitrary listing destinations."""
    if len(href) > 2048 or any(ord(c) < 32 for c in href):
        raise ValueError('Unsupported report link')
    u = urlsplit(urljoin(base, href))
    path = unquote(u.path)
    if (u.scheme != 'https' or u.hostname not in {'www.dmc.gov.lk', 'dmc.gov.lk'}
            or u.username or u.password or u.port not in (None, 443) or u.query
            or not path.startswith('/images/dmcreports/') or not path.lower().endswith('.pdf')
            or any(part in {'.', '..'} for part in path.split('/')) or '\\' in path
            or '%' in path or any(ord(c) < 32 for c in path)):
        raise ValueError('Unsupported report link')
    return urlunsplit(('https', u.hostname, quote(path, safe='/'), '', ''))


class Listing(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows, self.links, self.cells, self.row_links = [], [], None, []
        self.cell, self.skip = None, 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {'script', 'style'}:
            self.skip += 1
        if tag == 'tr':
            self.cells, self.row_links = [], []
        if tag == 'td' and self.cells is not None:
            self.cell = []
        if tag == 'a' and 'href' in attrs and not self.skip:
            self.links.append(attrs)
            if self.cells is not None:
                self.row_links.append(attrs['href'])

    def handle_data(self, data):
        if self.cell is not None and not self.skip:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag in {'script', 'style'}:
            self.skip = max(0, self.skip - 1)
        if tag == 'td' and self.cell is not None:
            self.cells.append(clean(' '.join(self.cell)))
            self.cell = None
        if tag == 'tr' and self.cells is not None:
            self.rows.append((self.cells, self.row_links))
            self.cells, self.cell = None, None


def parse_listing(raw, base, stream, offset, now):
    parser = Listing()
    parser.feed(raw.decode('utf-8'))
    entries, errors = [], []
    for cells, links in parser.rows:
        # Header/search rows have no report date or download link.
        if not links and not any(re.fullmatch(r'\d{4}-\d{2}-\d{2}', x) for x in cells):
            continue
        if len(cells) != 4 or len(links) != 1:
            errors.append('Report row shape changed')
            continue
        try:
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', cells[1]) or not re.fullmatch(r'\d{2}:\d{2}', cells[2]):
                raise ValueError('Unrecognized listing date/time')
            listed = datetime.strptime(cells[1] + ' ' + cells[2], '%Y-%m-%d %H:%M').replace(tzinfo=SLST)
            url = pdf_url(links[0], base)
            title = cells[0]
            hints = []
            if re.search(r'\b(cancel\w*|withdraw\w*|revok\w*)\b', title, re.I):
                hints.append('possible-cancellation-title')
            if re.search(r'\b(replac\w*|supersed\w*|updat\w*|revis\w*)\b', title, re.I):
                hints.append('possible-update-title')
            entries.append(dict(stream=stream, title=title, url=url, listedAt=listed.isoformat(),
                                listingPageUrl=base, titleHints=hints,
                                listingTimeState='future' if listed > now + timedelta(minutes=5) else 'reported'))
        except (ValueError, OverflowError) as exc:
            errors.append(str(exc))
    if not entries:
        errors.append('No recognized report rows; empty is not an all-clear')
    expected_offset = offset + PAGE_SIZE
    next_valid = False
    for a in parser.links:
        if a.get('title', '').lower() != 'next':
            continue
        u = urlsplit(urljoin(base, a['href']))
        q = parse_qs(u.query)
        next_valid = (u.scheme == 'https' and u.hostname in {'www.dmc.gov.lk', 'dmc.gov.lk'}
                      and u.path == '/index.php' and q.get('option') == ['com_dmcreports']
                      and q.get('report_type_id') == [str(STREAMS[stream])]
                      and q.get('limit') == [str(PAGE_SIZE)] and q.get('limitstart') == [str(expected_offset)])
        if not next_valid:
            errors.append('Unexpected pagination target')
    return entries, next_valid, errors


def listing_url(stream, offset=0):
    return 'https://www.dmc.gov.lk/index.php?' + urlencode(dict(
        option='com_dmcreports', view='reports', report_type_id=STREAMS[stream], lang='en',
        limit=PAGE_SIZE, **({'limitstart': offset} if offset else {})))


def capture(url, out, fetch, prefix, pdf=False):
    record = dict(url=url, checkedAt=datetime.now(timezone.utc).isoformat())
    try:
        raw, media, final = fetch(url)
        if pdf and (not raw.startswith(b'%PDF-') or pdf_url(final, final) != url):
            raise ValueError('PDF signature or final report identity changed')
        digest = sha256(raw).hexdigest()
        name = prefix + '-' + digest[:16] + ('.pdf' if pdf else '.html')
        (out / name).write_bytes(raw)
        record.update(status='ok', sha256=digest, bytes=len(raw), contentType=media, finalUrl=final, rawFile=name)
        return record, raw
    except Exception as exc:
        # No server-controlled exception text or HTML enters the workflow summary.
        record.update(status='error', errorType=type(exc).__name__)
        return record, None


def discover(snapshot, provenance, out, fetch, existing=(), now=None,
             max_pages=MAX_PAGES, document_limit=DOCUMENT_LIMIT):
    now = now or datetime.now(timezone.utc)
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    active = [w for w in snapshot['bulletins'] if instant(w.get('expiresAt')) and instant(w['expiresAt']) > now]
    starts = [instant(w.get('issuedAt')) for w in active if instant(w.get('issuedAt'))]
    cutoff = min([now - timedelta(days=7)] + [d - timedelta(days=1) for d in starts])
    cutoff = cutoff.astimezone(SLST).replace(hour=0, minute=0, second=0, microsecond=0)
    coverage, rows, issues, pages = [], [], [], []
    for stream in STREAMS:
        seen_pages, last_time = set(), None
        state, reason = 'incomplete', 'page-budget'
        stream_rows = []
        for index in range(max_pages):
            url = listing_url(stream, index * PAGE_SIZE)
            prior = next((r for r in existing if r.get('url') == url), None)
            if prior:
                record, raw = prior, (out / prior['rawFile']).read_bytes() if prior.get('status') == 'ok' else None
            else:
                record, raw = capture(url, out, fetch, stream + '-listing-' + str(index))
            pages.append(dict(record, stream=stream, offset=index * PAGE_SIZE))
            if raw is None:
                reason = 'source-failed'
                break
            digest = sha256(raw).hexdigest()
            if digest in seen_pages:
                reason = 'repeated-page'
                break
            seen_pages.add(digest)
            try:
                entries, has_next, errors = parse_listing(raw, url, stream, index * PAGE_SIZE, now)
            except (UnicodeError, ValueError) as exc:
                entries, has_next, errors = [], False, [type(exc).__name__]
            stream_rows.extend(entries)
            issues.extend(dict(stream=stream, pageUrl=url, reason=e) for e in errors)
            times = [instant(e['listedAt']) for e in entries]
            ordered = all(a >= b for a, b in zip(times, times[1:])) and (last_time is None or not times or last_time >= times[0])
            if errors or not ordered:
                reason = 'unrecognized-or-unordered-listing'
                break
            if times:
                last_time = times[-1]
            if not has_next:
                if len(entries) >= PAGE_SIZE and last_time and last_time >= cutoff:
                    reason = 'full-page-without-confirmed-pagination'
                    break
                state, reason = 'complete', 'listing-exhausted'
                break
            if last_time and last_time < cutoff:
                state, reason = 'complete', 'lookback-covered'
                break
        rows.extend(stream_rows)
        coverage.append(dict(stream=stream, status=state, stopReason=reason, rows=len(stream_rows),
                             earliestListingAt=last_time.isoformat() if last_time else None))
    current = {}
    for item in snapshot['bulletins'] + snapshot['stations']:
        url = pdf_url(item['url'], item['url'])
        current.setdefault(url, item)
    reviewed_listing = {stream: [] for stream in STREAMS}
    for item in snapshot['bulletins']:
        stream = 'weather' if item.get('kind') in {'rain', 'lightning'} else item.get('kind')
        value = instant(item.get('listingAt'))
        if stream in reviewed_listing and value:
            reviewed_listing[stream].append(value)
    # Report issue time is not substituted for an unknown listing time.
    for item in snapshot['stations']:
        value = instant(item.get('listingAt'))
        if value:
            reviewed_listing['flood'].append(value)
    known = {}
    for item in provenance.get('sources', []):
        try:
            url = pdf_url(item['url'], item['url'])
        except (ValueError, KeyError):
            continue
        known.setdefault(url, set()).add(item.get('sha256'))
    by_url = {}
    for row in rows:
        by_url.setdefault(row['url'], []).append(row)
    documents = []
    for url, aliases in by_url.items():
        latest = max(aliases, key=lambda row: row['listedAt'])
        recent = instant(latest['listedAt']) >= cutoff
        if not recent and url not in current:
            continue
        docs = dict(documentId=sha256(url.encode()).hexdigest(), url=url, listings=aliases,
                    latestListedAt=latest['listedAt'], titleHints=sorted({h for a in aliases for h in a['titleHints']}),
                    issueTime=None, expiresAt=None, validity='unreviewed', severity=None,
                    supersedes=None, cancels=None, reviewState='awaiting-document-hash', source=None)
        comparisons = []
        for stream in sorted({a['stream'] for a in aliases}):
            baseline = max(reviewed_listing[stream], default=None)
            listed = max(instant(a['listedAt']) for a in aliases if a['stream'] == stream)
            comparisons.append(dict(stream=stream, reviewedListingAt=baseline.isoformat() if baseline else None,
                                    relation='unknown' if baseline is None else 'later-listing' if listed > baseline else 'same-listing-time' if listed == baseline else 'earlier-listing'))
        docs['listingComparisons'] = comparisons
        documents.append(docs)
    for url in current:
        if url not in by_url:
            documents.append(dict(documentId=sha256(url.encode()).hexdigest(), url=url, listings=[],
                                  latestListedAt=None, titleHints=[], issueTime=None, expiresAt=None,
                                  validity='unreviewed', severity=None, supersedes=None, cancels=None,
                                  reviewState='current-document-not-in-scanned-listings', source=None, listingComparisons=[]))
            issues.append(dict(url=url, reason='Current reviewed source absent from scanned rows; not a cancellation'))
    cached = {}
    for item in existing:
        try:
            cached[pdf_url(item['url'], item['url'])] = item
        except (ValueError, KeyError):
            continue
    # Cancellation words are review hints, never authority to withdraw a warning.
    documents.sort(key=lambda d: (bool(d['titleHints']), d['latestListedAt'] or ''), reverse=True)
    selected = [d for d in documents if d['url'] not in cached][:document_limit]
    def read_document(d):
        return d['url'], capture(d['url'], out, fetch, 'discovered-' + d['documentId'][:12], pdf=True)[0]
    with ThreadPoolExecutor(max_workers=3) as pool:
        cached.update(dict(pool.map(read_document, selected)))
    for document in documents:
        url = document['url']
        result = cached.get(url)
        document['source'] = result
        if not result:
            continue
        if result['status'] != 'ok':
            document['reviewState'] = 'source-unavailable'
            continue
        digest = result['sha256']
        reviewed = current.get(url)
        if reviewed and digest == reviewed.get('sha256'):
            document.update(reviewState='current-reviewed-document-unchanged', issueTime=reviewed.get('issuedAt'),
                            expiresAt=reviewed.get('expiresAt'), validity='reviewed-times-only')
        elif reviewed:
            document['reviewState'] = 'review-required-changed-bytes'
        elif digest in known.get(url, set()):
            document['reviewState'] = 'known-source-not-in-current-assessment'
        else:
            document['reviewState'] = 'review-required-changed-bytes' if url in known or reviewed else 'review-required-unseen-document'
    missing_hashes = sum(d['source'] is None for d in documents)
    failures = sum(d.get('source', {}).get('status') == 'error' for d in documents if d['source'])
    needs_review = [d for d in documents if d['reviewState'] not in {'current-reviewed-document-unchanged', 'known-source-not-in-current-assessment'}]
    return dict(schemaVersion=1, startedAt=now.isoformat(), checkedAt=datetime.now(timezone.utc).isoformat(), publishing='read-only; no warning or status publication',
                coverage=dict(lookbackStart=cutoff.isoformat(), streams=coverage,
                              completeForListingWindow=all(c['status'] == 'complete' for c in coverage),
                              warningValidityCoverage='unknown: listing dates cannot establish validity of unreviewed PDFs',
                              maxPagesPerStream=max_pages, rowsScanned=len(rows)),
                documentHashing=dict(limit=document_limit, fetched=len(selected), deferred=missing_hashes, failures=failures),
                reviewRequired=len(needs_review), issues=issues, pages=pages, documents=documents)


def markdown(queue):
    def text(value):
        return re.sub(r'([\\`*_{}\[\]()#+.!|>-])', r'\\\1', escape(clean(str(value))))
    lines = ['## Official bulletin review queue', '',
             'Read-only discovery. **No warning is issued, changed, cancelled or published by this job.**', '',
             f"Checked: {queue['checkedAt']}",
             f"Listing window begins: {queue['coverage']['lookbackStart']}",
             f"Rows scanned: {queue['coverage']['rowsScanned']}; items needing review/hash: {queue['reviewRequired']}.",
             f"Listing window complete: {queue['coverage']['completeForListingWindow']}. "
             f"Deferred PDF hashes: {queue['documentHashing']['deferred']}; PDF failures: {queue['documentHashing']['failures']}.", '',
             '**Listing timestamps are not verified issue times. Unreviewed validity is unknown.** '
             'New general forecasts do not automatically replace specific warnings. '
             'Title hints and duplicate update numbers never establish supersession or cancellation.', '',
             '| Listed (SLST) | Original document | Review state | SHA-256 |', '|---|---|---|---|']
    pending = [d for d in queue['documents'] if d['reviewState'] != 'current-reviewed-document-unchanged']
    for document in pending[:30]:
        title = document['listings'][0]['title'] if document['listings'] else 'Previously reviewed source'
        digest = document['source'].get('sha256', 'unavailable') if document['source'] else 'pending: bounded fetch limit'
        hint = ('; ' + ', '.join(document['titleHints'])) if document['titleHints'] else ''
        if any(c['relation'] == 'later-listing' for c in document['listingComparisons']):
            hint += '; later listing (issue time unverified)'
        if any(a['listingTimeState'] == 'future' for a in document['listings']):
            hint += '; future listing time needs review'
        lines.append(f"| {text(document['latestListedAt'] or 'not listed')} | [{text(title)}]({document['url']}) | {text(document['reviewState'] + hint)} | {digest} |")
    lines += ['', 'This summary shows up to 30 entries. The full JSON queue and listing/PDF hashes '
              'are preserved in the run log. Raw files are temporary on the runner. '
              'Missing links, changed bytes, failures and unfamiliar formats require review; none means all-clear.']
    return '\n'.join(lines) + '\n'
