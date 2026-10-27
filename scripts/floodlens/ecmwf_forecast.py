#!/usr/bin/env python3
"""Reviewed ECMWF IFS snapshot adapter. Anonymous bounded Range reads, never visitor coordinates.
Run chosen explicitly or by the bounded approved publisher; candidates require independent publication validation.
"""
from __future__ import annotations
import argparse, hashlib, json, math, re, urllib.request, urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path
import eccodes as ec
import numpy as np

UTC = timezone.utc
HOST = 'https://data.ecmwf.int/forecasts'
PARAMS = {'tp': (228, 'm', 'surface', 0, 'accum'), '10u': (165, 'm s**-1', 'heightAboveGround', 10, 'instant'), '10v': (166, 'm s**-1', 'heightAboveGround', 10, 'instant')}
# Keep enough lead time for a full upcoming day as the reviewed snapshot ages.
STEPS = list(range(3, 61, 3))
BBOX = [79.5, 5.75, 82.0, 10.0]
GRID_KEYS = 'gridType Ni Nj iDirectionIncrementInDegrees jDirectionIncrementInDegrees latitudeOfFirstGridPointInDegrees longitudeOfFirstGridPointInDegrees latitudeOfLastGridPointInDegrees longitudeOfLastGridPointInDegrees iScansNegatively jScansPositively jPointsAreConsecutive alternativeRowScanning'.split()
META_KEYS = 'edition centre shortName paramId units dataDate dataTime validityDate validityTime stepType stepUnits startStep endStep typeOfLevel level uvRelativeToGrid bitmapPresent numberOfMissing missingValue packingType bitsPerValue binaryScaleFactor decimalScaleFactor packingError'.split() + GRID_KEYS
MAX_MESSAGE = 2_000_000

def iso(dt): return dt.astimezone(UTC).isoformat().replace('+00:00','Z')
def digest(raw): return hashlib.sha256(raw).hexdigest()
def run_time(value):
    dt = datetime.strptime(value, '%Y%m%d%H').replace(tzinfo=UTC)
    if dt.hour not in (0, 6, 12, 18): raise ValueError('Unexpected model run hour')
    return dt

def validate_run(run, now):
    if run > now: raise ValueError('Future model run is not accepted')

def validate_index(rows, run, step):
    found = {}
    for p in PARAMS:
        matches = [r for r in rows if r.get('param') == p and r.get('levtype') == 'sfc']
        if len(matches) != 1: raise ValueError(f'Missing/duplicate {p} index row')
        r = matches[0]
        for key, expected in {'date':run.strftime('%Y%m%d'),'time':run.strftime('%H%M'),'step':str(step),'class':'od','type':'fc','stream':'oper','levtype':'sfc'}.items():
            if r.get(key) != expected: raise ValueError(f'Unexpected index {key}')
        start, size = r.get('_offset'), r.get('_length')
        if type(start) != int or type(size) != int or start < 0 or not 20 <= size <= MAX_MESSAGE: raise ValueError('Unbounded GRIB range')
        found[p] = r
    return found

def validate_meta(m, p, run, step):
    ident, units, level_type, level, step_type = PARAMS[p]
    expected = dict(edition=2, centre='ecmf', shortName=p, paramId=ident, units=units, dataDate=int(run.strftime('%Y%m%d')), dataTime=run.hour*100, stepType=step_type, stepUnits=1, startStep=0 if p=='tp' else step, endStep=step, typeOfLevel=level_type, level=level, gridType='regular_ll', uvRelativeToGrid=0, Ni=1440, Nj=721, iDirectionIncrementInDegrees=.25, jDirectionIncrementInDegrees=.25, iScansNegatively=0, jScansPositively=0, jPointsAreConsecutive=0, alternativeRowScanning=0)
    valid = run + timedelta(hours=step)
    expected.update(validityDate=int(valid.strftime('%Y%m%d')), validityTime=valid.hour*100)
    for k, v in expected.items():
        if m.get(k) != v: raise ValueError(f'Unexpected GRIB {k}: {m.get(k)!r} expected {v!r}')
    for k,v in dict(latitudeOfFirstGridPointInDegrees=90.0,longitudeOfFirstGridPointInDegrees=180.0,latitudeOfLastGridPointInDegrees=-90.0,longitudeOfLastGridPointInDegrees=179.75).items():
        if m.get(k)!=v: raise ValueError('Grid origin changed')
    if not isinstance(m.get('packingError'), (int,float)) or not math.isfinite(m['packingError']) or m['packingError']<0: raise ValueError('Packing precision unavailable')
    if m['packingError'] > (.002 if p=='tp' else 1): raise ValueError('Unexpectedly coarse packing')

