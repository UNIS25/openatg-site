import {ageState,safeSource} from './core.mjs?v=20261106-37';
export const GAUGE_DASHBOARD='https://slirrigation.maps.arcgis.com/apps/dashboards/2cffe83c9ff5497d97375498bdf3ff38';
export function riverGaugePoints(locations,snapshot,now=Date.now()){
 if(locations?.schemaVersion!==1||locations.kind!=='official_river_station_locations'||!Array.isArray(locations.stations)||!locations.stations.length||!Array.isArray(snapshot?.stations)||!Number.isFinite(now))throw Error('Gauge source unavailable');
 const source=new URL(locations.source);if(source.origin!=='https://services3.arcgis.com'||source.username||source.password||source.hash||source.pathname!=='/J7ZFXmR8rSmQ3FGf/arcgis/rest/services/hydrostations/FeatureServer/0/query'||!/^[a-f0-9]{64}$/.test(locations.sourceSha256))throw Error('Unexpected location source');
 const names=new Set();return locations.stations.map(p=>{
  if(typeof p.name!=='string'||!p.name.trim()||names.has(p.name)||!Array.isArray(p.point)||p.point.length!==2||!p.point.every(Number.isFinite)||p.point[0]<79||p.point[0]>82||p.point[1]<5.5||p.point[1]>10)throw Error('Invalid or duplicate station');names.add(p.name);
  const readings=snapshot.stations.filter(s=>s.name===p.name);if(readings.length!==1)throw Error('Station join not unique');const r=readings[0];
  const observed=Date.parse(r.observedAt),issued=Date.parse(r.issuedAt);
  if(r.unit!==p.unit||!['m','ft'].includes(r.unit)||!Number.isFinite(r.value)||!safeSource(r.url)||!/^[a-f0-9]{64}$/.test(r.sha256)||!Number.isFinite(observed)||!Number.isFinite(issued)||observed>now||issued>now||issued<observed||r.status==='unavailable')throw Error('Invalid station reading');
  return {...r,point:p.point,coordinateNote:p.coordinateNote,freshness:ageState(r.observedAt,3,now),floodExtent:'unknown',homeDepth:'unknown',dashboard:GAUGE_DASHBOARD};
 });
}
