import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateSnapshot,warningState,warningMatches,locationEvidence,ageState} from '../../floodlens/core.mjs';
const read=async p=>JSON.parse(await readFile(p));
const data=await read('floodlens/data/reviewed.json'),provenance=await read('floodlens/data/provenance.json'),catalog=await read('floodlens/data/areas.json');
const current=data.bulletins.find(w=>w.id==='kalu-20261027-02'),previous=(await read('tests/floodlens/fixtures/kalu-20261026-01.json')).bulletin;
test('Kalu No. 02 retains exactly the reviewed 13-DS low-lying scope and Amber severity',()=>{
 validateSnapshot(data);assert.equal(current.severity,'amber');assert.deepEqual(current.areas,previous.areas);assert.equal(current.areas.length,13);assert.deepEqual(current.districtCodes,[]);assert.match(current.summary.en,/low-lying/);assert.deepEqual(current.summary,previous.summary);
 for(const a of current.areas)assert.ok(warningMatches(current,catalog.divisions.find(d=>d.code===a.divisionCode)));
 assert.equal(warningMatches(current,catalog.divisions.find(d=>d.code==='LK1103')),false);
});
test('extension uses explicit No. 02 header dates, not the inconsistent prose reference',()=>{
 assert.equal(current.issuedAt,'2026-10-27T13:30:00+05:30');assert.equal(current.expiresAt,'2026-10-28T13:30:00+05:30');
 assert.equal(warningState(current,Date.parse('2026-10-27T08:00:00Z')),'active');assert.equal(warningState(current,Date.parse('2026-10-28T08:00:00Z')),'expired');
 assert.equal(warningState(previous,Date.parse('2026-10-27T07:00:00Z')),'expired');assert.equal(warningState(current,Date.parse('2026-10-27T07:00:00Z')),'unknown');
 assert.match(current.sourceDiscrepancy,/27 October/);assert.match(current.sourceDiscrepancy,/26 October/);assert.equal(current.extendsBulletinId,previous.id);
});
test('old Kalu source is preserved in provenance; unrelated Mahaweli expiry is unchanged',()=>{
 const review=provenance.reviews.find(r=>r.currentBulletinId===current.id);assert.deepEqual(review.previousBulletin,previous);
 assert.ok(provenance.sources.some(s=>s.id===previous.id&&s.sha256===previous.sha256));assert.ok(provenance.sources.some(s=>s.id===current.id&&s.sha256===current.sha256));
 assert.equal(data.bulletins.some(w=>w.id===previous.id),false);const m=data.bulletins.find(w=>w.id==='mahaweli-20261026-01');assert.equal(m.expiresAt,'2026-10-27T11:30:00+05:30');assert.equal(warningState(m,Date.parse('2026-10-27T08:44:00Z')),'expired');
});
test('dated river observations cannot suppress the new active Kalu warning',()=>{
 const now=Math.max(...data.stations.map(s=>Date.parse(s.observedAt)).filter(Number.isFinite))+4*3600000,area=catalog.divisions.find(a=>a.code==='LK1309');assert.equal(warningState(current,now),'active');assert.equal(locationEvidence(data.bulletins,[area],{now}).source.id,current.id);
 for(const station of data.stations)assert.equal(ageState(station.observedAt,3,now),station.status==='unavailable'?'unknown':'stale');
});
