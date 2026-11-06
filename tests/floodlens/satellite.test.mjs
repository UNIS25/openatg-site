import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {satelliteState,verifiedSatelliteImage} from '../../floodlens/satellite-model.mjs';import {warningLayer} from '../../floodlens/explore-model.mjs';import {copy} from '../../floodlens/explore-copy.mjs';
const d=JSON.parse(await readFile('floodlens/data/satellite/satellite.json')),now=Date.parse(d.retrievedAt)+1000;
const fetcher=async path=>new Response(await readFile('.'+path.split('?')[0]));
test('matched dated products retain correct projection, provenance and separate clocks',async()=>{
 assert.equal(d.products.flood.date,'2026-11-05');assert.equal(d.products.truecolor.date,d.products.flood.date);
 for(const key of ['flood','truecolor']){assert.equal(satelliteState(d,key,now).status,'available');const raw=await readFile('.'+d.products[key].path);assert.equal(createHash('sha256').update(raw).digest('hex'),d.products[key].sha256);assert.match(await verifiedSatelliteImage(d,key,fetcher,now),/^data:image\/png;base64,/);}
 assert.ok(Math.abs(d.displayResolutionDegrees-.00439453125)<1e-12);assert.equal(d.nominalProductResolutionMeters,250);assert.equal(d.products.flood.compositeDays,2);
});
test('stale, future, mismatched, external or malformed imagery cannot appear',async()=>{
 assert.equal(satelliteState(d,'flood',Date.parse('2026-11-08T00:00:01Z')).status,'stale');assert.equal(satelliteState(d,'flood',Date.parse(d.retrievedAt)-1).status,'clock_unknown');await assert.rejects(verifiedSatelliteImage(d,'flood',fetcher,Date.parse('2026-11-08T00:00:01Z')));
 for(const mutate of [x=>x.crs='EPSG:3857',x=>x.bbox=[0,0,1,1],x=>x.pixelWidth=200,x=>x.products.flood.path='https://example.com/map.png',x=>x.products.flood.date='2026-02-30',x=>x.products.flood.compositeDays=1,x=>x.displayResolutionDegrees=NaN]){const x=structuredClone(d);mutate(x);assert.throws(()=>satelliteState(x,'flood',now));}
 const bad=structuredClone(d);bad.products.flood.sha256='f'.repeat(64);await assert.rejects(verifiedSatelliteImage(bad,'flood',fetcher,now),/version mismatch/);await assert.rejects(verifiedSatelliteImage(d,'flood',async()=>new Response('bad'),now),/size\/type mismatch/);
});
test('all languages show limitations, dates, no-data meaning and non-live help sources',async()=>{
 for(const lang of ['en','si','ta'])for(const k of ['satellite','truecolor','satelliteTitle','satelliteNote','truecolorNote','satelliteStale','satelliteUse','satelliteResolution','insufficientData','transparentUnknown','imageDate','roadsHelpNote'])assert.ok(copy[lang][k]);
 assert.match(copy.en.satelliteNote,/not a live/);assert.match(copy.en.satelliteNote,/Transparent areas do not prove safety/);assert.match(copy.en.roadsHelpNote,/may not be open/);
 const html=await readFile('ark/explore/index.html','utf8');assert.match(html,/data-layer="satellite"/);assert.match(html,/data-layer="truecolor"/);assert.match(html,/connect-src 'self'/);assert.doesNotMatch(html,/maps\.googleapis\.com/);
});
test('official CAP unmatched DSD names remain visible in map limitation, not guessed polygons',async()=>{
 const [s,c,o]=await Promise.all(['reviewed.json','areas.json','map-overview.json'].map(async p=>JSON.parse(await readFile('floodlens/data/'+p))));const layer=warningLayer(s,c,o,'lightning',Date.parse(s.reviewedAt));assert.ok(layer.unmapped.some(x=>x.area.division==='MUNDALA'));assert.ok(layer.unmapped.length>=37);
});
