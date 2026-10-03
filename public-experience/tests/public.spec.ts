import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdirSync} from 'node:fs';
import {base,copy,locales,link} from '../src/copy';
mkdirSync('artifacts/screenshots',{recursive:true});
const isLive=!!process.env.PUBLIC_RELEASE_URL;
const widths=[1440,1024,390,350];
function errors(page:Page){
  const errors:string[]=[]; const known:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error'){
    // The existing OpenATG Cloudflare injection is rejected by the unchanged
    // strict CSP. Keep this narrow; all application console errors fail.
    if(isLive&&msg.text().includes('static.cloudflareinsights.com/beacon.min.js')&&msg.text().includes('Content Security Policy'))known.push(msg.text());else errors.push(msg.text());
  }});
  const writes:string[]=[];page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());});
  return ()=>{expect(errors).toEqual([]);expect(writes).toEqual([]);};
}
async function audit(page:Page){
  await expect(page.locator('h1')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(await page.locator('img').evaluateAll(images=>images.filter(image=>(image as HTMLImageElement).complete&&!(image as HTMLImageElement).naturalWidth).map(i=>(i as HTMLImageElement).src))).toEqual([]);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
}
for(const locale of locales)for(const width of widths){
  test(`${locale} at ${width}: connected public journey, reload, alignment and accessibility`,async({page})=>{
    const clean=errors(page);await page.setViewportSize({width,height:width<700?844:900});
    await page.goto(link(locale));await audit(page);
    await expect(page.locator('.destinations a').first()).toHaveAttribute('href',link(locale,'store'));
    await page.screenshot({path:`artifacts/screenshots/${isLive?'live':'local'}-gateway-${locale}-${width}.png`,fullPage:true});
    await page.locator('.destinations a').first().click();await expect(page).toHaveURL(new RegExp(`${locale}/store/`));
    await expect(page.locator('.tea-grid .product-card')).toHaveCount(5);await audit(page);
    await page.locator('#tea-collection').scrollIntoViewIfNeeded();
    const aligns=await page.locator('.tea-grid .purchase-row').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));
    if(width>700){for(const row of aligns)for(const other of aligns)if(Math.abs(row.x-other.x)>5&&Math.abs(row.y-other.y)<100)expect(Math.abs(row.y-other.y)).toBeLessThan(2);}
    const card=page.locator('.tea-grid .product-card').first();await card.locator('[data-plus]').click();await expect(card.locator('output')).toHaveText('2');await card.locator('[data-add]').click();await expect(page.locator('[data-basket-count]')).toHaveText('2');
    await page.locator('.restaurant-closing').scrollIntoViewIfNeeded();await page.locator('.restaurant-closing img').evaluate(async img=>{await (img as HTMLImageElement).decode();});
    await page.locator('.store-hero').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/screenshots/${isLive?'live':'local'}-store-${locale}-${width}.png`,fullPage:true});
    await page.goto(link(locale,'bag'));await page.reload();await expect(page.locator('[data-bag-product]:visible')).toHaveCount(1);await expect(page.locator('[data-bag-product]:visible output')).toHaveText('2');await audit(page);
    await page.locator('[data-bag-product]:visible [data-minus]').click();await expect(page.locator('[data-bag-product]:visible output')).toHaveText('1');
    await page.locator('[data-clear]').click();await expect(page.locator('[data-empty]')).toBeVisible();
    await page.goto(`${link(locale,'shop')}?category=tea`);await page.reload();await expect(page.locator('[data-category]:visible')).toHaveCount(5);await audit(page);
    await page.goto(link(locale,'product/premium-black-tea-powder'));await page.reload();await audit(page);
    await page.goto(link(locale,'product/gelber-curry-kokos'));await audit(page);await expect(page.locator('.weight')).toContainText('80 g');
    await page.goto(link(locale,'club'));await audit(page);await expect(page.locator('video')).toHaveCount(0);
    await page.screenshot({path:`artifacts/screenshots/${isLive?'live':'local'}-lounge-${locale}-${width}.png`,fullPage:true});
    for(const route of ['login','account','membership','recovery','privacy','legal']){await page.goto(link(locale,route));await page.reload();await audit(page);await expect(page.locator('form')).toHaveCount(0);}
    await page.goto(link(locale,'account'));await page.screenshot({path:`artifacts/screenshots/${isLive?'live':'local'}-account-${locale}-${width}.png`,fullPage:true});
    if(width<700){await page.locator('.menu-toggle').click();await expect(page.locator('#mobile-navigation')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#mobile-navigation')).toBeHidden();}
    const next=locale==='de'?'fr':locale==='fr'?'en':'de';await page.locator('.languages a').filter({hasText:next.toUpperCase()}).click();await expect(page.locator('html')).toHaveAttribute('lang',next);await expect(page).toHaveURL(new RegExp(`/${next}/account/`));
    clean();
  });
}
test('Actual downloaded-film derivative plays, pauses, resumes and loops on desktop and mobile',async({page})=>{
  const clean=errors(page);
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});await page.goto(base+'/');
    const video=page.locator('video');await expect.poll(()=>video.evaluate(v=>({paused:(v as HTMLVideoElement).paused,ready:(v as HTMLVideoElement).readyState}))).toMatchObject({paused:false,ready:4});
    expect(await video.evaluate(v=>(v as HTMLVideoElement).duration)).toBeCloseTo(14.7,1);
    await expect(video).toHaveAttribute('src',new RegExp(`gateway-${width===1440?'1920':'1280'}\.`));
    await page.locator('.film-control button').click();expect(await video.evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);
    await page.waitForTimeout(100);await page.locator('.film-control button').click();await expect.poll(()=>video.evaluate(v=>(v as HTMLVideoElement).paused)).toBe(false);
    await video.evaluate(v=>{(v as HTMLVideoElement).currentTime=(v as HTMLVideoElement).duration-.3;});await page.waitForTimeout(800);expect(await video.evaluate(v=>(v as HTMLVideoElement).currentTime)).toBeLessThan(3);
    expect(await video.evaluate(v=>(v as HTMLVideoElement).muted)).toBe(true);
  }clean();
});
test('Lower films load on demand and off-screen films pause',async({page})=>{
  const clean=errors(page);await page.goto(link('en','store'));
  await expect.poll(()=>page.locator('[data-film=highlands]').getAttribute('data-playing')).toBe('true');
  await expect(page.locator('[data-film=tea] video')).not.toHaveAttribute('src');await expect(page.locator('[data-film=kitchen] video')).not.toHaveAttribute('src');
  await page.locator('.pouring').evaluate(section=>section.scrollIntoView({block:'start'}));await expect.poll(()=>page.locator('[data-film=tea]').getAttribute('data-playing')).toBe('true');
  await expect.poll(()=>page.locator('[data-film=highlands] video').evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);
  await page.locator('.spices').evaluate(section=>section.scrollIntoView({block:'start'}));await expect.poll(()=>page.locator('[data-film=kitchen]').getAttribute('data-playing')).toBe('true');
  await expect.poll(()=>page.locator('[data-film=tea] video').evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);clean();
});
test('Reduced motion, Save-Data and slow connections use posters without video requests',async({browser})=>{
  for(const condition of ['motion','data','2g']){
    const context=await browser.newContext({reducedMotion:condition==='motion'?'reduce':'no-preference'});
    if(condition!=='motion')await context.addInitScript(value=>{Object.defineProperty(navigator,'connection',{value:{saveData:value==='data',effectiveType:value==='2g'?'2g':'4g',addEventListener(){}}});},condition);
    const page=await context.newPage();const requests:string[]=[];page.on('request',r=>{if(/\.mp4(?:\?|$)/.test(r.url()))requests.push(r.url());});
    await page.goto((process.env.PUBLIC_RELEASE_URL||'http://127.0.0.1:4188')+base+'/');await page.waitForTimeout(250);await expect(page.locator('.still-label')).toBeVisible();await expect(page.locator('video')).not.toHaveAttribute('src');await page.locator('.destinations a').first().click();await page.locator('.spices').scrollIntoViewIfNeeded();await page.waitForTimeout(250);expect(requests).toEqual([]);await context.close();
  }
});
test('Autoplay rejection leaves navigation and a working explicit play control',async({page})=>{
  await page.addInitScript(()=>{
    const original=HTMLMediaElement.prototype.play;let blocked=true;
    HTMLMediaElement.prototype.play=function(){if(blocked)return Promise.reject(new DOMException('Autoplay blocked','NotAllowedError'));return original.call(this);};
    document.addEventListener('click',()=>{blocked=false;},true);
  });
  await page.goto(base+'/');await page.waitForTimeout(200);await expect(page.locator('.destinations a')).toHaveCount(2);await expect(page.locator('.film-control button')).toBeVisible();await page.locator('.film-control button').click();await expect.poll(()=>page.locator('[data-film=gateway]').getAttribute('data-playing')).toBe('true');
});
test('Unsupported media returns to the poster and does not disable links',async({page})=>{
  await page.route('**/*.mp4',route=>route.fulfill({status:200,contentType:'video/mp4',body:'invalid-video'}));
  await page.goto(base+'/');await expect(page.locator('.still-label')).toBeVisible();await expect.poll(()=>page.locator('video').getAttribute('src')).toBe(null);await expect(page.locator('.film-poster')).toBeVisible();await page.locator('.destinations a').first().click();await expect(page).toHaveURL(/\/de\/store\/$/);
});
test('Navigation works without JavaScript or video',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
  await page.goto((process.env.PUBLIC_RELEASE_URL||'http://127.0.0.1:4188')+base+'/');await page.locator('.destinations a').first().click();await expect(page.locator('.tea-grid .product-card')).toHaveCount(5);await page.goto((process.env.PUBLIC_RELEASE_URL||'http://127.0.0.1:4188')+link('fr','account'));await expect(page.locator('h1')).toHaveText(copy.fr.account);await context.close();
});
