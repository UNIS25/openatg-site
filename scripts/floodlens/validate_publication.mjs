// Deterministic publication gate; never interprets warnings or news.
import {readFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateForecast,futureDayWindow,selectPoint} from '../../floodlens/forecast-model.mjs';
import {cloudState} from '../../floodlens/clouds-model.mjs';
import {selectTides} from '../../floodlens/tides-model.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
async function raw(path){const s=await lstat(path);if(!s.isFile()||s.isSymbolicLink()||s.size>2000000)throw Error('Unexpected file type/size');return readFile(path);}
const json=async p=>JSON.parse(await raw(p));
const validTime=(value,now)=>{const t=Date.parse(value);if(!Number.isFinite(t)||t>now)throw Error('Invalid/future source time');return t;};
export async function validateGroup(group,dir,beforeDir,now=Date.now()){
 if(group==='forecast'){
  const bytes=await raw(dir+'/forecast.json'),d=JSON.parse(bytes),p=await json(dir+'/provenance.json'),old=await json(beforeDir+'/forecast.json');validateForecast(d,now);
  if(Date.parse(d.runAt)<Date.parse(old.runAt)||now-Date.parse(d.runAt)>18*3600000||d.captureErrors.length||p.errors.length||p.runAt!==d.runAt||p.forecastSha256!==sha(bytes)||p.forecastBytes!==bytes.length)throw Error('Regressed/incomplete forecast or provenance');
  validTime(d.generatedAt,now);validTime(d.capturedAt,now);
  if(p.sources.length!==(d.frames.length+1)*4||p.sources.filter(s=>s.kind==='grib').length!==(d.frames.length+1)*3)throw Error('Incomplete GRIB provenance');
  for(const s of p.sources){if(!s.url.startsWith('https://data.ecmwf.int/forecasts/')||!/^[a-f0-9]{64}$/.test(s.sha256)||!Number.isInteger(s.bytes)||s.bytes<20||s.bytes>2000000)throw Error('Invalid source identity');validTime(s.retrievedAt,now);}
  for(const f of d.frames)for(let i=0;i<198;i++)if(f.rainMm[i]===null||f.windUms[i]===null||f.windVms[i]===null||Math.hypot(f.windUms[i],f.windVms[i])>150)throw Error('Incomplete grid cell');
  for(const point of d.grid.points){const window=futureDayWindow(selectPoint(d,point,now).frames,now);if(!window||Date.parse(window.start)>now+3*3600000)throw Error('No complete upcoming day beginning within three hours');}
 }else if(group==='clouds'){
  const d=await json(dir+'/clouds.json'),p=await json(dir+'/provenance.json'),old=await json(beforeDir+'/clouds.json');
  if(d.schemaVersion!==2||cloudState(d,now).status!=='available'||Date.parse(d.capturedAt)<Date.parse(old.capturedAt))throw Error('Old/unavailable cloud capture');
  validTime(d.retrievedAt,now);if(d.pixelWidth!==189||d.pixelHeight!==274||p.matrix.resolutionDegrees!==9/512||p.capabilitiesUrl!=='https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml'||!/^[a-f0-9]{64}$/.test(p.capabilitiesSha256))throw Error('Changed cloud grid/source');
  if(new Set(d.frames.map(f=>f.sha256)).size!==3)throw Error('Repeated source frames');
  for(const [i,f]of d.frames.entries()){
   if(f.path!==`/floodlens/data/clouds/frame-${i}.png`)throw Error('Unapproved image path');
   const b=await raw(dir+`/frame-${i}.png`);if(b.length!==f.bytes||sha(b)!==f.sha256||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||b.readUInt32BE(16)!==189||b.readUInt32BE(20)!==274)throw Error('Image hash/shape mismatch');
   if(f.samples?.length!==4||f.samples.some(s=>s.rgba?.length!==4||s.rgba[3]===0))throw Error('Missing public coverage checks');
   const sources=p.sources.filter(s=>s.captureAt===f.captureAt);if(sources.length!==4||new Set(sources.map(s=>s.tileRow+','+s.tileCol)).size!==4)throw Error('Missing cloud tiles');
   for(const s of sources){if(!s.url.startsWith('https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/Himawari_AHI_Band13_Clean_Infrared/default/'+f.captureAt+'/2km/5/')||!(/^[a-f0-9]{64}$/).test(s.sha256))throw Error('Unexpected cloud source');validTime(s.retrievedAt,now);}
  }
 }else if(group==='tides'){
  const b=await raw(dir+'/colombo.json'),d=JSON.parse(b),v=await json(dir+'/validation.json'),old=await json(beforeDir+'/colombo.json');
  if(selectTides(d,['LK11'],now).status!=='available'||Date.parse(d.validUntil)<now+24*3600000||Date.parse(d.validUntil)<Date.parse(old.validUntil))throw Error('Incomplete/regressed tide coverage');
  validTime(d.calculatedAt,now);
  if(d.source.sha256!==sha(await raw('floodlens/data/tides/colombo-source.json'))||d.engine.sha256!==sha(await raw('scripts/floodlens/vendor/slackwater.mjs'))||v.predictionSha256!==sha(b)||v.validFrom!==d.validFrom||v.validUntil!==d.validUntil)throw Error('Tide input/validation mismatch');
  if(v.samples!==2881||v.constituents!==36||!Number.isFinite(v.maxDifferenceMetres)||v.maxDifferenceMetres>.02||v.extremaComparison.length<6||v.extremaComparison.some(e=>!Number.isFinite(e.differenceMinutes)||e.differenceMinutes>5))throw Error('Independent tide check failed');
 }else throw Error('Unsupported publication group');
 return true;
}
if(process.argv[1]?.endsWith('/validate_publication.mjs')){await validateGroup(process.argv[2],process.argv[3],process.argv[4]);console.log('Validated '+process.argv[2]);}
