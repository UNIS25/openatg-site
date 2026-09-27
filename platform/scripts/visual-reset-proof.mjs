// Frontend-only proof checks. No sign-in, API writes, database operations or live services.
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.VISUAL_PROOF_URL || 'http://127.0.0.1:4191';
const out = 'artifacts/visual-reset';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const report = { url: `${base}/visual-reset/`, cases: [], consoleErrors: [], pageErrors: [], accessibility: [], requests: [], motion: [], performance: [] };
function casePassed(name) { report.cases.push(name); console.log(`PASS ${name}`); }
function watch(page) {
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') report.consoleErrors.push(msg.text()); });
  page.on('request', request => { if (request.url().includes('/api/')) report.requests.push(request.url()); });
}
async function settled(page) {
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('img')].filter(image => image.loading !== 'lazy').every(image => image.complete && image.naturalWidth > 0));
}
async function audit(page, name) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  report.accessibility.push({ name, violations: result.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(n => n.target) })) });
  assert.equal(result.violations.length, 0, `${name}: ${result.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(';')}`).join(', ')}`);
  casePassed(`Accessibility ${name}`);
}
for (const size of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }, { name: 'tablet', width: 1024, height: 768 }]) {
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
  const page = await context.newPage(); watch(page);
  await page.goto(`${base}/visual-reset/`, { waitUntil: 'networkidle' });
  await settled(page);
  const hero = page.locator('[data-film="highlands"] video');
  await page.waitForFunction(() => document.querySelector('[data-film="highlands"] video')?.currentTime > 0.5);
  const before = await hero.evaluate(v => v.currentTime);
  await page.waitForTimeout(700);
  const after = await hero.evaluate(v => v.currentTime);
  assert.ok(after > before + .2, `${size.name} has genuine playing video`);
  assert.ok(await hero.evaluate(v => v.muted && v.playsInline));
  assert.match(await hero.getAttribute('src'), size.width < 700 ? /mobile\.mp4$/ : /1600\.mp4$/);
  report.motion.push({ screen: size.name, before, after });
  casePassed(`${size.name}: actual silent responsive video playback`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: `${out}/homepage-${size.name}.png` });
  await audit(page, `${size.name} homepage`);
  await page.getByRole('button', { name: 'Pause films', exact: true }).first().click();
  await page.waitForTimeout(150);
  assert.ok(await hero.evaluate(v => v.paused));
  await page.getByRole('button', { name: 'Play films', exact: true }).first().click();
  casePassed(`${size.name}: visible pause and resume controls`);
  await page.getByRole('button', { name: 'Enter the private club · 18+' }).click();
  const popup = page.getByRole('dialog', { name: 'VARATHANS25 PREMIUM CIGAR CLUB' });
  await popup.waitFor();
  await page.screenshot({ path: `${out}/popup-${size.name}.png` });
  assert.ok(await hero.evaluate(v => v.paused));
  assert.equal(await popup.getByRole('link', { name: 'Join & verify 18+' }).getAttribute('href'), '/en/register');
  assert.equal(await popup.getByRole('link', { name: 'Already a member? Sign in' }).getAttribute('href'), '/en/login');
  assert.ok(await popup.getByText(/Registration does not verify age/).isVisible());
  await audit(page, `${size.name} popup`);
  for (let i=0;i<8;i++) { await page.keyboard.press('Tab'); assert.ok(await popup.evaluate(el => el.contains(document.activeElement))); }
  await page.keyboard.press('Escape');
  await popup.waitFor({ state: 'hidden' });
  assert.match(await page.evaluate(() => document.activeElement?.textContent), /Enter the private club/);
  casePassed(`${size.name}: popup links, focus trap, Escape and focus restoration`);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('dialog', { name: 'Explore' }).getByRole('link', { name: 'The Art of Tea' }).click();
  await page.waitForFunction(() => document.querySelector('[data-film="tea"] video')?.currentTime > .3);
  assert.ok(await hero.evaluate(v => v.paused));
  assert.equal(await page.locator('video').evaluateAll(videos => videos.filter(v => !v.paused).length), 1);
  casePassed(`${size.name}: navigation and one active film`);
  for (const chapter of ['tea','kitchen','after-dark']) {
    await page.locator(`#${chapter}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    if (size.name === 'desktop') await page.screenshot({ path: `${out}/chapter-${chapter}.png` });
  }
  await page.locator('#collection').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('figure img')].every(image => image.complete && image.naturalWidth > 0));
  assert.equal(await page.locator('figure').count(), 5);
  await page.screenshot({ path: `${out}/collection-${size.name}.png` });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  casePassed(`${size.name}: five original tins, chapters and no horizontal overflow`);
  await page.evaluate(() => window.scrollTo(0,0));
  await page.screenshot({ path: `${out}/homepage-${size.name}-full.png`, fullPage: true });
  await page.reload({ waitUntil: 'networkidle' });
  await settled(page);
  report.performance.push({ screen: size.name, metrics: await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    return { domContentLoadedMs: Math.round(n.domContentLoadedEventEnd), loadMs: Math.round(n.loadEventEnd), media: performance.getEntriesByType('resource').filter(r => /\.mp4/.test(r.name)).map(r => ({ name: r.name.split('/').pop(), bytes: r.transferSize, durationMs: Math.round(r.duration) })) };
  }) });
  casePassed(`${size.name}: direct route reload`);
  await context.close();
}
for (const mode of ['reduced-motion','save-data']) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference' });
  if (mode === 'save-data') await context.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' }, configurable: true }));
  const page = await context.newPage(); watch(page);
  const videos = [];
  page.on('request', r => { if (r.url().endsWith('.mp4')) videos.push(r.url()); });
  await page.goto(`${base}/visual-reset/`, { waitUntil: 'networkidle' });
  await settled(page);
  await page.screenshot({ path: `${out}/${mode}.png` });
  assert.equal(videos.length, 0);
  assert.equal(await page.locator('video[src]').count(), 0);
  casePassed(`${mode}: real static poster, no video request`);
  await context.close();
}
const failedContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const failedPage = await failedContext.newPage();
watch(failedPage);
await failedPage.route('**/*.mp4', route => route.fulfill({ status: 200, contentType: 'video/mp4', body: 'deliberate unavailable decoder fixture' }));
await failedPage.goto(`${base}/visual-reset/`, { waitUntil: 'networkidle' });
await failedPage.waitForFunction(() => !document.querySelector('[data-film=\"highlands\"] video'));
assert.ok(await failedPage.locator('[data-film=\"highlands\"] img').evaluate(image => image.complete && image.naturalWidth > 0));
assert.ok(await failedPage.getByRole('heading', { name: 'The art of taking time.' }).isVisible());
casePassed('Video decoding failure keeps the real poster and navigation usable');
await failedContext.close();
const narrow = await browser.newContext({ viewport: { width: 320, height: 740 } });
const narrowPage = await narrow.newPage(); watch(narrowPage);
await narrowPage.goto(`${base}/visual-reset/`, { waitUntil: 'networkidle' });
assert.equal(await narrowPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
casePassed('320px mobile: no horizontal overflow');
await narrow.close();
assert.equal(report.requests.length, 0, 'Visual proof must never call backend APIs');
assert.equal(report.consoleErrors.length, 0);
assert.equal(report.pageErrors.length, 0);
casePassed('No backend API calls, browser errors or console errors');
await writeFile(`${out}/verification.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log(`${report.cases.length} visual checks passed.`);
