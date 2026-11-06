import copy
import importlib.util
import json
import math
import unittest
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).parents[2]
spec = importlib.util.spec_from_file_location('gfs_hourly', ROOT / 'scripts/floodlens/gfs_hourly.py')
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)
RUN = g.run_time('2026110612')


def metadata(step=7, start=0):
    valid = RUN + step * g.HOUR
    return dict(edition=2, centre='kwbc', shortName='tp', paramId=228228, units='kg m**-2', dataDate=20261106, dataTime=1200,
                validityDate=int(valid.strftime('%Y%m%d')), validityTime=valid.hour * 100,
                stepType='accum', stepUnits=1, startStep=start, endStep=step, typeOfLevel='surface', level=0,
                typeOfStatisticalProcessing=1, numberOfTimeRanges=1, gridType='regular_ll', Ni=11, Nj=18,
                iDirectionIncrementInDegrees=.25, jDirectionIncrementInDegrees=.25, latitudeOfFirstGridPointInDegrees=5.75,
                longitudeOfFirstGridPointInDegrees=79.5, latitudeOfLastGridPointInDegrees=10., longitudeOfLastGridPointInDegrees=82.,
                iScansNegatively=0, jScansPositively=1, jPointsAreConsecutive=0, alternativeRowScanning=0,
                bitmapPresent=0, numberOfMissing=0, missingValue=9999, packingType='grid_simple', bitsPerValue=10,
                binaryScaleFactor=-4, decimalScaleFactor=0, packingError=.03125)


def field(step, values):
    return {'metadata': metadata(step), 'values': values}