def precipitation(previous, current):
    """Return mm for exactly one 3-hour interval; never replace missing by zero."""
    a,b=previous['metadata'],current['metadata']
    if any(a.get(k)!=b.get(k) for k in GRID_KEYS+['dataDate','dataTime','units','shortName','startStep','stepType']): raise ValueError('Incompatible cumulative fields')
    if a['shortName']!='tp' or a['units']!='m' or a['startStep']!=0 or a['stepType']!='accum' or b['endStep']-a['endStep']!=3: raise ValueError('Incomplete or incompatible rainfall interval')
    if len(previous['values'])!=len(current['values']):raise ValueError('Grid size mismatch')
    tolerance=(a['packingError']+b['packingError'])*1000
    values=[];quality=[]
    for x,y in zip(previous['values'],current['values']):
        if x is None or y is None or not math.isfinite(x) or not math.isfinite(y):values.append(None);quality.append('missing');continue
        if x<0 or y<0:values.append(None);quality.append('invalid_accumulation');continue
        diff=(y-x)*1000
        if diff < -tolerance-1e-9:values.append(None);quality.append('accumulation_decreased');continue
        values.append(round(max(0,diff),4));quality.append('within_packing_tolerance' if diff<0 else 'valid')
    return values,quality,tolerance

def complete_total(intervals):
    if not intervals:return None
    if any(b['startStep']!=a['endStep'] for a,b in zip(intervals,intervals[1:])):return None
    if any(v.get('rainMm') is None or v['endStep']-v['startStep']!=3 for v in intervals):return None
    return sum(v['rainMm'] for v in intervals)

def wind(u,v):
    if u is None or v is None or not math.isfinite(u) or not math.isfinite(v): return None
    speed=math.hypot(u,v)
    if speed>150:return None
    # Meteorological direction FROM which wind blows, clockwise from north.
    return {'speedMs':speed,'speedKmh':speed*3.6,'fromDegrees':None if speed<.5 else (math.degrees(math.atan2(u,v))+180)%360}

def read_bounded(url, limit, start=None, size=None):
    headers={} if start is None else {'Range':f'bytes={start}-{start+size-1}'}
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=45) as r:
        if start is not None:
            if r.status!=206 or not re.fullmatch(rf'bytes {start}-{start+size-1}/\d+',r.headers.get('Content-Range','')):raise ValueError('Server did not honor bounded byte range')
        elif r.status!=200:raise ValueError('Index unavailable')
        if urllib.parse.urlparse(r.geturl()).hostname!='data.ecmwf.int':raise ValueError('Unexpected source redirect host')
        raw=r.read(limit+1)
    if len(raw)>limit or (size is not None and len(raw)!=size):raise ValueError('Source size mismatch')
    if start is not None and (raw[:4]!=b'GRIB' or raw[-4:]!=b'7777' or raw[7]!=2 or int.from_bytes(raw[8:16],'big')!=len(raw)):raise ValueError('Not one complete GRIB2 message')
    return raw

def capture(path,url,start=None,size=None):
    provenance_path=path.with_suffix(path.suffix+'.source.json')
    if path.exists() and provenance_path.exists():
        raw=path.read_bytes();source=json.loads(provenance_path.read_text())
        if source.get('url')==url and source.get('rangeStart')==start and source.get('bytes')==len(raw) and source.get('sha256')==digest(raw):return raw,source
        raise ValueError('Cached source does not match provenance')
    raw=read_bounded(url,2_000_000 if size is None else size,start,size)
    source={'url':url,'rangeStart':start,'bytes':len(raw),'sha256':digest(raw),'retrievedAt':iso(datetime.now(UTC))}
    path.write_bytes(raw);provenance_path.write_text(json.dumps(source,indent=2))
    return raw,source

def decode(raw,p,run,step):
    h=ec.codes_new_from_message(raw)
    try:
        m={k:ec.codes_get(h,k) for k in META_KEYS}
        validate_meta(m,p,run,step)
        lat=ec.codes_get_array(h,'latitudes');lon=ec.codes_get_array(h,'longitudes');values=ec.codes_get_array(h,'values')
        mask=(lon>=BBOX[0])&(lon<=BBOX[2])&(lat>=BBOX[1])&(lat<=BBOX[3]); ids=np.flatnonzero(mask)
        order=np.lexsort((lon[ids],lat[ids]));ids=ids[order]
        coords=[[float(lon[i]),float(lat[i])] for i in ids]
        expected=[[float(x),float(y)] for y in np.arange(BBOX[1],BBOX[3]+.001,.25) for x in np.arange(BBOX[0],BBOX[2]+.001,.25)]
        if coords!=expected:raise ValueError('Unexpected regional grid')
        regional=[None if not np.isfinite(values[i]) or values[i]==m['missingValue'] else float(values[i]) for i in ids]
        return {'metadata':m,'values':regional},coords
    finally:ec.codes_release(h)

