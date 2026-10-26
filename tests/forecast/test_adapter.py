import unittest, json, copy, math, importlib.util
from pathlib import Path
from datetime import timedelta
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('forecast_build',Path(__file__).parents[2]/'scripts/floodlens/ecmwf_forecast.py');b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
DATA=Path(__file__).parents[2]/'floodlens/data/forecast'
manifest=json.loads((DATA/'provenance.json').read_text());run=b.run_time('2026102606')
meta=next(s['metadata'] for s in manifest['sources'] if s.get('parameter')=='tp' and s['step']==12)

def field(step,values):
 m=copy.deepcopy(meta);m['endStep']=step;return {'metadata':m,'values':values}
class Forecast(unittest.TestCase):
 def test_actual_grib_metadata_all_54_fields(self):
  sources=[s for s in manifest['sources'] if s['kind']=='grib'];self.assertEqual(len(sources),54)
  for s in sources:b.validate_meta(s['metadata'],s['parameter'],run,s['step'])
 def test_future_run_rejected_but_future_valid_forecast_allowed(self):
  with self.assertRaises(ValueError):b.validate_run(run,run-timedelta(seconds=1))
  b.validate_run(run,run+timedelta(hours=1));b.validate_meta(meta,'tp',run,12)
 def test_validity_mismatch_rejected(self):
  m={**meta,'validityTime':1900}
  with self.assertRaises(ValueError):b.validate_meta(m,'tp',run,12)
 def test_units_scan_height_or_earth_reference_changes_rejected(self):
  for key,value in [('units','mm'),('level',10),('uvRelativeToGrid',1),('jScansPositively',1),('longitudeOfFirstGridPointInDegrees',0)]:
   with self.subTest(key=key),self.assertRaises(ValueError):b.validate_meta({**meta,key:value},'tp',run,12)
 def test_tp_is_difference_mm_not_total_or_rate(self):
  values,q,t=b.precipitation(field(9,[.025,0,None]),field(12,[.030,0,.1]));self.assertEqual(values,[5,0,None]);self.assertEqual(q,['valid','valid','missing']);self.assertGreater(t,0)
 def test_gaps_runs_resets_units_do_not_generate_accumulations(self):
  for key,value in [('endStep',15),('dataTime',0),('startStep',3),('units','kg m**-2'),('Ni',1)]:
   a=field(9,[.02]);c=field(12,[.04]);c['metadata'][key]=value
   with self.subTest(key=key),self.assertRaises(ValueError):b.precipitation(a,c)
 def test_negative_difference_beyond_precision_unavailable(self):
  values,q,t=b.precipitation(field(9,[.1]),field(12,[.01]));self.assertEqual(values,[None]);self.assertEqual(q,['accumulation_decreased'])
 def test_small_packing_difference_flagged_not_silently_abs(self):
  values,q,t=b.precipitation(field(9,[.1]),field(12,[.1-meta['packingError']]));self.assertEqual(values,[0]);self.assertEqual(q,['within_packing_tolerance'])
 def test_missing_invalid_accumulation_not_zero(self):
  values,q,_=b.precipitation(field(9,[-1,math.nan,None]),field(12,[1,1,1]));self.assertEqual(values,[None,None,None])
 def test_complete_total_requires_all_intervals(self):
  a=[{'startStep':9,'endStep':12,'rainMm':0},{'startStep':12,'endStep':15,'rainMm':3}];self.assertEqual(b.complete_total(a),3)
  self.assertIsNone(b.complete_total([a[0],{'startStep':15,'endStep':18,'rainMm':1}]))
  self.assertIsNone(b.complete_total([a[0],{**a[1],'rainMm':None}]))
 def test_wind_from_convention_cardinals_and_calm(self):
  for u,v,expected in [(0,-1,0),(-1,0,90),(0,1,180),(1,0,270)]:self.assertEqual(b.wind(u,v)['fromDegrees'],expected)
  self.assertIsNone(b.wind(0,0)['fromDegrees']);self.assertIsNone(b.wind(None,1));self.assertAlmostEqual(b.wind(3,4)['speedKmh'],18)
 def test_duplicate_missing_or_oversized_index_fails(self):
  rows=[s['indexRow'] for s in manifest['sources'] if s['kind']=='grib' and s['step']==12]
  b.validate_index(rows,run,12)
  for bad in [rows[:2],rows+[rows[0]],[{**rows[0],'_length':b.MAX_MESSAGE+1}]+rows[1:]]:
   with self.assertRaises(ValueError):b.validate_index(bad,run,12)
 def test_http_server_must_honor_range_before_reading(self):
  class Response:
   status=200;headers={}
   def __enter__(self):return self
   def __exit__(self,*a):pass
   def read(self,*a):raise AssertionError('Full file must not be read')
  with patch.object(b.urllib.request,'urlopen',return_value=Response()),self.assertRaises(ValueError):b.read_bounded('https://example.test',100,0,100)
 def test_actual_dataset_hash_complete_and_small(self):
  raw=(DATA/'forecast.json').read_bytes();d=json.loads(raw);self.assertEqual(b.digest(raw),manifest['forecastSha256']);self.assertLess(len(raw),200000);self.assertFalse(d['captureErrors']);self.assertEqual(len(d['grid']['points']),198)
  for f in d['frames']:self.assertEqual(len(f['rainMm']),198);self.assertTrue(all(x is not None for x in f['rainMm']));self.assertEqual(f['endStep']-f['startStep'],3)
if __name__=='__main__':unittest.main()
