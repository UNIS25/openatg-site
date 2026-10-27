"""Independent numerical comparison, not validation against observed sea levels."""
import json,sys,subprocess
from pathlib import Path
from datetime import datetime,timedelta
import numpy as np
import uptide
out=Path(sys.argv[1]);source=json.loads(Path('floodlens/data/tides/colombo-source.json').read_text());snapshot=json.loads((out/'colombo.json').read_text())
cs=[c for c in source['harmonic_constituents'] if c['name'] in uptide.tidal.omega]
assert len(cs)==36
start=datetime.fromisoformat(snapshot['validFrom'].replace('Z','+00:00'));t=uptide.Tides([c['name'] for c in cs]);t.set_initial_time(start.replace(tzinfo=None))
seconds=np.arange(0,48*3600+1,60)
y=t.from_amplitude_phase(np.array([c['amplitude'] for c in cs]),np.deg2rad([c['phase'] for c in cs]),seconds)+source['datums']['MSL']-source['datums']['LAT']
comparison={'constituents':[c['name'] for c in cs],'values':[{'time':(start+timedelta(seconds=int(s))).isoformat(),'level':float(v)} for s,v in zip(seconds,y)]}
(out/'independent-input.json').write_text(json.dumps(comparison,allow_nan=False))
subprocess.run(['node','scripts/floodlens/check_tides.mjs',str(out)],check=True)
