import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateSnapshot,warningState,warningMatches,locationEvidence,ageState} from '../../floodlens/core.mjs';
import {warningLayer} from '../../floodlens/explore-model.mjs';
const read=async p=>JSON.parse(await readFile(p));
const data=await read('floodlens/data/reviewed.json'),provenance=await read('floodlens/data/provenance.json'),catalog=await read('floodlens/data/areas.json'),overview=await read('floodlens/data/map-overview.json');
const current=data.bulletins.find(w=>w.id==='kalu-20261028-03'),previous=data.bulletins.find(w=>w.id==='kalu-20261027-02');
test('Kalu No. 03 retains the exact 13-DS low-floodplain scope and trilingual summary',()=>{
 validateSnapshot(data);assert.equal(current.severity,'amber');assert.deepEqual(current.areas,previous.areas);assert.equal(current.areas.length,13);assert.deepEqual(current.districtCodes,[]);assert.deepEqual(current.summary,previous.summary);assert.match(current.summary.en,/low-lying/);
 for(const a of current.areas)assert.equal(warningMatches(current,catalog.divisions.find(d=>d.code===a.divisionCode)),true);
 assert.equal(warningMatches(current,catalog.divisions.find(d=>d.code==='LK1103')),false);
 const layer=warningLayer({...data,bulletins:[current]},catalog,overview,'flood',Date.parse(data.reviewedAt));assert.equal(layer.areas.length,13);assert.equal(layer.unmapped.length,0);assert.ok(layer.areas.every(a=>a.level===2));
});
test('Kalu No. 03 uses its explicit header dates while preserving conflicting No. 01 reference',()=>{
 assert.equal(current.issuedAt,'2026-10-28T13:30:00+05:30');assert.equal(current.expiresAt,'2026-10-29T13:30:00+05:30');
 const start=Date.parse(current.issuedAt),end=Date.parse(current.expiresAt);assert.equal(warningState(current,start-1),'unknown');assert.equal(warningState(current,start),'active');assert.equal(warningState(previous,start),'expired');assert.equal(warningState(current,end-1),'active');assert.equal(warningState(current,end),'expired');
 assert.equal(current.extendsBulletinId,'kalu-20261026-01');assert.match(current.sourceDiscrepancy,/27 October/);assert.match(current.sourceDiscrepancy,/26 October/);assert.equal(current.sha256,'de78a7e17264a9a3494dc15cbec0d7c817b2316ea26324a1182550e8ea3ff8c6');
 assert.ok(provenance.sources.some(s=>s.id===current.id&&s.sha256===current.sha256));assert.ok(provenance.sources.some(s=>s.id===previous.id&&s.sha256===previous.sha256));
});
test('stale noon gauges do not suppress Kalu No. 03 or the higher Red landslide warning',()=>{
 const now=Date.parse('2026-10-28T09:31:00Z');for(const s of data.stations){assert.equal(s.observedAt,'2026-10-28T12:00:00+05:30');assert.equal(ageState(s.observedAt,3,now),'stale');}
 for(const code of ['LK1309','LK1318','LK9136'])assert.equal(locationEvidence(data.bulletins,[catalog.divisions.find(a=>a.code===code)],{now}).source.id,current.id);
 const ratnapura=locationEvidence(data.bulletins,[catalog.divisions.find(a=>a.code==='LK9112')],{now});assert.equal(ratnapura.level,3);assert.equal(ratnapura.source.id,'LEWM-27-10-2026-1600-34');assert.equal(ratnapura.otherFlood,true);
});
