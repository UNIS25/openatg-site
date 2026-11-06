import {validateSnapshot,warningState,warningMatches,warningReviewStatus,ageState,safeSource} from './core.mjs?v=20261106-37';
import {reviewedNews} from './news-model.mjs?v=20261106-37';
import {selectPoint,futureDayWindow} from './forecast-model.mjs?v=20261106-37';
// District-level browsing only. A district report never becomes flood geometry.
export function districtMapFeatures(catalog,overview){
 if(!Array.isArray(catalog?.districts)||!Array.isArray(catalog?.divisions)||!Array.isArray(overview?.features))throw Error('District boundaries unavailable');
 const divisions=new Map(catalog.divisions.map(a=>[a.code,a]));return catalog.districts.map(d=>({...d,features:overview.features.filter(f=>divisions.get(f.properties?.code)?.districtCode===d.code)})).filter(d=>d.features.length);
}
export function districtEvidence({snapshot,catalog,overview,forecast,news},code,now=Date.now()){
 const district=catalog?.districts?.find(d=>d.code===code);if(!district)throw Error('Unknown district');
 let warnings=[],warningStatus='unavailable',warningReviewOlder=false,reviewStatus='unknown';
 try{validateSnapshot(snapshot);if(!Number.isFinite(now)||!Number.isFinite(Date.parse(snapshot.reviewedAt))||Date.parse(snapshot.reviewedAt)>now)throw Error();warnings=snapshot.bulletins.filter(w=>warningState(w,now)==='active'&&warningMatches(w,district));reviewStatus=warningReviewStatus(snapshot,[district],{now});warningReviewOlder=ageState(snapshot.reviewedAt,3,now)==='stale';warningStatus=warningReviewOlder?'stale':['unknown','expired_since_review'].includes(reviewStatus)?'unavailable':'reviewed';if(snapshot.bulletins.some(w=>warningState(w,now)==='active'&&w.scopeIncomplete))warningStatus='scope_incomplete';}catch{}
 let reports=[],newsStatus='unavailable';try{if(!news)throw Error();reports=reviewedNews(news,[code],now);newsStatus='reviewed';}catch{}
 const [west,south,east,north]=district.bbox,point=[(west+east)/2,(south+north)/2];let weather={status:'unavailable'};
 try{const p=selectPoint(forecast,point,now),window=futureDayWindow(p.frames||[],now);weather={status:window?p.status:'incomplete',point:p.gridPoint,window,runAt:forecast.runAt,source:forecast.source};}catch{}
 return {district,warnings,warningStatus,warningReviewOlder,warningReviewStatus:reviewStatus,warningReviewedAt:snapshot?.reviewedAt||null,reports,newsStatus,weather,reportingComplete:false,floodExtent:'not_established',householdRisk:'unknown'};
}
export function officialWarningOutlines(data,snapshot,now=Date.now()){
 if(!data)return [];
 if(data.schemaVersion!==1||data.kind!=='official_cap_warning_geometry'||!Array.isArray(data.warnings)||data.warnings.length>30)throw Error('Invalid official warning geometry');
 validateSnapshot(snapshot);if(!Number.isFinite(now)||!Number.isFinite(Date.parse(snapshot.reviewedAt))||Date.parse(snapshot.reviewedAt)>now)throw Error('Unreviewed warning time');
 const seen=new Set();
 return data.warnings.flatMap(g=>{
  const matches=snapshot.bulletins.filter(w=>w.id===g.bulletinId),w=matches[0];if(seen.has(g.bulletinId)||matches.length!==1||!w||w.kind!=='lightning'||w.url!==g.sourceUrl||w.sha256!==g.sourceSha256||!/^[a-f0-9]{64}$/.test(g.sourceSha256)||w.issuedAt!==g.issuedAt||w.expiresAt!==g.expiresAt||!safeSource(g.sourceUrl)||!/^https:\/\/was\.meteo\.gov\.lk\/cap\/en\/[a-f0-9]{32}\.xml$/.test(g.sourceUrl)||!Number.isFinite(Date.parse(w.issuedAt))||!Number.isFinite(Date.parse(w.expiresAt))||Date.parse(w.expiresAt)<=Date.parse(w.issuedAt))throw Error('Warning geometry/source mismatch');seen.add(g.bulletinId);
  if(g.geometry?.type!=='Polygon'||g.coordinateOrder!=='longitude,latitude'||!Array.isArray(g.geometry.coordinates)||g.geometry.coordinates.length!==1)throw Error('Unsupported official geometry');
  const ring=g.geometry.coordinates[0];if(ring.length<4||ring.length>5000||JSON.stringify(ring[0])!==JSON.stringify(ring.at(-1)))throw Error('Unclosed official polygon');
  if(ring.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<78||p[0]>84||p[1]<4||p[1]>12))throw Error('Official coordinates out of bounds');
  return warningState(w,now)==='active'?[{...g,title:w.title}]:[];
 });
}
