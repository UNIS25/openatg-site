#!/usr/bin/env python3
"""Read-only official-source checks; no LLM, execution, credentials or publishing.

Fetches are allowlisted, TLS-verified, size/time bounded. Raw files are retained
in the audit output, identified by SHA-256. A changed hash requires review; it
never silently changes a warning's geographic scope, severity or validity.
"""
import argparse, concurrent.futures, csv, hashlib, io, json, os, re, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler

ROOT=Path(__file__).resolve().parents[2]
ALLOWED={'www.dmc.gov.lk','dmc.gov.lk','docs.google.com','www.irrigation.gov.lk','irrigation.gov.lk'}
def allowed(url):
    u=urlparse(url)
    return u.scheme=='https' and (u.hostname in ALLOWED or (u.hostname or '').endswith('.googleusercontent.com')) and not u.username and not u.password
class Redirect(HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        if not allowed(newurl): raise ValueError('Redirect outside source allowlist')
        return super().redirect_request(req,fp,code,msg,headers,newurl)
def fetch(url):
    if not allowed(url): raise ValueError('Unapproved source origin')
    with build_opener(Redirect).open(Request(url,headers={'User-Agent':'OpenATG-FloodLens-source-check/1.0','Accept':'application/pdf,text/html,text/csv'}),timeout=25) as response:
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
        digest=hashlib.sha256(raw).hexdigest();ext={'pdf':'pdf','listing':'html','csv':'csv'}[item['kind']]
        filename=f'{item["id"]}-{digest[:12]}.{ext}';(out/filename).write_bytes(raw)
        result.update(status='ok',sha256=digest,bytes=len(raw),contentType=typ,finalUrl=final,rawFile=filename,changed=expected.get(item['id'],{}).get('sha256') not in (None,digest))
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
def main():
    p=argparse.ArgumentParser();p.add_argument('--output',default='artifacts/floodlens/source-check');p.add_argument('--initial-capture',action='store_true');args=p.parse_args()
    out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    snapshot=json.loads((ROOT/'floodlens/data/reviewed.json').read_text())
    items=[dict(id=w['id'],url=w['url'],kind='pdf') for w in snapshot['bulletins']]
    items.append(dict(id='river-observations',url=snapshot['stations'][0]['url'],kind='pdf'))
    items.append(dict(id='major-reservoir-csv',url=snapshot['reservoirs'][0]['url'],kind='csv'))
    for kind,number in [('flood',6),('landslide',5),('weather',2)]:
        items.append(dict(id=kind+'-listing',url=f'https://www.dmc.gov.lk/index.php?option=com_dmcreports&view=reports&report_type_id={number}&lang=en',kind='listing'))
    provenance=ROOT/'floodlens/data/provenance.json'
    expected=json.loads(provenance.read_text()).get('sources',[]) if provenance.exists() else []
    expected={x['id']:x for x in expected}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results=list(pool.map(lambda x:check(x,out,expected),items))
    now=datetime.now(timezone.utc).isoformat()
    report=dict(schemaVersion=1,checkedAt=now,publishing='read-only; no automatic public publication',sources=results)
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    lines=['# FloodLens official-source check','',f'Completed: {now}','', '| Source | Fetch | Changed since reviewed snapshot |', '|---|---|---|']
    lines += [f'| {r["id"]} | {r["status"]} | {r.get("changed","unknown")} |' for r in results]
    lines += ['','These are retrieval checks, not validation that a warning remains current. Changed/new official documents require review before publication. Fetch times are not observation times.']
    (out/'summary.md').write_text('\n'.join(lines)+'\n')
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:f.write('\n'.join(lines))
    if args.initial_capture:
        if provenance.exists():raise SystemExit('Initial capture cannot overwrite an existing baseline; explicit source review required.')
        if any(r['status']!='ok' for r in results[:6]):raise SystemExit('Cannot capture reviewed baseline: a bulletin or observation fetch failed.')
        snapshot['reviewedAt']=now;snapshot['fetchedAt']=now
        for w in snapshot['bulletins']:w['sha256']=next(r['sha256'] for r in results if r['id']==w['id'])
        (ROOT/'floodlens/data/reviewed.json').write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n')
        # Raw assets stay in audit output; public provenance contains hashes, not executable HTML.
        provenance.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'checkedAt':now,'ok':sum(r['status']=='ok' for r in results),'failed':[r['id'] for r in results if r['status']!='ok'],'changed':[r['id'] for r in results if r.get('changed')]}))
    if any(r['status']!='ok' for r in results):return 1
    return 0
if __name__=='__main__':sys.exit(main())
