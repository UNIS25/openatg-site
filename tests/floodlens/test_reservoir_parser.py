import importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('reservoir_catalog',ROOT/'scripts/floodlens/reservoir_catalog.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class ReservoirParser(unittest.TestCase):
 def test_missing_is_not_zero(self):
  for s in ['','-','#REF!','#N/A']:self.assertIsNone(module.number(s))
  self.assertEqual(module.number('2,200'),2200);self.assertEqual(module.number('0.0'),0)
 def test_invalid_value_rejected(self):
  for s in ['nan','Infinity','1000 cusecs','__import__(x)']:self.assertRaises(ValueError,module.number,s)
 def test_bad_source_dates_remain_unknown(self):
  self.assertIsNone(module.date('#REF!'));self.assertEqual(module.date('10/26/2026'),'2026-10-26');self.assertRaises(ValueError,module.date,'31/99/2026')
 def test_complete_directory_preserves_age_and_unknowns(self):
  d=json.loads((ROOT/'floodlens/data/reservoirs.json').read_text());self.assertEqual(len(d['records']),74);self.assertEqual(sum(r['observedDate'] is None for r in d['records']),5);self.assertEqual(sum(r['observedDate']=='2026-10-26' for r in d['records']),55);self.assertTrue(all(r['observedAt'] is None for r in d['records']));self.assertEqual(next(r for r in d['records'] if r['name']=='Tabbowa')['spillCusecs'],2200)
if __name__=='__main__':unittest.main()
