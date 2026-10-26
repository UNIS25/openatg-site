"""Display-only national outline from the existing licensed exact boundaries."""
from pathlib import Path
import json, hashlib
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

sources = sorted(Path('floodlens/data/boundaries').glob('LK*.json'))
geometries, provenance = [], []
for source in sources:
    raw = source.read_bytes()
    provenance.append({'path': str(source), 'sha256': hashlib.sha256(raw).hexdigest()})
    for feature in json.loads(raw)['features']:
        geometry = shape(feature['geometry'])
        if not geometry.is_valid:
            raise ValueError('Invalid source geometry: ' + str(source))
        geometries.append(geometry)
assert len(geometries) == 339
coast = unary_union(geometries).simplify(.003, preserve_topology=True)
assert coast.is_valid
output = {'type': 'FeatureCollection', 'purpose': 'Display outline only; never hazard extent or location matching',
          'source': 'Survey Department Sri Lanka / OCHA HDX COD-AB v03, 2022 boundaries',
          'licence': 'https://creativecommons.org/licenses/by/3.0/igo/',
          'modifications': 'Union of exact administrative geometries, display simplification 0.003 degrees.',
          'features': [{'type': 'Feature', 'properties': {}, 'geometry': mapping(coast)}]}
Path('floodlens/data/clouds/outline.json').write_text(json.dumps(output, separators=(',', ':')) + '\n')
Path('artifacts/floodlens/clouds/outline-sources.json').write_text(json.dumps(provenance, indent=2)+'\n')
print('Validated', len(geometries), 'source divisions; display-only outline bytes', Path('floodlens/data/clouds/outline.json').stat().st_size)
