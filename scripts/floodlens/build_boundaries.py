#!/usr/bin/env python3
"""Make exact-geometry district shards from OCHA COD-AB v03 (CC BY 3.0 IGO).
Usage: python3 scripts/floodlens/build_boundaries.py /path/to/lka_admin3.geojson
No simplification, nearest-area substitution or coordinate rounding.
"""
import hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'floodlens/data'
ALIASES={('Kandy','Udadumbara'):'LK2118',('Kandy','Pasbage Korale'):'LK2157',('Kegalle','Yatiyanthota'):'LK9227',('Ratnapura','Kuruwita'):'LK9106',('Ratnapura','Openayake'):'LK9121',('Ratnapura','Kahawaththa'):'LK9139',('Nuwara Eliya','Kotmale East'):'LK2303'}
def clean(s):return (s or '').replace('\\u200d','\u200d')
def names(p,level):return dict(en=clean(p[f'adm{level}_name']),si=clean(p[f'adm{level}_name1']),ta=clean(p[f'adm{level}_name2']))
def points(coords):
    if isinstance(coords[0],(int,float)):yield coords
    else:
        for c in coords:yield from points(c)
def main():
    raw=Path(sys.argv[1]).read_bytes();geo=json.loads(raw);assert len(geo['features'])==339
    districts={};divisions=[];shards={};(DATA/'boundaries').mkdir(exist_ok=True)
    for f in geo['features']:
        p=f['properties'];g=f['geometry'];assert g['type'] in ('Polygon','MultiPolygon')
        pts=list(points(g['coordinates']));bbox=[min(x[0] for x in pts),min(x[1] for x in pts),max(x[0] for x in pts),max(x[1] for x in pts)]
        code=p['adm3_pcode'];parent=p['adm2_pcode']
        aliases=[n for (d,n),c in ALIASES.items() if c==code]
        divisions.append(dict(type='division',code=code,districtCode=parent,names=names(p,3),bbox=bbox,aliases=aliases))
        if parent not in districts:districts[parent]=dict(type='district',code=parent,names=names(p,2),bbox=bbox.copy())
        else:
            b=districts[parent]['bbox'];b[:]=[min(b[0],bbox[0]),min(b[1],bbox[1]),max(b[2],bbox[2]),max(b[3],bbox[3])]
        shards.setdefault(parent,[]).append(dict(type='Feature',properties={'code':code},geometry=g))
    assert len(districts)==25 and len({d['code'] for d in divisions})==339
    districts['LK91']['displayNames']={'ta':'இரத்தினபுரி மாவட்டம்'}
    districts['LK91']['displayCorrection']='Tamil district display spelling curated; original source names retained in names.'
    shard_meta=[]
    for code,features in shards.items():
        payload=json.dumps(dict(type='FeatureCollection',features=features),ensure_ascii=False,separators=(',',':')).encode()
        (DATA/f'boundaries/{code}.json').write_bytes(payload)
        shard_meta.append(dict(code=code,bytes=len(payload),sha256=hashlib.sha256(payload).hexdigest(),features=len(features)))
    catalog=dict(schemaVersion=1,source='Survey Department of Sri Lanka; published by OCHA / HDX',sourceUrl='https://data.humdata.org/dataset/cod-ab-lka',license='CC BY 3.0 IGO',licenseUrl='https://creativecommons.org/licenses/by/3.0/igo/',validOn='2022-08-16',boundaryDate='2022-08-02',coverageNote='339 DS divisions in COD-AB v03; later administrative changes may not be represented. Not parcel-level hazard boundaries.',sourceSha256=hashlib.sha256(raw).hexdigest(),districts=sorted(districts.values(),key=lambda d:d['names']['en']),divisions=sorted(divisions,key=lambda d:d['names']['en']),shards=shard_meta)
    (DATA/'areas.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n')
    snapshot=json.loads((DATA/'reviewed.json').read_text())
    dm={d['names']['en']:d['code'] for d in districts.values()}
    exact={(d['districtCode'],d['names']['en']):d['code'] for d in divisions}
    for warning in snapshot['bulletins']:
        for a in warning['areas']:
            a['districtCode']=dm[a['district']]
            a['divisionCode']=ALIASES.get((a['district'],a['division'])) or exact[(a['districtCode'],a['division'])]
        warning['districtCodes']=[dm[d] for d in warning.get('districts',[])]
    (DATA/'reviewed.json').write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'districts':len(districts),'divisions':len(divisions),'geometryBytes':sum(s['bytes'] for s in shard_meta),'catalogBytes':(DATA/'areas.json').stat().st_size,'allWarningAreasMapped':True}))
if __name__=='__main__':main()
