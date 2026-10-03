import {chromium,webkit} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const origin=process.argv[2]||'https://127.0.0.1:4189';
const stage=origin.includes('127.0.0.1')?'local':'live';
mkdirSync('artifacts/screenshots',{recursive:true});
const report={origin,screenshots:[],toolWarnings:[]};
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch();
  for(const [locale,width] of [...[350,390,430,1024,1440].map(width=>['de',width]),['fr',390],['en',390]]){
    const context=await browser.newContext({ignoreHTTPSErrors:stage==='local',viewport:{width,height:width<700?844:900},isMobile:width<700,hasTouch:width<700});
    const page=await context.newPage();
    const errors=[];let capturing=false;
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'){
      // WebKit's screenshot helper injects "body {}" to sync animations.
      // The public CSP rejects it. This is capture tooling, never site code.
      if(capturing&&engine==='webkit'&&m.text()==="Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy.")report.toolWarnings.push('WebKit screenshot animation-sync style blocked by site CSP');
      else if(stage==='live'&&m.text().includes('static.cloudflareinsights.com/beacon.min.js')&&m.text().includes('Content Security Policy'))report.toolWarnings.push('Existing Cloudflare analytics injection blocked by site CSP');
      else errors.push(m.text());
    }});
    for(const route of ['','store','club']){
      await page.goto(`${origin}/varathans25/premium-preview/${locale}/${route?route+'/':''}`);
      await page.evaluate(()=>document.fonts.ready);
      if(route==='store'){
        for(const section of await page.locator('main > section').all()){
          await section.scrollIntoViewIfNeeded();
          const button=section.locator('.film-control button');
          if(await button.isVisible()&&await section.locator('video').evaluate(v=>v.paused))await button.click();
        }
        await page.locator('img').evaluateAll(async images=>{await Promise.all(images.map(img=>img.decode()));});
        await page.evaluate(()=>scrollTo(0,0));
      }
      if(route===''){
        const video=page.locator('video');
        await page.waitForTimeout(250);
        if(engine==='webkit'&&await video.evaluate(v=>v.paused))await page.locator('.film-control button').click();
        await page.waitForFunction(()=>document.querySelector('video').currentTime>.1);
        await video.evaluate(v=>{v.currentTime=15;});
        await page.waitForFunction(()=>!document.querySelector('video').seeking);
      }
      const file=`artifacts/screenshots/${stage}-${engine}-${route||'gateway'}-${locale}-${width}.png`;
      capturing=true;await page.screenshot({path:file,fullPage:true});capturing=false;
      report.screenshots.push(file);
    }
    if(errors.length)throw Error(`Browser errors: ${errors.join('\n')}`);
    await context.close();
  }
  await browser.close();
}
report.toolWarnings=[...new Set(report.toolWarnings)];
writeFileSync(`artifacts/${stage}-screenshots.json`,JSON.stringify(report,null,2));
console.log(`Captured ${report.screenshots.length} fresh public-page screenshots with ${report.toolWarnings.length} documented tooling/injection warning types.`);
