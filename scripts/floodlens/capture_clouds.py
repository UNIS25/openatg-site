"""Validated fixed-country NASA GIBS candidate; never accepts visitor coordinates."""
from pathlib import Path
from datetime import datetime,timedelta,timezone
import os,urllib.request,urllib.error,xml.etree.ElementTree as E,json,hashlib,math,numpy as np,rasterio
from rasterio.io import MemoryFile
from rasterio.transform import from_origin
from rasterio.features import geometry_mask
BASE='https://gibs.earthdata.nasa.gov';LAYER='Himawari_AHI_Band13_Clean_Infrared';NS={'w':'http://www.opengis.net/wmts/1.0','o':'http://www.opengis.net/ows/1.1'}
work=Path('artifacts/floodlens/clouds');out=Path(os.environ.get('ARK_CLOUD_OUT',str(work/'candidate')));out.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
capabilities_url=BASE+'/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml'
with urllib.request.urlopen(capabilities_url,timeout=30) as response:
 assert response.status==200
 capabilities=response.read(20000000)
(work/'capabilities.xml').write_bytes(capabilities)
root=E.fromstring(capabilities);layer=next(l for l in root.findall('.//w:Layer',NS) if l.findtext('o:Identifier',namespaces=NS)==LAYER)
dim=layer.find('w:Dimension',NS);latest=datetime.fromisoformat(dim.findtext('w:Default',namespaces=NS).replace('Z','+00:00'));now=datetime.now(timezone.utc)
assert timedelta(0)<=now-latest<timedelta(hours=3)
intervals=[]
for value in dim.findall('w:Value',NS):
 parts=value.text.split('/')
 if len(parts)==3 and parts[2]=='PT10M':intervals.append(tuple(datetime.fromisoformat(p.replace('Z','+00:00')) for p in parts[:2]))
def advertised(dt):return any(a<=dt<=b and (dt-a).total_seconds()%600==0 for a,b in intervals)
m=next(x for x in root.findall('.//w:Contents/w:TileMatrixSet',NS) if x.findtext('o:Identifier',namespaces=NS)=='2km');t=next(x for x in m.findall('w:TileMatrix',NS) if x.findtext('o:Identifier',namespaces=NS)=='5')
resolution=float(t.findtext('w:ScaleDenominator',namespaces=NS))*.00028/(2*math.pi*6378137/360);assert abs(resolution-9/512)<1e-10
assert t.findtext('w:TopLeftCorner',namespaces=NS)=='-180 90';assert t.findtext('w:TileWidth',namespaces=NS)=='512';assert t.findtext('w:MatrixWidth',namespaces=NS)=='40'
bbox=[79.2,5.5,82.5,10.3];x0=math.floor((bbox[0]-72)/resolution);x1=math.ceil((bbox[2]-72)/resolution);y0=math.floor((18-bbox[3])/resolution);y1=math.ceil((18-bbox[1])/resolution);bounds=[72+x0*resolution,18-y1*resolution,72+x1*resolution,18-y0*resolution];transform=from_origin(bounds[0],bounds[3],resolution,resolution)
shapes=[f['geometry'] for f in json.loads(Path('floodlens/data/map-overview.json').read_text())['features']];land=geometry_mask(shapes,out_shape=(y1-y0,x1-x0),transform=transform,invert=True)
frames=[];sources=[]
def capture(time):
 stamp=time.isoformat().replace('+00:00','Z');mosaic=np.zeros((4,1024,1024),dtype=np.uint8)
 for row in [8,9]:
  for col in [28,29]:
   url=f'{BASE}/wmts/epsg4326/best/{LAYER}/default/{stamp}/2km/5/{row}/{col}.png';request=urllib.request.Request(url,headers={'User-Agent':'OpenATG-Ark-reviewed-cloud-capture/1.0 (+https://openatg.com/ark/)'})
   with urllib.request.urlopen(request,timeout=30) as response:
    raw=response.read(2_000_001);assert len(raw)<=2_000_000 and response.status==200 and 'image/png' in response.headers.get('Content-Type','')
   fetched=datetime.now(timezone.utc).isoformat();name=f'{time:%Y%m%dT%H%M}-{row}-{col}.png';(work/name).write_bytes(raw)
   with MemoryFile(raw) as mem:
    with mem.open() as image:
     assert image.width==512 and image.height==512
     values=image.read()
     if image.count==1:
      palette=image.colormap(1);lut=np.zeros((256,4),dtype=np.uint8)
      for key,value in palette.items():lut[key,:len(value)]=value
      values=np.moveaxis(lut[values[0]],2,0)
     elif image.count==3:values=np.concatenate([values,np.full((1,512,512),255,dtype=np.uint8)])
     assert values.shape==(4,512,512)
   mosaic[:,(row-8)*512:(row-7)*512,(col-28)*512:(col-27)*512]=values
   sources.append({'url':url,'sha256':sha(raw),'bytes':len(raw),'retrievedAt':fetched,'captureAt':stamp,'tileRow':row,'tileCol':col})
 crop=mosaic[:,y0:y1,x0:x1];coverage=float(np.mean(crop[3][land]>0));assert coverage>.99
 samples=[]
 for name,lon,lat in [('Colombo',79.8612,6.9271),('Puttalam',79.828,8.036),('Jaffna',80.0255,9.6615),('Ratnapura',80.4037,6.6828)]:
  x=int((lon-bounds[0])/resolution);y=int((bounds[3]-lat)/resolution);samples.append({'publicTestLocation':name,'rgba':[int(v) for v in crop[:,y,x]]});assert crop[3,y,x]>0
 name=f'{time:%Y%m%dT%H%M}.png'
 with rasterio.open(out/name,'w',driver='PNG',width=crop.shape[2],height=crop.shape[1],count=4,dtype='uint8') as dest:dest.write(crop)
 raw=(out/name).read_bytes();frames.append({'captureAt':stamp,'path':'/floodlens/data/clouds/'+name,'sha256':sha(raw),'bytes':len(raw),'landPixelCoverage':coverage,'samples':samples});print('Validated',stamp,coverage,len(raw),flush=True)
