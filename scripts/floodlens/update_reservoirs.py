"""Fetch and validate the single approved reservoir source; never interpret warnings."""
import copy,csv,hashlib,io,json,os
from datetime import datetime,timezone
from pathlib import Path
from zoneinfo import ZoneInfo
from check_sources import fetch
from reservoir_catalog import parse,SOURCE

ROOT=Path(__file__).resolve().parents[2]
TARGET=ROOT/'floodlens/data/reservoirs.json'
HEADERS=['NO','Week No','Update Date','Reservoir','Latitude','Longitude','Range','Division','Extent_Ac','FSD_ft','Gross Capacity_Acft','Dead Storage_Acft','Active Storage_Acft','Date','Water Depth_ft','Gross Storage_Acft','Effective Storage_Acft','Effective Storage_per','Rainfall_Preceding Day_mm','Spilling','Remarks','DS IMPACT','Spilling_Cusec','Remind_Storage_Acft']
UNITS={'depthFeet':'ft','effectiveStorageAcreFeet':'acre-ft','grossStorageAcreFeet':'acre-ft','effectivePercent':'percent of effective capacity','spillCusecs':'ft3/s (cusecs)','previousDayRainfallMm':'mm, preceding day'}

def validate(raw,previous,now):
    if next(csv.reader(io.StringIO(raw.decode('utf-8-sig'))),None)!=HEADERS:
        raise ValueError('Source schema or unit columns changed')
    records=parse(raw)
    before={r['name']:r for r in previous['records']}
    if len(before)!=74 or {r['name'] for r in records}!=set(before):
        raise ValueError('Source coverage changed; review required')
    today=now.astimezone(ZoneInfo('Asia/Colombo')).date().isoformat()
    for record in records:
        prior=before[record['name']]
        if record['range']!=prior['range']:raise ValueError('Reservoir identity changed')
        for field in ('observedDate','updatedDate'):
            value=record[field]
            if value and value>today:raise ValueError('Future source date')
            if prior[field] and (not value or value<prior[field]):raise ValueError('Source date regressed')
        if record['depthFeet'] is not None and not -100<=record['depthFeet']<=1000:
            raise ValueError('Depth outside review bounds')
        if record['observedDate'] and record['updatedDate'] and record['observedDate']>record['updatedDate']:
            raise ValueError('Observation after source update date')
    return records

def update(previous,fetcher=fetch,now=None):
    now=now or datetime.now(timezone.utc);stamp=now.isoformat();result=copy.deepcopy(previous)
    try:
        raw,content_type,final_url=fetcher(SOURCE)
        records=validate(raw,previous,now)
        digest=hashlib.sha256(raw).hexdigest()
        result.update(records=records,sourceSha256=digest,retrievedAt=stamp,processedAt=stamp,units=UNITS,
                      sourceUrl=SOURCE,sourceBytes=len(raw),sourceContentType=content_type,sourceFinalUrl=final_url)
        result['ingestion']={'status':'ok','lastAttemptAt':stamp,'lastSuccessAt':stamp,'method':'deterministic official CSV; no warning interpretation'}
        audit=ROOT/'artifacts/floodlens/reservoir-update';audit.mkdir(parents=True,exist_ok=True)
        (audit/(digest+'.csv')).write_bytes(raw)
    except Exception as error:
        # Preserve all prior values, dates, retrieval time and validated source hash.
        result['ingestion']={'status':'error','lastAttemptAt':stamp,'lastSuccessAt':previous.get('ingestion',{}).get('lastSuccessAt',previous.get('retrievedAt')),
                             'errorCode':type(error).__name__,'message':'Source fetch or validation failed; prior dated records retained'}
    return result

def main():
    previous=json.loads(TARGET.read_text())
    if previous.get('schemaVersion')!=1 or previous.get('sourceUrl')!=SOURCE:raise ValueError('Unexpected publication target')
    result=update(previous)
    TARGET.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
    status=result['ingestion'];print(json.dumps({'ingestion':status,'sourceSha256':result['sourceSha256'],'records':len(result['records'])}))
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'],'a') as f:f.write('source_status='+status['status']+'\n')
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:f.write(f"## Reservoir source check\n\nStatus: {status['status']} · checked {status['lastAttemptAt']}\n\nValidated source SHA-256: `{result['sourceSha256']}`\n\nRecords: {len(result['records'])}. Observation dates are not retrieval times. Warning interpretations are unchanged.\n")
if __name__=='__main__':main()
