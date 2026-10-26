export function selectTides(data,districts,now=Date.now()){
  if(!districts.includes('LK11'))return {status:'outside'};
  if(data?.schemaVersion!==1||data.kind!=='astronomical_station_prediction'||data.stationId!=='colombo-115c-lka-uhslc_rq'||data.datum!=='dataset LAT'||data.units!=='m'||data.observationAt!==null||!Array.isArray(data.events)||data.events.length<6)throw Error('Unsupported tide snapshot');
  if(data.source?.url!=='https://doi.org/10.17882/109129'||data.source.licence!=='https://creativecommons.org/licenses/by/4.0/'||data.engine?.url!=='https://github.com/openwatersio/slackwater')throw Error('Unexpected tide source');
  const start=Date.parse(data.validFrom),end=Date.parse(data.validUntil);
  if(!Number.isFinite(now)||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>3*86400000)throw Error('Invalid tide interval');
  let previous=start-1,kind;
  for(const e of data.events){const at=Date.parse(e.at);if(!Number.isFinite(at)||at<=previous||at<start||at>=end||!['high','low'].includes(e.kind)||e.kind===kind||!Number.isFinite(e.heightMetres)||e.heightMetres<-.5||e.heightMetres>2)throw Error('Invalid tide event');previous=at;kind=e.kind;}
  if(now<start)return {status:'clock_unknown'};
  if(now>=end)return {status:'expired'};
  const events=data.events.filter(e=>Date.parse(e.at)>now);
  const high=events.find(e=>e.kind==='high'),low=events.find(e=>e.kind==='low');
  if(!high||!low)return {status:'incomplete'};
  return {status:'available',events:[high,low].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))};
}
