import {chromium} from '/Users/adrianvasu/Desktop/ATG Apply Plus/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const cloud=JSON.parse(await readFile('floodlens/data/clouds/clouds.json'));const cloudNow=new Date(Date.parse(cloud.capturedAt)+40*60000).toISOString();
const root=process.cwd(),out='artifacts/floodlens/clouds/browser';
await mkdir(out,{recursive:true});
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
const server=createServer(async(req,res)=>{try{let f=new URL(req.url,'http://local').pathname;if(f.endsWith('/'))f+='index.html';f=path.resolve(root,'.'+f);if(!f.startsWith(root+'/'))throw Error();res.writeHead(200,{'Content-Type':types[path.extname(f)]||'text/plain'}).end(await readFile(f));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.BASE_URL||`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),results=[],hashes=[];
async function make({point=[79.8612,6.9271],lang='en',time=cloudNow,fail}={}){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),requests=[],errors=[];
 await page.clock.setFixedTime(new Date(time));page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
 if(fail==='metadata')await page.route('**/data/clouds/clouds.json',r=>r.abort());
 if(fail==='image')await page.route('**/data/clouds/*.png',r=>r.abort());
 await page.goto(base+'/ark/');await page.waitForFunction(()=>document.documentElement.dataset.arkReady==='true');
 await page.locator(`[data-language="${lang}"]`).click();
 await page.evaluate(p=>{navigator.geolocation.getCurrentPosition=ok=>ok({coords:{longitude:p[0],latitude:p[1],accuracy:40}});},point);
 await page.locator('#locate').click();await page.locator('#assessment-title').waitFor();
 if(point[1]<11)await page.waitForFunction(()=>document.querySelector('#location-forecast').getAttribute('aria-busy')==='false');
 else await page.waitForFunction(()=>document.querySelector('#assessment-title').textContent.includes('Outside'));
 return {context,page,requests,errors};
}
async function open(page,status='available'){
 await page.locator('#cloud-imagery>summary').click();
 await page.waitForFunction(s=>document.querySelector('#cloud-imagery').dataset.cloudStatus===s,status);
}
try{
 for(const lang of ['en','si','ta']){
  const {context,page,requests,errors}=await make({lang});
  assert.equal(await page.locator('#cloud-imagery').getAttribute('open'),null);
  assert.ok(!requests.some(u=>u.includes('/data/clouds/')));
  await open(page);await page.locator('#cloud-imagery svg image').waitFor();
  assert.match(await page.locator('#cloud-imagery .cloud-time').innerText(),/09:40/);
  assert.match(await page.locator('#cloud-imagery .cloud-time').innerText(),/40/);
  assert.equal(await page.locator('#cloud-imagery svg path').count(),2);
  assert.equal(await page.locator('#cloud-imagery svg circle').count(),1);
  assert.equal(await page.locator('#cloud-imagery svg image').getAttribute('href'),cloud.frames[2].path);
  const slider=page.locator('#cloud-imagery input[type=range]');
  await slider.fill('0');assert.match(await page.locator('#cloud-imagery .cloud-time').innerText(),/09:20/);
  await page.locator('#cloud-imagery .cloud-controls button').click();
  await page.waitForFunction(()=>document.querySelector('#cloud-imagery input').value==='1');
  assert.equal(await page.locator('#cloud-imagery svg image').getAttribute('href'),cloud.frames[1].path);
  await page.locator('#cloud-imagery>summary').click();
  await page.waitForFunction(()=>document.querySelector('#cloud-imagery .cloud-controls button').getAttribute('aria-pressed')==='false');
  await page.locator('#cloud-imagery>summary').click();await slider.fill('2');
  assert.ok(!requests.some(u=>cloud.unavailableFrames.some(f=>u.includes(f.captureAt.slice(0,16)))));
  assert.ok(!requests.some(u=>/79\.8612|6\.9271|gibs\.earthdata|tile\.openstreetmap/.test(u)));
  assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  await page.locator('#cloud-imagery').screenshot({path:`${out}/clouds-${lang}.png`});
  results.push(`Optional real cloud frames, animation, capture age, private pin and mobile layout ${lang}`);await context.close();
 }
 for(const [label,options,status]of [
  ['old images',{time:new Date(Date.parse(cloud.capturedAt)+3*3600000+60000).toISOString()},'stale'],
  ['future clock',{time:new Date(Date.parse(cloud.capturedAt)-60000).toISOString()},'clock_unknown'],
  ['source failure',{fail:'metadata'},'unavailable'],
  ['image failure',{fail:'image'},'image_failed']]){
  const {context,page}=await make({...options,point:[80.4037,6.6828]});await open(page,status);
  assert.equal(await page.locator('#cloud-imagery svg').isVisible(),false);
  assert.match(await page.locator('#assessment-title').innerText(),/Red/);
  results.push(`${label} hides imagery and preserves official Red warning`);await context.close();
 }
 {
  const {context,page}=await make({point:[77.209,28.613]});
  assert.equal(await page.locator('#cloud-imagery').isVisible(),false);
  results.push('Outside Sri Lanka has no substituted cloud pin');await context.close();
 }
 {
  const {context,page}=await make();const data=JSON.parse(await readFile('floodlens/data/clouds/clouds.json'));
  for(const file of ['/floodlens/data/clouds/clouds.json','/floodlens/data/clouds/provenance.json','/floodlens/data/clouds/outline.json',...data.frames.map(f=>f.path)]){
   const expected=await readFile('.'+file),result=await page.evaluate(async url=>{const r=await fetch(url,{cache:'no-store'});return{status:r.status,bytes:[...new Uint8Array(await r.arrayBuffer())]};},file);
   assert.equal(result.status,200);const body=Buffer.from(result.bytes);assert.ok(body.equals(expected));
   hashes.push({path:file,sha256:createHash('sha256').update(body).digest('hex'),bytes:body.length});
  }
  results.push('Every cloud frame, manifest and provenance exactly match reviewed files');await context.close();
 }
 await writeFile(`${out}/results.json`,JSON.stringify({base,checkedAt:new Date().toISOString(),passed:results.length,results,hashes},null,2));console.log(results);
}finally{await browser.close();server.close();}
