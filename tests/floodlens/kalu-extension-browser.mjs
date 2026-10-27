import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {copy} from '../../floodlens/i18n.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH?pathToFileURL(process.env.PLAYWRIGHT_PATH).href:'playwright');
const root=process.cwd(),out='artifacts/floodlens/review-20261027-0842';await mkdir(out,{recursive:true});
const types={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
const server=createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p.endsWith('/'))p+='index.html';const f=path.resolve(root,'.'+decodeURIComponent(p));if(!f.startsWith(root+'/'))throw Error();res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'}).end(await readFile(f));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.BASE_URL||`http://127.0.0.1:${server.address().port}`,prefix=process.env.BASE_URL?'public':'local';
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})}),result={base,checkedAt:new Date().toISOString(),cases:[],hashes:[],errors:[]};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));
 await page.goto(base+'/ark/');await page.locator('[data-language=en]').click();await page.evaluate(()=>{navigator.geolocation.getCurrentPosition=ok=>ok({coords:{longitude:80.062,latitude:6.715,accuracy:20}})});await page.locator('#locate').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled&&!document.querySelector('#result-screen').hidden&&!document.querySelector('#assessment-title').textContent.includes('Checking'));
 for(const language of ['en','si','ta']){await page.locator('#language').selectOption(language);assert.equal(await page.locator('#assessment-title').innerText(),copy[language].amberFlood);assert.ok((await page.locator('#quick-source').getAttribute('href')).includes('1793090488.pdf'));assert.match(await page.locator('#warnings .warning').filter({has:page.locator('a[href$="1793090488.pdf"]')}).locator('.warning-times').textContent(),/28[\s\S]*13:30/);assert.match(await page.locator('.checked-fact').innerText(),/14:13/);assert.equal(await page.locator('#warnings a[href$="1793090488.pdf"]').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);result.cases.push({place:'Horana',language,title:await page.locator('#assessment-title').innerText(),facts:await page.locator('#quick-facts').innerText()});await page.screenshot({path:`${out}/${prefix}-horana-${language}.png`,fullPage:true});}
 await page.goto(base+'/ark/explore/');await page.waitForFunction(()=>document.documentElement.dataset.exploreReady==='true');await page.locator('#warning-kind').selectOption('flood');assert.equal(await page.locator('#source-content a[href$="1793090488.pdf"]').count(),1);assert.equal(await page.locator('#source-content a[href*="Flood_Warning_for_Mahaweli"]').count(),0);
 for(const file of ['reviewed.json','provenance.json']){const expected=await readFile('floodlens/data/'+file),bytes=Buffer.from(await page.evaluate(async file=>{const r=await fetch('/floodlens/data/'+file,{cache:'no-store'});if(!r.ok)throw Error(r.status);return [...new Uint8Array(await r.arrayBuffer())]},file));assert.ok(bytes.equals(expected));result.hashes.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});}
 assert.deepEqual(result.errors,[]);await context.close();await writeFile(`${out}/${prefix}-kalu-browser.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();server.close();}
