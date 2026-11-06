import json, sys, unittest, xml.etree.ElementTree as E
from pathlib import Path
import numpy as np
import rasterio
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'scripts/floodlens'))
from capture_satellite_flood import matrix
class SatelliteCapture(unittest.TestCase):
 def test_pixels_preserve_official_colours_and_transparency(self):
  with rasterio.open(ROOT/'floodlens/data/satellite/flood.png') as r:
   self.assertEqual((r.count,r.width,r.height),(4,752,1093));a=r.read()
  actual=set(tuple(x) for x in np.unique(a.reshape(4,-1).T,axis=0).tolist())
  self.assertEqual(actual,{(0,0,1,0),(50,210,245,255),(175,175,175,255),(250,30,36,255),(255,255,0,255)})
  self.assertGreater(np.sum(a[3]==0),0)
 def test_truecolour_has_real_region_pixels_not_global_date_black_tile(self):
  with rasterio.open(ROOT/'floodlens/data/satellite/truecolor.png') as r:a=r.read()
  self.assertGreater(np.mean(np.any(a[:3]>0,axis=0)),.98)
 def test_source_dates_projection_and_no_visitor_query(self):
  p=json.loads((ROOT/'floodlens/data/satellite/provenance.json').read_text());self.assertEqual(p['matrix']['identifier'],'250m');self.assertEqual(p['matrix']['zoom'],7)
  self.assertEqual(len(p['sources']),12)
  for s in p['sources']:
   self.assertIn('/wmts/epsg4326/best/',s['url']);self.assertIn('/2026-11-05/250m/7/',s['url']);self.assertNotIn('?',s['url']);self.assertEqual(len(s['sha256']),64)
if __name__=='__main__':unittest.main()
