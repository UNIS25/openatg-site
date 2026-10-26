import copy
import hashlib
import json
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/floodlens'))
from discover_bulletins import discover, listing_url, markdown, pdf_url

NOW = datetime.fromisoformat('2026-10-26T13:30:00+00:00')
BASE = 'https://www.dmc.gov.lk'


def row(name, path, date='2026-10-26', time='11:30'):
    return f'<tr><td>{name}</td><td>{date}</td><td>{time}</td><td><a href="/images/dmcreports/{path}.pdf">Download</a></td></tr>'


def page(rows, stream, next_offset=None):
    next_link = '' if next_offset is None else f'<a title="Next" href="{listing_url(stream, next_offset)}">Next</a>'
    return ('<html>com_dmcreports<table><tr><th>Title</th></tr>' + ''.join(rows) + '</table>' + next_link + '</html>').encode()


class Discovery(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.out = Path(self.temp.name)
        self.snapshot = {'bulletins': [], 'stations': []}
        self.provenance = {'sources': []}
        self.pages = {listing_url(s): page([row('Earlier report', s + '-old', '2026-10-01')], s) for s in ['weather', 'landslide', 'flood']}
        self.pdfs = {}
        self.calls = []

    def fetch(self, url):
        self.calls.append(url)
        if url in self.pages:
            return self.pages[url], 'text/html', url
        value = self.pdfs.get(url, b'%PDF-1.4\n' + url.encode())
        if isinstance(value, Exception):
            raise value
        return value, 'application/pdf', url

    def run_queue(self, **kwargs):
        before = copy.deepcopy(self.snapshot)
        result = discover(self.snapshot, self.provenance, self.out, self.fetch, now=NOW, **kwargs)
        self.assertEqual(self.snapshot, before, 'Discovery must never mutate published interpretations')
        return result

    def current(self, name='current', **fields):
        url = BASE + '/images/dmcreports/' + name + '.pdf'
        raw = b'%PDF-1.4\nreviewed'
        self.pdfs[url] = raw
        record = dict(url=url, sha256=hashlib.sha256(raw).hexdigest(), issuedAt='2026-10-26T03:00:00+05:30', expiresAt='2026-10-27T05:30:00+05:30', **fields)
        self.snapshot['bulletins'].append(record)
        self.provenance['sources'].append(copy.deepcopy(record))
        return record

    def test_lightning_below_general_forecasts_is_not_hidden_by_latest_date(self):
        self.pages[listing_url('weather')] = page([row('General forecast', f'forecast-{n}', time='16:00') for n in range(12)] + [row('Severe lightning', 'lightning')], 'weather')
        q = self.run_queue()
        document = next(d for d in q['documents'] if 'lightning.pdf' in d['url'])
        self.assertEqual(document['reviewState'], 'review-required-unseen-document')
        self.assertIsNone(document['issueTime'])
        self.assertIsNone(document['severity'])
        self.assertTrue(q['coverage']['completeForListingWindow'])

    def test_same_update_number_and_title_do_not_collapse_distinct_documents(self):
        self.pages[listing_url('landslide')] = page([row('31st update', 'new', time='14:45'), row('31st update', 'earlier', time='09:00')], 'landslide')
        q = self.run_queue()
        self.assertEqual(len(q['documents']), 2)
        self.assertEqual(len({d['documentId'] for d in q['documents']}), 2)
        self.assertTrue(all(d['supersedes'] is None for d in q['documents']))

    def test_repeated_url_retains_listing_aliases_but_fetches_once(self):
        self.pages[listing_url('weather')] = page([row('English', 'same'), row('Other label', 'same')], 'weather')
        q = self.run_queue()
        self.assertEqual(len(q['documents']), 1)
        self.assertEqual(len(q['documents'][0]['listings']), 2)
        self.assertEqual(self.calls.count(q['documents'][0]['url']), 1)

    def test_cancellation_and_replacement_hints_cannot_cancel_or_supersede(self):
        self.current()
        self.pages[listing_url('weather')] = page([row('Cancellation / revised warning', 'candidate', time='18:00'), row('Current', 'current')], 'weather')
        q = self.run_queue()
        candidate = next(d for d in q['documents'] if 'candidate.pdf' in d['url'])
        self.assertIn('possible-cancellation-title', candidate['titleHints'])
        self.assertIn('possible-update-title', candidate['titleHints'])
        self.assertIsNone(candidate['cancels'])
        self.assertIsNone(candidate['supersedes'])
        self.assertEqual(candidate['validity'], 'unreviewed')

    def test_listing_time_is_never_substituted_for_reviewed_issue_time(self):
        self.current()
        self.pages[listing_url('weather')] = page([row('Heavy rain', 'current', time='03:30')], 'weather')
        d = self.run_queue()['documents'][0]
        self.assertEqual(d['latestListedAt'], '2026-10-26T03:30:00+05:30')
        self.assertEqual(d['issueTime'], '2026-10-26T03:00:00+05:30')
        self.assertEqual(d['reviewState'], 'current-reviewed-document-unchanged')

    def test_newer_listing_is_explicit_but_not_a_newer_verified_issue(self):
        current = self.current(kind='rain', listingAt='2026-10-26T03:30:00+05:30')
        self.pages[listing_url('weather')] = page([row('Newly listed', 'new', time='16:00'), row('Earlier unseen lightning', 'hidden', time='03:00'), row('Old', 'old', '2026-10-01')], 'weather')
        q = self.run_queue()
        new = next(d for d in q['documents'] if d['url'].endswith('/new.pdf'))
        hidden = next(d for d in q['documents'] if d['url'].endswith('/hidden.pdf'))
        self.assertEqual(new['listingComparisons'][0]['relation'], 'later-listing')
        self.assertIsNone(new['issueTime'])
        self.assertEqual(hidden['listingComparisons'][0]['relation'], 'earlier-listing')
        self.assertEqual(hidden['reviewState'], 'review-required-unseen-document')

    def test_changed_current_bytes_require_review_even_if_hash_was_seen_historically(self):
        current = self.current()
        new_raw = b'%PDF-1.4\nchanged'
        self.pdfs[current['url']] = new_raw
        self.provenance['sources'].append(dict(url=current['url'], sha256=hashlib.sha256(new_raw).hexdigest()))
        d = self.run_queue()['documents'][0]
        self.assertEqual(d['reviewState'], 'review-required-changed-bytes')
        self.assertIsNone(d['issueTime'])

    def test_pdf_failure_does_not_freshen_or_cancel_published_warning(self):
        current = self.current()
        self.pdfs[current['url']] = TimeoutError('untrusted error detail')
        q = self.run_queue()
        self.assertEqual(q['documentHashing']['failures'], 1)
        self.assertEqual(q['documents'][0]['reviewState'], 'source-unavailable')
        self.assertNotIn('untrusted error detail', json.dumps(q))

    def test_missing_current_listing_is_explicit_not_a_cancellation(self):
        self.current()
        q = self.run_queue()
        self.assertTrue(any('absent' in i['reason'] for i in q['issues']))
        self.assertIsNone(q['documents'][0]['cancels'])

    def test_pagination_reaches_report_after_first_hundred_rows(self):
        self.pages[listing_url('weather')] = page([row('General forecast', f'p{i}', time='16:00') for i in range(100)], 'weather', 100)
        self.pages[listing_url('weather', 100)] = page([row('Lightning', 'deep-lightning'), row('Old', 'old', '2026-10-01')], 'weather', 200)
        q = self.run_queue(document_limit=0)
        self.assertTrue(any('deep-lightning.pdf' in d['url'] for d in q['documents']))
        self.assertTrue(q['coverage']['completeForListingWindow'])
        self.assertNotIn(listing_url('weather', 200), self.calls)

    def test_active_reviewed_warning_extends_the_lookback(self):
        current = self.current()
        current['issuedAt'] = '2026-10-01T09:00:00+05:30'
        self.pages[listing_url('weather')] = page([row('Recent', 'recent', '2026-10-15')], 'weather', 100)
        self.pages[listing_url('weather', 100)] = page([row('Old but not presumed expired', 'old-active', '2026-10-01')], 'weather')
        q = self.run_queue()
        self.assertEqual(q['coverage']['lookbackStart'], '2026-09-30T00:00:00+05:30')
        self.assertTrue(any('old-active.pdf' in d['url'] for d in q['documents']))

    def test_unknown_dates_and_row_shapes_fail_closed(self):
        self.pages[listing_url('weather')] = page([row('Unknown layout', 'a', '26/10/2026')], 'weather')
        q = self.run_queue()
        self.assertFalse(q['coverage']['completeForListingWindow'])
        self.assertTrue(q['issues'])

    def test_unordered_listing_and_page_budget_do_not_claim_complete_coverage(self):
        self.pages[listing_url('weather')] = page([row('Earlier', 'a', time='09:00'), row('Later', 'b', time='11:30')], 'weather')
        self.assertFalse(self.run_queue()['coverage']['completeForListingWindow'])
        self.pages[listing_url('weather')] = page([row('Recent', 'c')], 'weather', 100)
        self.assertFalse(self.run_queue(max_pages=1)['coverage']['completeForListingWindow'])

    def test_repeated_page_is_not_successful_pagination(self):
        raw = page([row('Recent', 'a')], 'weather', 100)
        self.pages[listing_url('weather')] = raw
        self.pages[listing_url('weather', 100)] = raw
        q = self.run_queue()
        self.assertEqual(next(s for s in q['coverage']['streams'] if s['stream'] == 'weather')['stopReason'], 'repeated-page')

    def test_full_page_without_pagination_does_not_claim_exhaustion(self):
        self.pages[listing_url('weather')] = page([row('Report', f'item-{i}') for i in range(100)], 'weather')
        q = self.run_queue(document_limit=0)
        self.assertFalse(q['coverage']['completeForListingWindow'])

    def test_failed_initial_listing_is_not_retried_or_reclassified_as_empty(self):
        prior = dict(url=listing_url('weather'), status='error', error='HTTPError')
        q = self.run_queue(existing=[prior])
        self.assertNotIn(listing_url('weather'), self.calls)
        self.assertFalse(q['coverage']['completeForListingWindow'])

    def test_network_failure_keeps_discovery_incomplete_and_other_streams_work(self):
        original = self.fetch
        def failed(url):
            if url == listing_url('weather'):
                raise ConnectionError()
            return original(url)
        self.fetch = failed
        q = self.run_queue()
        self.assertFalse(q['coverage']['completeForListingWindow'])
        self.assertEqual(sum(s['status'] == 'complete' for s in q['coverage']['streams']), 2)

    def test_bounded_hashing_preserves_unfetched_queue_items_as_unknown(self):
        self.pages[listing_url('weather')] = page([row('Report', f'item-{i}') for i in range(5)], 'weather')
        q = self.run_queue(document_limit=1)
        self.assertEqual(len(q['documents']), 5)
        self.assertEqual(q['documentHashing']['deferred'], 4)
        self.assertTrue(all(d['validity'] == 'unreviewed' for d in q['documents']))

    def test_future_listing_is_flagged_and_never_made_an_active_warning(self):
        self.pages[listing_url('weather')] = page([row('Future', 'future', '2026-10-27')], 'weather')
        d = self.run_queue()['documents'][0]
        self.assertEqual(d['listings'][0]['listingTimeState'], 'future')
        self.assertIsNone(d['issueTime'])
        self.assertEqual(d['validity'], 'unreviewed')

    def test_external_links_scripts_and_markdown_are_not_executable_instructions(self):
        for bad in ['http://www.dmc.gov.lk/images/dmcreports/a.pdf', 'https://evil.example/a.pdf', 'javascript:alert(1)', 'https://user@www.dmc.gov.lk/images/dmcreports/a.pdf', 'https://www.dmc.gov.lk/images/dmcreports/../a.pdf', 'https://www.dmc.gov.lk/images/dmcreports/%252e%252e/a.pdf', 'https://www.dmc.gov.lk/images/dmcreports/a%00.pdf']:
            with self.assertRaises(ValueError):
                pdf_url(bad, BASE)
        self.pages[listing_url('weather')] = page([row('<script>execute()</script>[evil](https://evil.example) | &lt;img&gt;', 'safe')], 'weather')
        output = markdown(self.run_queue())
        self.assertNotIn('execute()', output)
        self.assertNotIn('[evil](https://evil.example)', output)
        self.assertNotIn('<img>', output)

    def test_raw_pdf_hash_matches_saved_bytes_and_html_response_is_rejected(self):
        self.pages[listing_url('weather')] = page([row('Valid', 'valid'), row('Error page', 'bad')], 'weather')
        self.pdfs[BASE + '/images/dmcreports/bad.pdf'] = b'<html>not PDF</html>'
        q = self.run_queue()
        good = next(d for d in q['documents'] if d['url'].endswith('/valid.pdf'))['source']
        self.assertEqual(hashlib.sha256((self.out / good['rawFile']).read_bytes()).hexdigest(), good['sha256'])
        self.assertEqual(q['documentHashing']['failures'], 1)


if __name__ == '__main__':
    unittest.main()
