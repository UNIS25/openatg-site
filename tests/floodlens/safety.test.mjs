import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {locationEvidence,warningState,ageState,dailyAgeState,warningMatches,assessment,insideGeometry,locationCandidates,validateSnapshot} from '../../floodlens/core.mjs';
import {copy} from '../../floodlens/i18n.mjs';
const snapshot=JSON.parse(await readFile(new URL('../../floodlens/data/reviewed.json',import.meta.url)));
const catalog=JSON.parse(await readFile(new URL('../../floodlens/data/areas.json',import.meta.url)));
const now=Date.parse('2026-10-26T13:00:00+05:30');
test('official bulletin validity expires exactly; missing/future times are unknown',()=>{
 const b=snapshot.bulletins[0];assert.equal(warningState(b,now),'active');assert.equal(warningState(b,Date.parse(b.expiresAt)),'expired');assert.equal(warningState({...b,expiresAt:null},now),'unknown');assert.equal(warningState(b,Date.parse(b.issuedAt)-1),'unknown');
});
test('all named warning areas map exactly to one district-scoped DS code',()=>{
 for(const w of snapshot.bulletins)for(const a of w.areas){const d=catalog.divisions.filter(d=>d.code===a.divisionCode);assert.equal(d.length,1);assert.equal(d[0].districtCode,a.districtCode);}
});
test('stale observations never suppress valid official warnings',()=>{
 assert.equal(ageState('2026-10-25T12:00:00+05:30',3,now),'stale');const ratnapura=catalog.divisions.find(a=>a.code==='LK9112');assert.equal(assessment(snapshot.bulletins,ratnapura,now),'matched');
});
test('district browsing is distinct from a division match; no match never says safe',()=>{
 assert.equal(assessment(snapshot.bulletins,catalog.districts.find(a=>a.code==='LK91'),now),'district');assert.equal(assessment(snapshot.bulletins,catalog.divisions.find(a=>a.code==='LK1103'),now),'unmatched');assert.equal(assessment([],null,now),'expired');
});
test('broad rainfall context never becomes a local flood warning',()=>{
 const rain=snapshot.bulletins.find(b=>b.kind==='rain');assert.equal(assessment([rain],catalog.divisions.find(a=>a.code==='LK1103'),now),'unmatched');
});
test('expired warnings and future data remain uncertain',()=>{
 assert.equal(assessment(snapshot.bulletins,catalog.divisions.find(a=>a.code==='LK9112'),Date.parse('2026-10-28T13:00:00+05:30')),'expired');assert.equal(ageState('2027-01-01',3,now),'unknown');assert.equal(ageState(null,3,now),'unknown');
});
test('Polygon holes and MultiPolygon islands are honored',()=>{
 const geometry={type:'Polygon',coordinates:[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[3,3],[7,3],[7,7],[3,7],[3,3]]]};assert.equal(insideGeometry([1,1],geometry),true);assert.equal(insideGeometry([5,5],geometry),false);assert.equal(insideGeometry([11,1],geometry),false);assert.equal(insideGeometry([1,1],{type:'MultiPolygon',coordinates:[geometry.coordinates]}),true);
});
test('accuracy circle near an edge produces multiple candidates, not nearest fallback',()=>{
 const poly=(x)=>({type:'Feature',geometry:{type:'Polygon',coordinates:[[[x,7],[x+.01,7],[x+.01,7.01],[x,7.01],[x,7]]]}});
 assert.equal(locationCandidates([poly(80),poly(80.01)],[80.0099,7.005],100).length,2);assert.equal(locationCandidates([poly(80)],[81,7],50).length,0);
});
test('production source records and units are valid; no fixture switches',()=>{
 validateSnapshot(snapshot);assert.equal(snapshot.stations.length,11);assert.ok(snapshot.stations.every(s=>s.unit==='m'));assert.ok(snapshot.bulletins.every(b=>/^[a-f0-9]{64}$/.test(b.sha256)));assert.equal(snapshot.reservoirs.find(r=>r.name==='Tabbowa').effectivePercent,99.98);
});
test('all UI translation keys exist in Sinhala and Tamil',()=>{
 for(const language of ['si','ta'])for(const k of Object.keys(copy.en))assert.equal(typeof copy[language][k],'string',`${language}.${k}`);
});
test('unsafe source schemes and malformed data fail closed',()=>{
 assert.throws(()=>validateSnapshot({...snapshot,bulletins:[{...snapshot.bulletins[0],url:'javascript:alert(1)'}]}));assert.throws(()=>validateSnapshot({...snapshot,stations:[{...snapshot.stations[0],value:null}]}));
});
test('all 339 catalog codes and 25 district shards are accounted for',()=>{
 assert.equal(catalog.divisions.length,339);assert.equal(catalog.districts.length,25);assert.equal(new Set(catalog.divisions.map(d=>d.code)).size,339);assert.equal(catalog.shards.reduce((a,b)=>a+b.features,0),339);
});
test('daily reservoir report becomes stale on next Sri Lanka calendar day',()=>{
 assert.equal(dailyAgeState('2026-10-26',now),'daily');assert.equal(dailyAgeState('2026-10-25',now),'stale');assert.equal(dailyAgeState('2026-10-27',now),'unknown');assert.equal(dailyAgeState(null,now),'unknown');
});
test('18:00 bulletin has ten visually verified Red divisions and exact 71-division scope',()=>{
 const w=snapshot.bulletins.find(b=>b.kind==='landslide');assert.equal(w.id,'LEWM-26-10-2026-1800-33');assert.deepEqual(w.areas.filter(a=>a.level===3).map(a=>a.divisionCode).sort(),['LK1312','LK1327','LK2315','LK2330','LK9112','LK9130','LK9124','LK9106','LK9127','LK9121'].sort());assert.equal(w.areas.length,71);assert.equal(new Set(w.areas.map(a=>a.divisionCode)).size,71);assert.deepEqual([1,2,3].map(level=>w.areas.filter(a=>a.level===level).length),[28,33,10]);assert.equal(warningState(w,Date.parse('2026-10-26T18:00:00+05:30')),'active');assert.equal(warningState(w,Date.parse('2026-10-27T18:00:00+05:30')),'expired');assert.equal(w.areas.find(a=>a.divisionCode==='LK1227').level,2);assert.equal(w.areas.find(a=>a.divisionCode==='LK3203').level,1);assert.equal(w.areas.find(a=>a.divisionCode==='LK2321').level,2);assert.equal(w.areas.find(a=>a.divisionCode==='LK2303').level,2);assert.equal(w.areas.find(a=>a.divisionCode==='LK9136').level,2);
});
test('future warning formats and unsupported severity require a page update',()=>{
 assert.throws(()=>validateSnapshot({...snapshot,minClientVersion:999}),{code:'CLIENT_UPDATE_REQUIRED'});assert.throws(()=>validateSnapshot(snapshot,3),{code:'CLIENT_UPDATE_REQUIRED'});const w=snapshot.bulletins.find(w=>w.kind==='landslide');assert.throws(()=>validateSnapshot({...snapshot,bulletins:[{...w,areas:[{...w.areas[0],level:4}]}]}),{code:'CLIENT_UPDATE_REQUIRED'});
});
test('reservoir map joins are unique, explicit, and limited to source directory identities',async()=>{
 const locations=JSON.parse(await readFile(new URL('../../floodlens/data/reservoir-locations.json',import.meta.url)));const readings=JSON.parse(await readFile(new URL('../../floodlens/data/reservoirs.json',import.meta.url)));const names=new Set(readings.records.map(r=>r.name));assert.equal(locations.features.length,43);assert.equal(new Set(locations.features.map(f=>f.properties.tankCode)).size,43);assert.equal(new Set(locations.features.map(f=>f.properties.name)).size,43);assert.ok(locations.features.every(f=>names.has(f.properties.name)&&f.geometry.type==='Point'&&f.geometry.coordinates[0]>79.3&&f.geometry.coordinates[0]<82.1));assert.deepEqual(locations.excludedAmbiguousNames,['Mahadivul Wewa']);assert.equal(locations.features.find(f=>f.properties.name==='Tabbowa').properties.tankCode,'R13206');
});

