import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
class WorkflowConfig(unittest.TestCase):
 def test_thirty_minute_schedule_keeps_guarded_permissions(self):
  source=(ROOT/'.github/workflows/floodlens-source-check.yml').read_text()
  observation=(ROOT/'.github/workflows/floodlens-observation-update.yml').read_text()
  self.assertIn("cron: '17,47 * * * *'",source)
  self.assertIn("cron: '7,37 * * * *'",observation)
  self.assertNotIn('contents: write',source)
  self.assertIn('persist-credentials: false',observation)
  self.assertIn('cancel-in-progress: false',observation)
if __name__=='__main__':unittest.main()
