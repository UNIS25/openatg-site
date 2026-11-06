import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm, readFile, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {validateGroup} from '../../scripts/floodlens/validate_publication.mjs';

const HOUR = 3600000, NOW = Date.parse('2026-11-06T19:30:00Z');
const SOURCE = 'https://www.nco.ncep.noaa.gov/pmb/products/gfs/nomads/';
const stamp = value => new Date(value).toISOString().replace('.000Z', 'Z');
const hash = value => createHash('sha256').update(value).digest('hex');
function fixture() {
  const history = '2026-11-05T18:00:00Z', future = '2026-11-06T12:00:00Z';
  const floor = Math.floor(NOW / HOUR) * HOUR, frames = [];
  for (let start = floor - 24 * HOUR; start < floor + 26 * HOUR; start += HOUR) {
    const runAt = start < floor ? history : future, step = (start - Date.parse(runAt)) / HOUR;
    frames.push({runAt, startStep: step, endStep: step + 1, intervalStart: stamp(start), validAt: stamp(start + HOUR), rainMm: Array(198).fill(.5), rainQuality: Array(198).fill('valid'), packingToleranceMm: .01});
  }
  const data = {schemaVersion: 1, kind: 'hourly_model_rainfall', model: 'NOAA GFS 0.25°', pastDataKind: 'archived_forecast_model_estimate', intervalHours: 1, units: {rainMm: 'mm/1h'}, source: SOURCE, terms: 'https://www.weather.gov/disclaimer', capturedAt: stamp(NOW), generatedAt: stamp(NOW), runs: [history, future].map(runAt => ({runAt, source: SOURCE})), grid: {type: 'regular_ll', spacingDegrees: .25, bbox: [79.5, 5.75, 82, 10], points: Array.from({length: 198}, (_, i) => [79.5 + i % 11 * .25, 5.75 + Math.floor(i / 11) * .25])}, frames, captureErrors: []};
  const sourceMap = new Map();
  for (const frame of frames) for (const step of [frame.startStep, frame.endStep]) {
    if (step === 0) continue;
    const runAt = frame.runAt, validAt = stamp(Date.parse(runAt) + step * HOUR), day = runAt.slice(0, 10).replaceAll('-', ''), hour = runAt.slice(11, 13);
    const url = 'https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl?' + new URLSearchParams({file: `gfs.t${hour}z.pgrb2.0p25.f${String(step).padStart(3, '0')}`, lev_surface: 'on', var_APCP: 'on', subregion: '', leftlon: '79.5', rightlon: '82.0', toplat: '10.0', bottomlat: '5.75', dir: `/gfs.${day}/${hour}/atmos`});
    const meta = {edition: 2, centre: 'kwbc', shortName: 'tp', paramId: 228228, units: 'kg m**-2', dataDate: Number(day), dataTime: Number(hour) * 100, validityDate: Number(validAt.slice(0, 10).replaceAll('-', '')), validityTime: Number(validAt.slice(11, 13)) * 100, stepType: 'accum', stepUnits: 1, endStep: step, typeOfLevel: 'surface', level: 0, typeOfStatisticalProcessing: 1, numberOfTimeRanges: 1, gridType: 'regular_ll', Ni: 11, Nj: 18, iDirectionIncrementInDegrees: .25, jDirectionIncrementInDegrees: .25, latitudeOfFirstGridPointInDegrees: 5.75, longitudeOfFirstGridPointInDegrees: 79.5, latitudeOfLastGridPointInDegrees: 10, longitudeOfLastGridPointInDegrees: 82, iScansNegatively: 0, jScansPositively: 1, jPointsAreConsecutive: 0, alternativeRowScanning: 0, numberOfMissing: 0, bitmapPresent: 0, packingType: 'grid_simple', bitsPerValue: 16, packingError: .005};
    sourceMap.set(runAt + '/' + step, {runAt, step, url, retrievedAt: stamp(NOW), bytes: 500, sha256: 'a'.repeat(64), messages: [0, Math.floor((step - 1) / 6) * 6].map(startStep => ({metadata: {...meta, startStep}, sha256: 'b'.repeat(64)}))});
  }
  const manifest = {schemaVersion: 1, createdAt: stamp(NOW), source: SOURCE, terms: data.terms, decoder: {ecCodes: '2.50.0', pythonPackage: '2.50.0'}, sources: [...sourceMap.values()], errors: []};
  return {data, manifest};
}
async function candidate(change = () => {}, check) {
  const root = await mkdtemp(join(tmpdir(), 'ark-hourly-publication-'));
  const before = root + '/before', current = root + '/candidate';
  await mkdir(before); await mkdir(current);
  try {
    const {data, manifest} = fixture(), old = structuredClone(data);
    await change(data, manifest, old);
    const bytes = JSON.stringify(data);
    manifest.hourlyRainBytes = Buffer.byteLength(bytes); manifest.hourlyRainSha256 = hash(bytes);
    await writeFile(before + '/hourly-rain.json', JSON.stringify(old));
    await writeFile(current + '/hourly-rain.json', bytes);
    await writeFile(current + '/provenance.json', JSON.stringify(manifest));
    await check(current, before);
  } finally { await rm(root, {recursive: true, force: true}); }
}
test('hourly gate accepts complete fixed-source days at every grid point', async () => {
  await candidate(undefined, async (dir, old) => assert.equal(await validateGroup('hourly-rain', dir, old, NOW), true));
});
test('hourly gate rejects wrong URL, run, step, bytes, hash or duplicate provenance', async () => {
  for (const change of [
    p => p.sources[0].url += '&extra=1', p => p.sources[0].url = p.sources[0].url.replace('nomads.ncep.noaa.gov', 'example.com'),
    p => p.sources[0].runAt = '2026-11-05T12:00:00Z', p => p.sources[0].step += 1, p => p.sources[0].bytes = 65537,
    p => p.sources[0].sha256 = 'not-a-hash', p => p.sources[1] = structuredClone(p.sources[0]), p => p.sources.pop()
  ]) await candidate((d, p) => change(p), async (dir, old) => assert.rejects(validateGroup('hourly-rain', dir, old, NOW)));
});
test('hourly gate rejects altered raw artifact identity', async () => {
  await candidate(undefined, async (dir, old) => {
    const manifest = JSON.parse(await readFile(dir + '/provenance.json')); manifest.hourlyRainSha256 = '0'.repeat(64);
    await writeFile(dir + '/provenance.json', JSON.stringify(manifest));
    await assert.rejects(validateGroup('hourly-rain', dir, old, NOW), /identity/);
  });
});
test('hourly gate rejects wrong GRIB accumulation, grid and packing metadata', async () => {
  for (const change of [m => m.startStep = 1, m => m.endStep += 1, m => m.units = 'm', m => m.Ni = 10, m => m.numberOfMissing = 1, m => m.packingType = 'grid_jpeg', m => m.bitsPerValue = 33, m => m.packingError = .51]) {
    await candidate((d, p) => change(p.sources[0].messages[0].metadata), async (dir, old) => assert.rejects(validateGroup('hourly-rain', dir, old, NOW)));
  }
});
test('hourly gate fails closed on capture errors, missing cells and stale or future times', async () => {
  for (const change of [
    (d, p) => d.captureErrors.push({error: 'timeout'}), (d, p) => p.errors.push({error: 'timeout'}),
    d => { d.frames[0].rainMm[0] = null; d.frames[0].rainQuality[0] = 'missing'; },
    d => d.generatedAt = '2099-01-01T00:00:00Z', (d, p) => p.sources[0].retrievedAt = '2099-01-01T00:00:00Z',
    (d, p) => p.sources.forEach(source => source.retrievedAt = '2026-11-06T19:00:00Z')
  ]) await candidate(change, async (dir, old) => assert.rejects(validateGroup('hourly-rain', dir, old, NOW)));
  await candidate(undefined, async (dir, old) => assert.rejects(validateGroup('hourly-rain', dir, old, NOW + 13 * HOUR), /complete fresh/));
});
test('hourly gate rejects regressing runs and fabricated review timestamps', async () => {
  await candidate((d, p, old) => {
    old.runs[1].runAt = '2026-11-06T18:00:00Z';
    for (const frame of old.frames) if (frame.runAt === '2026-11-06T12:00:00Z') {
      frame.runAt = old.runs[1].runAt; frame.startStep -= 6; frame.endStep -= 6;
    }
  }, async (dir, old) => assert.rejects(validateGroup('hourly-rain', dir, old, NOW), /Regressed hourly model run/));
  for (const change of [d => d.reviewedAt = stamp(NOW), (d, p) => p.reviewedAt = stamp(NOW), (d, p) => p.sources[0].reviewedAt = stamp(NOW)]) {
    await candidate(change, async (dir, old) => assert.rejects(validateGroup('hourly-rain', dir, old, NOW), /must not claim human review/));
  }
});
test('retained hourly snapshot passes its real publication-time gate', async t => {
  const dir = 'floodlens/data/hourly-rain';
  try { await access(dir + '/hourly-rain.json'); } catch { t.skip('First verified source capture not present'); return; }
  const manifest = JSON.parse(await readFile(dir + '/provenance.json'));
  await validateGroup('hourly-rain', dir, dir, Date.parse(manifest.createdAt));
});