const allFeatures=(await Promise.all(catalog.districts.map(async a=>JSON.parse(await readFile(new URL('../../floodlens/data/boundaries/'+a.code+'.json',import.meta.url))).features))).flat();
const reviewedTime=Date.parse('2026-10-26T19:00:00+05:30');
const evidenceAt=(p,accuracy=20)=>{const areas=locationCandidates(allFeatures,p,accuracy).map(f=>catalog.divisions.find(a=>a.code===f.properties.code));return {...locationEvidence(snapshot.bulletins,areas,{uncertain:areas.length>1||accuracy>1500,now:reviewedTime}),areas};};
test('real Ratnapura, Pelmadulla, Horana and Puttalam coordinates produce different evidence categories',()=>{
 for(const [p,kind,level,code] of [[[80.399,6.682],'landslide',3,'LK9112'],[[80.529,6.628],'landslide',3,'LK9124'],[[80.062,6.715],'flood',0,'LK1309'],[[79.828,8.036],'rain',0,'LK6215']]){
  const e=evidenceAt(p);assert.equal(e.kind,kind);assert.equal(e.level,level);assert.equal(e.areas[0].code,code);assert.equal(e.uncertain,false);
 }
});
test('poor GPS preserves all plausible area warnings, with uncertainty',()=>{
 const e=evidenceAt([80.399,6.682],3000);assert.equal(e.kind,'landslide');assert.equal(e.level,3);assert.equal(e.uncertain,true);assert.ok(e.areas.length>=3);
});
test('actual administrative edge and manual unknown accuracy retain warning evidence',()=>{
 const horana=allFeatures.find(f=>f.properties.code==='LK1309');const polygons=horana.geometry.type==='Polygon'?[horana.geometry.coordinates]:horana.geometry.coordinates;
 const point=polygons[0][0][Math.floor(polygons[0][0].length/2)];const e=evidenceAt(point,100);assert.ok(e.areas.some(a=>a.code==='LK1309'));assert.ok(['flood','landslide'].includes(e.kind));
 const manual=evidenceAt([80.062,6.715],100);assert.equal(manual.kind,'flood');
});
test('an unlisted division has no verified local assessment; expired sources never become current',()=>{
 const d=catalog.divisions.find(a=>a.districtCode==='LK52');const e=locationEvidence(snapshot.bulletins,[d],{now:reviewedTime});assert.equal(e.kind,'unknown');assert.equal(e.source,undefined);
 assert.equal(locationEvidence(snapshot.bulletins,[catalog.divisions.find(a=>a.code==='LK9112')],{now:Date.parse('2026-10-28T00:00:00Z')}).kind,'unknown');
});