class GFSHourly(unittest.TestCase):
    def test_parameter_units_grid_interval_and_run_are_binary_validated(self):
        g.validate_meta(metadata(), RUN, 7)
        for key, value in [('units', 'm'), ('centre', 'ecmf'), ('paramId', 228), ('stepUnits', 0), ('startStep', 1),
                           ('endStep', 8), ('dataTime', 600), ('validityTime', 1800), ('typeOfStatisticalProcessing', 0),
                           ('jScansPositively', 0), ('Ni', 13), ('latitudeOfFirstGridPointInDegrees', 10),
                           ('packingError', 2), ('packingError', math.nan), ('numberOfMissing', 1), ('packingType', 'unknown')]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                g.validate_meta({**metadata(), key: value}, RUN, 7)

    def test_only_same_run_adjacent_cumulative_fields_are_differenced(self):
        amounts, quality, tolerance = g.precipitation(field(6, [10, 0, None]), field(7, [12, 0, 4]))
        self.assertEqual(amounts, [2, 0, None])
        self.assertEqual(quality, ['valid', 'valid', 'missing'])
        self.assertEqual(tolerance, .0625)
        for key, value in [('endStep', 8), ('dataTime', 600), ('startStep', 6), ('units', 'm'), ('Ni', 13), ('stepUnits', 0)]:
            a, b = field(6, [1]), field(7, [3])
            b['metadata'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                g.precipitation(a, b)

    def test_bucket_reset_never_becomes_zero_rainfall(self):
        values, quality, _ = g.precipitation(field(6, [10]), field(7, [1]))
        self.assertEqual(values, [None]); self.assertEqual(quality, ['accumulation_decreased'])

    def test_missing_invalid_and_extreme_values_fail_closed(self):
        values, quality, _ = g.precipitation(field(6, [None, math.nan, -1, 1, 1]), field(7, [3, 3, 3, math.inf, 2000]))
        self.assertEqual(values, [None] * 5)
        self.assertEqual(quality, ['missing', 'missing', 'invalid_accumulation', 'missing', 'out_of_range'])

    def test_negative_packing_noise_has_explicit_quality(self):
        values, quality, _ = g.precipitation(field(6, [1, 1]), field(7, [.97, .9]))
        self.assertEqual(values, [0, None]); self.assertEqual(quality, ['within_packing_tolerance', 'accumulation_decreased'])

    def test_region_and_parameter_are_fixed_not_user_coordinates(self):
        url = g.filter_url(RUN, 7)
        self.assertIn('filter_gfs_0p25_1hr.pl', url)
        self.assertIn('leftlon=79.5', url); self.assertIn('bottomlat=5.75', url)
        self.assertIn('var_APCP=on', url); self.assertIn('f007', url)
        for step in [0, 121, -1]:
            with self.assertRaises(ValueError): g.filter_url(RUN, step)
        with self.assertRaises(ValueError): g.run_time('2026110603')

    def test_bounded_grib_splitting_rejects_html_truncation_extra_messages(self):
        message = b'GRIB' + b'\x00\x00\x00\x02' + (20).to_bytes(8, 'big') + b'7777'
        self.assertEqual(g.split_messages(message * 2), [message, message])
        for raw in [message, message * 3, message * 2 + b'x', b'<html>' * 40, (message * 2)[:-1], b'x' * (g.MAX_RESPONSE + 1)]:
            with self.assertRaises(ValueError): g.split_messages(raw)

    def test_http_response_is_bounded_and_source_redirect_checked(self):
        class Response:
            status = 200
            headers = {'Content-Length': '65537'}
            def __enter__(self): return self
            def __exit__(self, *a): pass
            def geturl(self): return g.filter_url(RUN, 7)
            def read(self, size): raise AssertionError('Oversized response must not be read')
        with patch.object(g.urllib.request, 'urlopen', return_value=Response()), patch.object(g, '_next_fetch_at', 0), self.assertRaises(ValueError):
            g.read_bounded(g.filter_url(RUN, 7))
        Response.headers = {}
        Response.geturl = lambda self: 'https://example.com/evil'
        with patch.object(g.urllib.request, 'urlopen', return_value=Response()), patch.object(g, '_next_fetch_at', 0), self.assertRaises(ValueError):
            g.read_bounded(g.filter_url(RUN, 7))

    def test_filter_fetches_respect_noaa_pacing_and_one_minute_error_pause(self):
        with patch.object(g, '_next_fetch_at', 105), patch.object(g.time, 'monotonic', return_value=100), patch.object(g.time, 'sleep') as sleep, patch.object(g.urllib.request, 'urlopen', side_effect=OSError('offline')):
            with self.assertRaises(OSError): g.read_bounded(g.filter_url(RUN, 7))
            sleep.assert_called_once_with(5)
            self.assertEqual(g._next_fetch_at, 160)

    def test_release_lag_uses_bounded_cycle_fallback(self):
        now = RUN + 3.5 * g.HOUR
        calls = []
        def capture(cache, run, step):
            calls.append((run, step))
            if run == RUN: raise OSError('latest run not uploaded yet')
            return {}, {}
        with patch.object(g, 'capture', side_effect=capture):
            old, current = g.choose_runs(now, Path('/unused'), 12)
        self.assertEqual(old, RUN - 24 * g.HOUR)
        self.assertEqual(current, RUN - 6 * g.HOUR)
        self.assertLessEqual(len(calls), 16)
        with patch.object(g, 'capture', side_effect=OSError('offline')) as mocked:
            with self.assertRaises(ValueError): g.choose_runs(now, Path('/unused'), 12)
            self.assertEqual(mocked.call_count, 4)

    def test_access_denials_and_rate_restrictions_never_trigger_alternate_cycle(self):
        for code in (401, 403, 429):
            error = g.HTTPError(g.filter_url(RUN, 7), code, 'Denied or rate-limited', {}, None)
            with self.subTest(code=code), patch.object(g, 'capture', side_effect=error) as mocked:
                with self.assertRaises(g.HTTPError): g.choose_runs(RUN + 3.5 * g.HOUR, Path('/unused'), 12)
                self.assertEqual(mocked.call_count, 1)
            with self.subTest(code=code), patch.object(g, 'capture', side_effect=error) as mocked:
                with self.assertRaises(g.HTTPError): g.build(RUN - 24 * g.HOUR, RUN, Path('/unused'), Path('/unused'), now=RUN + 3.5 * g.HOUR)
                self.assertEqual(mocked.call_count, 1)
            error.close()

    def test_symlinked_cache_or_output_is_rejected_before_writing(self):
        with patch.object(g.Path, 'is_symlink', return_value=True), self.assertRaises(ValueError):
            g.reject_symlinks(Path('/unused/cache'))

    def test_actual_cached_duplicate_first_hours_and_reset_metadata(self):
        cache = ROOT / 'artifacts/floodlens/hourly-rain/2026110512'
        paths = [cache / f'f{s:03}.grib2' for s in (3, 6, 7)]
        if not all(p.exists() for p in paths): self.skipTest('Real capture has not reached f007 yet')
        run = g.run_time('2026110512')
        for step, path in zip((3, 6, 7), paths):
            current, messages = g.decode(path.read_bytes(), run, step)
            self.assertEqual(current['metadata']['startStep'], 0)
            self.assertEqual(len(current['values']), 198)
            self.assertEqual(sorted(m['metadata']['startStep'] for m in messages), [0, 0 if step <= 6 else 6])

    def test_committed_candidate_provenance_all_actual_binary_metadata(self):
        folder = ROOT / 'floodlens/data/hourly-rain'
        if not (folder / 'provenance.json').exists(): self.skipTest('First capture still running')
        raw = (folder / 'hourly-rain.json').read_bytes()
        manifest = json.loads((folder / 'provenance.json').read_text())
        self.assertEqual(g.digest(raw), manifest['hourlyRainSha256'])
        self.assertEqual(len(raw), manifest['hourlyRainBytes'])
        self.assertFalse(manifest['errors'])
        for source in manifest['sources']:
            run = g.datetime.fromisoformat(source['runAt'].replace('Z', '+00:00'))
            for message in source['messages']:
                g.validate_meta(message['metadata'], run, source['step'])
            self.assertEqual(source['url'], g.filter_url(run, source['step']))
        data = json.loads(raw)
        for frame in data['frames']:
            self.assertEqual(frame['endStep'] - frame['startStep'], 1)
            self.assertEqual(len(frame['rainMm']), 198)
            self.assertTrue(all(value is not None for value in frame['rainMm']))


if __name__ == '__main__': unittest.main()
