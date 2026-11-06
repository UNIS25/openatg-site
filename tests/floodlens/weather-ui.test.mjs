import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderHourlyRain,mountHourlyRain} from '../../floodlens/hourly-rain-ui.mjs?v=20261106-37';
import {mountForecast} from '../../floodlens/weather-ui.mjs';
import {renderDistrictEvidence} from '../../floodlens/place-ui.mjs';
import {districtEvidence} from '../../floodlens/place-evidence.mjs';
import {ExploreMap} from '../../floodlens/explore-map.mjs';
import {hourlyMapLayer} from '../../floodlens/hourly-map-model.mjs';
import {selectHourlyRain,HOURLY_RAIN_SOURCE} from '../../floodlens/hourly-rain-model.mjs';
let JSDOM;try{({JSDOM}=await import(process.env.JSDOM_MODULE||'jsdom'));}catch{}
const domTest=(name,fn)=>test(name,{skip:JSDOM?false:'Install jsdom or set JSDOM_MODULE to its module entrypoint for DOM tests'},fn);
const H=3600000,now=Date.parse('2026-11-06T15:30:00Z'),point=[79.8612,6.9271],iso=ms=>new Date(ms).toISOString();
const json=name=>JSON.parse(fs.readFileSync(new URL('../../floodlens/data/'+name,import.meta.url)));
function fixture(){
 const old=Date.parse('2026-11-05T12:00:00Z'),current=Date.parse('2026-11-06T12:00:00Z'),floor=Math.floor(now/H)*H;
 return {schemaVersion:1,kind:'hourly_model_rainfall',model:'NOAA GFS 0.25°',source:HOURLY_RAIN_SOURCE,terms:'https://www.weather.gov/disclaimer',intervalHours:1,units:{rainMm:'mm/1h'},pastDataKind:'archived_forecast_model_estimate',capturedAt:iso(now),generatedAt:iso(now),runs:[old,current].map(r=>({runAt:iso(r),source:HOURLY_RAIN_SOURCE})),grid:{type:'regular_ll',spacingDegrees:.25,bbox:[79.5,5.75,82,10],points:Array.from({length:198},(_,i)=>[79.5+(i%11)*.25,5.75+Math.floor(i/11)*.25])},frames:Array.from({length:49},(_,i)=>{const start=floor-24*H+i*H,run=i<24?old:current;return {runAt:iso(run),startStep:(start-run)/H,endStep:(start-run)/H+1,intervalStart:iso(start),validAt:iso(start+H),rainMm:Array(198).fill(1),rainQuality:Array(198).fill('valid'),packingToleranceMm:.0625};})};
}
async function withDom(fn){
 const dom=new JSDOM('<!doctype html><html><body><main></main></body></html>',{url:'https://example.test/ark/',pretendToBeVisual:true});
 const previous={document:globalThis.document,window:globalThis.window,fetch:globalThis.fetch,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval,now:Date.now};
 globalThis.document=dom.window.document;globalThis.window=dom.window;Date.now=()=>now;
 try{return await fn(dom.window.document.querySelector('main'),dom.window);}finally{dom.window.close();for(const k of ['document','window','fetch','setInterval','clearInterval'])globalThis[k]=previous[k];Date.now=previous.now;}
}

