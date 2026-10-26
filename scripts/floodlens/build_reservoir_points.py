"""Build-time exact-name join only. Review new aliases and IDs before adding them."""
from pathlib import Path
import json,urllib.request,urllib.parse,hashlib,datetime,collections
root=Path(__file__).resolve().parents[2]
names=[r['name'] for r in json.loads((root/'floodlens/data/reservoirs.json').read_text())['records']]
query={'where':'Res_Name IN ('+','.join("'"+n.replace("'","''")+"'" for n in names)+')','outFields':'Res_Name,Res_Type,Tank_Code,Latitude,Longitude','outSR':'4326','f':'geojson','resultRecordCount':'100'}
base='https://services3.arcgis.com/J7ZFXmR8rSmQ3FGf/ArcGIS/rest/services/Scheme_Data_2/FeatureServer/3/query'
with urllib.request.urlopen(base+'?'+urllib.parse.urlencode(query),timeout=30) as response:raw=response.read(2*1024*1024)
d=json.loads(raw)
if 'error' in d or d.get('exceededTransferLimit'):raise ValueError(d)
features=[]
for f in d['features']:
 p=f['properties'];g=f['geometry'];name=p['Res_Name']
 if name not in names or g['type']!='Point' or not p['Tank_Code']:raise ValueError('Unverified identity')
 x,y=g['coordinates'][:2]
 if not(79.3<x<82.1 and 5.7<y<10.1):raise ValueError('Point outside coverage')
 features.append({'type':'Feature','properties':{'name':name,'tankCode':p['Tank_Code']},'geometry':g})
counts=collections.Counter(f['properties']['name'] for f in features)
ambiguous=[n for n,c in counts.items() if c>1]
features=[f for f in features if counts[f['properties']['name']]==1]
out={'excludedAmbiguousNames':ambiguous,'coverage':str(len(features))+' unique exact-name points; unmatched or ambiguous directory entries are not mapped','type':'FeatureCollection','source':'Sri Lanka Irrigation Department ICT/GIS Scheme_Data_2 layer 3','sourceUrl':base,'sourceSha256':hashlib.sha256(raw).hexdigest(),'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Exact-name matches to the dated reservoir directory; point locations only, not upstream connectivity or current releases','features':features}
(root/'floodlens/data/reservoir-locations.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print({'matched':len(features),'directory':len(names),'names':[f['properties']['name'] for f in features]})
