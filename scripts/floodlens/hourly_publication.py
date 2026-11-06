"""Read-only proof that hourly rainfall matches retained, validated source bytes.

The JavaScript gate checks the public contract and coverage. This independent
publication check re-decodes the local source cache without any network calls.
Neither a cache hit nor publication advances the original retrieval timestamps.
"""
import json
from datetime import datetime
from pathlib import Path

import gfs_hourly as gfs


def bounded_file(path, limit):
    if path.is_symlink() or not path.is_file() or path.stat().st_size > limit:
        raise ValueError('Missing, linked or oversized hourly source cache file')
    with path.open('rb') as source:
        raw = source.read(limit + 1)
    if len(raw) > limit:
        raise ValueError('Oversized hourly source cache file')
    return raw


def validate_cached_sources(candidate, cache):
    candidate, cache = Path(candidate), Path(cache)
    data = json.loads(bounded_file(candidate / 'hourly-rain.json', 2_000_000))
    manifest = json.loads(bounded_file(candidate / 'provenance.json', 2_000_000))
    fields = {}
    for source in manifest['sources']:
        run = datetime.fromisoformat(source['runAt'].replace('Z', '+00:00'))
        step = source['step']
        if not isinstance(step, int) or isinstance(step, bool) or source['url'] != gfs.filter_url(run, step):
            raise ValueError('Unexpected hourly source identity')
        folder = cache / run.strftime('%Y%m%d%H')
        if cache.is_symlink() or folder.is_symlink():
            raise ValueError('Linked hourly source cache directory')
        raw = bounded_file(folder / f'f{step:03}.grib2', gfs.MAX_RESPONSE)
        retained = json.loads(bounded_file(folder / f'f{step:03}.source.json', 4096))
        if len(raw) != source['bytes'] or gfs.digest(raw) != source['sha256']:
            raise ValueError('Hourly source bytes/hash mismatch')
        if any(retained.get(key) != source.get(key) for key in ('url', 'bytes', 'sha256', 'retrievedAt')):
            raise ValueError('Hourly source provenance/retrieval time mismatch')
        field, messages = gfs.decode(raw, run, step)
        key = (source['runAt'], step)
        if messages != source['messages'] or key in fields:
            raise ValueError('Hourly source metadata mismatch or duplicate')
        fields[key] = field
    for frame in data['frames']:
        run, step = frame['runAt'], frame['endStep']
        current = fields.get((run, step))
        previous = fields.get((run, step - 1))
        if current and step == 1:
            previous = {'metadata': {**current['metadata'], 'endStep': 0, 'packingError': 0}, 'values': [0.0] * 198}
        if not previous or not current:
            raise ValueError('Missing hourly source interval')
        rain, quality, tolerance = gfs.precipitation(previous, current)
        if (rain, quality, tolerance) != (frame['rainMm'], frame['rainQuality'], frame['packingToleranceMm']):
            raise ValueError('Published rainfall does not match decoded source bytes')
    return True
