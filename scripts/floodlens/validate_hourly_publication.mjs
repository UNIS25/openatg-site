// Hourly rainfall is an isolated, fixed-source model-data publication group.
import {readFile, lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateHourlyRain, selectHourlyRain, HOURLY_RAIN_SOURCE} from '../../floodlens/hourly-rain-model.mjs';
const HOUR = 3600000;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (ok, message) => { if (!ok) throw Error(message); };
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
async function raw(path) {
  const stat = await lstat(path);
  check(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 2000000, 'Unexpected hourly file type/size');
  return readFile(path);
}
function time(value, now) {
  const result = typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value) ? Date.parse(value) : NaN;
  check(Number.isFinite(result) && result <= now, 'Invalid/future hourly source time');
  return result;
}
function noReviewStamp(value) {
  if (!value || typeof value !== 'object') return;
  check(!Object.hasOwn(value, 'reviewedAt'), 'Automated hourly data must not claim human review');
  for (const child of Object.values(value)) if (typeof child === 'object') noReviewStamp(child);
}
function sourceUrl(runAt, step) {
  const day = runAt.slice(0, 10).replaceAll('-', ''), hour = runAt.slice(11, 13);
  return 'https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25_1hr.pl?' + new URLSearchParams({
    file: `gfs.t${hour}z.pgrb2.0p25.f${String(step).padStart(3, '0')}`,
    lev_surface: 'on', var_APCP: 'on', subregion: '', leftlon: '79.5', rightlon: '82.0', toplat: '10.0', bottomlat: '5.75', dir: `/gfs.${day}/${hour}/atmos`
  });
}
function validateMessages(source) {
  const run = Date.parse(source.runAt), valid = new Date(run + source.step * HOUR).toISOString();
  const expected = {
    edition: 2, centre: 'kwbc', shortName: 'tp', paramId: 228228, units: 'kg m**-2',
    dataDate: Number(source.runAt.slice(0, 10).replaceAll('-', '')), dataTime: Number(source.runAt.slice(11, 13)) * 100,
    validityDate: Number(valid.slice(0, 10).replaceAll('-', '')), validityTime: Number(valid.slice(11, 13)) * 100,
    stepType: 'accum', stepUnits: 1, endStep: source.step, typeOfLevel: 'surface', level: 0,
    typeOfStatisticalProcessing: 1, numberOfTimeRanges: 1, gridType: 'regular_ll', Ni: 11, Nj: 18,
    iDirectionIncrementInDegrees: .25, jDirectionIncrementInDegrees: .25,
    latitudeOfFirstGridPointInDegrees: 5.75, longitudeOfFirstGridPointInDegrees: 79.5,
    latitudeOfLastGridPointInDegrees: 10, longitudeOfLastGridPointInDegrees: 82,
    iScansNegatively: 0, jScansPositively: 1, jPointsAreConsecutive: 0, alternativeRowScanning: 0, numberOfMissing: 0
  };
  check(Array.isArray(source.messages) && source.messages.length === 2, 'Incomplete hourly GRIB provenance');
  for (const message of source.messages) {
    const meta = message.metadata;
    check(hash(message.sha256) && meta && Object.entries(expected).every(([key, value]) => meta[key] === value), 'Hourly GRIB source identity mismatch');
    check([0, 1].includes(meta.bitmapPresent) && meta.packingType === 'grid_simple' && Number.isInteger(meta.bitsPerValue) && meta.bitsPerValue >= 0 && meta.bitsPerValue <= 32 && Number.isFinite(meta.packingError) && meta.packingError >= 0 && meta.packingError <= .5, 'Invalid hourly GRIB quality/packing');
  }
  const starts = source.messages.map(m => m.metadata.startStep).sort((a, b) => a - b);
  check(starts[0] === 0 && starts[1] === Math.floor((source.step - 1) / 6) * 6, 'Changed hourly accumulation origins');
}

export async function validateHourlyPublication(dir, beforeDir, now = Date.now()) {
  const bytes = await raw(dir + '/hourly-rain.json');
  const data = JSON.parse(bytes), manifest = JSON.parse(await raw(dir + '/provenance.json'));
  const old = JSON.parse(await raw(beforeDir + '/hourly-rain.json'));
  validateHourlyRain(data, now); validateHourlyRain(old, now);
  noReviewStamp(data); noReviewStamp(manifest);
  check(manifest.schemaVersion === 1 && manifest.source === HOURLY_RAIN_SOURCE && manifest.terms === data.terms && manifest.hourlyRainSha256 === sha(bytes) && manifest.hourlyRainBytes === bytes.length, 'Hourly data/provenance identity mismatch');
  check(Array.isArray(data.captureErrors) && data.captureErrors.length === 0 && Array.isArray(manifest.errors) && manifest.errors.length === 0, 'Incomplete hourly capture');
  check(['ecCodes', 'pythonPackage'].every(key => typeof manifest.decoder?.[key] === 'string' && manifest.decoder[key].length > 0 && manifest.decoder[key].length < 100), 'Missing hourly decoder identity');
  const captured = time(data.capturedAt, now), generated = time(data.generatedAt, now), created = time(manifest.createdAt, now);
  check(created >= generated && generated >= captured && captured >= time(old.capturedAt, now), 'Regressed hourly capture or provenance time');
  const runs = data.runs.map(r => time(r.runAt, now)), oldRuns = old.runs.map(r => time(r.runAt, now));
  check(Math.min(...runs) >= Math.min(...oldRuns) && Math.max(...runs) >= Math.max(...oldRuns), 'Regressed hourly model run');
  const required = new Set();
  for (const frame of data.frames) {
    required.add(frame.runAt + '/' + frame.endStep);
    if (frame.startStep > 0) required.add(frame.runAt + '/' + frame.startStep);
    check(frame.rainMm.every(Number.isFinite), 'Incomplete hourly grid cell');
  }
  check(Array.isArray(manifest.sources) && manifest.sources.length === required.size, 'Incomplete hourly source provenance');
  let latestRetrieval = -Infinity;
  const runSet = new Set(data.runs.map(r => r.runAt));
  for (const source of manifest.sources) {
    const key = source.runAt + '/' + source.step;
    check(required.delete(key) && runSet.has(source.runAt) && Number.isInteger(source.step) && source.step >= 1 && source.step <= 120, 'Unexpected or duplicate hourly source');
    check(source.url === sourceUrl(source.runAt, source.step) && hash(source.sha256) && Number.isInteger(source.bytes) && source.bytes >= 40 && source.bytes <= 65536, 'Invalid hourly source URL/bytes/hash');
    const retrieved = time(source.retrievedAt, now);
    check(retrieved >= time(source.runAt, now) && retrieved <= captured, 'Hourly source retrieval time mismatch');
    latestRetrieval = Math.max(latestRetrieval, retrieved);
    validateMessages(source);
  }
  check(required.size === 0 && latestRetrieval === captured, 'Hourly capture time does not match source retrievals');
  for (const point of data.grid.points) {
    const selection = selectHourlyRain(data, point, now);
    check(selection.status === 'available' && selection.past24.status === 'complete' && selection.next24.status === 'complete', 'No complete fresh past/upcoming hourly day');
  }
  return true;
}
