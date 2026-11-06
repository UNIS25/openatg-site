// Native hourly GFS model rainfall. Past intervals are archived forecasts, not observations.
export const HOURLY_RAIN_SOURCE = 'https://www.nco.ncep.noaa.gov/pmb/products/gfs/nomads/';
export const MAX_HOURLY_RAIN_TEXT_LENGTH = 2000000;
const HOUR = 3600000;
const BBOX = [79.5, 5.75, 82, 10];
const GOOD = new Set(['valid', 'within_packing_tolerance']);
const BAD = new Set(['missing', 'missing_interval', 'invalid_accumulation', 'accumulation_decreased', 'out_of_range']);
const iso = ms => new Date(ms).toISOString();
function instant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)) return NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && iso(parsed).replace('.000Z', 'Z') === value.replace('.000Z', 'Z') ? parsed : NaN;
}
function check(ok, message) { if (!ok) throw Error(message); }

export function validateHourlyRain(data, now = Date.now()) {
  check(Number.isFinite(now), 'Invalid current time');
  check(data?.schemaVersion === 1 && data.kind === 'hourly_model_rainfall' && data.model === 'NOAA GFS 0.25°', 'Unsupported hourly rainfall');
  check(data.source === HOURLY_RAIN_SOURCE && data.terms === 'https://www.weather.gov/disclaimer', 'Unsupported source links');
  check(data.intervalHours === 1 && data.units?.rainMm === 'mm/1h' && data.pastDataKind === 'archived_forecast_model_estimate', 'Unsupported rainfall semantics');
  const captured = instant(data.capturedAt), generated = instant(data.generatedAt);
  check(Number.isFinite(captured) && captured <= now + 300000 && Number.isFinite(generated) && generated >= captured && generated <= now + 300000, 'Invalid capture/generated time');
  const grid = data.grid;
  check(grid?.type === 'regular_ll' && grid.spacingDegrees === .25 && JSON.stringify(grid.bbox) === JSON.stringify(BBOX), 'Unsupported grid');
  check(Array.isArray(grid.points) && grid.points.length === 198, 'Incomplete regional grid');
  grid.points.forEach((p, i) => check(Array.isArray(p) && p.length === 2 && p[0] === 79.5 + (i % 11) * .25 && p[1] === 5.75 + Math.floor(i / 11) * .25, 'Grid order/coordinates changed'));
  check(Array.isArray(data.runs) && data.runs.length >= 1 && data.runs.length <= 2, 'Unsupported model runs');
  const runs = new Map();
  const runTimes = new Set();
  for (const r of data.runs) {
    const time = instant(r.runAt);
    check(Number.isFinite(time) && time % (6 * HOUR) === 0 && time <= captured && !runTimes.has(time), 'Invalid/duplicate model run');
    check(r.source === HOURLY_RAIN_SOURCE, 'Invalid run source');
    runs.set(r.runAt, time);
    runTimes.add(time);
  }
  check(Array.isArray(data.frames) && data.frames.length > 0 && data.frames.length <= 120, 'Missing/oversized hourly intervals');
  let previousEnd = -Infinity;
  for (const f of data.frames) {
    const run = runs.get(f.runAt), start = instant(f.intervalStart), end = instant(f.validAt);
    check(run !== undefined && Number.isInteger(f.startStep) && f.startStep >= 0 && f.endStep === f.startStep + 1 && f.endStep <= 120, 'Invalid native hourly step');
    check(start === run + f.startStep * HOUR && end === run + f.endStep * HOUR && start >= previousEnd, 'Invalid/overlapping time axis');
    previousEnd = end;
    check(f.packingToleranceMm === null || (Number.isFinite(f.packingToleranceMm) && f.packingToleranceMm >= 0 && f.packingToleranceMm <= 1), 'Invalid packing tolerance');
    check(Array.isArray(f.rainMm) && Array.isArray(f.rainQuality) && f.rainMm.length === 198 && f.rainQuality.length === 198, 'Incomplete hourly field');
    for (let i = 0; i < 198; i++) {
      const value = f.rainMm[i], quality = f.rainQuality[i];
      check(value === null ? BAD.has(quality) : Number.isFinite(value) && value >= 0 && value <= 1000 && GOOD.has(quality) && f.packingToleranceMm !== null, 'Invalid precipitation/quality');
    }
  }
  return data;
}

