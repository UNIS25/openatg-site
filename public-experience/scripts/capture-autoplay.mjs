import {chromium,webkit,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const origin=process.argv[2]||'https://127.0.0.1:4189';
const stage=origin.includes('127.0.0.1')?'local':'live';
const report={origin,screenshots:[],playback:[],warnings:[]};
mkdirSync('artifacts/screenshots',{recursive:true});
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch();
  for(const width of [390,1440]){
    const page=await browser.newPage({ignoreHTTPSErrors:stage==='local',viewport:{width,height:width<700?844:900},isMobile:width<700,hasTouch:width<700});
    const errors=[];let capturing=false;
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'){
      if(stage==='live'&&m.text().includes('static.cloudflareinsights.com/beacon.min.js')&&m.text().includes('Content Security Policy'))report.warnings.push('Existing Cloudflare injection rejected by strict CSP');
      else if(capturing&&engine==='webkit'&&m.text()==="Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy.")report.warnings.push('WebKit capture stylesheet rejected by strict CSP');
      else errors.push(m.text());
    }});
    for(const route of ['','store']){
      await page.goto(`${origin}/varathans25/premium-preview/de/${route?route+'/':''}`);
      await page.evaluate(()=>document.fonts.ready);
      const ids=route?['highlands','tea','kitchen']:['gateway'];
      for(const id of ids){
        const box=page.locator(`[data-film=${id}]`),video=box.locator('video');
        await box.evaluate(b=>b.scrollIntoView({block:'center',behavior:'instant'}));
        // No click or explicit video.play: verify actual automatic decoding.
        await expect.poll(()=>video.evaluate(v=>!v.paused&&v.currentTime>.1),{timeout:30000}).toBe(true);
        report.playback.push({engine,viewportWidth:width,id,...await video.evaluate(v=>({paused:v.paused,currentTime:v.currentTime,muted:v.muted,videoWidth:v.videoWidth,videoHeight:v.videoHeight}))});
        if(!route){await video.evaluate(v=>{v.currentTime=15;});await expect.poll(()=>video.evaluate(v=>v.seeking)).toBe(false);}
      }
      if(route){
        for(const section of await page.locator('main > section').all())await section.scrollIntoViewIfNeeded();
        await page.locator('img').evaluateAll(async images=>{await Promise.all(images.map(img=>img.decode()));});
      }
      await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
      const file=`artifacts/screenshots/autoplay-${stage}-${engine}-${route||'gateway'}-de-${width}.png`;
      capturing=true;await page.screenshot({path:file,fullPage:true});capturing=false;
      report.screenshots.push(file);
      if(errors.length)throw Error(errors.join('\n'));
    }
    await page.close();
  }
  await browser.close();
}
report.warnings=[...new Set(report.warnings)];
writeFileSync(`artifacts/${stage}-autoplay-screenshots.json`,JSON.stringify(report,null,2));
console.log(`Captured ${report.screenshots.length} screenshots; verified ${report.playback.length} films playing automatically without a tap.`);
