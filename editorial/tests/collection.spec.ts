import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
import { collectionCopy } from '../src/lib/collection-copy';

for (const locale of ['de', 'fr', 'en'] as const) {
  test(`${locale}: factual editorial, responsive images, accessibility and manual controls`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    const forbiddenRequests: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/\/api\/|supabase|\/auth\/|stripe|paypal/i.test(request.url())) forbiddenRequests.push(request.url()); });
    const c = collectionCopy[locale];
    const path = `/varathans25/${locale}/cigar-collection/`;
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow, noarchive');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(c.title);
    await expect(page.getByText(c.status, { exact: true })).toBeVisible();
    await expect(page.getByText(c.adults, { exact: true })).toBeVisible();
    const main = page.locator('main');
    await expect(main.getByRole('button')).toHaveCount(2);
    const closed = page.locator('.collection-image-stage img').nth(0);
    const open = page.locator('.collection-image-stage img').nth(1);
    await expect(closed).toHaveClass('is-visible');
    await expect(closed).toHaveAttribute('alt', c.closedAlt);
    await expect(open).toHaveAttribute('alt', c.openAlt);
    await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); await document.fonts.ready; });
    expect(await main.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const logo = page.locator('.site-header .brand-mark img');
    const logoBox = await logo.boundingBox();
    const headerBox = await page.locator('.site-header').boundingBox();
    expect(logoBox!.y).toBeGreaterThanOrEqual(headerBox!.y + 8);
    expect(logoBox!.y + logoBox!.height).toBeLessThanOrEqual(headerBox!.y + headerBox!.height - 8);
    const bounds = await page.locator('.collection-image-stage').boundingBox();
    await page.getByRole('button', { name: c.next, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(open).toHaveClass('is-visible');
    await expect(open).toHaveAttribute('aria-hidden', 'false');
    expect(await page.locator('.collection-image-stage').boundingBox()).toEqual(bounds);
    await page.getByRole('button', { name: c.previous, exact: true }).click();
    await expect(closed).toHaveClass('is-visible');
    await page.reload();
    await expect(page.getByText(c.status, { exact: true })).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    mkdirSync('artifacts/screenshots', { recursive: true });
    await page.screenshot({ path: `artifacts/screenshots/${locale}-${testInfo.project.name}.png`, fullPage: true });
    await page.getByRole('button', { name: c.next, exact: true }).click();
    await expect(open).toHaveCSS('opacity', '1');
    if (locale === 'en') await page.screenshot({ path: `artifacts/screenshots/en-${testInfo.project.name}-open.png`, fullPage: true });
    expect(errors).toEqual([]);
    expect(forbiddenRequests).toEqual([]);
  });
}

test('language switching, mobile navigation and saved bag remain intact', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/varathans25/de/cigar-collection/');
  await page.evaluate(() => localStorage.setItem('varathans25_review_cart', JSON.stringify([{ productId: 'editorial-preservation-test', quantity: 2 }])));
  await page.reload();
  for (const locale of ['fr', 'en', 'de'] as const) {
    if (testInfo.project.name === 'mobile') {
      await page.locator('.mobile-menu').click();
      await page.locator('dialog[open] .language-select select').selectOption(locale);
      if (await page.locator('dialog[open]').count()) await page.keyboard.press('Escape');
    } else {
      await page.locator('.site-header .language-select select').selectOption(locale);
    }
    await expect(page).toHaveURL(new RegExp(`/varathans25/${locale}/cigar-collection/?$`));
    await expect(page.getByText(collectionCopy[locale].status, { exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
  }
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('varathans25_review_cart')) || '[]')).toEqual([{ productId: 'editorial-preservation-test', quantity: 2 }]);
  if (testInfo.project.name === 'mobile') {
    await page.locator('.mobile-menu').click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  }
  await expect(page.locator('.logo-link')).toHaveAttribute('href', '/varathans25/de');
  await page.evaluate(() => window.scrollTo(0, 400));
  await expect(page.locator('.site-header')).toHaveClass(/is-scrolled/);
  const logo = await page.locator('.site-header .brand-mark img').boundingBox();
  const header = await page.locator('.site-header').boundingBox();
  expect(logo!.y).toBeGreaterThanOrEqual(header!.y + 8);
  expect(logo!.y + logo!.height).toBeLessThanOrEqual(header!.y + header!.height - 8);
  expect(errors).toEqual([]);
});

test('reduced motion still permits keyboard image navigation without animation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/varathans25/en/cigar-collection/');
  await page.getByRole('button', { name: 'Next view', exact: true }).focus();
  await page.keyboard.press('Space');
  const open = page.locator('.collection-image-stage img').nth(1);
  await expect(open).toHaveClass('is-visible');
  await expect(open).toHaveCSS('transition-duration', '0s');
  await expect(open).toHaveCSS('opacity', '1');
  expect(errors).toEqual([]);
});
