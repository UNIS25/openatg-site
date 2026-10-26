"""Manual ODbL road-basemap build; never accepts visitor coordinates."""
import hashlib,json,math,osmium
from pathlib import Path
from datetime import datetime,timezone
source=Path('artifacts/floodlens/roads/sri-lanka-261025.osm.pbf');out=Path('artifacts/floodlens/roads/district-shards');out.mkdir(exist_ok=True)
expected=Path('artifacts/floodlens/roads/source.md5').read_text().split()[0]
assert hashlib.md5(source.read_bytes()).hexdigest()==expected
catalog=json.loads(Path('floodlens/data/areas.json').read_text());districts=catalog['districts']
buckets={d['code']:{'schemaVersion':1,'kind':'osm_basemap','roads':[],'places':[]} for d in districts};overview={'schemaVersion':1,'kind':'osm_basemap','roads':[],'places':[]}
kinds={k:i for i,group in enumerate([['motorway','motorway_link','trunk','trunk_link'],['primary','primary_link'],['secondary','secondary_link'],['tertiary','tertiary_link'],['residential','living_street','unclassified'],['service','track','pedestrian','footway','path','cycleway','steps']]) for k in group}
placekinds={'city':0,'town':1,'suburb':2,'village':3,'hamlet':4}
def overlaps(a,b):return a[0]<=b[2] and a[2]>=b[0] and a[1]<=b[3] and a[3]>=b[1]
def labels(tags):return [(tags.get(k,'') or '')[:100] for k in ['name','name:en','name:si','name:ta']]
def simplify(p,tolerance):
 if len(p)<3:return p
 keep={0,len(p)-1};stack=[(0,len(p)-1)];tol=tolerance*tolerance
 while stack:
  a,b=stack.pop();x,y=p[a];dx=p[b][0]-x;dy=p[b][1]-y;length=dx*dx+dy*dy;maximum=tol;index=None
  for i in range(a+1,b):
   px,py=p[i];u=max(0,min(1,((px-x)*dx+(py-y)*dy)/length)) if length else 0
   distance=(px-x-u*dx)**2+(py-y-u*dy)**2
   if distance>maximum:maximum=distance;index=i
  if index is not None:keep.add(index);stack.extend([(a,index),(index,b)])
 return [p[i] for i in sorted(keep)]
def encoded(points):
 flat=[];previous=(0,0)
 for x,y in points:flat.extend([x-previous[0],y-previous[1]]);previous=(x,y)
 return flat
class Handler(osmium.SimpleHandler):
 def __init__(self):super().__init__();self.roads=0;self.places=0;self.missing=0
 def node(self,n):
  kind=placekinds.get(n.tags.get('place',''))
  if kind is None or not n.location.valid():return
  names=labels(n.tags)
  if not any(names):return
  lon,lat=round(n.location.lon,5),round(n.location.lat,5)
  if not(79.3<=lon<=82.2 and 5.7<=lat<=10.1):return
  row=[n.id,kind,lon,lat,*names];self.places+=1
  for d in districts:
   if overlaps(d['bbox'],[lon,lat,lon,lat]):buckets[d['code']]['places'].append(row)
  if kind<=1:overview['places'].append(row)
 def way(self,w):
  kind=kinds.get(w.tags.get('highway',''))
  if kind is None or w.tags.get('area')=='yes':return
  try:points=[(round(n.lon*1e5),round(n.lat*1e5)) for n in w.nodes]
  except osmium.InvalidLocationError:self.missing+=1;return
  if len(points)<2:return
  xs,ys=zip(*points);bbox=[min(xs)/1e5,min(ys)/1e5,max(xs)/1e5,max(ys)/1e5]
  if not overlaps(bbox,[79.3,5.7,82.2,10.1]):return
  names=labels(w.tags);ref=(w.tags.get('ref','') or '')[:40]
  row=[w.id,kind,*names,ref,bbox,encoded(simplify(points,3))];self.roads+=1
  for d in districts:
   if overlaps(bbox,d['bbox']):buckets[d['code']]['roads'].append(row)
  if kind<=2:overview['roads'].append([*row[:-1],encoded(simplify(points,50))])
h=Handler();h.apply_file(str(source),locations=True,idx='flex_mem')
manifest={'schemaVersion':1,'kind':'osm_basemap_manifest','source':'https://download.geofabrik.de/asia/sri-lanka-261025.osm.pbf','sourceDataThrough':'2026-10-25T21:21:21Z','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'builtAt':datetime.now(timezone.utc).isoformat(),'licence':'https://opendatacommons.org/licenses/odbl/1-0/','attribution':'© OpenStreetMap contributors','modifications':'Selected road and place features; roads simplified to approximately 3 m, overview 50 m; coordinates rounded to 1e-5 degrees and delta encoded. District bounding-box shards, not warning geography. No routing, closures or passability assessment.','coordinateScale':100000,'roads':h.roads,'places':h.places,'missingGeometry':h.missing,'districts':[]}
for d in [*districts,{'code':'overview','bbox':[79.3,5.7,82.2,10.1]}]:
 data=overview if d['code']=='overview' else buckets[d['code']];raw=json.dumps(data,separators=(',',':'),ensure_ascii=False).encode();(out/(d['code']+'.json')).write_bytes(raw);manifest['districts'].append({'code':d['code'],'bbox':d['bbox'],'bytes':len(raw),'roads':len(data['roads']),'places':len(data['places']),'sha256':hashlib.sha256(raw).hexdigest()})
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({k:manifest[k] for k in ['roads','places','missingGeometry']},indent=2));print('Total bytes',sum(d['bytes'] for d in manifest['districts']));print('Largest',max(manifest['districts'],key=lambda x:x['bytes']))
