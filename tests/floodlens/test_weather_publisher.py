import copy,json,sys,tempfile,unittest
from pathlib import Path
from datetime import datetime,timezone,timedelta
from unittest.mock import patch
from urllib.error import HTTPError
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'scripts/floodlens'))
import update_weather as u
import publish_reservoirs as p
class WeatherPublisher(unittest.TestCase):
 def test_clean_runner_imports_all_required_decoders(self):
  import rasterio,eccodes,uptide,netCDF4
  self.assertTrue(eccodes.codes_get_api_version())
 def test_allowed_paths_are_exact_and_warning_news_code_are_excluded(self):
  self.assertEqual(len(p.ALLOWED),10)
  for name in p.ALLOWED:p.assert_paths([name])
  for name in ['floodlens/data/reviewed.json','floodlens/data/provenance.json','floodlens/data/explore/cyclone.json','floodlens/data/reservoir-reports.json','.github/workflows/floodlens-observation-update.yml','floodlens/data/clouds/frame-3.png','floodlens/data/tides/colombo-source.json','floodlens/data/forecast/../../app.mjs']:
   with self.assertRaises(ValueError):p.assert_paths([name])
 def test_latest_run_does_not_guess_future_or_downgrade(self):
  now=datetime(2026,10,27,5,40,tzinfo=timezone.utc);old=now.replace(day=26,hour=18,minute=0);seen=[]
  def missing(url,*args):seen.append(url);raise HTTPError(url,404,'missing',{},None)
  with patch.object(u.forecast,'read_bounded',missing):self.assertEqual(u.latest_run(now,old),old)
  self.assertEqual(len(seen),1);self.assertIn('/00z/',seen[0])
 def test_source_access_denial_is_not_retried_or_routed_around(self):
  now=datetime(2026,10,27,5,40,tzinfo=timezone.utc);old=now-timedelta(hours=12)
  with patch.object(u.forecast,'read_bounded',side_effect=HTTPError('official',403,'denied',{},None)) as fetch:
   with self.assertRaises(HTTPError):u.latest_run(now,old)
   self.assertEqual(fetch.call_count,1)
 def test_group_validation_failure_preserves_every_prior_byte(self):
  with tempfile.TemporaryDirectory() as tmp:
   base=Path(tmp);data=base/'published';out=base/'candidate';(data/'clouds').mkdir(parents=True);out.mkdir()
   for name in u.GROUPS['clouds']:(data/'clouds'/name).write_bytes(b'old');(out/name).write_bytes(b'untrusted')
   with patch.object(u,'DATA',data),patch.object(u.subprocess,'run',side_effect=ValueError('bad hash')):
    with self.assertRaises(ValueError):u.install_group('clouds',out)
   self.assertTrue(all((data/'clouds'/n).read_bytes()==b'old' for n in u.GROUPS['clouds']))
 def test_symlink_or_missing_publication_slot_fails_before_any_write(self):
  with tempfile.TemporaryDirectory() as tmp:
   base=Path(tmp);data=base/'published';out=base/'candidate';(data/'clouds').mkdir(parents=True);out.mkdir()
   for name in u.GROUPS['clouds']:(data/'clouds'/name).write_bytes(b'old');(out/name).write_bytes(b'new')
   (data/'clouds/frame-2.png').unlink();(data/'clouds/frame-2.png').symlink_to(out/'frame-2.png')
   with patch.object(u,'DATA',data),patch.object(u.subprocess,'run'):
    with self.assertRaises(ValueError):u.install_group('clouds',out)
   self.assertEqual((data/'clouds/clouds.json').read_bytes(),b'old')
 def test_reliable_tide_coverage_does_not_get_new_calculation_time_each_check(self):
  now=datetime.now(timezone.utc)
  with tempfile.TemporaryDirectory() as tmp:
   data=Path(tmp);(data/'tides').mkdir();(data/'tides/colombo.json').write_text(json.dumps({'validUntil':(now+timedelta(hours=45)).isoformat()}))
   with patch.object(u,'DATA',data),patch.object(u.subprocess,'run') as run:
    self.assertIn('unchanged',u.update_tides(now,data/'out'));run.assert_not_called()
 def test_no_force_push_persistent_credential_or_permission_expansion(self):
  source=(ROOT/'scripts/floodlens/publish_reservoirs.py').read_text();workflow=(ROOT/'.github/workflows/floodlens-observation-update.yml').read_text() if (ROOT/'.github/workflows/floodlens-observation-update.yml').exists() else ''
  self.assertIn("git('ls-remote'",source);self.assertIn("git('push',remote,'HEAD:main'",source);self.assertNotIn("'--force'",source)
  if workflow:self.assertIn('persist-credentials: false',workflow);self.assertIn("'7,37 * * * *'",workflow);self.assertNotIn('secrets.',workflow);self.assertNotIn('id-token:',workflow)
if __name__=='__main__':unittest.main()
