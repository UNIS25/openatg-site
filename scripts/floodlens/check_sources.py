#!/usr/bin/env python3
"""Read-only official-source checks; no LLM, execution, credentials or publishing.

Fetches are allowlisted, TLS-verified, size/time bounded. Raw files are retained
in the audit output, identified by SHA-256. A changed hash requires review; it
never silently changes a warning's geographic scope, severity or validity.
"""
import xml.etree.ElementTree as ET
import argparse, concurrent.futures, csv, hashlib, io, json, os, re, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler
from discover_bulletins import discover, markdown as queue_markdown

ROOT=Path(__file__).resolve().parents[2]
ALLOWED={'www.dmc.gov.lk','dmc.gov.lk','docs.google.com','www.irrigation.gov.lk','irrigation.gov.lk'}
def allowed(url):
    u=urlparse(url)
    if u.hostname=='was.meteo.gov.lk':return u.scheme=='https' and re.fullmatch(r'/cap/en/(?:rss|[a-f0-9]{32})\.xml',u.path) is not None and not (u.query or u.fragment or u.username or u.password)
    return u.scheme=='https' and (u.hostname in ALLOWED or (u.hostname or '').endswith('.googleusercontent.com')) and not u.username and not u.password
class Redirect(HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        if not allowed(newurl): raise ValueError('Redirect outside source allowlist')
        return super().redirect_request(req,fp,code,msg,headers,newurl)
def fetch(url):
    if not allowed(url): raise ValueError('Unapproved source origin')
    with build_opener(Redirect).open(Request(url,headers={'User-Agent':'OpenATG-FloodLens-source-check/1.0','Accept':'application/pdf,application/xml,text/html,text/csv'}),timeout=25) as response:
        payload=response.read(8*1024*1024+1)
        if len(payload)>8*1024*1024: raise ValueError('Source exceeded size limit')
        if not allowed(response.url):raise ValueError('Unapproved final origin')
        return payload,response.headers.get('Content-Type',''),response.url
def check(item,out,expected):
    result={'id':item['id'],'url':item['url'],'checkedAt':datetime.now(timezone.utc).isoformat()}
    try:
        raw,typ,final=fetch(item['url'])
        if item.get('kind')=='pdf' and not raw.startswith(b'%PDF-'): raise ValueError('Expected PDF signature missing')
        if item.get('kind')=='listing' and not all(k in raw.decode('utf-8',errors='replace') for k in ['com_dmcreports','Download']): raise ValueError('Official listing shape changed')
        cap=parse_cap_xml(raw,item['kind']) if item['kind'] in ['cap','cap_feed'] else None
        digest=hashlib.sha256(raw).hexdigest();ext={'pdf':'pdf','listing':'html','csv':'csv','cap':'xml','cap_feed':'xml'}[item['kind']]
        filename=f'{item["id"]}-{digest[:12]}.{ext}';(out/filename).write_bytes(raw)
        result.update(status='ok',sha256=digest,bytes=len(raw),contentType=typ,finalUrl=final,rawFile=filename,changed=expected.get(item['id'],{}).get('sha256') not in (None,digest))
        if cap is not None:result['capReviewQueue']=cap
        if item['kind']=='listing':
            # Audit only: raw links are never interpreted as active warning scope.
            text=raw.decode('utf-8',errors='replace');result['pdfLinks']=sorted(set(re.findall(r'[^\s"<>]+\.pdf',text)))[:100]
        if item['kind']=='csv':
            rows=list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))));result.update(rows=len(rows),columns=list(rows[0]) if rows else [])
            if not rows:raise ValueError('Empty reservoir data')
    except Exception as exc:
        # No request payload, environment, token or user location in errors.
        result.update(status='error',error=type(exc).__name__+': '+str(exc)[:180])
    return result
