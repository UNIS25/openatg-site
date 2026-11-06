import json
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/floodlens'))
import hourly_publication as h
import update_weather as u
import publish_reservoirs as p


class HourlyPublication(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.out, self.cache = self.base / 'candidate', self.base / 'cache'
        self.out.mkdir()
        self.folder = self.cache / '2026110612'
        self.folder.mkdir(parents=True)
        self.sources = []
        run = datetime(2026, 11, 6, 12, tzinfo=timezone.utc)
        for step in (1, 2):
            raw = (str(step) * 40).encode()
            source = {'url': h.gfs.filter_url(run, step), 'bytes': len(raw), 'sha256': h.gfs.digest(raw), 'retrievedAt': '2026-11-06T18:00:00Z'}
            (self.folder / f'f{step:03}.grib2').write_bytes(raw)
            (self.folder / f'f{step:03}.source.json').write_text(json.dumps(source))
            self.sources.append({**source, 'runAt': '2026-11-06T12:00:00Z', 'step': step, 'messages': [{'sha256': 'a' * 64}]})
        self.data = {'frames': [{'runAt': '2026-11-06T12:00:00Z', 'startStep': 1, 'endStep': 2, 'rainMm': [1] * 198, 'rainQuality': ['valid'] * 198, 'packingToleranceMm': .01}]}
        self.write_candidate()
        self.decoder = patch.object(h.gfs, 'decode', return_value=({'metadata': {}, 'values': [1] * 198}, [{'sha256': 'a' * 64}])).start()
        self.addCleanup(patch.stopall)
        patch.object(h.gfs, 'precipitation', return_value=([1] * 198, ['valid'] * 198, .01)).start()
        self.network = patch.object(h.gfs, 'read_bounded', side_effect=AssertionError('Publication must never fetch')).start()

    def write_candidate(self):
        (self.out / 'hourly-rain.json').write_text(json.dumps(self.data))
        (self.out / 'provenance.json').write_text(json.dumps({'sources': self.sources}))

    def test_validates_actual_cache_bytes_and_redecodes_without_network(self):
        self.assertTrue(h.validate_cached_sources(self.out, self.cache))
        self.assertEqual(self.decoder.call_count, 2)
        self.network.assert_not_called()

    def test_missing_source_cache_never_downloads_during_publication(self):
        (self.folder / 'f002.grib2').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing'):
            h.validate_cached_sources(self.out, self.cache)
        self.network.assert_not_called()

    def test_changed_raw_bytes_are_rejected(self):
        (self.folder / 'f001.grib2').write_bytes(b'X' * 40)
        with self.assertRaisesRegex(ValueError, 'bytes/hash'):
            h.validate_cached_sources(self.out, self.cache)

    def test_claimed_retrieval_time_cannot_advance_cached_source_time(self):
        self.sources[0]['retrievedAt'] = '2026-11-06T19:00:00Z'
        self.write_candidate()
        with self.assertRaisesRegex(ValueError, 'provenance/retrieval time'):
            h.validate_cached_sources(self.out, self.cache)

    def test_decoded_metadata_and_published_rainfall_must_match(self):
        self.sources[0]['messages'][0]['sha256'] = 'b' * 64
        self.write_candidate()
        with self.assertRaisesRegex(ValueError, 'metadata mismatch'):
            h.validate_cached_sources(self.out, self.cache)
        self.sources[0]['messages'][0]['sha256'] = 'a' * 64
        self.data['frames'][0]['rainMm'][0] = 2
        self.write_candidate()
        with self.assertRaisesRegex(ValueError, 'does not match decoded'):
            h.validate_cached_sources(self.out, self.cache)

    def test_cache_symlink_and_duplicate_source_are_rejected(self):
        path = self.folder / 'f001.grib2'
        path.unlink(); path.symlink_to(self.folder / 'f002.grib2')
        with self.assertRaisesRegex(ValueError, 'linked'):
            h.validate_cached_sources(self.out, self.cache)
        path.unlink(); path.write_bytes(b'1' * 40)
        self.sources.append(self.sources[0]); self.write_candidate()
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            h.validate_cached_sources(self.out, self.cache)

    def test_hourly_timeout_does_not_install_a_partial_candidate(self):
        hourly = self.base / 'data/hourly-rain'; hourly.mkdir(parents=True)
        (hourly / 'hourly-rain.json').write_text(json.dumps({'capturedAt': '2026-11-06T12:00:00Z'}))
        with patch.object(u, 'DATA', hourly.parent), patch.object(u.subprocess, 'run', side_effect=subprocess.TimeoutExpired('gfs', 1200)) as run, patch.object(u, 'install_group') as install:
            with self.assertRaises(subprocess.TimeoutExpired):
                u.update_hourly_rain(datetime(2026, 11, 6, 19, tzinfo=timezone.utc), self.out)
            self.assertEqual(run.call_args.kwargs['timeout'], 1200)
            install.assert_not_called()

    def test_fresh_hourly_snapshot_is_revalidated_without_retrieval_or_time_changes(self):
        hourly = self.base / 'data/hourly-rain'; hourly.mkdir(parents=True)
        original = json.dumps({'capturedAt': '2026-11-06T16:00:00Z'}).encode()
        (hourly / 'hourly-rain.json').write_bytes(original)
        with patch.object(u, 'DATA', hourly.parent), patch.object(u.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0)) as run, patch.object(u, 'install_group') as install:
            result = u.update_hourly_rain(datetime(2026, 11, 6, 19, tzinfo=timezone.utc), self.out)
        self.assertIn('unchanged', result)
        self.assertEqual(run.call_count, 1)
        self.assertEqual(run.call_args.args[0][0], 'node')
        self.assertEqual((hourly / 'hourly-rain.json').read_bytes(), original)
        install.assert_not_called()

    def test_failed_hourly_group_keeps_other_groups_isolated(self):
        with patch.object(u, 'WORK', self.base / 'work'), patch.object(u, 'update_forecast', return_value='ok'), patch.object(u, 'update_clouds', return_value='ok'), patch.object(u, 'update_tides', return_value='ok'), patch.object(u, 'update_hourly_rain', side_effect=ValueError('invalid source')), patch.dict(u.os.environ, {'GITHUB_OUTPUT': '', 'GITHUB_STEP_SUMMARY': ''}):
            result = u.main()
        self.assertEqual(result['hourly-rain']['status'], 'failed')
        self.assertTrue(all(result[group]['status'] == 'ok' for group in ('forecast', 'clouds', 'tides')))

    def test_hourly_source_proof_failure_preserves_both_published_files(self):
        published = self.base / 'data' / 'hourly-rain'
        published.mkdir(parents=True)
        for name in u.GROUPS['hourly-rain']:
            (published / name).write_bytes(b'original')
        with patch.object(u, 'DATA', published.parent), patch.object(u.subprocess, 'run'), patch.object(h, 'validate_cached_sources', side_effect=ValueError('invalid source')):
            with self.assertRaises(ValueError): u.install_group('hourly-rain', self.out)
        self.assertTrue(all((published / name).read_bytes() == b'original' for name in u.GROUPS['hourly-rain']))

    def test_publish_repeats_source_proof_before_commit(self):
        with patch.object(p, 'ROOT', self.base), patch.object(p, 'assert_regular_files'), patch.object(p, 'git', return_value='{}'), patch.object(p.subprocess, 'run') as node, patch.object(h, 'validate_cached_sources', return_value=True) as proof:
            p.validate_changed(['floodlens/data/hourly-rain/provenance.json'])
        self.assertEqual(node.call_args.args[0][2], 'hourly-rain')
        proof.assert_called_once_with(self.base / 'floodlens/data/hourly-rain', self.base / 'artifacts/floodlens/hourly-rain')


if __name__ == '__main__': unittest.main()
