import {validateSnapshot, warningState, warningMatches} from './core.mjs?v=20261027-31';
import {validateForecast, wind} from './forecast-model.mjs?v=20261027-31';

// Each layer retains its own meaning and clock. No cross-layer risk score.
export function warningLayer(snapshot, catalog, overview, kind, now=Date.now()) {
  validateSnapshot(snapshot);
  if(!['flood','landslide','rain','lightning'].includes(kind))throw Error('Unsupported warning kind');
  if(!Number.isFinite(Date.parse(snapshot.reviewedAt))||Date.parse(snapshot.reviewedAt)>now)throw Error('Unreviewed warning time');
  const bulletins=snapshot.bulletins.filter(w=>w.kind===kind&&warningState(w,now)==='active');
  const divisions=new Map(catalog.divisions.map(a=>[a.code,a]));
  const areas=overview.features.flatMap(feature=>{
    const area=divisions.get(feature.properties.code);
    if(!area)return [];
    const matches=bulletins.filter(w=>warningMatches(w,area));
    if(!matches.length)return [];
    const level=kind==='landslide'?Math.max(...matches.flatMap(w=>w.areas.filter(a=>a.divisionCode===area.code).map(a=>a.level||0))):2;
    if(![1,2,3].includes(level))throw Error('Unknown warning level');
    return [{feature,area,level,bulletins:matches}];
  });
  const known=new Set(overview.features.map(f=>f.properties.code));
  const unmapped=bulletins.flatMap(w=>w.areas.filter(a=>!known.has(a.divisionCode)).map(a=>({bulletin:w,area:a})));
  return {bulletins,areas,unmapped,reviewedAt:snapshot.reviewedAt,reviewOlder:now-Date.parse(snapshot.reviewedAt)>3*3600000};
}

export function forecastLayer(data, now=Date.now()) {
  validateForecast(data,now);
  // Exactly the same complete native intervals as the location summary.
  const frames=data.frames.filter(f=>Date.parse(f.intervalStart)>=now).slice(0,8);
  if(frames.length!==8||frames.some((f,i)=>i&&f.startStep!==frames[i-1].endStep))return {status:'incomplete',frames:[]};
  return {status:now-Date.parse(data.runAt)>18*3600000?'older_run':'available',frames,runAt:data.runAt};
}

export function forecastCells(data,frame,kind){
  if(!['rain','wind'].includes(kind))throw Error('Unsupported forecast layer');
  return data.grid.points.map((point,index)=>{
    const vector=wind(frame.windUms[index],frame.windVms[index]);
    return {id:String(index),point,value:kind==='rain'?frame.rainMm[index]:vector?.speedKmh??null,vector,kind,
      u:frame.windUms[index],v:frame.windVms[index],start:frame.intervalStart,end:frame.validAt};
  });
}

export function reviewedReports(media,locations,now=Date.now()){
  const url='https://www.dailymirror.lk/breaking-news/Two-reservoirs-release-7-400-cusecs-into-Mee-Oya-residents-warned/108-353450';
  if(media?.schemaVersion!==1||media.kind!=='reviewed_media_report'||media.url!==url||!Array.isArray(media.records))throw Error('Unsupported report');
  const published=Date.parse(media.publishedAt),reviewed=Date.parse(media.reviewedAt);
  if(!Number.isFinite(published)||!Number.isFinite(reviewed)||published>now||reviewed>now)throw Error('Invalid report time');
  if(now-published>48*3600000)return [];
  return media.records.map(record=>{
    const matches=locations.features.filter(f=>f.properties.tankCode===record.tankCode&&f.properties.name===record.name);
    if(matches.length!==1||!Number.isInteger(record.gateCount)||record.gateCount<0||!Number.isFinite(record.spillCusecs)||record.spillCusecs<0)throw Error('Unresolved report identity');
    const point=matches[0].geometry.coordinates;
    if(!point.every(Number.isFinite)||point[0]<79||point[0]>83||point[1]<5||point[1]>11)throw Error('Invalid reported structure location');
    return {...record,point,source:media.source,url:media.url,publishedAt:media.publishedAt,reviewedAt:media.reviewedAt,operationAt:media.operationAt};
  });
}

export function cycloneState(data,now=Date.now()){
  if(data?.schemaVersion!==1||data.kind!=='reviewed_official_cyclone_forecast'||data.agency!=='IMD / RSMC New Delhi'||!Array.isArray(data.points)||data.points.length<2)throw Error('Unsupported cyclone snapshot');
  const u=new URL(data.source.url);if(u.protocol!=='https:'||u.hostname!=='mausam.imd.gov.in'||!u.pathname.endsWith('.pdf')||!/^[a-f0-9]{64}$/.test(data.source.sha256))throw Error('Invalid official cyclone source');
  const issued=Date.parse(data.issuedAt),observed=Date.parse(data.analysisAt),valid=Date.parse(data.validUntil),next=Date.parse(data.nextReviewDueAt),reviewed=Date.parse(data.reviewedAt);
  if(![issued,observed,valid,next,reviewed,now].every(Number.isFinite)||observed>issued||valid<=issued||valid-issued>120*3600000||next<=issued||reviewed<issued)throw Error('Invalid cyclone time');
  let previous=observed-1;
  for(const [i,p]of data.points.entries()){
    const t=Date.parse(p.at);
    if(!Number.isFinite(t)||t<=previous||t<observed||t>valid||p.type!==(i===0?'reported':'forecast')||!Array.isArray(p.point)||p.point.length!==2||!p.point.every(Number.isFinite)||p.point[0]<40||p.point[0]>110||p.point[1]<0||p.point[1]>40||!Array.isArray(p.windKmh)||p.windKmh.length!==2||!p.windKmh.every(Number.isFinite)||p.windKmh[0]<0||p.windKmh[1]<p.windKmh[0]||p.windKmh[1]>350||!Number.isFinite(p.gustKmh)||p.gustKmh<p.windKmh[1])throw Error('Invalid cyclone forecast row');
    previous=t;
  }
  if(data.points[0].at!==data.analysisAt)throw Error('Cyclone analysis mismatch');
  return {status:now<issued||now<reviewed?'clock_unknown':now>=valid?'expired':now>=next?'review_due':'available',data};
}