errors=[]
for minutes in [0,10,20,30,40,50]:
 time=latest-timedelta(minutes=minutes)
 if not advertised(time):continue
 try:capture(time)
 except urllib.error.HTTPError as e:
  if e.code != 404:raise
  errors.append({'captureAt':time.isoformat(),'url':e.url,'status':e.code})
  print('Frame unavailable',time,e.code,flush=True)
 if len(frames)==3:break
frames.sort(key=lambda f:f['captureAt'])
assert len(frames)==3 and len({x['sha256'] for x in frames})==3
for i,frame in enumerate(frames):
 old=out/Path(frame['path']).name;name=f'frame-{i}.png';(out/name).write_bytes(old.read_bytes());old.unlink();frame['path']='/floodlens/data/clouds/'+name
manifest={'schemaVersion':2,'kind':'infrared_cloud_imagery','layer':LAYER,'provider':'JMA Himawari-9 AHI via NASA GIBS','capturedAt':frames[-1]['captureAt'],'retrievedAt':max(s['retrievedAt'] for s in sources),'nativeResolutionKm':2,'bbox':bounds,'pixelWidth':x1-x0,'pixelHeight':y1-y0,'frames':frames,'unavailableFrames':errors,'advertisedLatestAt':latest.isoformat(),'interpretation':'Infrared brightness-temperature colours. Clouds, not rain radar, floodwater, a warning or a forecast. Data are delayed; capture time is not retrieval time.','attribution':'Japan Meteorological Agency Himawari-9 imagery, provided by NASA GIBS / ESDIS. Sri Lanka crop and outline display prepared by OpenATG. No endorsement.','terms':'https://www.jma.go.jp/jma/en/copyright.html','licence':'https://creativecommons.org/licenses/by/4.0/','source':'https://nasa-gibs.github.io/gibs-api-docs/','metadata':'https://github.com/nasa-gibs/worldview/blob/main/config/default/common/config/metadata/layers/himawari/Himawari_AHI_Band13_Clean_Infrared.md','acknowledgement':"We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).",'publication':'Validated fixed-region snapshot. Scheduled checks are every 30 minutes, subject to source availability and runner delays. Capture time is unchanged by a check.'}
(out/'clouds.json').write_text(json.dumps(manifest,indent=2)+'\n');(out/'provenance.json').write_text(json.dumps({'schemaVersion':1,'capabilitiesUrl':BASE+'/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml','capabilitiesSha256':sha((work/'capabilities.xml').read_bytes()),'matrix':{'identifier':'2km','zoom':5,'tileWidth':512,'origin':[-180,90],'resolutionDegrees':resolution,'sourceMosaicBounds':[72,0,90,18]},'modifications':'Lossless mosaic and pixel-aligned fixed-country crop. No interpolation, recolouring, hazard interpretation or visitor-location query. Outline overlaid separately in the client.','sources':sources},indent=2)+'\n');print(bounds,x1-x0,y1-y0)
