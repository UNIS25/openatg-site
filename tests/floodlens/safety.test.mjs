import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {warningState,ageState,dailyAgeState,warningMatches,assessment,insideGeometry,locationCandidates,validateSnapshot} from '../../floodlens/core.mjs';
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
 validateSnapshot(snapshot);assert.equal(snapshot.stations.length,8);assert.ok(snapshot.stations.every(s=>s.unit==='m'));assert.ok(snapshot.bulletins.every(b=>/^[a-f0-9]{64}$/.test(b.sha256)));assert.equal(snapshot.reservoirs.find(r=>r.name==='Tabbowa').effectivePercent,99.98);
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
test('14:45 bulletin has the six visually verified Red divisions, not a blanket district severity',()=>{
 const w=snapshot.bulletins.find(b=>b.kind==='landslide');assert.equal(w.id,'LEWM-26-10-2026-1445-00');assert.deepEqual(w.areas.filter(a=>a.level===3).map(a=>a.divisionCode).sort(),['LK9112','LK9130','LK9124','LK9106','LK9127','LK9121'].sort());assert.equal(warningState(w,Date.parse('2026-10-26T15:00:00+05:30')),'active');assert.equal(w.areas.find(a=>a.divisionCode==='LK9136').level,2);
});
