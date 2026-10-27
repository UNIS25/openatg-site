"""One-shot recovery for the existing review turn; never a daemon or a warning publisher.

Local dispatch uses existing gh authentication. Runner duplicate checks use only
anonymous public GETs, so no Actions token permission is added. Unknown outcomes
are journaled before dispatch and never blindly retried.
"""
import argparse,fcntl,json,os,re,subprocess,time
from contextlib import contextmanager
from datetime import datetime,timedelta,timezone
from pathlib import Path
from urllib.request import Request,urlopen

ROOT=Path(__file__).resolve().parents[2]
REPO='UNIS25/openatg-site'
WORKFLOW='floodlens-observation-update.yml'
WORKFLOW_ID=396918646
ENDPOINT=f'repos/{REPO}/actions/workflows/{WORKFLOW}'
JOURNAL=ROOT/'artifacts/floodlens/watchdog/request.json'
REQUIRED_STEPS={'Fetch and validate dated reservoir observations','Validate forecast, cloud and tide candidates separately','Publish only the ten approved data files and verify Pages build'}
PUBLICATION_STEP='Publish only the ten approved data files and verify Pages build'

def stamp(value):
 d=datetime.fromisoformat(value.replace('Z','+00:00'))
 if d.tzinfo is None:raise ValueError('Timezone required')
 return d.astimezone(timezone.utc)

def api(endpoint,body=None,anonymous=False):
 if not endpoint.startswith(f'repos/{REPO}/actions/'):raise ValueError('Unexpected API target')
 if anonymous:
  if body is not None:raise ValueError('Anonymous client is read-only')
  with urlopen(Request('https://api.github.com/'+endpoint,headers={'Accept':'application/vnd.github+json','User-Agent':'OpenATG-publisher-watchdog'}),timeout=25) as response:
   raw=response.read(8_000_001)
   if len(raw)>8_000_000:raise ValueError('Oversized API response')
   return json.loads(raw)
 args=['gh','api',endpoint]
 if body is not None:args+=['--method','POST','--input','-']
 result=subprocess.run(args,input=None if body is None else json.dumps(body),text=True,capture_output=True,timeout=45,cwd=ROOT)
 if result.returncode:raise RuntimeError('GitHub API request failed; outcome requires inspection')
 return json.loads(result.stdout) if result.stdout.strip() else None

def runs(get):
 data=get(ENDPOINT+'/runs?per_page=100')
 if not isinstance(data.get('workflow_runs'),list):raise ValueError('Invalid run history')
 out=[]
 for r in data['workflow_runs']:
  if r.get('workflow_id')!=WORKFLOW_ID or not isinstance(r.get('id'),int):raise ValueError('Unexpected workflow run')
  if r.get('head_branch')=='main':out.append(r)
 return out

def decision(history,get,now,minutes=30,current_id=None,check_active=True):
 relevant=[r for r in history if r['id']!=current_id]
 active=[r['id'] for r in relevant if r.get('status')!='completed']
 if check_active and active:return {'state':'active','runIds':active}
 inspected=0;unconfirmed=[]
 for r in sorted(relevant,key=lambda r:stamp(r['updated_at']),reverse=True):
  if r.get('status')!='completed':continue
  at=stamp(r['updated_at'])
  if at>now:raise ValueError('Future run timestamp')
  if at<=now-timedelta(minutes=minutes):continue
  if r.get('conclusion') not in ['success','failure','cancelled','timed_out']:continue
  inspected+=1
  if inspected>6:raise ValueError('Too many recent runs to verify safely')
  data=get(f'repos/{REPO}/actions/runs/{r["id"]}/jobs?per_page=100')
  if not isinstance(data,dict) or not isinstance(data.get('jobs'),list):raise ValueError('Invalid jobs history')
  if data.get('total_count',0)>100:raise ValueError('Incomplete jobs history')
  for job in data.get('jobs',[]):
   successful={s.get('name') for s in job.get('steps',[]) if s.get('conclusion')=='success'}
   if r.get('conclusion')=='success' and job.get('conclusion')=='success' and REQUIRED_STEPS<=successful:
    completed=stamp(job['completed_at'])
    if completed>now:raise ValueError('Future completion time')
    if completed>now-timedelta(minutes=minutes):return {'state':'fresh','runId':r['id'],'completedAt':job['completed_at']}
   publication=next((s for s in job.get('steps',[]) if s.get('name')==PUBLICATION_STEP),{})
   if (REQUIRED_STEPS-{PUBLICATION_STEP})<=successful and publication.get('conclusion') in ['failure','cancelled','timed_out']:
    unconfirmed.append(r)
 if unconfirmed:return {'state':'publication-unconfirmed','runId':unconfirmed[0]['id'],'runUpdatedAt':unconfirmed[0]['updated_at'],'reason':'Publication may have pushed before verification failed. Inspect exact commit/build/public bytes; do not redispatch blindly.'}
 return {'state':'due','reason':'No active run or verified successful combined refresh in the interval'}

