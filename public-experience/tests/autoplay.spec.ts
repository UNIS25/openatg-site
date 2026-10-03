import {test,expect} from '@playwright/test';
import {base,copy,link,locales} from '../src/copy';

test('An early autoplay rejection recovers without a click after the film loads',async({page})=>{
  await page.addInitScript(()=>{
    // Disable native automatic start here to exercise the retry path alone.
    // Successful attempts still use the real decoder and real play promise.
    const autoplay=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'autoplay')!;
    Object.defineProperty(HTMLMediaElement.prototype,'autoplay',{...autoplay,set(){autoplay.set!.call(this,false);}});
    const original=HTMLMediaElement.prototype.play;let attempts=0;
    HTMLMediaElement.prototype.play=function(){
      attempts++;
      if(attempts<=2)return Promise.reject(new DOMException('Early loading rejection','NotAllowedError'));
      return original.call(this);
    };
  });
  for(const width of [390,1440])for(const locale of locales){
    await page.setViewportSize({width,height:844});await page.goto(link(locale));
    await expect.poll(()=>page.locator('video').evaluate(v=>!(v as HTMLVideoElement).paused&&(v as HTMLVideoElement).currentTime>.1)).toBe(true);
    await expect(page.locator('.film-control button')).toHaveAttribute('aria-label',copy[locale].pause);
  }
});

test('Every visible Discover film starts automatically in all languages on mobile and desktop',async({page})=>{
  for(const width of [390,1440])for(const locale of locales){
    await page.setViewportSize({width,height:844});await page.goto(link(locale,'store'));
    for(const film of ['highlands','tea','kitchen']){
      const box=page.locator(`[data-film=${film}]`),video=box.locator('video');
      // Wait for fonts before measuring the scroll destination. Their first
      // load can otherwise move a chapter out of view immediately after scroll.
      await page.evaluate(()=>document.fonts.ready);
      await box.evaluate(b=>b.scrollIntoView({block:'center',behavior:'instant'}));
      await expect.poll(()=>video.evaluate(v=>!(v as HTMLVideoElement).paused&&(v as HTMLVideoElement).currentTime>.1)).toBe(true);
      await expect(video).toHaveAttribute('autoplay','');await expect(video).toHaveAttribute('playsinline','');
      expect(await video.evaluate(v=>(v as HTMLVideoElement).muted)).toBe(true);
      await expect(video).toHaveAttribute('poster',/\.webp$/);
      await expect(box).toHaveAttribute('data-video-active','true');
      await expect(box.locator('.film-control button')).toHaveAttribute('aria-label',copy[locale].pause);
    }
  }
});

test('An ordinary page interaction recovers browser-blocked playback without the Play button',async({page})=>{
  await page.addInitScript(()=>{
    const autoplay=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'autoplay')!;
    Object.defineProperty(HTMLMediaElement.prototype,'autoplay',{...autoplay,set(){autoplay.set!.call(this,false);}});
    const original=HTMLMediaElement.prototype.play;let blocked=true;
    HTMLMediaElement.prototype.play=function(){if(blocked)return Promise.reject(new DOMException('Gesture required','NotAllowedError'));return original.call(this);};
    document.addEventListener('click',event=>{if(event.isTrusted)blocked=false;},true);
  });
  await page.goto(base+'/');
  await expect(page.locator('.film-control button')).toHaveAttribute('aria-label',copy.de.play);
  await expect(page.locator('.film-control button')).toBeVisible();
  const heading=await page.locator('h1').boundingBox();
  // Film text intentionally lets pointer events through to the background.
  await page.mouse.click(heading!.x+heading!.width/2,heading!.y+heading!.height/2);
  await expect.poll(()=>page.locator('video').evaluate(v=>!(v as HTMLVideoElement).paused&&(v as HTMLVideoElement).currentTime>.1)).toBe(true);
  await expect(page.locator('.film-control button')).toHaveAttribute('aria-label',copy.de.pause);
});

test('Changing motion or data preferences pauses playback and automatic resumption respects a deliberate pause',async({page})=>{
  await page.addInitScript(()=>{
    const connection=Object.assign(new EventTarget(),{saveData:false,effectiveType:'4g'});
    Object.defineProperty(navigator,'connection',{value:connection});
  });
  await page.goto(base+'/');
  const video=page.locator('video'),button=page.locator('.film-control button');
  await expect.poll(()=>video.evaluate(v=>!(v as HTMLVideoElement).paused&&(v as HTMLVideoElement).currentTime>.1)).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(video).not.toHaveAttribute('src');await expect(page.locator('.still-label')).toBeVisible();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await expect.poll(()=>video.evaluate(v=>(v as HTMLVideoElement).paused)).toBe(false);
  await page.evaluate(()=>{
    const connection=(navigator as Navigator & {connection:EventTarget & {saveData:boolean}}).connection;
    connection.saveData=true;connection.dispatchEvent(new Event('change'));
  });
  await expect(video).not.toHaveAttribute('src');await expect(page.locator('.still-label')).toBeVisible();
  await page.evaluate(()=>{
    const connection=(navigator as Navigator & {connection:EventTarget & {saveData:boolean}}).connection;
    connection.saveData=false;connection.dispatchEvent(new Event('change'));
  });
  await expect.poll(()=>video.evaluate(v=>(v as HTMLVideoElement).paused)).toBe(false);
  await button.click();await expect(button).toHaveAttribute('aria-label',copy.de.play);
  await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  const heading=await page.locator('h1').boundingBox();
  await page.mouse.click(heading!.x+heading!.width/2,heading!.y+heading!.height/2);await page.waitForTimeout(300);
  expect(await video.evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);
});
