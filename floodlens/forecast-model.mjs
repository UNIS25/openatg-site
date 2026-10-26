// Forecast semantics only. No connection to official warning severity.
export function validateForecast(data, now = Date.now()) {
  if (!data || data.schemaVersion !== 1 || data.kind !== 'model_forecast' || data.model !== 'ECMWF IFS control') throw Error('Unsupported forecast');
  if (data.units?.rainMm!=='mm/3h'||data.units?.windUms!=='m/s'||data.units?.windVms!=='m/s') throw Error('Unsupported physical units');
  if(data.source!=='https://www.ecmwf.int/en/forecasts/datasets/open-data'||data.licence!=='https://creativecommons.org/licenses/by/4.0/'||data.terms!=='https://apps.ecmwf.int/datasets/licences/general/')throw Error('Unsupported source links');
  const run = Date.parse(data.runAt), captured = Date.parse(data.capturedAt);
  if (!Number.isFinite(run) || run > now || !Number.isFinite(captured) || captured < run || captured > now + 300000) throw Error('Invalid model run/capture time');
  if (data.intervalHours !== 3 || data.grid?.spacingDegrees !== .25 || data.grid.type !== 'regular_ll') throw Error('Unsupported forecast grid');
  const {bbox, points} = data.grid;
  if (JSON.stringify(bbox) !== '[79.5,5.75,82,10]' || !Array.isArray(points) || points.length !== 198) throw Error('Unexpected regional coverage');
  for (let i = 0; i < points.length; i++) {
    if (points[i][0] !== 79.5 + (i % 11) * .25 || points[i][1] !== 5.75 + Math.floor(i / 11) * .25) throw Error('Grid order/coordinates changed');
  }
  if (!Array.isArray(data.frames) || !data.frames.length || data.frames.length > 48) throw Error('Missing forecast intervals');
  let previousEnd;
  for (const f of data.frames) {
    if (!Number.isInteger(f.startStep) || f.startStep < 0 || f.endStep !== f.startStep + 3 || (previousEnd !== undefined && f.startStep !== previousEnd)) throw Error('Incomplete time axis');
    previousEnd = f.endStep;
    if (Date.parse(f.intervalStart) !== run + f.startStep * 3600000 || Date.parse(f.validAt) !== run + f.endStep * 3600000) throw Error('Mismatched valid time');
    for (const key of ['rainMm', 'rainQuality', 'windUms', 'windVms']) if (!Array.isArray(f[key]) || f[key].length !== points.length) throw Error('Incomplete field');
    for (let i = 0; i < points.length; i++) {
      const rain=f.rainMm[i], quality=f.rainQuality[i], hasRain=rain!==null;
      if (hasRain && (!Number.isFinite(rain) || rain < 0 || rain > 3000)) throw Error('Invalid precipitation');
      if (hasRain !== ['valid','within_packing_tolerance'].includes(quality)) throw Error('Invalid precipitation quality');
      for (const key of ['windUms','windVms']) if(f[key][i]!==null && (!Number.isFinite(f[key][i]) || Math.abs(f[key][i])>150)) throw Error('Invalid wind');
    }
  }
  return data;
}
export function wind(u, v) {
  if (!Number.isFinite(u) || !Number.isFinite(v) || u === null || v === null) return null;
  const speedMs=Math.hypot(u,v);if(speedMs>150)return null;
  return {speedMs,speedKmh:speedMs*3.6,fromDegrees:speedMs<.5?null:(Math.atan2(u,v)*180/Math.PI+180)%360};
}
export function distanceKm(a,b){const r=Math.PI/180,dlat=(b[1]-a[1])*r,dlon=(b[0]-a[0])*r;const h=Math.sin(dlat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dlon/2)**2;return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)));}
export function selectPoint(data, point, now=Date.now()) {
  validateForecast(data,now);
  if (!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))return {status:'invalid_location'};
  const [x,y]=point,[west,south,east,north]=data.grid.bbox;
  if(x<west||x>east||y<south||y>north)return {status:'outside_coverage'};
  let index=0,distance=Infinity;
  data.grid.points.forEach((p,i)=>{const d=distanceKm(point,p);if(d<distance){index=i;distance=d;}});
  const ageHours=(now-Date.parse(data.runAt))/3600000;
  const frames=data.frames.map(f=>({startStep:f.startStep,endStep:f.endStep,intervalStart:f.intervalStart,validAt:f.validAt,rainMm:f.rainMm[index],rainQuality:f.rainQuality[index],wind:wind(f.windUms[index],f.windVms[index]),elapsed:Date.parse(f.validAt)<=now}));
  return {status:frames.every(f=>f.elapsed)?'expired':ageHours>18?'older_run':'available',ageHours,index,gridPoint:data.grid.points[index],distanceKm:distance,frames};
}
export function completeTotal(frames){if(!frames.length||frames.some(f=>f.rainMm===null||!Number.isFinite(f.rainMm)||f.endStep-f.startStep!==3))return null;for(let i=1;i<frames.length;i++)if(frames[i].startStep!==frames[i-1].endStep)return null;return frames.reduce((a,f)=>a+f.rainMm,0);}

export function futureDayWindow(frames,now=Date.now()) {const upcoming=frames.filter(f=>Date.parse(f.intervalStart)>=now).slice(0,8);const total=upcoming.length===8?completeTotal(upcoming):null;return total===null?null:{rainMm:total,start:upcoming[0].intervalStart,end:upcoming[7].validAt};}
