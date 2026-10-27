import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {warningState,warningMatches,locationEvidence,validateSnapshot} from '../../floodlens/core.mjs';
import {warningLayer} from '../../floodlens/explore-model.mjs';
const json=async p=>JSON.parse(await readFile(new URL(p,import.meta.url)));
const current=await json('../../floodlens/data/reviewed.json');
const provenance=await json('../../floodlens/data/provenance.json');
const catalog=await json('../../floodlens/data/areas.json');
const overview=await json('../../floodlens/data/map-overview.json');
const previous=(await json('./fixtures/landslide-20261026-1800.json')).bulletin;
const warning=current.bulletins.find(w=>w.kind==='landslide');
test('34th landslide renewal has original identity, hash and explicit next-day validity',()=>{
 validateSnapshot(current);
 assert.equal(warning.id,'LEWM-27-10-2026-1600-34');
 assert.equal(warning.previousBulletinId,previous.id);
 assert.equal(warning.issuedAt,'2026-10-27T16:00:00+05:30');
 assert.equal(warning.expiresAt,'2026-10-28T16:00:00+05:30');
 assert.equal(warning.sha256,'6734f8541331b9fcbf5a70a60b2d1dcca291f90a138fa2e7240180a71bfe64aa');
 assert.ok(warning.url.endsWith('1793098165.pdf'));
 assert.equal(warningState(warning,Date.parse(warning.issuedAt)-1),'unknown');
 assert.equal(warningState(warning,Date.parse(warning.issuedAt)),'active');
 assert.equal(warningState(warning,Date.parse(previous.expiresAt)),'active');
 assert.equal(warningState(warning,Date.parse(warning.expiresAt)),'expired');
});
test('renewal retains all 71 exact district-scoped divisions, levels and non-official summaries',()=>{
 assert.deepEqual(warning.areas,previous.areas);assert.deepEqual(warning.summary,previous.summary);
 assert.deepEqual([1,2,3].map(level=>warning.areas.filter(a=>a.level===level).length),[28,33,10]);
 for(const area of warning.areas){assert.equal(catalog.divisions.find(a=>a.code===area.divisionCode)?.districtCode,area.districtCode);}
 assert.equal(warningMatches(warning,catalog.divisions.find(a=>a.code==='LK1103')),false);
});
test('renewed Red warning and mapped areas remain active after old expiry without extending other warnings',()=>{
 const now=Date.parse('2026-10-27T13:00:00Z'),ratnapura=catalog.divisions.find(a=>a.code==='LK9112');
 assert.equal(warningState(previous,now),'expired');
 const evidence=locationEvidence(current.bulletins,[ratnapura],{now});assert.equal(evidence.kind,'landslide');assert.equal(evidence.level,3);
 const historicalReview={...current,reviewedAt:'2026-10-27T11:13:41Z'};const layer=warningLayer(historicalReview,catalog,overview,'landslide',now);
 assert.equal(layer.areas.length,71);assert.equal(layer.areas.filter(a=>a.level===3).length,10);assert.equal(layer.unmapped.length,0);
 assert.equal(warningLayer(current,catalog,overview,'landslide',Date.parse(warning.expiresAt)).areas.length,0);
 for(const id of ['kelani-20261026-01','attanagalu-20261026-01'])assert.equal(warningState(current.bulletins.find(w=>w.id===id),now),'expired');
 const retained=provenance.reviews.find(r=>r.source?.sha256==='24f403b0375b169fcdbbd54a4e4002f967aa3486a49c3453a9412478e5b8fc41').previousStations;assert.ok(retained.every(s=>s.observedAt==='2026-10-27T15:00:00+05:30'&&s.issuedAt==='2026-10-27T15:30:00+05:30'));
});
test('full previous bulletin is preserved and review time is distinct from source validity',()=>{
 const review=provenance.reviews.find(r=>r.currentBulletinId===warning.id);assert.deepEqual(review.previousBulletin,previous);
 const source=provenance.sources.find(s=>s.id===warning.id);assert.equal(source.sha256,warning.sha256);assert.equal(source.bytes,501564);
 assert.ok(Number.isFinite(Date.parse(current.reviewedAt)));assert.ok(Date.parse(current.reviewedAt)>=Date.parse('2026-10-27T11:13:41Z'));
 assert.notEqual(Date.parse(current.reviewedAt),Date.parse(warning.issuedAt));
 assert.ok(Date.parse(source.checkedAt)>Date.parse(warning.issuedAt));
});
