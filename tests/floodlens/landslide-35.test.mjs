import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateSnapshot,warningState,locationEvidence,warningReviewStatus,ageState} from '../../floodlens/core.mjs';
import {warningLayer} from '../../floodlens/explore-model.mjs';
const json=async p=>JSON.parse(await readFile(new URL(p,import.meta.url)));
const data=await json('../../floodlens/data/reviewed.json'), provenance=await json('../../floodlens/data/provenance.json'),catalog=await json('../../floodlens/data/areas.json'),overview=await json('../../floodlens/data/map-overview.json');
const warning=data.bulletins.find(w=>w.id==='LEWM-28-10-2026-1600-35'),prior=data.bulletins.find(w=>w.id===warning.previousBulletinId),now=Date.parse(data.reviewedAt);
const area=code=>catalog.divisions.find(a=>a.code===code);
test('Update 35 has its explicit issue, next-day expiry, original hash and preceding identity',()=>{
 validateSnapshot(data);assert.equal(warning.issuedAt,'2026-10-28T16:00:00+05:30');assert.equal(warning.expiresAt,'2026-10-29T16:00:00+05:30');assert.equal(warning.previousBulletinId,'LEWM-27-10-2026-1600-34');assert.equal(warning.sha256,'09c25b29a90d053861884ba00c5cc8b28f7237dfa504e435e3292632d736c64c');assert.ok(warning.url.endsWith('1793186280.pdf'));
 assert.equal(warningState(warning,Date.parse(warning.issuedAt)-1),'unknown');assert.equal(warningState(warning,now),'active');assert.equal(warningState(prior,now),'expired');assert.equal(warningState(warning,Date.parse(warning.expiresAt)),'expired');
 const review=provenance.reviews.find(r=>r.currentBulletinId===warning.id);assert.deepEqual(review.previousBulletin,prior);assert.equal(provenance.sources.find(s=>s.id===warning.id).bytes,507902);
});
test('all 54 original column entries resolve exactly: 41 Yellow, 13 Amber, no Red',()=>{
 assert.deepEqual([1,2,3].map(n=>warning.areas.filter(a=>a.level===n).length),[41,13,0]);assert.equal(new Set(warning.areas.map(a=>a.divisionCode)).size,54);
 for(const a of warning.areas)assert.equal(area(a.divisionCode).districtCode,a.districtCode);
 const expectedAmber=['Attanagalla','Bulathsinhala','Dodangoda','Mawanella','Aranayake','Norwood','Ambagamuwa Korale','Ratnapura','Openayake','Kuruwita','Ayagama','Elapatha','Pelmadulla'].sort();assert.deepEqual(warning.areas.filter(a=>a.level===2).map(a=>a.division).sort(),expectedAmber);
 const layer=warningLayer(data,catalog,overview,'landslide',now);assert.equal(layer.areas.length,54);assert.equal(layer.unmapped.length,0);assert.ok(layer.areas.every(a=>[1,2].includes(a.level)));
 for(const name of ['Deraniyagala','Udapalatha','Kothmale West','Kotmale East'])assert.equal(warning.areas.find(a=>a.division===name).level,1);
 for(const lang of ['en','si','ta']){assert.ok(warning.summary[lang]);assert.ok(!warning.summary[lang].includes('3'));}
});
test('current lesser landslide levels replace expired Red without overriding active flood warnings',()=>{
 const norwood=locationEvidence(data.bulletins,[area('LK2330')],{now});assert.equal(norwood.source.id,warning.id);assert.equal(norwood.level,2);
 const yellow=warning.areas.find(a=>a.division==='Udapalatha'),local=locationEvidence(data.bulletins,[area(yellow.divisionCode)],{now});assert.equal(local.source.id,warning.id);assert.equal(local.level,1);
 const ratnapura=locationEvidence(data.bulletins,[area('LK9112')],{now});assert.equal(ratnapura.kind,'flood');assert.equal(ratnapura.source.id,'kalu-20261028-03');
 const later=now+2*3600000;assert.equal(ageState(data.stations[0].observedAt,3,later),'stale');assert.equal(locationEvidence(data.bulletins,[area('LK2330')],{now:later}).level,2);
});
test('omission, boundary uncertainty and later expiry never create a safe assessment',()=>{
 const omitted=prior.areas.filter(a=>!warning.areas.some(b=>b.divisionCode===a.divisionCode));assert.equal(omitted.length,17);
 const one=omitted.find(a=>locationEvidence(data.bulletins,[area(a.divisionCode)],{now}).kind==='unknown');assert.ok(one);assert.equal(warningReviewStatus(data,[area(one.divisionCode)],{now}),'reviewed_absence');
 const uncertain=locationEvidence(data.bulletins,[area(one.divisionCode),area('LK2330')],{now,uncertain:true});assert.equal(uncertain.kind,'landslide');assert.equal(uncertain.level,2);assert.equal(uncertain.uncertain,true);
 const expires=Date.parse(warning.expiresAt),fresh={...data,reviewedAt:new Date(expires).toISOString()};assert.notEqual(locationEvidence(data.bulletins,[area('LK2330')],{now:expires}).kind,'safe');assert.equal(warningReviewStatus(fresh,[area('LK2330')],{now:expires}),'reviewed_absence');
});
