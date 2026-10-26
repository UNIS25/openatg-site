"""Small display-only administrative basemap. Matching always uses exact shards."""
import json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def simplify(points,tolerance=.004):
    # Iterative Douglas-Peucker; this geometry must never be used for matching.
    keep={0,len(points)-1};stack=[(0,len(points)-1)]
    while stack:
        a,b=stack.pop();ax,ay=points[a];bx,by=points[b];dx,dy=bx-ax,by-ay;den=dx*dx+dy*dy;best=tolerance*tolerance;index=None
        for i in range(a+1,b):
            x,y=points[i];t=max(0,min(1,((x-ax)*dx+(y-ay)*dy)/den)) if den else 0
            distance=(x-ax-t*dx)**2+(y-ay-t*dy)**2
            if distance>best:best=distance;index=i
        if index is not None:keep.add(index);stack.extend([(a,index),(index,b)])
    return [[round(v,5) for v in points[i]] for i in sorted(keep)]
features=[]
for path in sorted((ROOT/'floodlens/data/boundaries').glob('*.json')):
    for feature in json.loads(path.read_text())['features']:
        g=feature['geometry'];polygons=[g['coordinates']] if g['type']=='Polygon' else g['coordinates'];out=[]
        for polygon in polygons:
            rings=[s for ring in polygon if len(s:=simplify(ring))>=4]
            if rings:out.append(rings)
        if out:features.append(dict(type='Feature',properties=feature['properties'],geometry=dict(type='MultiPolygon',coordinates=out)))
output=dict(type='FeatureCollection',purpose='Display only; never warning matching',source='Survey Department Sri Lanka / OCHA HDX COD-AB v03, 2022 boundaries',license='CC BY 3.0 IGO',features=features)
target=ROOT/'floodlens/data/map-overview.json';target.write_text(json.dumps(output,separators=(',',':'))+'\n');print({'features':len(features),'bytes':target.stat().st_size})
