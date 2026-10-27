import json,os,sys,tempfile,unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'scripts/floodlens'))
import publisher_watchdog as w
NOW=datetime(2026,10,27,7,20,tzinfo=timezone.utc)
def run(id=1,age=60,status='completed',conclusion='success',title='regular'):
 t=(NOW-timedelta(minutes=age)).isoformat();return dict(id=id,workflow_id=w.WORKFLOW_ID,head_branch='main',status=status,conclusion=conclusion,updated_at=t,created_at=t,display_title=title,event='workflow_dispatch')
def jobs(real=True,age=10,publication='success'):
 return {'total_count':1,'jobs':[{'conclusion':'success' if publication=='success' else 'failure','completed_at':(NOW-timedelta(minutes=age)).isoformat(),'steps':[{'name':n,'conclusion':(publication if n==w.PUBLICATION_STEP else 'success') if real else 'skipped'}for n in w.REQUIRED_STEPS]}]}
class WatchdogTests(unittest.TestCase):
 def test_active_and_pending_block_dispatch(self):
  for status in ['queued','waiting','in_progress','pending','requested']:
   self.assertEqual(w.decision([run(status=status)],lambda _:None,NOW)['state'],'active')
 def test_recent_success_requires_actual_source_and_publication_steps(self):
  self.assertEqual(w.decision([run(age=10)],lambda _:jobs(),NOW)['state'],'fresh')
  self.assertEqual(w.decision([run(age=10)],lambda _:jobs(False),NOW)['state'],'due')
 def test_failure_does_not_look_like_freshness(self):
  self.assertEqual(w.decision([run(age=10,conclusion='failure')],lambda _:jobs(),NOW)['state'],'due')
 def test_failed_publication_requires_verification_instead_of_blind_dispatch(self):
  result=w.decision([run(age=10,conclusion='failure')],lambda _:jobs(publication='failure'),NOW)
  self.assertEqual(result['state'],'publication-unconfirmed');self.assertEqual(result['runId'],1)
 def test_successful_older_refresh_may_still_be_verified_but_failure_is_never_fresh(self):
  history=[run(id=2,age=2,conclusion='failure'),run(id=1,age=5)]
  result=w.decision(history,lambda endpoint:jobs(publication='failure') if '/2/' in endpoint else jobs(age=5),NOW)
  self.assertEqual(result['state'],'fresh');self.assertEqual(result['runId'],1)
 def test_malformed_jobs_fail_closed(self):
  for response in [None,{},{'jobs':None}]:
   with self.assertRaises(ValueError):w.decision([run(age=10)],lambda _:response,NOW)
 def test_future_or_invalid_clock_fails_closed(self):
  with self.assertRaises(ValueError):w.decision([run(age=-1)],lambda _:jobs(),NOW)
  with self.assertRaises(ValueError):w.stamp('2026-10-27T07:20:00')
 def test_second_preflight_catches_new_active_cron(self):
  lists=iter([[],[run(status='queued',age=0)]]);posted=[]
  with tempfile.TemporaryDirectory() as tmp:
   result=w.recover(lambda _: {'workflow_runs':next(lists)},lambda *a:posted.append(a),NOW,NOW+timedelta(hours=1),Path(tmp)/'journal',True)
   self.assertEqual(result['state'],'active');self.assertEqual(posted,[])
 def test_dispatch_has_exact_target_and_safe_inputs_and_is_journaled_first(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'journal';posted=[]
   def post(endpoint,body):self.assertEqual(json.loads(p.read_text())['state'],'intent-recorded');posted.append((endpoint,body))
   r=w.recover(lambda _: {'workflow_runs':[]},post,NOW,NOW+timedelta(hours=1),p,True)
   self.assertEqual(r['state'],'accepted-awaiting-run');self.assertEqual(posted,[(w.ENDPOINT+'/dispatches',{'ref':'main','inputs':{'force_refresh':False,'watchdog_request_id':'watchdog-20261027T0707Z'}})])
   again=w.recover(lambda _: {'workflow_runs':[]},post,NOW+timedelta(minutes=1),NOW+timedelta(hours=1),p,True)
   self.assertEqual(again['state'],'pending-or-uncertain');self.assertEqual(len(posted),1)
 def test_uncertain_dispatch_never_blindly_retries(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'journal';calls=[]
   def post(*a):calls.append(a);raise TimeoutError()
   with self.assertRaisesRegex(RuntimeError,'uncertain'):w.recover(lambda _: {'workflow_runs':[]},post,NOW,NOW+timedelta(hours=1),p,True)
   self.assertEqual(json.loads(p.read_text())['state'],'dispatch-uncertain');r=w.recover(lambda _: {'workflow_runs':[]},post,NOW+timedelta(minutes=31),NOW+timedelta(hours=1),p,True);self.assertEqual(r['state'],'pending-or-uncertain');self.assertEqual(len(calls),1)
 def test_prior_run_identity_resolves_without_new_dispatch(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'journal';key=w.request_id(NOW);w.save(p,{'state':'accepted-awaiting-run','requestId':key});history=[run(age=0,status='in_progress',title='Ark data · workflow_dispatch · '+key)];calls=[]
   r=w.recover(lambda _: {'workflow_runs':history},lambda *a:calls.append(a),NOW,NOW+timedelta(hours=1),p,True);self.assertEqual(r['state'],'active');self.assertEqual(calls,[]);self.assertEqual(json.loads(p.read_text())['runId'],1)
 def test_same_slot_failed_request_not_reissued(self):
  def get(endpoint):return jobs(publication='failure') if '/jobs?' in endpoint else {'workflow_runs':[run(age=1,conclusion='failure',title=w.request_id(NOW))]}
  for dispatch in [False,True]:
   r=w.recover(get,lambda *a:self.fail('duplicate'),NOW,NOW+timedelta(hours=1),Path('/nonexistent/ark-watchdog-test'),dispatch);self.assertEqual(r['state'],'already-requested');self.assertEqual(r['runConclusion'],'failure');self.assertEqual(r['verificationState'],'publication-unconfirmed')
 def test_current_slot_journal_not_in_returned_history_remains_uncertain(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'journal';w.save(p,{'state':'run-found','requestId':w.request_id(NOW),'runId':1})
   for dispatch in [False,True]:
    r=w.recover(lambda _: {'workflow_runs':[]},lambda *a:self.fail('duplicate'),NOW,NOW+timedelta(hours=1),p,dispatch);self.assertEqual(r['state'],'pending-or-uncertain')
 def test_runner_does_not_repeat_unconfirmed_publication(self):
  env={'GITHUB_ACTIONS':'true','GITHUB_REPOSITORY':w.REPO,'GITHUB_REF':'refs/heads/main','GITHUB_RUN_ID':'2','ARK_FORCE_REFRESH':'false'}
  def get(endpoint):return jobs(publication='failure') if '/jobs?' in endpoint else {'workflow_runs':[run(id=2,status='in_progress',age=0),run(age=5,conclusion='failure')]}
  with patch.dict(os.environ,env):self.assertEqual(w.runner_gate(NOW,get)['state'],'publication-unconfirmed')
 def test_recovery_stops_after_authorized_deadline_and_rejects_unbounded_window(self):
  for until in [NOW,NOW-timedelta(seconds=1),NOW+timedelta(hours=49)]:
   with self.assertRaises(ValueError):w.recover(lambda _:self.fail('network'),None,NOW,until)
 def test_local_lock_prevents_parallel_writes(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'lock'
   with w.lock(p):
    with self.assertRaises(RuntimeError):
     with w.lock(p):pass
 def test_runner_skips_real_recent_refresh_but_not_skip_chain(self):
  env={'GITHUB_ACTIONS':'true','GITHUB_REPOSITORY':w.REPO,'GITHUB_REF':'refs/heads/main','GITHUB_RUN_ID':'2','ARK_FORCE_REFRESH':'false'}
  for real,expected in [(True,'fresh'),(False,'due')]:
   def get(endpoint):return {'workflow_runs':[run(id=2,status='in_progress',age=0),run(id=1,age=5)]} if '/workflows/' in endpoint else jobs(real,5)
   with patch.dict(os.environ,env):self.assertEqual(w.runner_gate(NOW,get)['state'],expected)
 def test_runner_ignores_later_queued_run_while_holding_concurrency_slot(self):
  history=[run(id=2,status='in_progress',age=0),run(id=3,status='queued',age=-1)]
  self.assertEqual(w.decision(history,lambda _:None,NOW,minutes=15,current_id=2,check_active=False)['state'],'due')
 def test_half_hour_review_does_not_skip_alternate_slots_after_delayed_completion(self):
  at=datetime(2026,10,27,7,42,tzinfo=timezone.utc);r=run();r.update(updated_at='2026-10-27T07:23:22Z');j=jobs();j['jobs'][0]['completed_at']='2026-10-27T07:23:21Z'
  self.assertEqual(w.decision([r],lambda _:j,at,minutes=w.due_window(at))['state'],'due')
  self.assertEqual(w.request_id(at),'watchdog-20261027T0737Z')
 def test_current_slot_refresh_and_short_race_cooldown_remain_fresh(self):
  at=datetime(2026,10,27,7,42,tzinfo=timezone.utc)
  for completed in ['2026-10-27T07:38:00Z','2026-10-27T07:30:00Z']:
   r=run();r['updated_at']=completed;j=jobs();j['jobs'][0]['completed_at']=completed
   self.assertEqual(w.decision([r],lambda _:j,at,minutes=w.due_window(at))['state'],'fresh')
 def test_no_new_permissions_secrets_or_publisher_paths(self):
  p=ROOT/'.github/workflows/floodlens-observation-update.yml'
  if not p.exists():return
  source=p.read_text();self.assertNotIn('actions: write',source);self.assertNotIn('actions: read',source);self.assertNotIn('secrets.',source);self.assertIn("cron: '7,37 * * * *'",source);self.assertIn('cancel-in-progress: false',source);self.assertIn('watchdog_request_id',source)
if __name__=='__main__':unittest.main()
