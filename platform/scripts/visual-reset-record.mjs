// A real browser capture of the genuine video playback, scrolling and invitation.
import { chromium } from '@playwright/test';
import { mkdir, rename } from 'node:fs/promises';
const out = 'artifacts/visual-reset';
await mkdir(`${out}/recording`, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, recordVideo: { dir: `${out}/recording`, size: { width: 1440, height: 900 } } });
const page = await context.newPage();
await page.goto('http://127.0.0.1:4191/visual-reset/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('[data-film="highlands"] video')?.currentTime > 1);
await page.waitForTimeout(4500);
// Smooth scrolling is driven by actual browser scroll position, not a rendered mockup.
async function scrollTo(selector, duration = 1800) {
  const y = await page.locator(selector).evaluate(el => el.getBoundingClientRect().top + scrollY);
  await page.evaluate(async ({ y, duration }) => {
    const from = scrollY;
    const start = performance.now();
    await new Promise(resolve => {
      function frame(now) {
        const p = Math.min(1, (now - start) / duration);
        const ease = p < .5 ? 2*p*p : 1 - (-2*p+2)**2 / 2;
        window.scrollTo(0, from + (y - from)*ease);
        if (p < 1) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
  }, { y, duration });
}
await scrollTo('#introduction'); await page.waitForTimeout(1800);
await scrollTo('#tea'); await page.waitForTimeout(4200);
await scrollTo('#collection'); await page.waitForTimeout(2200);
await scrollTo('#kitchen'); await page.waitForTimeout(4200);
await scrollTo('#after-dark', 2200); await page.waitForTimeout(4200);
await page.getByRole('button', { name: 'Club account information · 18+' }).click();
await page.waitForTimeout(5500);
await page.keyboard.press('Escape');
await page.waitForTimeout(700);
const video = page.video();
await context.close();
await rename(await video.path(), `${out}/visual-reset-browser-recording.webm`);
await browser.close();
console.log('Recorded actual browser footage at 1440 × 900.');
