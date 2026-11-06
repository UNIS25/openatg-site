import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/floodlens'))
from check_sources import allowed,parse_cap_xml
class CAPSources(unittest.TestCase):
 def test_exact_public_source_allowlist(self):
  self.assertTrue(allowed('https://was.meteo.gov.lk/cap/en/rss.xml'))
  for u in ['https://was.meteo.gov.lk/api/warnings','http://was.meteo.gov.lk/cap/en/rss.xml','https://was.meteo.gov.lk/cap/en/rss.xml?x=1']:self.assertFalse(allowed(u))
 def test_both_actual_namespaces_and_public_actual_only(self):
  for version in ['1.1','1.2']:
   raw=f'<alert xmlns="urn:oasis:names:tc:emergency:cap:{version}"><status>Actual</status><scope>Public</scope><identifier>x</identifier></alert>'.encode()
   self.assertEqual(parse_cap_xml(raw,'cap')['identifier'],'x')
   with self.assertRaises(ValueError):parse_cap_xml(raw.replace(b'Actual',b'Test'),'cap')
 def test_feed_is_read_only_and_external_links_or_entities_reject(self):
  raw=b'<rss><channel><item><link>https://was.meteo.gov.lk/cap/en/17f6e64ddc334403a2ababe2145ee3f2.xml</link></item></channel></rss>'
  self.assertTrue(parse_cap_xml(raw,'cap_feed')['reviewRequired'])
  with self.assertRaises(ValueError):parse_cap_xml(raw.replace(b'was.meteo.gov.lk',b'evil.example'),'cap_feed')
  with self.assertRaises(ValueError):parse_cap_xml(b'<!DOCTYPE a>'+raw,'cap_feed')
if __name__=='__main__':unittest.main()
