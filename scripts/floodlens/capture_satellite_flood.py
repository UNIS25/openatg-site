"""Fixed-country NASA GIBS snapshots. No visitor locations or hazard inference.

Run with the existing pinned publisher environment. Output remains a candidate
until reviewed and published. A failed fetch never changes the previous release.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta
from pathlib import Path
import argparse, hashlib, json, math, urllib.request, xml.etree.ElementTree as E
import numpy as np
from rasterio.io import MemoryFile

BASE = 'https://gibs.earthdata.nasa.gov'
CAP_URL = BASE + '/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml'
NS = {'w': 'http://www.opengis.net/wmts/1.0', 'o': 'http://www.opengis.net/ows/1.1'}
LAYERS = {'flood': ('VIIRS_Combined_Flood_2-Day', 'png'), 'truecolor': ('VIIRS_NOAA20_CorrectedReflectance_TrueColor', 'jpeg')}
BBOX = [79.2, 5.5, 82.5, 10.3]

def sha(raw): return hashlib.sha256(raw).hexdigest()
def fetch(url, maximum=20000000):
    request = urllib.request.Request(url, headers={'User-Agent': 'OpenATG-Ark-satellite-context/1.0 (+https://openatg.com/ark/)'})
    with urllib.request.urlopen(request, timeout=90) as response:
        raw = response.read(maximum + 1)
        if response.status != 200 or len(raw) > maximum: raise ValueError('Unexpected response')
        return raw, response.headers.get('Content-Type', ''), datetime.now(timezone.utc).isoformat()

def matrix(root, zoom='7'):
    group = next(m for m in root.findall('./w:Contents/w:TileMatrixSet', NS) if m.findtext('o:Identifier', namespaces=NS) == '250m')
    if group.findtext('o:SupportedCRS', namespaces=NS) != 'urn:ogc:def:crs:OGC:1.3:CRS84': raise ValueError('Unexpected CRS')
    t = next(t for t in group.findall('w:TileMatrix', NS) if t.findtext('o:Identifier', namespaces=NS) == zoom)
    resolution = float(t.findtext('w:ScaleDenominator', namespaces=NS)) * .00028 / (2 * math.pi * 6378137 / 360)
    if t.findtext('w:TopLeftCorner', namespaces=NS) != '-180 90' or t.findtext('w:TileWidth', namespaces=NS) != '512' or t.findtext('w:TileHeight', namespaces=NS) != '512' or abs(resolution - .00439453125) > 1e-12: raise ValueError('Unexpected tile matrix')
    return resolution

def run(out):
    raw, _, retrieved = fetch(CAP_URL)
    if b'<!DOCTYPE' in raw or b'<!ENTITY' in raw: raise ValueError('Unsafe XML')
    root = E.fromstring(raw); resolution = matrix(root); span = resolution * 512
    x0 = math.floor((BBOX[0] + 180) / resolution); x1 = math.ceil((BBOX[2] + 180) / resolution)
    y0 = math.floor((90 - BBOX[3]) / resolution); y1 = math.ceil((90 - BBOX[1]) / resolution)
    west, south, east, north = -180+x0*resolution, 90-y1*resolution, -180+x1*resolution, 90-y0*resolution
    rows = range(y0//512, (y1-1)//512+1); cols = range(x0//512, (x1-1)//512+1)
    sources=[]; products={}; files={}; now=datetime.now(timezone.utc)
    # A globally latest date need not contain Sri Lanka pixels. Compare a matched date.
    matched_date=min(l.findtext('w:Dimension/w:Default',namespaces=NS) for l in root.findall('./w:Contents/w:Layer',NS) if l.findtext('o:Identifier',namespaces=NS) in [v[0] for v in LAYERS.values()])
    for key,(identifier,extension) in LAYERS.items():
        layer=next(l for l in root.findall('./w:Contents/w:Layer',NS) if l.findtext('o:Identifier',namespaces=NS)==identifier)
        if layer.findtext('w:TileMatrixSetLink/w:TileMatrixSet',namespaces=NS)!='250m': raise ValueError('Unexpected layer matrix')
        dimension=layer.find('w:Dimension',NS); date=matched_date
        day=datetime.strptime(date,'%Y-%m-%d').replace(tzinfo=timezone.utc)
        if not timedelta(0)<=now-day<=timedelta(hours=72): raise ValueError('Advertised imagery is stale or future')
        if not any(len(parts:=v.text.split('/'))==3 and parts[2]=='P1D' and parts[0]<=date<=parts[1] for v in dimension.findall('w:Value',NS)): raise ValueError('Date not advertised')
        expected=f'{BASE}/wmts/epsg4326/best/{identifier}/default/{{Time}}/{{TileMatrixSet}}/{{TileMatrix}}/{{TileRow}}/{{TileCol}}.{extension}'
        if not any(r.get('template')==expected for r in layer.findall('w:ResourceURL',NS)): raise ValueError('Unexpected template')
        mosaic=np.zeros((4,len(rows)*512,len(cols)*512),dtype=np.uint8)
        def tile(pair):
            row,col=pair;url=expected.format(Time=date,TileMatrixSet='250m',TileMatrix='7',TileRow=row,TileCol=col)
            content,mime,fetched=fetch(url,3000000)
            if ('image/png' if extension=='png' else 'image/jpeg') not in mime: raise ValueError('Unexpected image type')
            with MemoryFile(content) as mem:
                with mem.open() as image:
                    if image.width!=512 or image.height!=512: raise ValueError('Unexpected tile size')
                    values=image.read()
                    if image.count==1:
                        lut=np.zeros((256,4),dtype=np.uint8)
                        for k,v in image.colormap(1).items(): lut[k,:len(v)]=v
                        values=np.moveaxis(lut[values[0]],2,0)
                    elif image.count==3: values=np.concatenate([values,np.full((1,512,512),255,dtype=np.uint8)])
                    if values.shape!=(4,512,512): raise ValueError('Unexpected channels')
            return row,col,values,{'url':url,'sha256':sha(content),'bytes':len(content),'retrievedAt':fetched,'date':date}
        with ThreadPoolExecutor(max_workers=3) as pool:
            for row,col,values,source in pool.map(tile,[(r,c) for r in rows for c in cols]):
                mosaic[:,(row-rows.start)*512:(row-rows.start+1)*512,(col-cols.start)*512:(col-cols.start+1)*512]=values;sources.append(source)
        crop=mosaic[:,y0-rows.start*512:y1-rows.start*512,x0-cols.start*512:x1-cols.start*512]
        if key=='truecolor' and np.mean(np.any(crop[:3]>0,axis=0))<.98: raise ValueError('True-colour region contains missing black imagery')
        with MemoryFile() as mem:
            with mem.open(driver='PNG',width=crop.shape[2],height=crop.shape[1],count=4,dtype='uint8') as image: image.write(crop)
            content=mem.read()
        if not 24<len(content)<3000000: raise ValueError('Unbounded crop')
        filename=f'{key}.png';files[filename]=content
        products[key]={'layer':identifier,'date':date,'path':'/floodlens/data/satellite/'+filename,'sha256':sha(content),'bytes':len(content),'compositeDays':2 if key=='flood' else 1}
        print(key,date,crop.shape,len(content),flush=True)
    manifest={'schemaVersion':1,'kind':'dated_satellite_context','bbox':[west,south,east,north],'crs':'OGC:CRS84','pixelWidth':x1-x0,'pixelHeight':y1-y0,'displayResolutionDegrees':resolution,'nominalProductResolutionMeters':250,'retrievedAt':max(s['retrievedAt'] for s in sources),'products':products,'source':'https://lance.modaps.eosdis.nasa.gov/flood/','attribution':'NASA GIBS / ESDIS; NASA LANCE VIIRS NOAA-20 + NOAA-21 flood product; NOAA-20 true-colour imagery. OpenATG fixed-country crop. No endorsement.','publication':'Dated reviewed snapshot, not a live feed. Imagery is hidden once its date is over 72 hours old. Retrieval time is not acquisition time.','limitations':'Clouds, shadows and coarse pixels can conceal or misclassify flooding. Gray is insufficient data. Transparent pixels can mean no water OR no data and never prove safety. Not for route safety or rescue dispatch.'}
    provenance={'capabilitiesUrl':CAP_URL,'capabilitiesSha256':sha(raw),'capabilitiesRetrievedAt':retrieved,'matrix':{'identifier':'250m','zoom':7,'resolutionDegrees':resolution,'origin':[-180,90]},'modifications':'NASA approximately 500 m overview tiles mosaicked and cropped without additional interpolation or recolouring. Source product nominal resolution is 250 m. No flood or person/road inference.','sources':sources}
    # Write only after every tile of both products has passed validation.
    out.mkdir(parents=True,exist_ok=True)
    for name,content in files.items(): (out/name).write_bytes(content)
    (out/'satellite.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (out/'provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--out',type=Path,default=Path('artifacts/floodlens/satellite/candidate'));run(p.parse_args().out)
