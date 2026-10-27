export const HOUR = 3600000;
export const CLIENT_VERSION = 8;
export function warningState(w, now=Date.now()) {
  const start=Date.parse(w.issuedAt),end=Date.parse(w.expiresAt);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||now<start) return 'unknown';
  return now<end?'active':'expired';
}
export function ageState(value, maxHours, now=Date.now()) {
  const time=Date.parse(value);
  if(!Number.isFinite(time)||time>now+5*60000) return 'unknown';
  return now-time>maxHours*HOUR?'stale':'fresh';
}
export function dailyAgeState(value, now=Date.now()) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return 'unknown';
  const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
  return value>localDate?'unknown':value<localDate?'stale':'daily';
}
export function warningMatches(w,area) {
  if(!area) return true;
  if(area.type==='district') return w.areas.some(a=>a.districtCode===area.code)||(w.districtCodes||[]).includes(area.code);
  return w.areas.some(a=>a.divisionCode===area.code)||(w.districtCodes||[]).includes(area.districtCode);
}
export function assessment(bulletins,area,now=Date.now()) {
  const relevant=bulletins.filter(w=>warningMatches(w,area));
  const current=relevant.filter(w=>warningState(w,now)==='active');
  // Broad rainfall context must not be presented as a location-specific flood/landslide warning.
  const local=current.filter(w=>!['rain','lightning'].includes(w.kind));
  if(local.length&&area) return area.type==='district'?'district':'matched';
  if(!area) return bulletins.some(w=>warningState(w,now)==='active')?'unknown':'expired';
  if(relevant.length&&!current.length) return 'expired';
  return 'unmatched';
}
// Evidence category, not probability or a claim of inundation at the pin.
// All plausible divisions count when GPS uncertainty crosses a boundary.
export function locationEvidence(bulletins,areas,{uncertain=false,now=Date.now()}={}) {
  const current=bulletins.filter(w=>warningState(w,now)==='active'&&areas.some(a=>warningMatches(w,a)));
  const ranked=current.filter(w=>w.kind==='landslide').map(w=>({w,level:Math.max(0,...w.areas.filter(a=>areas.some(c=>c.code===a.divisionCode)).map(a=>a.level||0))})).sort((a,b)=>b.level-a.level);
  const landslide=ranked[0]?.w,level=ranked[0]?.level||0;
  const flood=current.find(w=>w.kind==='flood'),lightning=current.find(w=>w.kind==='lightning'),rain=current.find(w=>w.kind==='rain');
  const source=level===3?landslide:flood||landslide||lightning||rain;
  return {source,kind:source?.kind||'unknown',level:source===landslide?level:0,uncertain,otherFlood:level===3&&Boolean(flood)};
}
// Reviewed absence is distinct from an expired bulletin awaiting another review.
// This never establishes that a location is safe or that sources are complete.
export function warningReviewStatus(data,areas,{now=Date.now(),online=true,loadFailed=false}={}) {
 if(!data||!areas.length||!online||loadFailed)return 'unknown';
 const reviewed=Date.parse(data.reviewedAt);
 if(!Number.isFinite(reviewed)||reviewed>now)return 'unknown';
 if(ageState(data.reviewedAt,3,now)!=='fresh')return 'stale';
 const relevant=data.bulletins.filter(w=>areas.some(a=>warningMatches(w,a)));
 if(relevant.some(w=>warningState(w,now)==='unknown'))return 'unknown';
 if(relevant.some(w=>warningState(w,now)==='active'))return 'active';
 if(relevant.some(w=>Date.parse(w.expiresAt)>reviewed))return 'expired_since_review';
 return 'reviewed_absence';
}
export function insideRing(point,ring) {
  let inside=false;const [x,y]=point;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [xi,yi]=ring[i],[xj,yj]=ring[j];
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)) inside=!inside;
  }return inside;
}
export function insideGeometry(point,geometry) {
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
  return polygons.some(rings=>insideRing(point,rings[0])&&!rings.slice(1).some(h=>insideRing(point,h)));
}
export function boundaryDistance(point,geometry) {
  // Local equirectangular metric only for GPS uncertainty around administrative edges.
  // Never used for river routing, arrival time or flood-risk distance.
  const scaleX=111320*Math.cos(point[1]*Math.PI/180),scaleY=111320;
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
  let result=Infinity;
  for(const polygon of polygons)for(const ring of polygon)for(let i=1;i<ring.length;i++) {
    const ax=(ring[i-1][0]-point[0])*scaleX,ay=(ring[i-1][1]-point[1])*scaleY,bx=(ring[i][0]-point[0])*scaleX,by=(ring[i][1]-point[1])*scaleY;
    const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy;
    const t=den?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/den)):0;
    result=Math.min(result,Math.hypot(ax+t*dx,ay+t*dy));
  }return result;
}
export function intersectsAccuracy(bbox,point,radius) {
  const dy=radius/111320,dx=dy/Math.cos(point[1]*Math.PI/180);
  return point[0]+dx>=bbox[0]&&point[0]-dx<=bbox[2]&&point[1]+dy>=bbox[1]&&point[1]-dy<=bbox[3];
}
export function locationCandidates(features,point,accuracy) {
  return features.filter(f=>insideGeometry(point,f.geometry)||boundaryDistance(point,f.geometry)<=accuracy+30);
}
export function validateSnapshot(d,clientVersion=CLIENT_VERSION) {
  if((Number.isInteger(d?.minClientVersion)&&d.minClientVersion>clientVersion)||(Number.isInteger(d?.schemaVersion)&&d.schemaVersion>1)){const error=new Error('Newer client required');error.code='CLIENT_UPDATE_REQUIRED';throw error;}
  if(d?.schemaVersion!==1||!Array.isArray(d.bulletins)||!Array.isArray(d.stations)||!Array.isArray(d.reservoirs)) throw Error('Invalid data schema');
  for(const w of d.bulletins) {
    if(!w.id||!['flood','landslide','rain','lightning'].includes(w.kind)||!Array.isArray(w.areas)||!w.title?.en||!w.summary?.en) throw Error('Invalid bulletin');
    if(!safeSource(w.url))throw Error('Invalid source');
    if(w.officialTranslations!==undefined) {
      if(!w.officialTranslations||typeof w.officialTranslations!=='object'||Array.isArray(w.officialTranslations))throw Error('Invalid official translation');
      for(const [language,source] of Object.entries(w.officialTranslations)) {
        let url;try{url=new URL(source?.url);}catch{throw Error('Invalid official translation source');}
        if(!['en','si','ta'].includes(language)||url.origin!=='https://www.dmc.gov.lk'||url.username||url.password||!/^\/images\/dmcreports\/[^/]+\.pdf$/.test(url.pathname)||url.search||url.hash||
          !/^[a-f0-9]{64}$/.test(source.sha256)||source.bulletinId!==w.id||source.issuedAt!==w.issuedAt||source.expiresAt!==w.expiresAt||
          !Number.isFinite(Date.parse(source.listingAt))||!Number.isFinite(Date.parse(source.reviewedAt)))throw Error('Invalid official translation');
      }
    }
    if(w.kind!=='landslide'&&w.severity!=='amber'){const error=new Error('Unsupported warning severity');error.code='CLIENT_UPDATE_REQUIRED';throw error;}
    if(w.areas.some(a=>a.level!==undefined&&![1,2,3].includes(a.level))){const error=new Error('Unsupported warning severity');error.code='CLIENT_UPDATE_REQUIRED';throw error;}
  }
  for(const s of d.stations){
    if(!Number.isFinite(s.value)||!['m','ft'].includes(s.unit)||!safeSource(s.url))throw Error('Invalid station');
    if(!['normal','minorRising','minorFalling','alertRising','alertFalling','alertNoTrend'].includes(s.status)){const error=new Error('Unsupported station classification');error.code='CLIENT_UPDATE_REQUIRED';throw error;}
  }
  for(const s of d.stations)if(s.status==='alertNoTrend'&&(s.sourceTrend!==null||s.sourceRemarks!=='Alert'))throw Error('Invalid no-trend station');
  for(const r of d.reservoirs)if(!Number.isFinite(r.effectivePercent)||!Number.isFinite(r.spillCusecs)||typeof r.name!=='string'||!safeSource(r.url))throw Error('Invalid reservoir');
  return d;
}
export function safeSource(url) {
  try{const u=new URL(url);return u.protocol==='https:'&&['www.dmc.gov.lk','docs.google.com','www.irrigation.gov.lk','irrigation.gov.lk'].includes(u.hostname);}catch{return false;}
}
// This selects a reviewed original document, not an official status for our UI summary.
export function warningSourceUrl(w,language) {
  return w?.officialTranslations?.[language]?.url||w?.url;
}
