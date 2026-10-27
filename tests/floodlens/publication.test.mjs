import test from 'node:test';import assert from 'node:assert/strict';import{mkdtemp,cp,readFile,writeFile,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';
import{validateGroup}from'../../scripts/floodlens/validate_publication.mjs';
async function candidate(group,change){const dir=await mkdtemp(join(tmpdir(),'ark-publish-'));await cp('floodlens/data/'+group,dir,{recursive:true});try{await change(dir);}finally{await rm(dir,{recursive:true,force:true});}}
async function changeJSON(dir,name,fn){const d=JSON.parse(await readFile(dir+'/'+name));fn(d);await writeFile(dir+'/'+name,JSON.stringify(d));}
test('forecast publication rejects incomplete/future/regressed or mismatched source groups',async()=>{
 await validateGroup('forecast','floodlens/data/forecast','floodlens/data/forecast');
 for(const fn of [d=>d.runAt='2099-01-01T00:00:00Z',d=>d.frames[0].rainMm[0]=null,d=>d.frames[0].windUms[0]=null,d=>d.units.rainMm='m',d=>d.captureErrors.push({error:'source failed'})])await candidate('forecast',async dir=>{await changeJSON(dir,'forecast.json',fn);await assert.rejects(validateGroup('forecast',dir,'floodlens/data/forecast'));});
});
test('cloud publication rejects swapped bytes, unapproved paths and false times',async()=>{
 await validateGroup('clouds','floodlens/data/clouds','floodlens/data/clouds');
 await candidate('clouds',async dir=>{await cp(dir+'/frame-0.png',dir+'/frame-2.png');await assert.rejects(validateGroup('clouds',dir,'floodlens/data/clouds'),/hash/);});
 for(const fn of [d=>d.frames[0].path='/floodlens/app.mjs',d=>d.frames[0].landPixelCoverage=.98,d=>d.capturedAt='2099-01-01T00:00:00Z'])await candidate('clouds',async dir=>{await changeJSON(dir,'clouds.json',fn);await assert.rejects(validateGroup('clouds',dir,'floodlens/data/clouds'));});
});
test('tide publication requires matching licensed inputs, validation and upcoming coverage',async()=>{
 await validateGroup('tides','floodlens/data/tides','floodlens/data/tides');
 for(const fn of [d=>d.predictionSha256='0'.repeat(64),d=>d.maxDifferenceMetres=.021,d=>d.extremaComparison[0].differenceMinutes=5.01,d=>d.samples=2])await candidate('tides',async dir=>{await changeJSON(dir,'validation.json',fn);await assert.rejects(validateGroup('tides',dir,'floodlens/data/tides'));});
 await candidate('tides',async dir=>{await changeJSON(dir,'colombo.json',d=>d.source.sha256='0'.repeat(64));await assert.rejects(validateGroup('tides',dir,'floodlens/data/tides'));});
});