test('future non-landslide severity cannot silently render an Amber label',()=>{
 const d=structuredClone(snapshot);d.bulletins.find(w=>w.kind==='flood').severity='red';assert.throws(()=>validateSnapshot(d),e=>e.code==='CLIENT_UPDATE_REQUIRED');
 assert.throws(()=>validateSnapshot(snapshot,4),e=>e.code==='CLIENT_UPDATE_REQUIRED');
});
test('multiple landslide bulletins select highest applicable reviewed severity',()=>{
 const ds=catalog.divisions.find(a=>a.code==='LK9112');const original=snapshot.bulletins.find(w=>w.kind==='landslide');const lower={...original,areas:original.areas.map(a=>({...a,level:1}))};
 assert.equal(locationEvidence([lower,original],[ds],{now:reviewedTime}).level,3);
});

test('15:30 official river report retains eight stations and adds three reviewed alerts without inferred trends',()=>{
 const expected=[['Holombuwa',4.83,'minorFalling'],['Rathnapura',7.96,'minorRising'],['Kithulgala',2.90,'normal'],['Norwood',2.39,'alertRising'],['Magura',4.24,'alertRising'],['Kalawellawa (Millakanda)',6.20,'alertRising'],['Nawalapitiya',2.97,'normal'],['Dunamale',3.80,'alertRising'],['Panadugama',5.37,'alertRising'],['Urawa',2.53,'alertRising'],['Peradeniya',5.53,'alertRising']];
 assert.deepEqual(snapshot.stations.map(s=>[s.name,s.value,s.status]),expected);
 for(const s of snapshot.stations){assert.equal(s.unit,'m');assert.equal(s.observedAt,'2026-10-26T15:00:00+05:30');assert.equal(s.issuedAt,'2026-10-26T15:30:00+05:30');assert.equal(s.sha256,'68f6608b19221bc5b16569b128f59a717163ad27a8bad111760b3a3cfefb60fd');assert.ok(s.url.endsWith('1793017314.pdf'));if(s.status==='normal')assert.equal(s.sourceTrend,null);assert.equal('rainfall' in s,false);}
 assert.equal(locationEvidence(snapshot.bulletins,[catalog.divisions.find(a=>a.code==='LK9112')],{now:reviewedTime}).level,3);
 assert.throws(()=>validateSnapshot(snapshot,5),e=>e.code==='CLIENT_UPDATE_REQUIRED');
 const d=structuredClone(snapshot);d.stations[0].status='unreviewed';assert.throws(()=>validateSnapshot(d),e=>e.code==='CLIENT_UPDATE_REQUIRED');
});

test('current lightning advisory is Amber in exactly the four text-named districts',()=>{
 const w=snapshot.bulletins.find(w=>w.kind==='lightning');assert.equal(w.id,'LLA-26-10-26-01-03');assert.equal(w.severity,'amber');assert.equal(w.issuedAt,'2026-10-26T11:30:00+05:30');assert.equal(w.expiresAt,'2026-10-26T23:00:00+05:30');assert.deepEqual([...w.districtCodes].sort(),['LK51','LK53','LK71','LK72']);assert.equal(w.areas.length,0);
 for(const code of ['LK51','LK53','LK71','LK72']){const area=catalog.divisions.find(a=>a.districtCode===code);assert.equal(warningMatches(w,area),true);assert.equal(locationEvidence(snapshot.bulletins,[area],{now:reviewedTime}).kind,'lightning');}
 for(const code of ['LK62','LK91','LK52'])assert.equal(warningMatches(w,catalog.divisions.find(a=>a.districtCode===code)),false);
 const batti=catalog.divisions.find(a=>a.districtCode==='LK51');assert.equal(warningState(w,Date.parse(w.expiresAt)),'expired');assert.equal(locationEvidence(snapshot.bulletins,[batti],{now:Date.parse(w.expiresAt)}).kind,'unknown');assert.equal(assessment([w],batti,reviewedTime),'unmatched');
 assert.throws(()=>validateSnapshot(snapshot,6),e=>e.code==='CLIENT_UPDATE_REQUIRED');
});
