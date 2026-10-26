"""Deterministic factual CSV extraction; no warning interpretation or publishing.
Usage: python3 scripts/floodlens/reservoir_catalog.py raw.csv output.json --retrieved-at ISO8601
Missing values stay null. Original daily dates and units are retained.
"""
import argparse,csv,hashlib,io,json,re,sys
from datetime import datetime,timezone
from pathlib import Path
SOURCE='https://docs.google.com/spreadsheets/d/e/2PACX-1vTcSGhi9RESl7CMCl1TQnrKe07Gx5Q696YiSB9jneIHqIP9lifpqSErgI3D5k9KtQXSdW5JpycIIr5e/pub?gid=1238978530&single=true&output=csv'
FIELDS=['Reservoir','Range','Date','Update Date','Water Depth_ft','Effective Storage_Acft','Effective Storage_per','Gross Storage_Acft','Spilling','Spilling_Cusec','Rainfall_Preceding Day_mm']
def number(value):
    value=value.strip().replace(',','')
    if value in ('','-','N/A','NA','#REF!','#N/A','#VALUE!'):return None
    if not re.fullmatch(r'-?\d+(?:\.\d+)?',value):raise ValueError('Unexpected numeric field')
    return float(value)
def date(value):
    if value.strip() in ('','#REF!','#N/A','#VALUE!','-'):return None
    return datetime.strptime(value.strip(),'%m/%d/%Y').date().isoformat()
def parse(raw):
    reader=csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))
    if not all(f in (reader.fieldnames or []) for f in FIELDS):raise ValueError('Reservoir source schema changed')
    records=[];seen=set()
    for row in reader:
        name=row['Reservoir'].strip()
        if not name or name in seen:raise ValueError('Missing or duplicate reservoir name')
        seen.add(name)
        spilling=row['Spilling'].strip().lower()
        if spilling not in ('yes','no','','-'):raise ValueError('Unknown spilling value')
        r=dict(name=name,range=row['Range'].strip(),observedDate=date(row['Date']),updatedDate=date(row['Update Date']),observedAt=None,depthFeet=number(row['Water Depth_ft']),effectiveStorageAcreFeet=number(row['Effective Storage_Acft']),grossStorageAcreFeet=number(row['Gross Storage_Acft']),effectivePercent=number(row['Effective Storage_per']),spilling={'yes':True,'no':False}.get(spilling),spillCusecs=number(row['Spilling_Cusec']),previousDayRainfallMm=number(row['Rainfall_Preceding Day_mm']),url=SOURCE)
        for k in ['effectiveStorageAcreFeet','grossStorageAcreFeet','effectivePercent','spillCusecs','previousDayRainfallMm']:
            if r[k] is not None and (r[k]<0 or r[k]>1e9):raise ValueError('Out-of-range numeric field')
        if r['effectivePercent'] is not None and r['effectivePercent']>200:raise ValueError('Implausible effective percentage; review required')
        records.append(r)
    if not 1<=len(records)<=200:raise ValueError('Unexpected source row count')
    return sorted(records,key=lambda r:r['name'].lower())
def main():
    p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('output');p.add_argument('--retrieved-at',required=True);args=p.parse_args();assert datetime.fromisoformat(args.retrieved_at).tzinfo,'Retrieval timestamp requires a time zone'
    raw=Path(args.input).read_bytes();records=parse(raw)
    out=dict(schemaVersion=1,source='Irrigation Department major-reservoir dashboard published CSV',sourceUrl=SOURCE,sourceSha256=hashlib.sha256(raw).hexdigest(),processedAt=datetime.now(timezone.utc).isoformat(),retrievedAt=args.retrieved_at,observationTime='Date only; no observation time published',coverage=f'{len(records)} records in this source snapshot; not complete national reservoir coverage',records=records)
    Path(args.output).write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n');print({'records':len(records),'sha256':out['sourceSha256']})
if __name__=='__main__':main()