def request_slot(now):
 shifted=now-timedelta(minutes=7)
 return shifted.replace(minute=shifted.minute//30*30,second=0,microsecond=0)+timedelta(minutes=7)

def request_id(now):
 # One recovery identity per existing :07/:37 schedule slot; no visitor data.
 return 'watchdog-'+request_slot(now).strftime('%Y%m%dT%H%MZ')

def due_window(now):
 # A rolling 30-minute cooldown would skip alternate 30-minute review turns.
 # Accept a real refresh in this slot, or within a 15-minute race cooldown.
 threshold=min(request_slot(now),now-timedelta(minutes=15))
 return (now-threshold).total_seconds()/60

def find_request(history,key):
 return next((r for r in history if key in r.get('display_title','') and r.get('event')=='workflow_dispatch'),None)

def save(path,value):
 path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix('.tmp')
 with open(tmp,'w') as f:json.dump(value,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
 os.replace(tmp,path)

@contextmanager
def lock(path):
 path.parent.mkdir(parents=True,exist_ok=True)
 with open(path,'a') as f:
  try:fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB)
  except BlockingIOError:raise RuntimeError('Another local watchdog invocation holds the lock')
  try:yield
  finally:fcntl.flock(f,fcntl.LOCK_UN)

def recover(get,post,now,until,journal=JOURNAL,dispatch=False):
 if until<=now or until>now+timedelta(hours=48):raise ValueError('Recovery window expired or exceeds 48 hours')
 history=runs(get);prior=json.loads(journal.read_text()) if journal.exists() else None
 if prior and prior.get('state') in ['intent-recorded','dispatch-uncertain','accepted-awaiting-run']:
  matched=find_request(history,prior['requestId'])
  if not matched:return {'state':'pending-or-uncertain','requestId':prior['requestId'],'reason':'Prior request has no confirmed run; do not redispatch'}
  prior.update(state='run-found',runId=matched['id']);save(journal,prior)
 state=decision(history,get,now,minutes=due_window(now))
 if state['state'] not in ['due','publication-unconfirmed']:return state
 key=request_id(now);existing=find_request(history,key)
 if existing:return {'state':'already-requested','runId':existing['id'],'requestId':key,'runConclusion':existing.get('conclusion'),'verificationState':state['state'],'reason':'Current slot has a confirmed request; inspect its outcome instead of dispatching again.'}
 if prior and prior.get('requestId')==key and prior.get('state')=='run-found':return {'state':'pending-or-uncertain','requestId':key,'reason':'Current slot is journaled but absent from returned history; do not redispatch'}
 if state['state']!='due' or not dispatch:return state
 # Re-read immediately before the side effect. Local lock + workflow concurrency
 # + runner freshness gate cover independent callers and a simultaneous cron.
 history=runs(get);state=decision(history,get,now,minutes=due_window(now))
 if state['state']!='due':return state
 existing=find_request(history,key)
 if existing:return {'state':'already-requested','runId':existing['id'],'requestId':key}
 record={'state':'intent-recorded','requestId':key,'requestedAt':now.isoformat(),'windowUntil':until.isoformat()};save(journal,record)
 try:post(ENDPOINT+'/dispatches',{'ref':'main','inputs':{'force_refresh':False,'watchdog_request_id':key}})
 except Exception:
  record['state']='dispatch-uncertain';save(journal,record);raise RuntimeError('Dispatch outcome uncertain; inspect run history, never retry blindly') from None
 record['state']='accepted-awaiting-run';save(journal,record)
 return {'state':'accepted-awaiting-run','requestId':key,'note':'Manual recovery requested; this is not evidence of cron success'}

def runner_gate(now,get):
 if os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('GITHUB_REPOSITORY')!=REPO or os.environ.get('GITHUB_REF')!='refs/heads/main':raise ValueError('Wrong runner context')
 key=os.environ.get('ARK_WATCHDOG_REQUEST_ID','')
 if key and not re.fullmatch(r'watchdog-\d{8}T\d{4}Z',key):raise ValueError('Invalid recovery identity')
 current=int(os.environ['GITHUB_RUN_ID'])
 if os.environ.get('ARK_FORCE_REFRESH')=='true':return {'state':'due','reason':'Explicit forced manual re-fetch'}
 # Runs are already serialized by the unchanged workflow concurrency group.
 # Skip-only successful jobs are never treated as a successful data refresh.
 return decision(runs(get),get,now,minutes=15,current_id=current,check_active=False)

def main():
 p=argparse.ArgumentParser();p.add_argument('--runner-gate',action='store_true');p.add_argument('--dispatch-if-due',action='store_true');p.add_argument('--until');args=p.parse_args();now=datetime.now(timezone.utc)
 if args.runner_gate:
  result=runner_gate(now,lambda endpoint:api(endpoint,anonymous=True))
  with open(os.environ['GITHUB_OUTPUT'],'a') as f:f.write('proceed='+str(result['state']=='due').lower()+'\n')
 else:
  if not args.until:raise ValueError('--until must be the existing monitoring deadline; never start a new window automatically')
  with lock(JOURNAL.with_suffix('.lock')):result=recover(api,api,now,stamp(args.until),dispatch=args.dispatch_if_due)
 print(json.dumps({'checkedAt':now.isoformat(),**result}))
 if os.environ.get('GITHUB_STEP_SUMMARY'):
  with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:f.write('\n## Duplicate prevention\n\n'+json.dumps(result)+'\n\nA manual recovery does not verify cron. No source timestamps were changed by this guard.\n')
if __name__=='__main__':main()
