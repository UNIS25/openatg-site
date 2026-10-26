"""Convert the fixed-country derived OSM database to small static public cells."""
import json,math,hashlib
from pathlib import Path
source=Path('artifacts/floodlens/roads/district-shards');out=Path('floodlens/data/roads');out.mkdir(exist_ok=True)
manifest=json.loads((source/'manifest.json').read_text());roads={};places={}
for row in manifest['districts']:
 if row['code']=='overview':continue
 d=json.loads((source/(row['code']+'.json')).read_text())
 for r in d['roads']:roads[r[0]]=r
 for p in d['places']:places[p[0]]=p
cells={}
def cell(x,y):return cells.setdefault((x,y),{'schemaVersion':1,'kind':'osm_basemap','roads':[],'places':[]})
for road in roads.values():
 b=road[7]
 for x in range(math.floor(b[0]*10),math.floor(b[2]*10)+1):
  for y in range(math.floor(b[1]*10),math.floor(b[3]*10)+1):cell(x,y)['roads'].append(road)
for p in places.values():cell(math.floor(p[2]*10),math.floor(p[3]*10))['places'].append(p)
manifest.pop('districts');manifest['regions']=[];manifest['modifications']=manifest['modifications'].replace('District bounding-box shards, not warning geography.','Fixed 0.1-degree display cells, not warning geography.');manifest['roadFields']=['osmId','roadClass','name','nameEn','nameSi','nameTa','ref','bbox','deltaCoordinates'];manifest['placeFields']=['osmId','placeClass','lon','lat','name','nameEn','nameSi','nameTa']
for i,((x,y),data) in enumerate(sorted(cells.items())):
 code=f'r{i:04d}';raw=json.dumps(data,separators=(',',':'),ensure_ascii=False).encode();(out/(code+'.json')).write_bytes(raw);manifest['regions'].append({'code':code,'bbox':[x/10,y/10,(x+1)/10,(y+1)/10],'bytes':len(raw),'roads':len(data['roads']),'places':len(data['places']),'sha256':hashlib.sha256(raw).hexdigest()})
raw=(source/'overview.json').read_bytes();(out/'overview.json').write_bytes(raw);manifest['overview']={'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()};(out/'manifest.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n');print('Regions',len(cells),'Total',sum(r['bytes'] for r in manifest['regions']),'Maximum',max(r['bytes'] for r in manifest['regions']));print('Colombo',[r for r in manifest['regions'] if r['bbox'][0]<=79.8612<r['bbox'][2] and r['bbox'][1]<=6.9271<r['bbox'][3]])
