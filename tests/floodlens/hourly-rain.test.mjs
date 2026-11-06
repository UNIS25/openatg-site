import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {validateHourlyRain, selectHourlyRain, parseHourlyRainText, MAX_HOURLY_RAIN_TEXT_LENGTH, HOURLY_RAIN_SOURCE} from '../../floodlens/hourly-rain-model.mjs';
const H = 3600000, now = Date.parse('2026-11-06T15:30:00Z'), point = [79.8612, 6.9271];
const iso = n => new Date(n).toISOString();
function fixture() {
  const old = Date.parse('2026-11-05T12:00:00Z'), current = Date.parse('2026-11-06T12:00:00Z');
  const floor = Math.floor(now / H) * H;
  return {schemaVersion: 1, kind: 'hourly_model_rainfall', model: 'NOAA GFS 0.25°', source: HOURLY_RAIN_SOURCE,
    terms: 'https://www.weather.gov/disclaimer', intervalHours: 1, units: {rainMm: 'mm/1h'}, pastDataKind: 'archived_forecast_model_estimate',
    capturedAt: iso(now), generatedAt: iso(now), runs: [old, current].map(r => ({runAt: iso(r), source: HOURLY_RAIN_SOURCE})),
    grid: {type: 'regular_ll', spacingDegrees: .25, bbox: [79.5, 5.75, 82, 10], points: Array.from({length: 198}, (_, i) => [79.5 + (i % 11) * .25, 5.75 + Math.floor(i / 11) * .25])},
    frames: Array.from({length: 49}, (_, i) => { const start = floor - 24 * H + i * H, run = i < 24 ? old : current;
      return {runAt: iso(run), startStep: (start - run) / H, endStep: (start - run) / H + 1,
        intervalStart: iso(start), validAt: iso(start + H), rainMm: Array(198).fill(1), rainQuality: Array(198).fill('valid'), packingToleranceMm: .0625}; })};
}
test('24 completed and 24 upcoming native hours exclude only the ongoing hour', () => {
  const result = selectHourlyRain(fixture(), point, now);
  assert.equal(result.status, 'available'); assert.equal(result.past24.rows.length, 24); assert.equal(result.next24.rows.length, 24);
  assert.equal(result.past24.start, '2026-11-05T15:00:00.000Z'); assert.equal(result.past24.end, '2026-11-06T15:00:00.000Z');
  assert.equal(result.next24.start, '2026-11-06T16:00:00.000Z'); assert.equal(result.next24.end, '2026-11-07T16:00:00.000Z');
  assert.equal(result.past24.totalMm, 24); assert.equal(result.next24.totalMm, 24); assert.equal(result.currentHourExcluded, true);
  assert.ok(result.past24.rows.every(r => r.kind === 'historical_model_estimate'));
  assert.ok(result.next24.rows.every(r => r.kind === 'model_forecast'));
  assert.ok(result.warnings.some(w => w.includes('not measured rainfall')));
  assert.ok(result.distanceKm > 0 && result.distanceKm < 20);
});
test('at an exact UTC hour the windows meet without a gap', () => {
  const data = fixture(), time = Math.floor(now / H) * H;
  data.capturedAt = data.generatedAt = iso(time);
  const r = selectHourlyRain(data, point, time);
  assert.equal(r.past24.end, r.next24.start); assert.equal(r.currentHourExcluded, false); assert.equal(r.next24.totalMm, 24);
});
test('native UTC hourly boundaries display at :30 Sri Lanka time', () => {
  const result = selectHourlyRain(fixture(), point, now);
  const local = new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(result.next24.start));
  assert.equal(local, '21:30');
});
test('a missing cell or interval keeps totals unknown rather than summing 23 hours', () => {
  for (const mutate of [d => { const i = selectHourlyRain(d, point, now).index; d.frames[0].rainMm[i] = null; d.frames[0].rainQuality[i] = 'missing'; }, d => d.frames.splice(0, 1)]) {
    const d = fixture(); mutate(d); const r = selectHourlyRain(d, point, now);
    assert.equal(r.past24.totalMm, null); assert.equal(r.past24.status, 'incomplete'); assert.equal(r.past24.rows.length, 24);
    assert.equal(r.status, 'partial'); assert.equal(r.next24.totalMm, 24);
  }
});
test('valid dry values stay zero, not missing', () => {
  const d = fixture(); d.frames.forEach(f => f.rainMm.fill(0));
  const r = selectHourlyRain(d, point, now); assert.equal(r.past24.totalMm, 0); assert.equal(r.next24.totalMm, 0); assert.equal(r.status, 'available');
});
test('changing day windows does not invent missing old hours', () => {
  const r = selectHourlyRain(fixture(), point, now + 8 * H);
  assert.equal(r.past24.totalMm, 24); assert.equal(r.past24.runAts.length, 2); assert.equal(r.next24.totalMm, null);
});
test('stale snapshots explicitly flag age and expired time windows remain unknown', () => {
  const r = selectHourlyRain(fixture(), point, now + 19 * H); assert.equal(r.status, 'stale'); assert.ok(r.warnings.some(w => w.includes('snapshot is old')));
  const expired = selectHourlyRain(fixture(), point, now + 96 * H); assert.equal(expired.status, 'unavailable'); assert.equal(expired.past24.totalMm, null); assert.equal(expired.next24.totalMm, null);
});
test('invalid source/time/grid/units/quality and temporal interpolation are rejected', () => {
  const changes = [d => d.source = 'https://example.com', d => d.pastDataKind = 'measured', d => d.intervalHours = 3,
    d => d.units.rainMm = 'mm/3h', d => d.grid.points.reverse(), d => d.grid.spacingDegrees = .1,
    d => d.frames[0].endStep += 1, d => d.frames[0].intervalStart = d.frames[1].intervalStart,
    d => d.frames[0].rainMm[0] = -1, d => d.frames[0].rainMm[0] = null, d => d.frames[0].rainQuality[0] = 'measured',
    d => d.frames[0].packingToleranceMm = 100, d => d.frames[0].runAt = '2026-11-04T12:00:00Z',
    d => d.generatedAt = '2030-01-01T00:00:00Z', d => d.capturedAt = '2020-01-01T00:00:00Z',
    d => d.frames.splice(1, 0, structuredClone(d.frames[0]))];
  for (const change of changes) { const d = fixture(); change(d); assert.throws(() => validateHourlyRain(d, now)); const r = selectHourlyRain(d, point, now); assert.equal(r.status, 'unavailable'); assert.equal(r.past24.totalMm, null); }
});
test('outside fixed crop and invalid coordinates do not use nearest remote values', () => {
  for (const p of [[79.49, 7], [80, 5.7], [82.1, 7], [80, 10.1]]) assert.equal(selectHourlyRain(fixture(), p, now).status, 'outside_coverage');
  for (const p of [null, [NaN, 7], [80], ['80', 7]]) assert.equal(selectHourlyRain(fixture(), p, now).status, 'invalid_location');
});
test('absent/corrupt/oversized source fails closed', () => {
  for (const d of [null, {}, undefined]) { const r = selectHourlyRain(d, point, now); assert.equal(r.status, 'unavailable'); assert.equal(r.past24.totalMm, null); assert.equal(r.next24.totalMm, null); }
  assert.throws(() => parseHourlyRainText('x'.repeat(MAX_HOURLY_RAIN_TEXT_LENGTH + 1), now));
  assert.throws(() => parseHourlyRainText('{', now));
  assert.equal(parseHourlyRainText(JSON.stringify(fixture()), now).frames.length, 49);
});
test('committed real NOAA snapshot is bounded, hashed and validates at capture', {skip: !fs.existsSync(new URL('../../floodlens/data/hourly-rain/hourly-rain.json', import.meta.url))}, () => {
  const raw = fs.readFileSync(new URL('../../floodlens/data/hourly-rain/hourly-rain.json', import.meta.url));
  const manifest = JSON.parse(fs.readFileSync(new URL('../../floodlens/data/hourly-rain/provenance.json', import.meta.url), 'utf8'));
  const d = JSON.parse(raw), time = Date.parse(d.generatedAt) + 1000;
  assert.equal(createHash('sha256').update(raw).digest('hex'), manifest.hourlyRainSha256); assert.equal(raw.length, manifest.hourlyRainBytes);
  validateHourlyRain(d, time); assert.equal(d.captureErrors.length, 0);
  const r = selectHourlyRain(d, point, time); assert.equal(r.past24.status, 'complete'); assert.equal(r.next24.status, 'complete');
  assert.ok(manifest.sources.length >= 49);
  assert.ok(manifest.sources.every(s => s.sha256.length === 64 && s.messages.length === 2 && s.bytes < 65536 && s.url.startsWith('https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl?')));
});