def parse_cap_xml(raw,kind):
    if len(raw)>1000000 or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():raise ValueError('Unsafe or oversized CAP XML')
    root=ET.fromstring(raw)
    if kind=='cap_feed':
        if root.tag!='rss':raise ValueError('Expected RSS')
        links=[e.text for e in root.findall('./channel/item/link')]
        if len(links)>100 or any(not allowed(u or '') or not re.fullmatch(r'https://was.meteo.gov.lk/cap/en/[a-f0-9]{32}\.xml',u or '') for u in links):raise ValueError('Unexpected CAP links')
        return {'reviewRequired':True,'urls':links,'note':'Read-only discovery. New alerts require original-document review; no public warning is automatically changed.'}
    ns=root.tag.removesuffix('alert').rstrip('}')
    if root.tag not in ['{urn:oasis:names:tc:emergency:cap:1.1}alert','{urn:oasis:names:tc:emergency:cap:1.2}alert']:raise ValueError('Unsupported CAP namespace')
    prefix=root.tag[:-5]
    def text(name):return root.findtext(prefix+name)
    if text('status')!='Actual' or text('scope')!='Public':raise ValueError('Non-public or test CAP')
    return {'identifier':text('identifier'),'sent':text('sent'),'messageType':text('msgType'),'reviewRequired':True,'note':'Preserve source language, area, namespace and timing. No automatic interpretation.'}

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',default='artifacts/floodlens/source-check');args=p.parse_args()
    out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    snapshot=json.loads((ROOT/'floodlens/data/reviewed.json').read_text())
    items=[dict(id=w['id'],url=w['url'],kind='cap' if w['url'].startswith('https://was.meteo.gov.lk/cap/') else 'pdf') for w in snapshot['bulletins']]
    items.append(dict(id='met-cap-feed',url='https://was.meteo.gov.lk/cap/en/rss.xml',kind='cap_feed'))
    items.append(dict(id='river-observations',url=snapshot['stations'][0]['url'],kind='pdf'))
    items.append(dict(id='major-reservoir-csv',url=snapshot['reservoirs'][0]['url'],kind='csv'))
    for kind,number in [('flood',6),('landslide',5),('weather',2)]:
        items.append(dict(id=kind+'-listing',url=f'https://www.dmc.gov.lk/index.php?option=com_dmcreports&view=reports&report_type_id={number}&lang=en&limit=100',kind='listing'))
    provenance=ROOT/'floodlens/data/provenance.json'
    provenance_data=json.loads(provenance.read_text()) if provenance.exists() else {}
    expected=provenance_data.get('sources',[])
    expected={x['id']:x for x in expected}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results=list(pool.map(lambda x:check(x,out,expected),items))
    # DMC PDF discovery and CAP XML are distinct formats and separate review queues.
    pdf_snapshot={**snapshot,'bulletins':[w for w in snapshot['bulletins'] if not w['url'].startswith('https://was.meteo.gov.lk/cap/')]}
    pdf_results=[r for r in results if not r['url'].startswith('https://was.meteo.gov.lk/cap/')]
    queue=discover(pdf_snapshot,provenance_data,out,fetch,existing=pdf_results)
    commit=os.environ.get('GITHUB_SHA','')
    queue['reviewedSnapshot']={'reviewedAt':snapshot.get('reviewedAt'),'sha256':hashlib.sha256((ROOT/'floodlens/data/reviewed.json').read_bytes()).hexdigest(),
                              'repositoryCommit':commit if re.fullmatch(r'[0-9a-f]{40}',commit) else None}
    now=datetime.now(timezone.utc).isoformat()
    report=dict(schemaVersion=2,checkedAt=now,publishing='read-only; no automatic public publication',sources=results,reviewQueue=queue)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    (out/'review-queue.json').write_text(json.dumps(queue,indent=2)+'\n')
    lines=['# FloodLens official-source check','',f'Completed: {now}','', '| Source | Fetch | Changed since reviewed snapshot |', '|---|---|---|']
    lines += [f'| {r["id"]} | {r["status"]} | {r.get("changed","unknown")} |' for r in results]
    lines += ['','These are retrieval checks, not validation that a warning remains current. Changed/new official documents require review before publication. Fetch times are not observation times.']
    summary='\n'.join(lines)+'\n\n'+queue_markdown(queue)
    (out/'summary.md').write_text(summary)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:f.write(summary)
    print(json.dumps({'checkedAt':now,'ok':sum(r['status']=='ok' for r in results),'failed':[r['id'] for r in results if r['status']!='ok'],'changed':[r['id'] for r in results if r.get('changed')],
                      'listingWindowComplete':queue['coverage']['completeForListingWindow'],'reviewRequired':queue['reviewRequired'],'deferredPdfHashes':queue['documentHashing']['deferred']}))
    if any(r['status']!='ok' for r in results) or not queue['coverage']['completeForListingWindow'] or queue['documentHashing']['failures']:return 1
    return 0
if __name__=='__main__':sys.exit(main())
