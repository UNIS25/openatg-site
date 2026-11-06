import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
class WorkflowConfig(unittest.TestCase):
 def test_hourly_schedule_keeps_guarded_permissions(self):
  source=(ROOT/'.github/workflows/floodlens-source-check.yml').read_text()
  observation=(ROOT/'.github/workflows/floodlens-observation-update.yml').read_text()
  self.assertIn("cron: '17 * * * *'",source)
  self.assertIn("cron: '7 * * * *'",observation)
  self.assertNotIn('contents: write',source)
  self.assertIn('persist-credentials: false',observation)
  self.assertIn('cancel-in-progress: false',observation)
 def test_hourly_rain_is_bounded_and_included_without_new_services(self):
  source=(ROOT/'.github/workflows/floodlens-observation-update.yml').read_text()
  self.assertIn('timeout-minutes: 50',source)
  for path in ['floodlens/data/hourly-rain','floodlens/hourly-rain-model.mjs','test_hourly_publication.py','test_gfs_hourly.py','hourly-publication.test.mjs']:
   self.assertIn(path,source)
  self.assertNotIn('actions/cache',source);self.assertNotIn('upload-artifact',source)
  self.assertNotIn('secrets.',source);self.assertNotIn('id-token:',source)
 def test_watchdog_requires_exact_current_workflow_steps(self):
  import sys
  sys.path.insert(0,str(ROOT/'scripts/floodlens'))
  from publisher_watchdog import REQUIRED_STEPS
  source=(ROOT/'.github/workflows/floodlens-observation-update.yml').read_text()
  for name in REQUIRED_STEPS:self.assertIn('- name: '+name+'\n',source)
if __name__=='__main__':unittest.main()
