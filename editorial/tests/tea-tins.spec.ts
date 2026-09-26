import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, appendFileSync } from 'node:fs';
import specification from '../assets/tea-tins.json' with { type: 'json' };

const test = base.extend({
  page: async ({ page }, provide, info) => {
    const errors: string[] = [], requests: string[] = [], knownAnalytics: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() !== 'error') return;
      const text = message.text();
      if (process.env.TEA_LIVE_URL && /Loading the script 'https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js\//.test(text) && /Content Security Policy/.test(text)) knownAnalytics.push(text);
      else errors.push(text);
    });
    page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method()) || /supabase|\/api\/|stripe|paypal|\/adminpage\//.test(request.url())) requests.push(request.url()); });
    await provide(page);
    mkdirSync('artifacts/tea-tins', { recursive: true });
    appendFileSync('artifacts/tea-tins/diagnostics.jsonl', JSON.stringify({ phase: process.env.TEA_LIVE_URL ? 'live' : 'local', name: info.title, viewport: info.project.name, errors, requests, knownAnalytics }) + '\n');
    expect(errors).toEqual([]); expect(requests).toEqual([]);
  },
});
const labels = { en: 'Tea', de: 'Tee', fr: 'Thé' };
const announcements = {
  en: 'Free delivery on orders of CHF 100 or more.',
  de: 'Kostenlose Lieferung ab einem Bestellwert von CHF 100.',
  fr: 'Livraison offerte dès CHF 100 d’achat.',
};
for (const locale of ['de', 'fr', 'en'] as const) {
  test(`${locale}: five complete tins, aligned cards, product reloads, keyboard and accessibility`, async ({ page }, info) => {
    test.setTimeout(90_000);
    const route = `/varathans25/${locale}/shop/?selection=tea`;
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText(labels[locale]);
    await expect(page.locator('.v25-delivery-announcement')).toContainText(announcements[locale]);
    const cards = page.locator('.product-card:visible');
    await expect(cards).toHaveCount(5);
    const geometry = [];
    for (const product of specification.products) {
      const card = cards.filter({ has: page.locator(`a[href$="/product/${product.slug}/"]`) });
      await expect(card.locator('h3')).toHaveText(product.names[locale]);
      const image = card.locator('.product-image img');
      await expect(image).toHaveAttribute('src', product.image);
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(i => (i as HTMLImageElement).naturalWidth)).toBe(1254);
      await expect(image).toHaveCSS('object-fit', 'contain');
      await expect(card.locator('.product-image')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      geometry.push(await card.evaluate(c => {
        const b = c.getBoundingClientRect(), image = c.querySelector('.product-image')!.getBoundingClientRect(), price = c.querySelector('.product-price')!.getBoundingClientRect();
        return { width: image.width, height: image.height, price: price.top - b.top };
      }));
    }
    for (const key of ['width', 'height', 'price'] as const) expect(Math.max(...geometry.map(g => g[key])) - Math.min(...geometry.map(g => g[key]))).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.evaluate(() => scrollTo(0, 0));
    mkdirSync('artifacts/tea-tins', { recursive: true });
    await page.screenshot({ path: `artifacts/tea-tins/${process.env.TEA_LIVE_URL ? 'live' : 'local'}-${locale}-${info.project.name}.png`, fullPage: true });
    for (const product of specification.products) {
      await page.goto(`/varathans25/${locale}/product/${product.slug}/`);
      await expect(page.locator('#main h1:visible')).toHaveText(product.names[locale]);
      await expect(page.locator('.product-main-image:visible')).toHaveAttribute('src', product.image);
      await page.reload();
      await expect(page.locator('#main h1:visible')).toHaveText(product.names[locale]);
      await expect(page.locator('.v25-product-delivery:visible')).toBeVisible();
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    }
    await page.locator('.bag-toggle').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('dialog[open]')).toBeVisible(); await page.keyboard.press('Escape');
    if (info.project.name === 'mobile') {
      await page.locator('.mobile-menu').click();
      await page.locator('.mobile-nav-drawer').getByRole('link', { name: labels[locale], exact: true }).click();
    } else await page.locator('.desktop-nav').getByRole('link', { name: labels[locale], exact: true }).click();
    await expect(page.locator('h1')).toHaveText(labels[locale]);
    await expect(cards).toHaveCount(5);
  });

  test(`${locale}: Coffee retirement, search, recommendations, legacy selection and saved-bag cleanup`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('tea-retirement-fixture')) {
        localStorage.setItem('varathans25_review_cart', JSON.stringify([{ productId: 'coffee-powder', quantity: 2 }, { productId: 'premium-black-tea-powder', quantity: 1 }]));
        sessionStorage.setItem('tea-retirement-fixture', '1');
      }
    });
    await page.goto(`/varathans25/${locale}/`);
    await expect(page.locator('a[href*="product/coffee-powder"]')).toHaveCount(0);
    await expect(page.locator('#tea-coffee .product-card')).toHaveCount(5);
    await page.locator('.bag-toggle').click();
    await expect(page.locator('dialog[open] .cart-line')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('varathans25_review_cart') || '[]'))).toEqual([{ productId: 'premium-black-tea-powder', quantity: 1 }]);
    await page.keyboard.press('Escape');
    await page.goto(`/varathans25/${locale}/shop/?selection=tea-coffee`);
    await expect(page.locator('h1')).toHaveText(labels[locale]);
    await expect(page.locator('.product-card:visible')).toHaveCount(5);
    await page.getByPlaceholder({ en: 'Search the collection…', de: 'Kollektion durchsuchen…', fr: 'Rechercher dans la collection…' }[locale]).fill({ en: 'coffee', de: 'Kaffeepulver', fr: 'Café moulu' }[locale]);
    await expect(page.locator('.product-card:visible')).toHaveCount(0);
    await page.goto(`/varathans25/${locale}/product/coffee-powder/`);
    await expect(page).toHaveURL(new RegExp(`/${locale}/shop/\\?selection=tea$`));
    await expect(page.locator('.product-card:visible')).toHaveCount(5);
    await page.goto(`/varathans25/${locale}/collections/`);
    await expect(page.locator('a[href*="product/coffee-powder"]')).toHaveCount(0);
    await page.goto(`/varathans25/${locale}/product/gelber-curry-kokos/`);
    await expect(page.locator('a[href*="product/coffee-powder"]')).toHaveCount(0);
    await expect(page.locator('.product-main-image:visible')).toHaveAttribute('src', '/varathans25/images/gelber-curry-kokos.webp');
    await page.goto(`/varathans25/${locale}/cigar-collection/`);
    await expect(page.locator('main')).toContainText('18+');
    await page.locator('.bag-toggle').click();
    await expect(page.locator('dialog[open] .cart-line')).toHaveCount(1);
  });
}
