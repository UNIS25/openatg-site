import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateSnapshot,ageState} from '../../floodlens/core.mjs';

const data=JSON.parse(await readFile('floodlens/data/reviewed.json'));
const provenance=JSON.parse(await readFile('floodlens/data/provenance.json'));
const hash='758cc85a7b562c60dc1f891f86e1dc0a53c7b6a662744a91d5a370ab0283d21c';
// Independently checked against both columns of the original 28 October 00:30 report.
const rows=[['Holombuwa',1.34,1.33,'normal'],['Rathnapura',7.34,7.24,'alertFalling'],['Kithulgala',2.20,2.30,'normal'],['Norwood',1.31,1.32,'normal'],['Magura',4.60,4.57,'alertFalling'],['Kalawellawa (Millakanda)',7.74,7.76,'minorRising'],['Nawalapitiya',1.63,1.62,'normal'],['Dunamale',4.61,4.56,'minorFalling'],['Panadugama',6.06,6.05,'minorFalling'],['Urawa',1.36,1.45,'normal'],['Peradeniya',3.28,3.25,'normal'],['Glencourse',12.10,12.12,'normal'],['Thawalama',2.76,2.74,'normal'],['Badalgama',4.00,3.95,'normal'],['Hanwella',4.91,4.83,'normal'],['Putupaula',3.43,3.46,'alertRising'],['Baddegama',4.18,4.20,'minorRising'],['Thalgahagoda',1.72,1.73,'minorRising'],['Moragaswewa',4.11,3.96,'normal'],['Galgamuwa',null,null,'unavailable'],['Thanthirimale',null,null,'unavailable'],['Ellagawa',10.31,10.35,'alertRising']];

test('midnight original has exactly five Minor Flood, four Alert and two unavailable selected stations',()=>{
 validateSnapshot(data);
 assert.deepEqual(data.stations.map(s=>[s.name,s.previousValue,s.value,s.status]),rows);
 assert.deepEqual(['minor','alert','normal','unavailable'].map(c=>data.stations.filter(s=>s.status.startsWith(c)).length),[5,4,11,2]);
 for(const s of data.stations){assert.equal(s.unit,'m');assert.equal(s.sha256,hash);assert.ok(s.url.endsWith('1793128484.pdf'));assert.equal(s.issuedAt,'2026-10-28T00:30:00+05:30');assert.equal(s.listingAt,s.issuedAt);assert.equal('rainfall' in s,false);if(s.status==='normal')assert.equal(s.sourceTrend,null);}
});

test('midnight comparison crosses calendar dates by one hour, not one day or negative time',()=>{
 for(const s of data.stations.filter(s=>s.status!=='unavailable')){
  assert.equal(s.previousObservedAt,'2026-10-27T23:00:00+05:30');
  assert.equal(s.observedAt,'2026-10-28T00:00:00+05:30');
  assert.equal(Date.parse(s.observedAt)-Date.parse(s.previousObservedAt),3600000);
  assert.equal(Date.parse(s.issuedAt)-Date.parse(s.observedAt),1800000);
 }
 assert.equal(new Date(data.stations[0].observedAt).toISOString(),'2026-10-27T18:30:00.000Z');
});

test('missing midnight readings stay missing and cannot acquire a measured time or carry-forward value',()=>{
 for(const name of ['Galgamuwa','Thanthirimale']){
  const s=data.stations.find(s=>s.name===name);
  assert.equal(s.value,null);assert.equal(s.previousValue,null);assert.equal(s.observedAt,null);assert.equal(s.previousObservedAt,null);assert.equal(s.sourceRemarks,null);assert.equal(s.sourceTrend,null);assert.equal(s.reportObservationAt,'2026-10-28T00:00:00+05:30');assert.equal(ageState(s.observedAt,3),'unknown');
  for(const change of [{value:4.03},{value:0},{status:'normal'},{observedAt:s.reportObservationAt},{sourceRemarks:'Normal'}]){const modified=structuredClone(data);Object.assign(modified.stations.find(s=>s.name===name),change);assert.throws(()=>validateSnapshot(modified));}
 }
});

test('new gauge classifications preserve prior readings, exact fifteen-hour rainfall scope and area warnings',()=>{
 const review=provenance.reviews.find(r=>r.source?.sha256===hash&&r.previousStations);
 assert.ok(review);assert.equal(review.previousStations.find(s=>s.name==='Rathnapura').status,'minorFalling');assert.equal(review.previousStations.find(s=>s.name==='Rathnapura').value,7.52);assert.equal(review.warningsChanged,false);assert.equal(review.rainfallPeriodHours,15);assert.equal(review.rainfallIngested,false);assert.deepEqual(review.otherMissingSourceStations,['Weraganthota','Yaka Wewa']);
 assert.equal(data.bulletins.find(w=>w.id==='kalu-20261027-02').expiresAt,'2026-10-28T13:30:00+05:30');
 assert.equal(data.bulletins.find(w=>w.kind==='landslide').id,'LEWM-27-10-2026-1600-34');
 assert.equal(data.marineBulletins.find(w=>w.id==='MSW-26-10-27-02-08').timeConflict,true);
});

test('midnight observation freshness follows its own UTC instant independently of bulletin review',()=>{
 const time=data.stations[0].observedAt;
 assert.equal(ageState(time,3,Date.parse('2026-10-27T19:43:32Z')),'fresh');
 assert.equal(ageState(time,3,Date.parse('2026-10-27T21:31:00Z')),'stale');
 assert.equal(Date.parse(data.reviewedAt)>Date.parse(time),true);
});
