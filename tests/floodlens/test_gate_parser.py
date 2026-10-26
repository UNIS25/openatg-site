import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/floodlens'))
from reservoir_catalog import gate_configuration

class GateParser(unittest.TestCase):
 def test_tabbowa_separates_irrigation_outlets(self):
  r=gate_configuration('GO=2200(24"@4,12"@2) SD,LB=0", RB=3"',2200)
  self.assertEqual(r['gateCount'],6);self.assertEqual([(g['count'],g['openingFeet']) for g in r['groups']],[(4,2),(2,1)]);self.assertIsNone(r['operationTime'])
 def test_inginimitiya_does_not_count_sd_outlets(self):
  r=gate_configuration('GO=1000(12"@2) SD=LB=8" RB=02" center=3"',1000)
  self.assertEqual(r['gateCount'],2);self.assertEqual(r['groups'][0]['openingFeet'],1)
 def test_explicit_feet_and_inches(self):
  self.assertEqual(gate_configuration("GO=1000(1'@2)",1000)['groups'],gate_configuration('GO=1000(12"@2)',1000)['groups'])
 def test_unknown_malformed_or_ambiguous_not_guessed(self):
  for raw in ['GO=2200','GO=2200(24@4)','GO=2200(24"@4,garbage)','GO=2200(24"@0)','GO=2200(900"@2)','GO=2200(24"@4) more openings','SD=LB=8" RB=2"','GO=2200(24"@4) GO=500(12"@2)']:
   self.assertNotEqual(gate_configuration(raw,2200)['status'],'reported_configuration')
 def test_discharge_mismatch_and_missing(self):
  for value in [None,2640]:self.assertEqual(gate_configuration('GO=2200(24"@4)',value)['status'],'unparsed')
 def test_empty_and_operation_time(self):
  self.assertEqual(gate_configuration('',0)['status'],'not_reported');self.assertIsNone(gate_configuration('GO=2200(24"@4)',2200)['operationTime'])
if __name__=='__main__':unittest.main()