test('hourly map and point cards use the same native one-hour source cells and window semantics',()=>{
 const d=fixture(),selection=selectHourlyRain(d,point,now);
 for(const period of ['past24','next24'])for(const frame of [0,12,23]){
  const m=hourlyMapLayer(d,period,frame,now),row=selection[period].rows[frame];
  assert.equal(m.rows.length,24);assert.equal(m.cells.length,198);assert.equal(m.frame.intervalStart,row.intervalStart);
  assert.equal(m.cells[selection.index].value,row.rainMm);assert.equal(m.runAt,row.runAt);
  assert.equal(Date.parse(m.frame.validAt)-Date.parse(m.frame.intervalStart),H);
  assert.equal(m.kind,period==='past24'?'historical_model_estimate':'model_forecast');
 }
 assert.throws(()=>hourlyMapLayer(d,'made-up',0,now));
 assert.equal(hourlyMapLayer(d,'next24',-1,now).frame.intervalStart,selection.next24.rows[0].intervalStart);
 assert.equal(hourlyMapLayer(d,'next24',100,now).frame.intervalStart,selection.next24.rows[23].intervalStart);
});
test('equivalent ISO formats do not turn actual hourly map cells into missing values',()=>{
 const d=fixture();for(const f of d.frames){f.intervalStart=f.intervalStart.replace('.000Z','Z');f.validAt=f.validAt.replace('.000Z','Z');}
 assert.ok(hourlyMapLayer(d,'next24',0,now).cells.every(c=>c.value===1));
 const hour=d.frames.findIndex(f=>Date.parse(f.intervalStart)===Date.parse('2026-11-06T16:00:00Z'));d.frames.splice(hour,1);
 assert.ok(hourlyMapLayer(d,'next24',0,now).cells.every(c=>c.value===null));
});
const hourlyFile=new URL('../../floodlens/data/hourly-rain/hourly-rain.json',import.meta.url);
test('real captured NOAA grid matches hourly map values exactly',{skip:!fs.existsSync(hourlyFile)},()=>{
 const d=JSON.parse(fs.readFileSync(hourlyFile)),at=Date.parse(d.generatedAt)+1000;
 for(const period of ['past24','next24']){
  const s=selectHourlyRain(d,point,at);assert.equal(s[period].status,'complete');
  const m=hourlyMapLayer(d,period,0,at),field=d.frames.find(f=>Date.parse(f.intervalStart)===Date.parse(m.frame.intervalStart));
  assert.ok(field);assert.deepEqual(m.cells.map(c=>c.value),field.rainMm);assert.equal(m.runAt,field.runAt);
 }
});
domTest('hourly cards show 24 rows each with explicit model/measurement limits and SLST boundaries',()=>withDom(root=>{
 const s=renderHourlyRain(root,fixture(),point,'en',now);assert.equal(s.status,'available');
 assert.equal(root.querySelectorAll('.hourly-card').length,2);assert.deepEqual([...root.querySelectorAll('.hourly-list')].map(x=>x.children.length),[24,24]);
 assert.deepEqual([...root.querySelectorAll('.hourly-total')].map(x=>x.textContent),['24.0 mm','24.0 mm']);
 assert.match(root.textContent,/MODEL ESTIMATE · NOT MEASURED/);assert.match(root.textContent,/MODEL FORECAST/);
 assert.match(root.textContent,/not a rain-gauge measurement/);assert.match(root.textContent,/does not show floodwater or household flood risk/);
 assert.match(root.textContent,/21:30/);assert.match(root.textContent,/SLST/);assert.match(root.textContent,/ongoing partial hour is excluded/);
 assert.equal(root.querySelectorAll('details[open]').length,0);
 for(const a of root.querySelectorAll('a')){assert.equal(a.target,'_blank');assert.match(a.rel,/noopener/);assert.match(a.rel,/noreferrer/);assert.ok(a.href.startsWith('https://'));}
 assert.ok(root.querySelector('a[href="/floodlens/data/hourly-rain/provenance.json"]'));
}));
domTest('missing rain stays unavailable while measured-zero model values remain visibly zero',()=>withDom(root=>{
 const d=fixture(),i=selectHourlyRain(d,point,now).index;d.frames[0].rainMm[i]=null;d.frames[0].rainQuality[i]='missing';
 renderHourlyRain(root,d,point,'en',now);assert.equal(root.dataset.hourlyStatus,'partial');
 assert.equal(root.querySelector('[data-rain-window="past24"] .hourly-total').textContent,'Unavailable');
 assert.match(root.textContent,/Missing hours are not zero rain/);
 const row=root.querySelector('.hourly-list li');assert.equal(row.querySelector('strong').textContent,'Unavailable');assert.equal(row.querySelector('i').style.width,'0%');
 d.frames.forEach(f=>{f.rainMm.fill(0);f.rainQuality.fill('valid');});renderHourlyRain(root,d,point,'en',now);
 assert.deepEqual([...root.querySelectorAll('.hourly-total')].map(x=>x.textContent),['0.0 mm','0.0 mm']);
 assert.doesNotMatch(root.textContent,/No flood risk|all clear|safe to travel/i);
}));
domTest('unavailable, outside-coverage and stale hourly data keep unknown totals and dated notices',()=>withDom(root=>{
 for(const d of [null,{}, {...fixture(),source:'https://example.com'}]){renderHourlyRain(root,d,point,'en',now);assert.equal(root.dataset.hourlyStatus,'unavailable');assert.deepEqual([...root.querySelectorAll('.hourly-total')].map(x=>x.textContent),['Unavailable','Unavailable']);}
 renderHourlyRain(root,fixture(),[0,0],'en',now);assert.equal(root.dataset.hourlyStatus,'outside_coverage');assert.equal(root.querySelector('.hourly-total').textContent,'Unavailable');
 renderHourlyRain(root,fixture(),point,'en',now+19*H);assert.equal(root.dataset.hourlyStatus,'stale');assert.match(root.querySelector('.forecast-notice').textContent,/snapshot is old/);
}));
domTest('expanded rows and sources survive refresh and all three supported languages render complete UI',()=>withDom(root=>{
 renderHourlyRain(root,fixture(),point,'en',now);for(const d of root.querySelectorAll('details'))d.open=true;
 for(const language of ['en','si','ta']){renderHourlyRain(root,fixture(),point,language,now);assert.equal(root.querySelectorAll('details[open]').length,3);assert.equal(root.querySelectorAll('li').length,48);assert.doesNotMatch(root.textContent,/undefined|NaN|Invalid Date/);assert.ok(root.querySelector('h3').textContent.length>5);}
}));
domTest('district UI keeps source dates, incomplete/stale notices, reports and household uncertainty separate',()=>withDom(root=>{
 const snapshot=json('reviewed.json'),catalog=json('areas.json'),news=json('news-updates.json'),forecast=JSON.parse(fs.readFileSync(new URL('./fixtures/forecast-20261106-00z.json',import.meta.url)));
 const e=districtEvidence({snapshot,catalog,news,forecast},'LK11',Date.parse('2026-11-06T19:00:00Z')),layers=[];
 renderDistrictEvidence(root,e,'en',layer=>layers.push(layer));
 assert.match(root.textContent,/area names are unmatched/);assert.match(root.textContent,/more than three hours old/);assert.match(root.textContent,/older model run/);
 assert.match(root.textContent,/Current floodwater extent at this place is not established/);assert.match(root.textContent,/Noon river readings cannot rule out evening street flooding/);
 assert.match(root.textContent,/Published:/);assert.match(root.textContent,/SLST/);
 for(const button of root.querySelectorAll('button'))button.click();assert.deepEqual(layers,['satellite','gauges','rain']);
 e.district.names.en='<img src=x onerror=alert(1)>';renderDistrictEvidence(root,e,'en');assert.equal(root.querySelector('img'),null);assert.match(root.querySelector('h2').textContent,/<img/);
 for(const language of ['si','ta']){renderDistrictEvidence(root,e,language);assert.doesNotMatch(root.textContent,/undefined|Invalid Date/);assert.equal(root.querySelectorAll('button').length,3);}
}));
domTest('map gives report districts neutral geometry, CAP outlines no flood fill, and dated gauge buttons',()=>withDom((root,window)=>{
 const picks=[],map=new ExploreMap(root,id=>picks.push(id)),feature={geometry:{type:'Polygon',coordinates:[[[80,7],[81,7],[81,8],[80,7]]]}};
 map.set({districts:[{code:'LK11',label:'Colombo',bbox:[80,7,81,8],features:[feature],reportCount:1}],selectedDistrict:'LK11',reportLabel:'reports',warningOutlines:[feature],gauges:[{name:'Gauge A',point:[80.5,7.5],value:3.5,unit:'m',observedAt:'2026-11-06T06:30:00Z'}]});
 const district=root.querySelector('[data-select="district:LK11"]');assert.equal(district.getAttribute('role'),'button');assert.equal(district.querySelector('path').getAttribute('fill'),'#dbeae3');
 assert.match(root.textContent,/Colombo · 1 reports/);const cap=root.querySelector('path[stroke-dasharray="8 5"]');assert.equal(cap.getAttribute('fill'),'none');assert.equal(cap.getAttribute('pointer-events'),'none');
 const gauge=root.querySelector('[data-select="gauge:Gauge%20A"]');assert.match(gauge.getAttribute('aria-label'),/3.5 m · 2026-11-06T06:30:00Z/);assert.equal(gauge.querySelectorAll('circle')[1].getAttribute('fill'),'#d3d9d8');
 district.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));gauge.dispatchEvent(new window.KeyboardEvent('keydown',{key:' ',bubbles:true}));assert.deepEqual(picks,['district:LK11','gauge:Gauge%20A']);
 map.set({});assert.equal(root.querySelector('[data-select]'),null);assert.equal(root.querySelector('path[stroke-dasharray]'),null);
}));
domTest('hourly fetch failure renders unknown and retries without sending the pin to a server',()=>withDom(async root=>{
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});if(calls.length===1)throw Error('offline');return {ok:true,text:async()=>JSON.stringify(fixture())};};
 await mountHourlyRain(root,point,'en');assert.equal(root.dataset.hourlyStatus,'unavailable');await mountHourlyRain(root,point,'en');assert.equal(root.dataset.hourlyStatus,'available');assert.equal(calls.length,2);
 for(const {url,options}of calls){assert.equal(url,'/floodlens/data/hourly-rain/hourly-rain.json');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.cache,'no-store');assert.ok(options.signal);}
}));
domTest('weather wrapper replaces mounts, lazy-loads regional fallback once, and disposes its timers',()=>withDom(async(root,window)=>{
 const timers=new Map(),calls=[];let next=0;globalThis.setInterval=(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id;};globalThis.clearInterval=id=>timers.delete(id);
 globalThis.fetch=async(url,options)=>{calls.push(String(url));return {ok:false,text:async()=>''};};
 const first=await mountForecast(root,point,'en');assert.equal(typeof first,'function');assert.equal(root.querySelectorAll('.hourly-card').length,2);assert.equal(timers.size,1);assert.equal(calls.length,0);
 const second=await mountForecast(root,[80.5,7.5],'ta');assert.equal(timers.size,1);assert.equal(root.querySelectorAll('.weather-more').length,1);
 const more=root.querySelector('.weather-more');more.open=true;more.dispatchEvent(new window.Event('toggle'));await new Promise(setImmediate);more.open=false;more.dispatchEvent(new window.Event('toggle'));more.open=true;more.dispatchEvent(new window.Event('toggle'));await new Promise(setImmediate);
 assert.equal(calls.length,1);assert.match(calls[0],/forecast\/forecast\.json/);second();assert.equal(timers.size,0);first();assert.equal(timers.size,0);
}));
domTest('new mount wins over an interrupted pending hourly fetch',()=>withDom(async root=>{
 Date.now=()=>now+5*60000;let resolve;globalThis.fetch=()=>new Promise(r=>resolve=r);const timers=new Map();let next=0;globalThis.setInterval=(fn,ms)=>{timers.set(++next,{fn,ms});return next;};globalThis.clearInterval=id=>timers.delete(id);
 const first=mountForecast(root,point,'en'),second=mountForecast(root,[80.5,7.5],'ta');assert.ok(resolve);resolve({ok:true,text:async()=>JSON.stringify(fixture())});
 const disposers=await Promise.all([first,second]);assert.equal(root.querySelectorAll('.hourly-card').length,2);assert.equal(root.querySelector('h3').textContent,'மணிநேர மழை');assert.equal(timers.size,1);disposers.forEach(fn=>fn());assert.equal(timers.size,0);
}));
domTest('visible refresh loads new published rain while preserving expansion, hidden/disposed views do not update',()=>withDom(async root=>{
 let clock=now+10*60000,count=0;Date.now=()=>clock;const timers=new Map();let next=0;
 globalThis.setInterval=(fn,ms)=>{timers.set(++next,{fn,ms});return next;};globalThis.clearInterval=id=>timers.delete(id);
 globalThis.fetch=async()=>{count++;const d=fixture();if(count>1)d.frames.forEach(f=>f.rainMm.fill(2));return {ok:true,text:async()=>JSON.stringify(d)};};
 const dispose=await mountForecast(root,point,'en'),tick=[...timers.values()].find(t=>t.ms===60000).fn;
 assert.equal(count,1);assert.equal(root.querySelector('.hourly-total').textContent,'24.0 mm');root.querySelector('details[data-window="past24"]').open=true;
 clock+=5*60000;tick();await new Promise(setImmediate);assert.equal(count,2);assert.equal(root.querySelector('.hourly-total').textContent,'48.0 mm');assert.equal(root.querySelector('details[data-window="past24"]').open,true);
 Object.defineProperty(document,'hidden',{value:true,configurable:true});clock+=5*60000;tick();await new Promise(setImmediate);assert.equal(count,2);
 Object.defineProperty(document,'hidden',{value:false,configurable:true});dispose();tick();await new Promise(setImmediate);assert.equal(count,2);assert.equal(timers.size,0);
}));
domTest('explore app district dropdown and language redraw preserve the selected neutral district',()=>withDom(async(_root,window)=>{
 const previousOption=globalThis.Option;globalThis.Option=window.Option;const timers=new Map();let next=0;
 globalThis.setInterval=(fn,ms)=>{timers.set(++next,{fn,ms});return next;};globalThis.clearInterval=id=>timers.delete(id);
 document.body.innerHTML=fs.readFileSync(new URL('../../ark/explore/index.html',import.meta.url),'utf8');
 window.HTMLElement.prototype.scrollIntoView=()=>{};
 globalThis.fetch=async url=>{
  const path=String(url).split('?')[0];if(/\/clouds\/clouds\.json$|\/satellite\/satellite\.json$/.test(path))return {ok:false};
  try{const raw=fs.readFileSync(new URL('../../'+path.replace(/^\//,''),import.meta.url),'utf8');return {ok:true,json:async()=>JSON.parse(raw),text:async()=>raw};}catch{return {ok:false};}
 };
 try{
  await import('../../floodlens/explore-app.mjs?dom-regression');for(let i=0;i<20&&document.documentElement.dataset.exploreReady!=='true';i++)await new Promise(setImmediate);
  assert.equal(document.documentElement.dataset.exploreReady,'true');assert.equal(document.querySelector('#explore-map').dataset.layer,'places');
  const select=document.querySelector('#district');select.value='LK11';select.dispatchEvent(new window.Event('change'));
  assert.equal(document.querySelector('#selection h2').textContent,'Colombo');assert.equal(document.querySelector('[data-select="district:LK11"] path').getAttribute('fill'),'#dbeae3');
  const language=document.querySelector('#explore-language');language.value='ta';language.dispatchEvent(new window.Event('change'));
  assert.equal(document.querySelector('#selection h2').textContent,json('areas.json').districts.find(d=>d.code==='LK11').names.ta);
  assert.equal(document.querySelector('#district').value,'LK11');
  assert.equal(document.querySelector('[data-select="district:LK11"] path').getAttribute('fill'),'#dbeae3');
 }finally{globalThis.Option=previousOption;}
}));