def build(run, cache, out, selection="Explicit reviewed run, not an assertion that no newer run exists"):
    now=datetime.now(UTC);validate_run(run,now);cache.mkdir(parents=True,exist_ok=True);out.mkdir(parents=True,exist_ok=True)
    base=f"{HOST}/{run:%Y%m%d}/{run:%H}z/ifs/0p25/oper/{run:%Y%m%d%H%M%S}"
    fields={};provenance=[];errors=[];coords=None
    for step in STEPS:
        try:
            index,src=capture(cache/f'{step}h.index',f'{base}-{step}h-oper-fc.index');provenance.append({'kind':'index',**src})
            selected=validate_index([json.loads(line) for line in index.splitlines()],run,step)
            fields[step]={}
            for p,r in selected.items():
                raw,src=capture(cache/f'{step}h-{p}.grib2',f'{base}-{step}h-oper-fc.grib2',r['_offset'],r['_length'])
                field,grid=decode(raw,p,run,step)
                if coords is not None and coords!=grid:raise ValueError('Grid changed within run')
                coords=grid;fields[step][p]=field
                provenance.append({'kind':'grib','step':step,'parameter':p,'indexRow':r,'metadata':field['metadata'],**src})
            print(f'Validated step {step}: tp + 10u + 10v',flush=True)
        except Exception as e:
            # A source or metadata failure may not silently generate a fabricated interval.
            errors.append({'step':step,'error':type(e).__name__,'message':str(e)[:240]});print(f'Unavailable step {step}: {e}',flush=True)
    if not coords:raise ValueError('No validated regional grid')
    frames=[]
    for step in STEPS[1:]:
        earlier=fields.get(step-3,{});current=fields.get(step,{})
        rain=[None]*len(coords);quality=['missing_interval']*len(coords);tolerance=None
        if 'tp' in earlier and 'tp' in current:
            try:rain,quality,tolerance=precipitation(earlier['tp'],current['tp'])
            except ValueError as e:errors.append({'step':step,'error':'IntervalInvalid','message':str(e)})
        u=current.get('10u',{}).get('values',[None]*len(coords));v=current.get('10v',{}).get('values',[None]*len(coords))
        frames.append({'startStep':step-3,'endStep':step,'intervalStart':iso(run+timedelta(hours=step-3)),'validAt':iso(run+timedelta(hours=step)),'rainMm':rain,'rainQuality':quality,'packingToleranceMm':tolerance,'windUms':u,'windVms':v})
    result={'schemaVersion':1,'kind':'model_forecast','model':'ECMWF IFS control','runAt':iso(run),'capturedAt':max(p['retrievedAt'] for p in provenance),'generatedAt':iso(datetime.now(UTC)),'units':{'rainMm':'mm/3h','windUms':'m/s','windVms':'m/s'},'runSelection':selection,'grid':{'type':'regular_ll','spacingDegrees':.25,'approximateKm':28,'bbox':BBOX,'points':coords,'matching':'nearest published grid point, no interpolation'},'intervalHours':3,'frames':frames,'captureErrors':errors,'attribution':'This service is based on data and products of the European Centre for Medium-Range Weather Forecasts (ECMWF).','copyright':'© 2026 European Centre for Medium-Range Weather Forecasts (ECMWF)','licence':'https://creativecommons.org/licenses/by/4.0/','terms':'https://apps.ecmwf.int/datasets/licences/general/','source':'https://www.ecmwf.int/en/forecasts/datasets/open-data','modifications':'Fixed Sri Lanka region crop; consecutive cumulative precipitation differences converted from m to mm; wind speed/direction derived from earth-relative 10 m u/v. No bias correction, downscaling, hazard inference or visitor data.'}
    raw=json.dumps(result,separators=(',',':'),allow_nan=False).encode();(out/'forecast.json').write_bytes(raw)
    manifest={'schemaVersion':1,'createdAt':iso(datetime.now(UTC)),'runAt':iso(run),'forecastSha256':digest(raw),'forecastBytes':len(raw),'decoder':{'ecCodes':ec.codes_get_api_version(),'pythonPackage':ec.__version__},'sources':provenance,'errors':errors}
    (out/'provenance.json').write_text(json.dumps(manifest,indent=2,allow_nan=False))
    print(json.dumps({'forecastBytes':len(raw),'gridPoints':len(coords),'intervals':len(frames),'sourceErrors':len(errors),'runAt':result['runAt']},indent=2))
    return result

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--run',required=True,help='Explicit YYYYMMDDHH UTC run');parser.add_argument('--cache',type=Path,default=Path('artifacts/floodlens/forecast-proof'));parser.add_argument('--out',type=Path,default=Path('floodlens/data/forecast'));args=parser.parse_args()
    build(run_time(args.run),args.cache/args.run,args.out)
