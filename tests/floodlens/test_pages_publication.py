import sys,unittest
from pathlib import Path
from urllib.error import HTTPError
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'scripts/floodlens'))
from publish_reservoirs import wait_for_pages_build,REPOSITORY

COMMIT='b1652187f518f4d41d1760a1e72385938f1eebd8'
OTHER='34e8ed585f2e26c0820777063bdb6022dcd3d29f'
def build(status,commit=COMMIT,id=1):
 return {'status':status,'commit':commit,'url':f'https://api.github.com/repos/{REPOSITORY}/pages/builds/{id}'}
class Clock:
 def __init__(self):self.now=0;self.waits=[]
 def time(self):return self.now
 def pause(self,seconds):self.waits.append(seconds);self.now+=seconds
class PagesPublication(unittest.TestCase):
 def verify(self,get,clock=None):
  clock=clock or Clock()
  return wait_for_pages_build(COMMIT,get,30,clock.time,clock.pause)
 def test_failed_and_successful_exact_commit_builds_in_either_order(self):
  failed=build('errored',id=1318408410);success=build('built',id=1318408409)
  for history in [[failed,success],[success,failed],[build('built',OTHER),failed,success]]:
   self.assertEqual(self.verify(lambda _:history),success)
 def test_initial_failure_waits_for_later_exact_success(self):
  history=iter([[build('errored')],[build('errored'),build('built',id=2)]])
  clock=Clock();calls=[]
  def get(endpoint):calls.append(endpoint);return next(history)
  self.assertEqual(self.verify(get,clock)['url'].split('/')[-1],'2')
  self.assertEqual(calls,['/pages/builds','/pages/builds']);self.assertEqual(clock.waits,[15])
 def test_all_failed_builds_still_fail_after_bounded_deadline(self):
  clock=Clock()
  with self.assertRaisesRegex(RuntimeError,'no successful build for the exact published commit'):
   self.verify(lambda _:[build('errored')],clock)
  self.assertEqual(clock.now,30);self.assertEqual(clock.waits,[15,15])
 def test_newer_unrelated_success_never_confirms_failed_target(self):
  with self.assertRaises(RuntimeError):self.verify(lambda _:[build('built',OTHER),build('errored')])
 def test_missing_or_pending_target_remains_unconfirmed(self):
  for history in [[],[build('built',OTHER)],[build('queued')],[build('building')]]:
   with self.assertRaises(TimeoutError):self.verify(lambda _:history)
 def test_denied_read_is_not_retried(self):
  calls=[]
  def denied(endpoint):calls.append(endpoint);raise HTTPError('api',403,'denied',{},None)
  with self.assertRaises(HTTPError):self.verify(denied)
  self.assertEqual(calls,['/pages/builds'])
 def test_malformed_history_and_unexpected_success_identity_fail_closed(self):
  for history in [{},[None],[build('unknown')],[dict(build('built'),url='https://example.com/unverified')],[build('built')]*101]:
   with self.assertRaises(ValueError):self.verify(lambda _:history)
 def test_full_exact_sha_is_required(self):
  for commit in [COMMIT[:7],OTHER+'x','main']:
   with self.assertRaises(ValueError):wait_for_pages_build(commit,lambda _:self.fail('network'),30)
if __name__=='__main__':unittest.main()