export function parseHourlyRainText(raw, now = Date.now()) {
  check(typeof raw === 'string' && raw.length <= MAX_HOURLY_RAIN_TEXT_LENGTH, 'Hourly rainfall too large or invalid');
  return validateHourlyRain(JSON.parse(raw), now);
}

function distance(a, b) {
  const rad = Math.PI / 180;
  const h = Math.sin((b[1] - a[1]) * rad / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin((b[0] - a[0]) * rad / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}
function windowAt(start, kind, frames, index) {
  const rows = Array.from({length: 24}, (_, i) => {
    const t = start + i * HOUR, f = frames.get(t), value = f?.rainMm[index];
    const available = Number.isFinite(value) && value !== null && GOOD.has(f?.rainQuality[index]);
    return {intervalStart: iso(t), validAt: iso(t + HOUR), rainMm: available ? value : null,
      rainQuality: f?.rainQuality[index] || 'missing_interval', status: available ? 'available' : 'unavailable', kind,
      runAt: f?.runAt || null, source: HOURLY_RAIN_SOURCE, startStep: f?.startStep ?? null, endStep: f?.endStep ?? null};
  });
  const complete = rows.every(r => r.status === 'available');
  return {status: complete ? 'complete' : 'incomplete', start: iso(start), end: iso(start + 24 * HOUR),
    totalMm: complete ? Math.round(rows.reduce((sum, r) => sum + r.rainMm, 0) * 10000) / 10000 : null,
    kind, rows, runAts: [...new Set(rows.map(r => r.runAt).filter(Boolean))]};
}

export function selectHourlyRain(data, point, now = Date.now()) {
  const clock = Number.isFinite(now) ? now : Date.now(), floor = Math.floor(clock / HOUR) * HOUR, ceil = Math.ceil(clock / HOUR) * HOUR;
  const base = {status: 'unavailable', gridPoint: null, distanceKm: null, gridSpacingDegrees: .25,
    past24: windowAt(floor - 24 * HOUR, 'historical_model_estimate', new Map(), -1),
    next24: windowAt(ceil, 'model_forecast', new Map(), -1), currentHourExcluded: floor !== ceil,
    sources: [{name: 'NOAA GFS', url: HOURLY_RAIN_SOURCE}], warnings: []};
  try { validateHourlyRain(data, now); } catch { return {...base, warnings: ['Hourly model rainfall is unavailable or failed validation. Unknown is not zero rainfall or an all-clear.']}; }
  if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) return {...base, status: 'invalid_location'};
  if (point[0] < BBOX[0] || point[0] > BBOX[2] || point[1] < BBOX[1] || point[1] > BBOX[3]) return {...base, status: 'outside_coverage'};
  let index = 0, nearest = Infinity;
  data.grid.points.forEach((p, i) => { const d = distance(point, p); if (d < nearest) { index = i; nearest = d; } });
  const frames = new Map(data.frames.map(f => [instant(f.intervalStart), f]));
  const past24 = windowAt(floor - 24 * HOUR, 'historical_model_estimate', frames, index);
  const next24 = windowAt(ceil, 'model_forecast', frames, index);
  const warnings = ['Past rainfall is an archived forecast/model estimate, not measured rainfall or reanalysis.', 'Nearest 0.25° model grid point (about 28 km); not a property-level rainfall measurement.'];
  if (floor !== ceil) warnings.push('The ongoing UTC hour is excluded. Totals cover completed/upcoming whole hours, not an exact rolling 24 hours from now.');
  const ageHours = (clock - instant(data.capturedAt)) / HOUR;
  const latestFutureRun = Math.max(...next24.runAts.map(instant));
  const stale = ageHours > 12 || (Number.isFinite(latestFutureRun) && clock - latestFutureRun > 18 * HOUR);
  if (stale) warnings.push('This model snapshot is old. Check its capture time and forecast run before using it.');
  const known = [...past24.rows, ...next24.rows].some(r => r.status === 'available');
  const status = !known ? 'unavailable' : stale ? 'stale' : past24.status === 'complete' && next24.status === 'complete' ? 'available' : 'partial';
  return {...base, status, gridPoint: data.grid.points[index], distanceKm: nearest, index, past24, next24, warnings,
    capturedAt: data.capturedAt, generatedAt: data.generatedAt, ageHours};
}
