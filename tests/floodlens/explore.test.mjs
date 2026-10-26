import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {warningLayer,forecastLayer,forecastCells,reviewedReports,cycloneState} from '../../floodlens/explore-model.mjs';
const json=async path=>JSON.parse(await readFile('floodlens/data/'+path));
const [warnings,catalog,overview,forecast,media,locations,cyclone]=await Promise.all(['reviewed.json','areas.json','map-overview.json','forecast/forecast.json','reservoir-reports.json','reservoir-locations.json','explore/cyclone.json'].map(json));
const now=Date.parse('2026-10-26T20:30:00Z');
test('warning geometry is the named administrative scope, with exact levels and expiry',()=>{
 const flood=warningLayer(warnings,catalog,overview,'flood',now);
 assert.equal(flood.bulletins.length,5);assert.ok(flood.areas.some(a=>a.area.code==='LK9112'));assert.ok(!flood.areas.some(a=>a.area.districtCode==='LK62'));
 const slide=warningLayer(warnings,catalog,overview,'landslide',now);assert.equal(slide.areas.find(a=>a.area.code==='LK9112').level,3);
 assert.equal(warningLayer(warnings,catalog,overview,'lightning',now).areas.length,0);
 assert.equal(warningLayer(warnings,catalog,overview,'flood',Date.parse('2026-10-28T00:00:00Z')).areas.length,0);
 const bad=structuredClone(warnings);bad.bulletins[0].severity='unknown';assert.throws(()=>warningLayer(bad,catalog,overview,'flood',now));
});
test('unmapped named divisions remain visible and stale review does not cancel active warnings',()=>{
 const s=structuredClone(warnings);s.bulletins[0].areas.push({districtCode:'LK91',division:'Unmapped test division',divisionCode:null});
 const layer=warningLayer(s,catalog,overview,'flood',Date.parse('2026-10-26T22:00:00Z'));assert.equal(layer.unmapped.length,1);assert.equal(layer.reviewOlder,true);assert.ok(layer.areas.length>0);
});
test('forecast map uses exactly eight consecutive upcoming native intervals with explicit missing cells',()=>{
 const f=forecastLayer(forecast,now);assert.equal(f.frames.length,8);assert.equal(f.frames[0].intervalStart,'2026-10-26T21:00:00Z');assert.equal(f.frames.at(-1).validAt,'2026-10-27T21:00:00Z');
 const rain=forecastCells(forecast,f.frames[0],'rain'),wind=forecastCells(forecast,f.frames[0],'wind');assert.equal(rain.length,198);assert.equal(wind.length,198);assert.equal(rain[0].value,f.frames[0].rainMm[0]);assert.ok(Math.abs(wind[0].value-Math.hypot(f.frames[0].windUms[0],f.frames[0].windVms[0])*3.6)<1e-10);
 const frame=structuredClone(f.frames[0]);frame.rainMm[0]=null;assert.equal(forecastCells(forecast,frame,'rain')[0].value,null);
 assert.equal(forecastLayer(forecast,Date.parse('2026-10-29T00:00:00Z')).status,'incomplete');
});
test('reports join exact reservoir identities and remain media claims with unknown operation times',()=>{
 const r=reviewedReports(media,locations,now);assert.deepEqual(r.map(x=>x.tankCode),['R13206','R13101']);assert.deepEqual(r.map(x=>x.spillCusecs),[4400,3000]);assert.ok(r.every(x=>x.operationAt===null&&x.source==='Daily Mirror'));
 assert.equal(reviewedReports(media,locations,now+72*3600000).length,0);
 const bad=structuredClone(media);bad.records[0].tankCode='unverified';assert.throws(()=>reviewedReports(bad,locations,now));assert.throws(()=>reviewedReports(media,locations,Date.parse('2026-10-25T00:00:00Z')));
});
test('official cyclone reported and forecast positions never become an interpolated current centre',()=>{
 assert.equal(cycloneState(cyclone,now).status,'available');assert.equal(cyclone.points.length,10);assert.deepEqual(cyclone.points[0].point,[86.8,15.8]);assert.equal(cyclone.points[0].type,'reported');assert.ok(cyclone.points.slice(1).every(p=>p.type==='forecast'));
 assert.deepEqual(cyclone.points[1].windKmh,[115,125]);assert.equal(cyclone.points[1].at,'2026-10-26T18:00:00Z');
 assert.equal(cycloneState(cyclone,Date.parse('2026-10-26T21:01:00Z')).status,'review_due');assert.equal(cycloneState(cyclone,Date.parse('2026-11-01T00:00:00Z')).status,'expired');assert.equal(cycloneState(cyclone,Date.parse('2026-10-26T17:00:00Z')).status,'clock_unknown');
 const future=structuredClone(cyclone);future.reviewedAt='2026-10-26T22:00:00Z';assert.equal(cycloneState(future,now).status,'clock_unknown');const bad=structuredClone(cyclone);bad.points[1].type='reported';assert.throws(()=>cycloneState(bad,now));bad.points[1].type='forecast';bad.source.url='https://example.com/track.pdf';assert.throws(()=>cycloneState(bad,now));
});
