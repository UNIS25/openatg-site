// Manual reviewed publication only. No network, user location or scheduler writes.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createTidePredictor,constituents} from './vendor/slackwater.mjs';
const sourcePath='floodlens/data/tides/colombo-source.json';
const raw=await readFile(sourcePath),source=JSON.parse(raw);
if(source.source.id!=='colombo-115c-lka-uhslc_rq'||source.license.type!=='cc-by-4.0'||!source.license.commercial_use||source.harmonic_constituents.length!==50||source.chart_datum!=='LAT')throw Error('Unexpected station contract');
for(const c of source.harmonic_constituents)if(!constituents[c.name]||!Number.isFinite(c.amplitude)||c.amplitude<0||!Number.isFinite(c.phase))throw Error('Unsupported constituent');
const start=new Date('2026-10-26T18:30:00Z'),end=new Date('2026-10-28T18:30:00Z');
const offset=source.datums.MSL-source.datums.LAT;
if(Math.abs(offset-.461)>1e-9)throw Error('Datum changed');
const predictor=createTidePredictor(source.harmonic_constituents,{offset});
const events=predictor.getExtremesPrediction({start,end}).filter(e=>e.time>=start&&e.time<end).map(e=>({at:e.time.toISOString(),kind:e.high?'high':'low',heightMetres:Math.round(e.level*1000)/1000}));
if(events.length<6||events.length>10||events.some((e,i)=>!Number.isFinite(e.heightMetres)||e.heightMetres<-.5||e.heightMetres>2||(i&& (Date.parse(e.at)-Date.parse(events[i-1].at)<3*3600000||e.kind===events[i-1].kind))))throw Error('Unexpected tide events');
const sha=b=>createHash('sha256').update(b).digest('hex');
const result={schemaVersion:1,kind:'astronomical_station_prediction',station:'Colombo',stationId:source.source.id,stationPoint:[source.longitude,source.latitude],displayDistricts:['LK11'],datum:'dataset LAT',units:'m',timezone:'Asia/Colombo',validFrom:start.toISOString(),validUntil:end.toISOString(),calculatedAt:new Date().toISOString(),observationAt:null,events,source:{url:'https://doi.org/10.17882/109129',attribution:'Hart-Davis, M., Dettmering, D. and Seitz, F. (2025), TICON-4. Adapted via Open Waters Slackwater station database.',licence:'https://creativecommons.org/licenses/by/4.0/',recordUrl:'https://github.com/openwatersio/slackwater-database/blob/4f50567f638388c75c3f3b31e4cbcc10738d9734/data/ticon/colombo-115c-lka-uhslc_rq.json',sha256:sha(raw),harmonicEpoch:source.epoch,datumEpoch:source.datum_epoch,datumOffsetMetres:offset},engine:{name:'@slackwater/engine',version:'1.0.0-beta.0',licence:'MIT',url:'https://github.com/openwatersio/slackwater',sha256:sha(await readFile('scripts/floodlens/vendor/slackwater.mjs'))},limits:'Station astronomical prediction from historical harmonics; not measured sea level, surge, a navigation chart, or a flood drainage forecast. No validated transfer to Puttalam or other stations.',validation:{method:'Independent uptide 1.2 comparison of 36 shared constituents at 5-minute samples. Numerical agreement is not observed accuracy; all 50 source constituents are used in published predictions.',report:'/floodlens/data/tides/validation.json'}};
await writeFile('floodlens/data/tides/colombo.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({events:events.length,first:events[0],validUntil:result.validUntil}));
