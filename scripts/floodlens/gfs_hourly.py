#!/usr/bin/env python3
"""Bounded NOAA native-hourly APCP adapter; fixed Sri Lanka crop, no visitor data.

Past hours are archived forecasts/model estimates, NEVER gauges or reanalysis.
Both reset-bucket and run-cumulative APCP messages are decoded and validated.
Only adjacent run-cumulative fields from the SAME run produce an hourly amount.
Use explicit runs for a reviewed capture, or --auto for bounded release-lag fallback.
This writes candidates locally; it does not publish, commit, or deploy them.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import time
import urllib.parse
import urllib.request
from urllib.error import HTTPError
from datetime import datetime, timedelta, timezone
from pathlib import Path
import eccodes as ec
import numpy as np

UTC = timezone.utc
HOUR = timedelta(hours=1)
SOURCE = 'https://www.nco.ncep.noaa.gov/pmb/products/gfs/nomads/'
TERMS = 'https://www.weather.gov/disclaimer'
ENDPOINT = 'https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl'
BBOX = [79.5, 5.75, 82.0, 10.0]
POINTS = [[79.5 + x * .25, 5.75 + y * .25] for y in range(18) for x in range(11)]
MAX_RESPONSE = 65536
MIN_FETCH_INTERVAL_SECONDS = 10.0  # https://nomads.ncep.noaa.gov/info.php?page=gribfilter
SOURCE_ERROR_PAUSE_SECONDS = 60.0  # https://www.weather.gov/disclaimer
_next_fetch_at = 0.0
GRID_KEYS = 'gridType Ni Nj iDirectionIncrementInDegrees jDirectionIncrementInDegrees latitudeOfFirstGridPointInDegrees longitudeOfFirstGridPointInDegrees latitudeOfLastGridPointInDegrees longitudeOfLastGridPointInDegrees iScansNegatively jScansPositively jPointsAreConsecutive alternativeRowScanning'.split()
META_KEYS = 'edition centre shortName paramId units dataDate dataTime validityDate validityTime stepType stepUnits startStep endStep typeOfLevel level typeOfStatisticalProcessing numberOfTimeRanges bitmapPresent numberOfMissing missingValue packingType bitsPerValue binaryScaleFactor decimalScaleFactor packingError'.split() + GRID_KEYS


def iso(dt):
    return dt.astimezone(UTC).isoformat(timespec='seconds').replace('+00:00', 'Z')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def reject_symlinks(path):
    """Keep source cache/candidate writes at their explicit local destinations."""
    path = Path(path).absolute()
    if any(part.is_symlink() for part in (path, *path.parents)):
        raise ValueError('Symlinked source cache or output path is not allowed')


def stop_for_access_or_rate_error(error):
    # Do not try a different cycle to evade an access denial or rate restriction.
    if isinstance(error, HTTPError) and error.code in (401, 403, 429):
        raise error


def run_time(value):
    dt = datetime.strptime(value, '%Y%m%d%H').replace(tzinfo=UTC)
    if dt.hour not in (0, 6, 12, 18):
        raise ValueError('Unexpected GFS cycle')
    return dt


def filter_url(run, step):
    if run.hour not in (0, 6, 12, 18) or not 1 <= step <= 120:
        raise ValueError('Unsupported hourly GFS run/step')
    return ENDPOINT + '?' + urllib.parse.urlencode({
        'file': f'gfs.t{run:%H}z.pgrb2.0p25.f{step:03}', 'lev_surface': 'on', 'var_APCP': 'on',
        'subregion': '', 'leftlon': BBOX[0], 'rightlon': BBOX[2], 'toplat': BBOX[3], 'bottomlat': BBOX[1],
        'dir': f'/gfs.{run:%Y%m%d}/{run:%H}/atmos'})


def read_bounded(url):
    global _next_fetch_at
    if not url.startswith(ENDPOINT + '?'):
        raise ValueError('Unapproved source')
    time.sleep(max(0.0, _next_fetch_at - time.monotonic()))
    _next_fetch_at = time.monotonic() + MIN_FETCH_INTERVAL_SECONDS
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'ARK-hourly-rainfall/1.0'}), timeout=45) as response:
            final = urllib.parse.urlparse(response.geturl())
            if response.status != 200 or final.scheme != 'https' or final.hostname != 'nomads.ncep.noaa.gov' or final.path != '/cgi-bin/filter_gfs_0p25_1hr.pl':
                raise ValueError('Unexpected source status or redirect')
            length = response.headers.get('Content-Length')
            if length is not None and (not length.isdigit() or int(length) > MAX_RESPONSE):
                raise ValueError('Oversized source response')
            raw = response.read(MAX_RESPONSE + 1)
    except (OSError, TimeoutError):
        _next_fetch_at = time.monotonic() + SOURCE_ERROR_PAUSE_SECONDS
        raise
    if not 40 <= len(raw) <= MAX_RESPONSE:
        raise ValueError('Invalid/oversized source response')
    return raw


def split_messages(raw):
    if not isinstance(raw, bytes) or not 40 <= len(raw) <= MAX_RESPONSE:
        raise ValueError('Invalid GRIB response size')
    offset, result = 0, []
    while offset < len(raw):
        if len(result) >= 2 or raw[offset:offset + 4] != b'GRIB' or raw[offset + 7] != 2:
            raise ValueError('Expected exactly two APCP GRIB2 messages')
        size = int.from_bytes(raw[offset + 8:offset + 16], 'big')
        if size < 20 or size > MAX_RESPONSE or offset + size > len(raw) or raw[offset + size - 4:offset + size] != b'7777':
            raise ValueError('Truncated or invalid GRIB2 message')
        result.append(raw[offset:offset + size])
        offset += size
    if len(result) != 2:
        raise ValueError('Missing APCP duplicate/bucket metadata')
    return result


def validate_meta(meta, run, step):
    valid = run + step * HOUR
    expected = dict(edition=2, centre='kwbc', shortName='tp', paramId=228228, units='kg m**-2',
                    dataDate=int(run.strftime('%Y%m%d')), dataTime=run.hour * 100,
                    validityDate=int(valid.strftime('%Y%m%d')), validityTime=valid.hour * 100,
                    stepType='accum', stepUnits=1, endStep=step, typeOfLevel='surface', level=0,
                    typeOfStatisticalProcessing=1, numberOfTimeRanges=1, gridType='regular_ll',
                    Ni=11, Nj=18, iDirectionIncrementInDegrees=.25, jDirectionIncrementInDegrees=.25,
                    latitudeOfFirstGridPointInDegrees=5.75, longitudeOfFirstGridPointInDegrees=79.5,
                    latitudeOfLastGridPointInDegrees=10.0, longitudeOfLastGridPointInDegrees=82.0,
                    iScansNegatively=0, jScansPositively=1, jPointsAreConsecutive=0, alternativeRowScanning=0)
    for key, value in expected.items():
        if meta.get(key) != value:
            raise ValueError(f'Unexpected GRIB {key}: {meta.get(key)!r}, expected {value!r}')
    bucket_start = ((step - 1) // 6) * 6
    if meta.get('startStep') not in (0, bucket_start):
        raise ValueError('Unknown APCP accumulation origin')
    if meta.get('bitmapPresent') not in (0, 1) or not isinstance(meta.get('numberOfMissing'), int) or not 0 <= meta['numberOfMissing'] <= 198:
        raise ValueError('Invalid missing-cell metadata')
    if meta['numberOfMissing'] and not meta['bitmapPresent']:
        raise ValueError('Missing cells without bitmap')
    if meta.get('packingType') != 'grid_simple' or not isinstance(meta.get('bitsPerValue'), int) or not 0 <= meta['bitsPerValue'] <= 32:
        raise ValueError('Unsupported filtered packing')
    error = meta.get('packingError')
    if not isinstance(error, (int, float)) or not math.isfinite(error) or not 0 <= error <= .5:
        raise ValueError('Packing precision unavailable or too coarse')


def decode(raw, run, step):
    fields = []
    for message in split_messages(raw):
        handle = ec.codes_new_from_message(message)
        try:
            meta = {key: ec.codes_get(handle, key) for key in META_KEYS}
            validate_meta(meta, run, step)
            lat = ec.codes_get_array(handle, 'latitudes')
            lon = ec.codes_get_array(handle, 'longitudes')
            values = ec.codes_get_array(handle, 'values')
            if len(values) != 198 or [[float(x), float(y)] for x, y in zip(lon, lat)] != POINTS:
                raise ValueError('Decoded grid order/coordinates changed')
            mask = ~np.isfinite(values) | (values == meta['missingValue'])
            if int(np.count_nonzero(mask)) != meta['numberOfMissing']:
                raise ValueError('Decoded missing cells do not match metadata')
            fields.append({'metadata': meta, 'values': [None if missing else float(value) for value, missing in zip(values, mask)], 'sha256': digest(message)})
        finally:
            ec.codes_release(handle)
    cumulative = [field for field in fields if field['metadata']['startStep'] == 0]
    expected = 2 if step <= 6 else 1
    if len(cumulative) != expected:
        raise ValueError('Missing/duplicate run-cumulative APCP')
    if len(cumulative) == 2:
        tolerance = sum(f['metadata']['packingError'] for f in cumulative)
        for a, b in zip(cumulative[0]['values'], cumulative[1]['values']):
            if (a is None) != (b is None) or (a is not None and abs(a - b) > tolerance + 1e-9):
                raise ValueError('Duplicate early-step APCP fields disagree')
    return cumulative[-1], [{'metadata': f['metadata'], 'sha256': f['sha256']} for f in fields]


def precipitation(previous, current):
    """Exactly one native hour; no resets, cross-run differences or fabricated zeros."""
    a, b = previous['metadata'], current['metadata']
    for key in GRID_KEYS + ['dataDate', 'dataTime', 'units', 'shortName', 'paramId', 'startStep', 'stepType', 'stepUnits']:
        if a.get(key) != b.get(key):
            raise ValueError('Incompatible cumulative fields: ' + key)
    if a.get('startStep') != 0 or a.get('units') != 'kg m**-2' or a.get('shortName') != 'tp' or a.get('stepType') != 'accum' or a.get('stepUnits') != 1 or b['endStep'] - a['endStep'] != 1:
        raise ValueError('Not adjacent same-run cumulative hourly rainfall')
    if len(previous['values']) != len(current['values']):
        raise ValueError('Grid size mismatch')
    tolerance = a['packingError'] + b['packingError']
    if not math.isfinite(tolerance) or not 0 <= tolerance <= 1:
        raise ValueError('Invalid packing tolerance')
    rain, quality = [], []
    for x, y in zip(previous['values'], current['values']):
        if x is None or y is None or not math.isfinite(x) or not math.isfinite(y):
            rain.append(None); quality.append('missing'); continue
        if x < 0 or y < 0:
            rain.append(None); quality.append('invalid_accumulation'); continue
        amount = y - x  # kg/m² water depth = mm, not mm/hour intensity.
        if amount < -tolerance - 1e-9:
            rain.append(None); quality.append('accumulation_decreased'); continue
        if amount > 1000:
            rain.append(None); quality.append('out_of_range'); continue
        rain.append(round(max(0, amount), 6))
        quality.append('within_packing_tolerance' if amount < 0 else 'valid')
    return rain, quality, tolerance


def capture(cache, run, step):
    url = filter_url(run, step)
    folder = cache / run.strftime('%Y%m%d%H')
    reject_symlinks(folder)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f'f{step:03}.grib2'
    provenance = folder / f'f{step:03}.source.json'
    reject_symlinks(path)
    reject_symlinks(provenance)
    if path.exists() and provenance.exists():
        if path.stat().st_size > MAX_RESPONSE or provenance.stat().st_size > 4096:
            raise ValueError('Oversized cached source')
        raw, src = path.read_bytes(), json.loads(provenance.read_text())
        if src.get('url') != url or src.get('bytes') != len(raw) or src.get('sha256') != digest(raw):
            raise ValueError('Cached source provenance mismatch')
    else:
        raw = read_bounded(url)
        # Reject bad bytes before putting them into the reusable source cache.
        decode(raw, run, step)
        src = {'url': url, 'retrievedAt': iso(datetime.now(UTC)), 'bytes': len(raw), 'sha256': digest(raw)}
        path.write_bytes(raw)
        provenance.write_text(json.dumps(src, indent=2))
    field, messages = decode(raw, run, step)
    retrieved = datetime.fromisoformat(src['retrievedAt'].replace('Z', '+00:00'))
    if retrieved < run or retrieved > datetime.now(UTC) + timedelta(minutes=5):
        raise ValueError('Invalid cached retrieval time')
    return field, {**src, 'runAt': iso(run), 'step': step, 'messages': messages}


def choose_runs(now, cache, buffer_hours):
    floor = now.replace(minute=0, second=0, microsecond=0)
    past_start = floor - 24 * HOUR
    history_base = past_start.replace(hour=(past_start.hour // 6) * 6)
    forecast_base = floor.replace(hour=(floor.hour // 6) * 6)
    ceil = floor if now == floor else floor + HOUR
    end = ceil + (24 + buffer_hours) * HOUR
    selected = []
    for role, base, start, finish in [('history', history_base, past_start, floor), ('forecast', forecast_base, floor, end)]:
        for back in range(4):
            run = base - back * 6 * HOUR
            first, last = int((start - run) / HOUR), int((finish - run) / HOUR)
            try:
                # Probe both endpoints. A partially uploaded latest cycle gets a fallback.
                capture(cache, run, max(1, first))
                capture(cache, run, last)
                selected.append(run)
                break
            except Exception as error:
                stop_for_access_or_rate_error(error)
                print(f'{role} candidate {run:%Y%m%d%H} unavailable: {type(error).__name__}: {error}', flush=True)
        else:
            raise ValueError(f'No bounded available {role} GFS run')
    return selected


def build(history_run, forecast_run, cache, out, now=None, buffer_hours=12):
    now = now or datetime.now(UTC)
    if not 0 <= buffer_hours <= 24:
        raise ValueError('Buffer must be within 0–24 hours')
    floor = now.replace(minute=0, second=0, microsecond=0)
    ceil = floor if now == floor else floor + HOUR
    windows = [(history_run, floor - 24 * HOUR, floor), (forecast_run, floor, ceil + (24 + buffer_hours) * HOUR)]
    if history_run > windows[0][1] or forecast_run > now or forecast_run < history_run:
        raise ValueError('Invalid/future model run selection')
    fields, provenance, errors, frames = {}, {}, [], []
    for run, start, end in windows:
        first, last = int((start - run) / HOUR), int((end - run) / HOUR)
        if first < 0 or last > 120:
            raise ValueError('Requested window outside native hourly range')
        for step in range(max(1, first), last + 1):
            key = (run, step)
            if key in fields:
                continue
            try:
                field, src = capture(cache, run, step)
                fields[key], provenance[key] = field, src
                print(f'Validated GFS {run:%Y%m%d%H} f{step:03}', flush=True)
            except Exception as error:
                stop_for_access_or_rate_error(error)
                errors.append({'runAt': iso(run), 'step': step, 'error': type(error).__name__, 'message': str(error)[:240]})
                print(f'Unavailable GFS {run:%Y%m%d%H} f{step:03}: {error}', flush=True)
        for step in range(first + 1, last + 1):
            previous, current = fields.get((run, step - 1)), fields.get((run, step))
            rain, quality, tolerance = [None] * 198, ['missing_interval'] * 198, None
            # At f001 the validated 0–1 accumulation IS the first hour.
            # Its second duplicate must agree; no invented f000 field is needed.
            if step == 1 and current:
                previous = {'metadata': {**current['metadata'], 'endStep': 0, 'packingError': 0}, 'values': [0.0] * 198}
            if previous and current:
                try:
                    rain, quality, tolerance = precipitation(previous, current)
                except ValueError as error:
                    errors.append({'runAt': iso(run), 'step': step, 'error': 'IntervalInvalid', 'message': str(error)[:240]})
            frames.append({'runAt': iso(run), 'startStep': step - 1, 'endStep': step,
                           'intervalStart': iso(run + (step - 1) * HOUR), 'validAt': iso(run + step * HOUR),
                           'rainMm': rain, 'rainQuality': quality, 'packingToleranceMm': tolerance})
    if not provenance:
        raise ValueError('No validated source data; previous published snapshot must remain unchanged')
    runs = sorted(set((history_run, forecast_run)))
    result = {'schemaVersion': 1, 'kind': 'hourly_model_rainfall', 'model': 'NOAA GFS 0.25°',
              'pastDataKind': 'archived_forecast_model_estimate', 'intervalHours': 1, 'units': {'rainMm': 'mm/1h'},
              'capturedAt': max(src['retrievedAt'] for src in provenance.values()), 'generatedAt': iso(datetime.now(UTC)),
              'source': SOURCE, 'terms': TERMS, 'attribution': 'NOAA/NWS/NCEP Global Forecast System (GFS), public-domain U.S. government data. Not an official warning service.',
              'runs': [{'runAt': iso(run), 'source': SOURCE} for run in runs],
              'grid': {'type': 'regular_ll', 'spacingDegrees': .25, 'approximateKm': 28, 'bbox': BBOX, 'points': POINTS, 'matching': 'nearest published grid point, no interpolation'},
              'frames': frames, 'captureErrors': errors,
              'windowPolicy': '24 completed UTC hours and 24 upcoming whole UTC hours. The ongoing hour is excluded; not an exact rolling-now total. Native UTC hours end at xx:30 in Sri Lanka.',
              'modifications': 'Fixed Sri Lanka subset. Difference adjacent 0–fNN cumulative APCP within the same run only. kg/m² is numerically mm water. No temporal interpolation, bias correction, gauge blending, downscaling, hazard inference, or visitor data.'}
    raw = json.dumps(result, separators=(',', ':'), allow_nan=False).encode()
    if len(raw) > 2000000:
        raise ValueError('Candidate exceeds client limit')
    manifest = {'schemaVersion': 1, 'createdAt': iso(datetime.now(UTC)), 'hourlyRainSha256': digest(raw), 'hourlyRainBytes': len(raw),
                'source': SOURCE, 'terms': TERMS, 'decoder': {'ecCodes': ec.codes_get_api_version(), 'pythonPackage': ec.__version__},
                'sources': list(provenance.values()), 'errors': errors}
    reject_symlinks(out)
    reject_symlinks(out / 'hourly-rain.json')
    reject_symlinks(out / 'provenance.json')
    out.mkdir(parents=True, exist_ok=True)
    (out / 'hourly-rain.json').write_bytes(raw)
    (out / 'provenance.json').write_text(json.dumps(manifest, indent=2, allow_nan=False))
    print(json.dumps({'bytes': len(raw), 'frames': len(frames), 'errors': len(errors), 'runs': [iso(run) for run in runs]}, indent=2))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--history-run', help='Explicit YYYYMMDDHH UTC run at/before the first completed hour')
    parser.add_argument('--forecast-run', help='Explicit YYYYMMDDHH UTC forecast run')
    parser.add_argument('--auto', action='store_true', help='Probe at most four recent cycles per window, with release-lag fallback')
    parser.add_argument('--buffer-hours', type=int, default=12)
    parser.add_argument('--cache', type=Path, default=Path('artifacts/floodlens/hourly-rain'))
    parser.add_argument('--out', type=Path, default=Path('artifacts/floodlens/hourly-rain/candidate'))
    args = parser.parse_args()
    if not 0 <= args.buffer_hours <= 24:
        parser.error('--buffer-hours must be 0–24')
    now = datetime.now(UTC)
    if args.auto and not args.history_run and not args.forecast_run:
        history, forecast = choose_runs(now, args.cache, args.buffer_hours)
    elif not args.auto and args.history_run and args.forecast_run:
        history, forecast = run_time(args.history_run), run_time(args.forecast_run)
    else:
        parser.error('Choose --auto OR both --history-run and --forecast-run')
    build(history, forecast, args.cache, args.out, now=now, buffer_hours=args.buffer_hours)
