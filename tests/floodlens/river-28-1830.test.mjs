import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateSnapshot,ageState,locationEvidence} from '../../floodlens/core.mjs';
const d=JSON.parse(await readFile('floodlens/data/reviewed.json'));
const p=JSON.parse(await readFile('floodlens/data/provenance.json'));
const catalog=JSON.parse(await readFile('floodlens/data/areas.json'));
// Independent expected transcription of the source's 17:00 and 18:00 columns.
const rows=[['Holombuwa',1.15,1.14,'normal'],['Rathnapura',5.95,5.89,'alertFalling'],['Kithulgala',2.21,2.23,'normal'],['Norwood',1.17,1.17,'normal'],['Magura',4.19,4.28,'alertRising'],['Kalawellawa (Millakanda)',7.70,7.68,'minorFalling'],['Nawalapitiya',1.56,1.55,'normal'],['Dunamale',3.27,3.25,'normal'],['Panadugama',6.06,6.11,'minorRising'],['Urawa',2.20,2.09,'normal'],['Peradeniya',2.98,2.98,'normal'],['Glencourse',11.71,11.65,'normal'],['Thawalama',3.30,3.30,'normal'],['Badalgama',3.30,3.29,'normal'],['Hanwella',4.28,4.27,'normal'],['Putupaula',3.70,3.71,'alertRising'],['Baddegama',4.23,4.23,'minorNoTrend'],['Thalgahagoda',1.84,1.85,'minorRising'],['Moragaswewa',3.00,2.95,'normal'],['Galgamuwa',2.35,2.36,'normal'],['Thanthirimale',1.82,1.82,'normal'],['Ellagawa',10.41,10.40,'alertFalling']];
test('18:30 original preserves exact columns, units, 4 Minor / 4 Alert and blank Baddegama trend',()=>{
 validateSnapshot(d);assert.deepEqual(d.stations.map(s=>[s.name,s.previousValue,s.value,s.status]),rows);
 assert.deepEqual(['minor','alert','normal'].map(c=>d.stations.filter(s=>s.status.startsWith(c)).length),[4,4,14]);
 for(const s of d.stations){assert.equal(s.unit,'m');assert.equal(s.observedAt,'2026-10-28T18:00:00+05:30');assert.equal(s.previousObservedAt,'2026-10-28T17:00:00+05:30');assert.equal(s.issuedAt,'2026-10-28T18:30:00+05:30');assert.equal(s.sha256,'73faf1ba5ae9da0c723fe8e8b7b0b1622e53d3e5d892e2776c22bf4deda13a09');if(s.status==='normal'||s.status.endsWith('NoTrend'))assert.equal(s.sourceTrend,null);}
 assert.equal(d.stations.find(s=>s.name==='Baddegama').sourceTrend,null);
 assert.ok(!d.stations.some(s=>s.name==='Nagalagam Street'));
});
test('18:00 source ages independently of review; station Normal cannot cancel Gin or Kalu',()=>{
 const at=Date.parse('2026-10-28T15:31:00Z');for(const s of d.stations)assert.equal(ageState(s.observedAt,3,at),'stale');
 for(const [code,id] of [['LK3118','gin-20261028-02'],['LK9112','kalu-20261028-03']])assert.equal(locationEvidence(d.bulletins,[catalog.divisions.find(a=>a.code===code)],{now:at}).source.id,id);
 const old=p.reviews.find(r=>r.source?.id==='river-20261028-1830').previousStations;
 assert.equal(old.find(s=>s.name==='Panadugama').status,'alertRising');assert.equal(d.stations.find(s=>s.name==='Panadugama').status,'minorRising');
 assert.equal(old.find(s=>s.name==='Dunamale').status,'alertFalling');assert.equal(d.stations.find(s=>s.name==='Dunamale').status,'normal');
});
test('nine-hour rainfall period remains separate from previous six and three-hour totals',()=>{
 for(const [id,hours,end] of [['river-20261028-1830',9,'18:00'],['river-20261028-1530',6,'15:00'],['river-20261028-1230',3,'12:00']]){const r=p.reviews.find(r=>r.source?.id===id);assert.equal(r.rainfallPeriodHours,hours);assert.equal(r.rainfallIngested,false);assert.equal(r.separateRainfallObservation.millimetres,68.6);assert.equal(r.separateRainfallObservation.periodEnd??r.separateRainfallObservation.endsAt,`2026-10-28T${end}:00+05:30`);}
 assert.ok(d.stations.every(s=>!('rainfall' in s)));
});
