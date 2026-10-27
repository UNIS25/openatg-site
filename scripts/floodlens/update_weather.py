"""Approved fixed-source candidates. Failure keeps each prior group byte-for-byte.
No warning/news interpretation, no visitor inputs, no persistent token or cache.
"""
import json,os,shutil,subprocess,sys
from pathlib import Path
from datetime import datetime,timedelta,timezone
from urllib.error import HTTPError
import ecmwf_forecast as forecast
ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'artifacts/floodlens/publisher';DATA=ROOT/'floodlens/data'
GROUPS={'forecast':['forecast.json','provenance.json'],'clouds':['clouds.json','provenance.json','frame-0.png','frame-1.png','frame-2.png'],'tides':['colombo.json','validation.json']}
def install_group(group,candidate):
 # All validation precedes writes. Git publication validates again and is atomic.
 subprocess.run(['node','scripts/floodlens/validate_publication.mjs',group,str(candidate),str(DATA/group)],check=True,cwd=ROOT)
 for name in GROUPS[group]:
  target=DATA/group/name
  if target.is_symlink() or not target.is_file():raise ValueError('Publication requires pre-existing regular files')
 previous={name:(DATA/group/name).read_bytes() for name in GROUPS[group]}
 try:
  for name in GROUPS[group]:shutil.copyfile(candidate/name,DATA/group/name)
 except Exception:
  for name,raw in previous.items():(DATA/group/name).write_bytes(raw)
  raise
def latest_run(now,old):
 current=now.replace(hour=now.hour//6*6,minute=0,second=0,microsecond=0)
 for n in range(4):
  run=current-timedelta(hours=6*n)
  if run<=old:return old
  base=f'{forecast.HOST}/{run:%Y%m%d}/{run:%H}z/ifs/0p25/oper/{run:%Y%m%d%H%M%S}'
  try:
   for step in (forecast.STEPS[0],forecast.STEPS[-1]):
    raw=forecast.read_bounded(f'{base}-{step}h-oper-fc.index',2_000_000)
    forecast.validate_index([json.loads(line) for line in raw.splitlines()],run,step)
   return run
  except HTTPError as e:
   if e.code!=404:raise # Do not evade access denials via another endpoint.
 return old

def update_forecast(now,out,force=False):
 old=json.loads((DATA/'forecast/forecast.json').read_text());oldrun=datetime.fromisoformat(old['runAt'].replace('Z','+00:00'));run=latest_run(now,oldrun)
 if run==oldrun and not force:
  subprocess.run(['node','scripts/floodlens/validate_publication.mjs','forecast',str(DATA/'forecast'),str(DATA/'forecast')],check=True,cwd=ROOT)
  return 'unchanged: newest fully indexed run is already published; source times retained'
 result=forecast.build(run,WORK/'grib'/run.strftime('%Y%m%d%H'),out,selection='Newest fully indexed run found in at most four already-issued slots; deterministic validation, no manual forecast interpretation')
 if result['captureErrors']:raise ValueError('Incomplete forecast candidate')
 install_group('forecast',out);return ('validated re-fetch of existing run ' if run==oldrun else 'validated new model run ')+result['runAt']

def update_clouds(now,out,force=False):
 subprocess.run([sys.executable,'scripts/floodlens/capture_clouds.py'],env={**os.environ,'ARK_CLOUD_OUT':str(out)},cwd=ROOT,check=True,timeout=420)
 candidate=json.loads((out/'clouds.json').read_text());old=json.loads((DATA/'clouds/clouds.json').read_text())
 if [(f['captureAt'],f['sha256']) for f in candidate['frames']]==[(f['captureAt'],f['sha256']) for f in old['frames']]:
  subprocess.run(['node','scripts/floodlens/validate_publication.mjs','clouds',str(out),str(DATA/'clouds')],check=True,cwd=ROOT)
  return 'unchanged: same captures; retrieval/observation times retained'
 install_group('clouds',out);return 'validated capture '+candidate['capturedAt']

def update_tides(now,out,force=False):
 old=json.loads((DATA/'tides/colombo.json').read_text())
 if not force and datetime.fromisoformat(old['validUntil'].replace('Z','+00:00'))>now+timedelta(hours=42):return 'unchanged: over 42 hours of predictions remain'
 start=now.replace(minute=0,second=0,microsecond=0).isoformat()
 subprocess.run(['node','scripts/floodlens/build_tides.mjs'],env={**os.environ,'ARK_TIDE_START':start,'ARK_TIDE_OUT':str(out)},cwd=ROOT,check=True,timeout=90)
 subprocess.run([sys.executable,'scripts/floodlens/check_tides.py',str(out)],cwd=ROOT,check=True,timeout=90)
 install_group('tides',out);return 'validated rolling 48-hour astronomical prediction'

def main():
 os.chdir(ROOT);WORK.mkdir(parents=True,exist_ok=True);results={}
 for group,action in [('forecast',update_forecast),('clouds',update_clouds),('tides',update_tides)]:
  out=WORK/group
  if out.exists():shutil.rmtree(out)
  out.mkdir()
  try:results[group]={'status':'ok','detail':action(datetime.now(timezone.utc),out,force=os.environ.get('ARK_FORCE_REFRESH')=='true')}
  except Exception as e:
   results[group]={'status':'failed','detail':type(e).__name__+': '+str(e)[:300]}
   print('::warning::'+group+' source failed; prior group retained with original timestamps',flush=True)
 print(json.dumps(results,indent=2));(WORK/'result.json').write_text(json.dumps(results,indent=2))
 failed=any(r['status']!='ok' for r in results.values())
 if os.environ.get('GITHUB_OUTPUT'):
  with open(os.environ['GITHUB_OUTPUT'],'a') as f:f.write('source_status='+('error' if failed else 'ok')+'\n')
 if os.environ.get('GITHUB_STEP_SUMMARY'):
  with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:f.write('\n## Source validation\n\n'+''.join(f"- **{k}**: {v['status']} — {v['detail']}\n" for k,v in results.items())+'\nFailures retain previous data, original times and client expiry. Warnings and news are not published by this job.\n')
 return results
if __name__=='__main__':main()
