import {readFile,writeFile} from 'node:fs/promises';
import {createTidePredictor} from './vendor/slackwater.mjs';
import {createHash} from 'node:crypto';
const out=process.argv[2],raw=await readFile(out+'/colombo.json'),d=JSON.parse(await readFile('floodlens/data/tides/colombo-source.json')),u=JSON.parse(await readFile(out+'/independent-input.json'));
const cs=d.harmonic_constituents.filter(c=>u.constituents.includes(c.name)),p=createTidePredictor(cs,{offset:d.datums.MSL-d.datums.LAT}),start=new Date(u.values[0].time),end=new Date(u.values.at(-1).time);
const timeline=p.getTimelinePrediction({start,end,timeFidelity:60});
if(u.values.length!==2881||cs.length!==36||timeline.length!==2881)throw Error('Incomplete numerical comparison');
const diffs=u.values.map((v,i)=>Math.abs(v.level-timeline[i].level));
// Refine the independent 1-minute extrema with the local quadratic vertex.
// The bracket is always +/-0.5 min; never search for a more convenient peak.
const peaks=[];for(let i=1;i<u.values.length-1;i++){
 const v=u.values[i],a=u.values[i-1].level,b=u.values[i+1].level,high=v.level>a&&v.level>b,low=v.level<a&&v.level<b;
 if(high||low){const delta=.5*(a-b)/(a-2*v.level+b);if(!Number.isFinite(delta)||Math.abs(delta)>.5)throw Error('Unbracketed independent extremum');peaks.push({...v,time:new Date(Date.parse(v.time)+delta*60000).toISOString(),high});}
}

const extremes=p.getExtremesPrediction({start,end}).filter(e=>e.time>=start&&e.time<end);
const pairs=extremes.map(e=>{const candidates=peaks.filter(v=>v.high===e.high);if(!candidates.length)throw Error('Missing independent extrema');const m=candidates.reduce((a,b)=>Math.abs(Date.parse(b.time)-e.time)<Math.abs(Date.parse(a.time)-e.time)?b:a);return {engineAt:e.time.toISOString(),uptideAt:m.time,differenceMinutes:Math.abs(Date.parse(m.time)-e.time)/60000};});
const report={samples:2881,constituents:36,thresholds:{maxDifferenceMetres:.02,maxExtremaDifferenceMinutes:5},maxDifferenceMetres:Math.max(...diffs),rmsDifferenceMetres:Math.sqrt(diffs.reduce((s,x)=>s+x*x,0)/diffs.length),extremaComparison:pairs,validFrom:start.toISOString(),validUntil:end.toISOString(),predictionSha256:createHash('sha256').update(raw).digest('hex'),extremaMethod:'Quadratic vertex within adjacent 1-minute samples; no extrapolation beyond the extremum bracket.',scope:'Numerical agreement of 36 shared constituents only (different astronomical/nodal formulations; bounded to 2 cm and 5 minutes);  not validation against observed Colombo water levels. Heights omit surge and weather.'};
console.log(JSON.stringify(report));
if(!Number.isFinite(report.maxDifferenceMetres)||report.maxDifferenceMetres>.02||pairs.length<6||pairs.some(x=>x.differenceMinutes>5))throw Error('Independent tide comparison outside reviewed tolerance');
await writeFile(out+'/validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
