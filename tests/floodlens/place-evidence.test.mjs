import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {districtMapFeatures,districtEvidence,officialWarningOutlines} from '../../floodlens/place-evidence.mjs';
import {riverGaugePoints,GAUGE_DASHBOARD} from '../../floodlens/gauge-map-model.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL('../../floodlens/data/'+name,import.meta.url)));
const snapshot=read('reviewed.json'),catalog=read('areas.json'),overview=read('map-overview.json'),news=read('news-updates.json'),geometry=read('explore/official-warning-geometry.json'),locations=read('explore/river-station-locations.json');
const forecast=JSON.parse(fs.readFileSync(new URL('./fixtures/forecast-20261106-00z.json',import.meta.url)));
const now=Date.parse('2026-11-06T15:00:00Z'),clone=structuredClone;
const evidence=(s=snapshot,code='LK11',at=now,extra={})=>districtEvidence({snapshot:s,catalog,overview,news,forecast,...extra},code,at);

test('district features join exact division codes once and cover all 25 districts',()=>{
 const districts=districtMapFeatures(catalog,overview),division=new Map(catalog.divisions.map(a=>[a.code,a]));
 assert.equal(districts.length,25);assert.equal(new Set(districts.map(d=>d.code)).size,25);
 assert.equal(districts.reduce((n,d)=>n+d.features.length,0),overview.features.length);
 for(const d of districts)assert.ok(d.features.every(f=>division.get(f.properties.code).districtCode===d.code));
 assert.throws(()=>districtMapFeatures(null,overview));assert.throws(()=>districtMapFeatures(catalog,null));
 assert.throws(()=>evidence(snapshot,'Colombo'),/Unknown district/);
});
test('Colombo reports remain district evidence and never establish flooding or safety at a house',()=>{
 const e=evidence();assert.equal(e.reports.length,1);assert.ok(e.reports[0].districtCodes.includes('LK11'));
 assert.equal(e.reportingComplete,false);assert.equal(e.floodExtent,'not_established');assert.equal(e.householdRisk,'unknown');
 assert.equal(e.warningStatus,'scope_incomplete');assert.equal(e.warningReviewOlder,false);
 assert.equal(evidence(snapshot,'LK12').reports.length,0);
 assert.equal(evidence(snapshot,'LK11',Date.parse(news.updates[0].displayUntil)).reports.length,0);
 assert.equal(evidence(snapshot,'LK11',Date.parse(news.updates[0].reviewedAt)-1).reports.length,0);
});
test('warning matches retain district qualification without expanding a division to unrelated districts',()=>{
 const e=evidence(snapshot,'LK91');assert.ok(e.warnings.some(w=>w.kind==='landslide'));
 assert.ok(e.warnings.find(w=>w.kind==='landslide').areas.every(a=>a.divisionCode.startsWith('LK91')));
 assert.ok(!evidence(snapshot,'LK11').warnings.some(w=>w.kind==='landslide'));
 assert.ok(evidence(snapshot,'LK62').warnings.some(w=>w.kind==='lightning'));
 assert.ok(!evidence(snapshot,'LK62').warnings.find(w=>w.kind==='lightning').districtCodes.includes('LK62'));
});
test('stale review and incomplete area matching are independent, active warnings remain active',()=>{
 const e=evidence(snapshot,'LK91',Date.parse('2026-11-06T18:00:00Z'));
 assert.equal(e.warningStatus,'scope_incomplete');assert.equal(e.warningReviewOlder,true);
 assert.equal(e.warningReviewStatus,'stale');assert.ok(e.warnings.some(w=>w.kind==='landslide'));
});
test('missing, malformed or future-reviewed warning sources fail closed independently of reports',()=>{
 for(const s of [null,{}, {...clone(snapshot),reviewedAt:'bad'}, {...clone(snapshot),reviewedAt:'2030-01-01T00:00:00Z'}]){
  const e=evidence(s);assert.equal(e.warningStatus,'unavailable');assert.equal(e.warnings.length,0);
  assert.equal(e.reports.length,1);assert.equal(e.householdRisk,'unknown');
 }
 assert.equal(evidence(snapshot,'LK11',now,{news:null}).newsStatus,'unavailable');
 assert.equal(evidence(snapshot,'LK11',now,{forecast:null}).weather.status,'unavailable');
});
test('invalid/future relevant bulletin times are not converted to reviewed absence',()=>{
 const s=clone(snapshot),w=clone(s.bulletins.find(w=>w.kind==='lightning'));
 s.bulletins=[w];w.areas=[];w.districtCodes=['LK11'];delete w.scopeIncomplete;delete w.unmappedAreaNames;delete w.officialTranslations;
 for(const issuedAt of ['bad','2026-11-06T16:00:00Z']){
  w.issuedAt=issuedAt;w.expiresAt='2026-11-06T18:00:00Z';
  const e=evidence(s);assert.equal(e.warningStatus,'unavailable');assert.equal(e.warningReviewStatus,'unknown');
 }
 w.issuedAt='2026-11-06T10:00:00Z';w.expiresAt='2026-11-06T14:45:00Z';
 assert.equal(evidence(s).warningReviewStatus,'expired_since_review');assert.equal(evidence(s).warningStatus,'unavailable');
 s.reviewedAt='2026-11-06T14:50:00Z';assert.equal(evidence(s).warningReviewStatus,'reviewed_absence');
 assert.equal(evidence(s).warningStatus,'reviewed');assert.equal(evidence(s).householdRisk,'unknown');
});
test('district weather is a dated nearest sample with exactly 24 complete hours',()=>{
 const e=evidence();assert.ok(e.weather.window);assert.equal(e.weather.runAt,forecast.runAt);
 assert.equal(Date.parse(e.weather.window.end)-Date.parse(e.weather.window.start),86400000);
 assert.ok(Date.parse(e.weather.window.start)>=now);assert.ok(e.weather.point.every(Number.isFinite));
 assert.equal(evidence(snapshot,'LK11',Date.parse('2026-11-06T19:00:00Z')).weather.status,'older_run');
 const missing=clone(forecast);missing.frames.forEach(f=>{f.rainMm.fill(null);f.rainQuality.fill('missing');});
 assert.equal(evidence(snapshot,'LK11',now,{forecast:missing}).weather.window,null);
});
test('official CAP polygon binds bulletin, original source hash and exact valid interval',()=>{
 const outlines=officialWarningOutlines(geometry,snapshot,now);assert.equal(outlines.length,1);
 assert.equal(outlines[0].bulletinId,'cap-lightning-20261106-152842');assert.equal(outlines[0].geometry.type,'Polygon');
 assert.equal(outlines[0].coordinateOrder,'longitude,latitude');
 assert.deepEqual(officialWarningOutlines(geometry,snapshot,Date.parse(outlines[0].expiresAt)),[]);
 assert.deepEqual(officialWarningOutlines(null,snapshot,now),[]);
 for(const mutate of [g=>g.bulletinId='another',g=>g.sourceSha256='0'.repeat(64),g=>g.sourceUrl+='?x=1',g=>g.issuedAt='2026-11-06T10:00:00Z',g=>g.expiresAt='2030-01-01T00:00:00Z']){
  const d=clone(geometry);mutate(d.warnings[0]);assert.throws(()=>officialWarningOutlines(d,snapshot,now));
 }
});
test('CAP polygons reject non-CAP sources, bad hashes, future reviews and non-unique identities',()=>{
 for(const mutate of [(g,w)=>g.sourceUrl=w.url='https://www.dmc.gov.lk/images/warning.pdf',(g,w)=>g.sourceSha256=w.sha256='wrong']){
  const d=clone(geometry),s=clone(snapshot),w=s.bulletins.find(w=>w.id===d.warnings[0].bulletinId);mutate(d.warnings[0],w);
  assert.throws(()=>officialWarningOutlines(d,s,now));
 }
 const d=clone(geometry);d.warnings.push(clone(d.warnings[0]));assert.throws(()=>officialWarningOutlines(d,snapshot,now));
 const s=clone(snapshot);s.bulletins.push(clone(s.bulletins.find(w=>w.id===geometry.warnings[0].bulletinId)));assert.throws(()=>officialWarningOutlines(geometry,s,now));
 assert.throws(()=>officialWarningOutlines(geometry,{...snapshot,reviewedAt:'2030-01-01T00:00:00Z'},now));
});
test('CAP polygons reject flipped coordinates, holes, open rings and out-of-region points',()=>{
 for(const mutate of [g=>g.coordinateOrder='latitude,longitude',g=>g.geometry.type='MultiPolygon',g=>g.geometry.coordinates.push(clone(g.geometry.coordinates[0])),g=>g.geometry.coordinates[0].pop(),g=>g.geometry.coordinates[0][1].reverse(),g=>g.geometry.coordinates[0][1]=[180,7],g=>g.geometry.coordinates[0][1]=[80,NaN]]){
  const d=clone(geometry);mutate(d.warnings[0]);assert.throws(()=>officialWarningOutlines(d,snapshot,now));
 }
});
const capRaw=new URL('../../artifacts/floodlens/reactivate-20261106/lightning-cap.xml',import.meta.url);
test('reviewed outline equals every original CAP point with latitude/longitude converted once',{skip:!fs.existsSync(capRaw)},()=>{
 const raw=fs.readFileSync(capRaw),g=geometry.warnings[0];assert.equal(createHash('sha256').update(raw).digest('hex'),g.sourceSha256);
 const polygon=raw.toString().match(/<polygon>([\s\S]*?)<\/polygon>/)[1].trim().split(/\s+/).map(pair=>pair.split(',').map(Number).reverse());
 assert.deepEqual(g.geometry.coordinates,[polygon]);
});
test('all 22 gauges preserve exact station identity, metres, original noon reading and neutral risk semantics',()=>{
 const gauges=riverGaugePoints(locations,snapshot,now);assert.equal(gauges.length,22);
 for(const g of gauges){const original=snapshot.stations.find(s=>s.name===g.name);assert.equal(g.value,original.value);assert.equal(g.unit,original.unit);assert.equal(g.observedAt,original.observedAt);assert.equal(g.issuedAt,original.issuedAt);assert.equal(g.freshness,'stale');assert.equal(g.homeDepth,'unknown');assert.equal(g.floodExtent,'unknown');assert.equal(g.dashboard,GAUGE_DASHBOARD);}
 const at=Date.parse(snapshot.stations[0].issuedAt);assert.ok(riverGaugePoints(locations,snapshot,at).every(g=>g.freshness==='fresh'));
});
test('gauges reject non-unique/missing joins, malformed coordinates, sources, units and future or invalid times',()=>{
 for(const mutate of [l=>l.stations.push(clone(l.stations[0])),l=>l.stations[0].name='near Holombuwa',l=>l.stations[0].point.reverse(),l=>l.stations[0].unit='ft',l=>l.source='https://example.com/query',l=>l.sourceSha256='bad',l=>l.source=l.source.replace('https://','https://user:pass@'),l=>l.stations=[]]){
  const l=clone(locations);mutate(l);assert.throws(()=>riverGaugePoints(l,snapshot,now));
 }
 for(const mutate of [s=>s.stations.push(clone(s.stations[0])),s=>s.stations[0].observedAt='invalid',s=>s.stations[0].observedAt=null,s=>s.stations[0].issuedAt='invalid',s=>s.stations[0].issuedAt='2030-01-01T00:00:00Z',s=>{s.stations[0].observedAt=s.stations[0].issuedAt='2030-01-01T00:00:00Z';},s=>s.stations[0].issuedAt='2026-11-06T05:00:00Z',s=>s.stations[0].value=null,s=>s.stations[0].status='unavailable',s=>s.stations[0].sha256='invalid']){
  const s=clone(snapshot);mutate(s);assert.throws(()=>riverGaugePoints(locations,s,now));
 }
 assert.throws(()=>riverGaugePoints(locations,snapshot,NaN));
});
