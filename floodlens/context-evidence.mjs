// Dated observation context. No fetch, storage or household hazard inference.
import {locationEvidence} from './core.mjs?v=20261026-18';
const HOUR=3600000;
const validPoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
const contains=(b,p)=>b&&p[0]>=b[0]&&p[0]<=b[2]&&p[1]>=b[1]&&p[1]<=b[3];
export function distanceKm(a,b){const r=Math.PI/180,dlat=(b[1]-a[1])*r,dlon=(b[0]-a[0])*r,q=Math.sin(dlat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dlon/2)**2;return 6371*2*Math.atan2(Math.sqrt(q),Math.sqrt(Math.max(0,1-q)));}
export function satelliteAt(data,point,{now=Date.now(),accuracy=0}={}){
 if(!data)return {status:'source_unavailable'};
 if(!data.regions?.some(r=>contains(r.bbox,point)))return {status:'outside_preview_coverage'};
 const region=data.regions.find(r=>contains(r.bbox,point));
 if(!region.values||typeof data.project!=='function')return {status:'source_unavailable'};
 const [x,y]=data.project(point),tr=region.nativeTransform;
 const col=Math.floor((x-tr[2])/tr[0]),row=Math.floor((y-tr[5])/tr[4]);
 const [height,width]=region.nativeShape;
 if(row<0||col<0||row>=height||col>=width)return {status:'nodata'};
 const value=region.values[row*width+col],state=data.states[value%16],sceneId=value?region.sceneIds[Math.floor(value/16)-1]:null;
 const scene=data.scenes[sceneId];
 if(!state||(value&&!scene))return {status:'invalid_pixel'};
 if(scene&&(!Number.isFinite(Date.parse(scene.observedAt))||Date.parse(scene.observedAt)>now||!Number.isFinite(Date.parse(scene.processedAt))||Date.parse(scene.processedAt)>now))return {status:'invalid_future_evidence'};
 const result={status:state||'nodata',observedAt:scene?.observedAt||null,processedAt:scene?.processedAt||null,ageHours:scene?(now-Date.parse(scene.observedAt))/HOUR:null,scene:sceneId,resolutionMetres:data.resolutionMetres,accuracyMetres:accuracy,source:scene?.sources?.ensemble_flood_extent?.url||null};
 // This is the centre pixel, never a claim about the whole GPS accuracy circle.
 if(accuracy>20)result.positionUncertain=true;
 return result;
}
export function rainfallAt(data,point,now=Date.now()){
 if(!data)return {status:'source_unavailable'};
 if(!Object.values(data.regions||{}).some(b=>contains(b,point)))return {status:'outside_preview_coverage'};
 // Half-open native cells prevent assigning two neighbours on a grid edge.
 const cells=data.cells.filter(c=>point[0]>=c.bbox[0]&&point[0]<c.bbox[2]&&point[1]>=c.bbox[1]&&point[1]<c.bbox[3]);
 if(cells.length!==1)return {status:'cell_unavailable'};
 const cell=cells[0];const records=(cell.attempts||[]).filter(r=>r.status==='valid_estimate'&&r.unit==='mm/hr'&&r.nativeGridDegrees===.1&&r.productVersion==='07'&&Number.isFinite(r.rateMmPerHour)&&r.rateMmPerHour>=0&&Number.isFinite(Date.parse(r.observationStart))&&Date.parse(r.observationEndExclusive)<=now&&Date.parse(r.observationEndExclusive)-Date.parse(r.observationStart)===HOUR/2&&Date.parse(r.retrievedAt)<=now).sort((a,b)=>Date.parse(b.observationStart)-Date.parse(a.observationStart));
 const latest=records[0];if(!latest)return {status:'no_valid_estimate',attempts:cell.attempts};
 return {status:'dated_estimate',rateMmPerHour:latest.rateMmPerHour,observedAt:latest.observationStart,end:latest.observationEndExclusive,ageHours:(now-Date.parse(latest.observationEndExclusive))/HOUR,nativeGridDegrees:.1,cellId:cell.id,bbox:cell.bbox,newerUnavailable:cell.attempts.some(r=>r.status!=='valid_estimate'&&Date.parse(r.observationStart)>Date.parse(latest.observationStart)),firstHour:cell.firstHour,source:data.contract.source};
}
export function nearestReservoir(points,directory,point,now=Date.now()){
 if(!points?.features?.length)return {status:'locations_unavailable'};
 const sorted=points.features.filter(f=>validPoint(f.geometry?.coordinates)&&f.properties?.tankCode).map(f=>({feature:f,distanceKm:distanceKm(point,f.geometry.coordinates)})).sort((a,b)=>a.distanceKm-b.distanceKm);
 if(!sorted.length)return {status:'locations_unavailable'};
 const {feature,distanceKm:distance}=sorted[0],readings=(directory?.records||[]).filter(r=>r.name===feature.properties.name);
 const reading=readings.length===1?readings[0]:null;const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
 const validDate=reading&&/^\d{4}-\d{2}-\d{2}$/.test(reading.observedDate||'')&&reading.observedDate<=today;
 return {status:'nearest_mapped',name:feature.properties.name,tankCode:feature.properties.tankCode,point:feature.geometry.coordinates,distanceKm:distance,coverage:points.coverage,reading:validDate?reading:null,dateStatus:!validDate?'unknown':reading.observedDate===today?'daily':'old',source:reading?.url||points.sourceUrl,connection:{status:'not_established',reason:'Licensed static catchment downloads returned HTTP 403. Proximity does not establish upstream flow or reservoir influence.'}};
}
// Curated district context, not a claimed catchment/route for the selected pin.
// Official Irrigation Scheme_Data_2 layer 10 identifies both tank codes as Mi Oya.
export const meeOyaSource='https://services3.arcgis.com/J7ZFXmR8rSmQ3FGf/ArcGIS/rest/services/Scheme_Data_2/FeatureServer/10';
export function reservoirsForContext(points,directory,point,areas=[],now=Date.now()){
 const districtContext=areas.some(a=>a.districtCode==='LK62'||a.type==='district'&&a.code==='LK62');
 if(!districtContext)return {scope:'nearest',items:[nearestReservoir(points,directory,point,now)]};
 const items=['R13206','R13101'].map(code=>{
  const matches=(points?.features||[]).filter(f=>f.properties?.tankCode===code);
  if(matches.length!==1)return {status:'locations_unavailable',tankCode:code,name:code==='R13206'?'Tabbowa':'Inginimitiya'};
  return nearestReservoir({...points,features:matches},directory,point,now);
 });
 return {scope:'puttalam_district_context',basin:'Mi Oya',source:meeOyaSource,items,connection:'not_established',completeInventory:false};
}
export function gateConflict(record){
 return record?.name==='Tabbowa'&&record.observedDate==='2026-10-26'&&record.gateConfiguration?.gateCount===6&&record.spillCusecs===2200;
}
// Separately reviewed media evidence never replaces an official daily measurement.
export function mediaReservoirReport(data,tankCode,now=Date.now()){
 if(data?.schemaVersion!==1||data.kind!=='reviewed_media_report'||data.source!=='Daily Mirror'||data.url!=='https://www.dailymirror.lk/breaking-news/Two-reservoirs-release-7-400-cusecs-into-Mee-Oya-residents-warned/108-353450')return null;
 if(!Number.isFinite(Date.parse(data.publishedAt))||Date.parse(data.publishedAt)>now||!Number.isFinite(Date.parse(data.reviewedAt))||Date.parse(data.reviewedAt)<Date.parse(data.publishedAt)||Date.parse(data.reviewedAt)>now||data.operationAt!==null)return null;
 const records=data.records?.filter(r=>r.tankCode===tankCode);if(records?.length!==1)return null;const r=records[0];
 if(!Number.isInteger(r.gateCount)||r.gateCount<1||r.gateCount>30||!Number.isFinite(r.spillCusecs)||r.spillCusecs<0||!Array.isArray(r.groups)||r.groups.some(g=>!Number.isInteger(g.count)||g.count<1||!Number.isFinite(g.openingFeet)||g.openingFeet<=0||g.openingFeet>30)||r.groups.reduce((n,g)=>n+g.count,0)!==r.gateCount)return null;
 return {...r,source:data.source,url:data.url,publishedAt:data.publishedAt,operationAt:null};
}
export function assemble(point,{satellite,rainfall,points,directory,reviewed,areas=[]},{now=Date.now(),accuracy=0}={}){
 if(!validPoint(point))throw Error('Invalid point');
 const outside=point[0]<79.3||point[0]>82.1||point[1]<5.7||point[1]>10.1;
 const official=outside?{kind:'outside'}:locationEvidence(reviewed?.bulletins||[],areas,{now,uncertain:areas.length>1||accuracy>1500});
 return {point,accuracy,checkedAt:new Date(now).toISOString(),outside,official,officialReviewAt:reviewed?.reviewedAt||null,satellite:outside?{status:'outside_sri_lanka'}:satelliteAt(satellite,point,{now,accuracy}),rainfall:outside?{status:'outside_sri_lanka'}:rainfallAt(rainfall,point,now),reservoir:outside?{status:'outside_sri_lanka'}:nearestReservoir(points,directory,point,now),tide:{status:'not_connected',reason:'Prediction reuse/access terms unresolved; lagoon drainage timing is not available.',homepage:'https://www.tide-forecast.com/'}};
}
