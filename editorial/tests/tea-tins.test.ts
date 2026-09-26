import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Script } from 'node:vm';
import sharp from 'sharp';
import { repo, specification, catalogue, flight, html, javascript } from '../scripts/tea-tins.mjs';

const before = (path: string) => execFileSync('git', ['show', `${specification.productionBaseline}:${path}`], { cwd: repo, maxBuffer: 10_000_000 });
const read = (path: string) => readFileSync(join(repo, path), 'utf8');
const baseline = JSON.parse(before('editorial/src/data/shell.json').toString());
const current = JSON.parse(read('editorial/src/data/shell.json'));
type Product = typeof current.products[number];
function walk(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(path, entry.name)) : [join(path, entry.name)]);
}

test('five approved masters retain their exact bytes; WebP keeps complete square dimensions', async () => {
  assert.equal(specification.products.length, 5);
  for (const product of specification.products) {
    assert.equal(createHash('sha256').update(readFileSync(join(repo, product.master))).digest('hex'), product.sha256);
    const image = await sharp(join(repo, product.image)).metadata();
    assert.equal(image.format, 'webp'); assert.equal(image.width, 1254); assert.equal(image.height, 1254);
  }
});

test('tea-only catalogue retains all other product facts, prices and non-coffee records', () => {
  assert.deepEqual(current, catalogue(baseline));
  const teas = current.products.filter((p: Product) => p.categoryId === 'tea');
  assert.equal(teas.length, 5);
  assert.ok(!current.products.some((p: Product) => p.id === 'coffee-powder'));
  assert.ok(!current.categories.some((p: { id: string }) => p.id === 'coffee'));
  assert.deepEqual(current.categories.find((p: { id: string }) => p.id === 'tea').names, { en: 'Tea', de: 'Tee', fr: 'Thé' });
  for (const product of current.products) {
    const original = baseline.products.find((p: Product) => p.id === product.id);
    for (const key of Object.keys(product)) {
      if (['translations', 'image', 'gallery'].includes(key) && product.categoryId === 'tea') continue;
      assert.deepEqual(product[key], original[key], `${product.id}.${key}`);
    }
    if (product.categoryId !== 'tea') assert.deepEqual(product, original);
    else for (const translation of product.translations) {
      const originalTranslation = original.translations.find((t: { locale: string }) => t.locale === translation.locale);
      for (const key of Object.keys(translation)) {
        if (key === 'name' || (key === 'description' && product.id === 'green-tea-powder')) continue;
        assert.deepEqual(translation[key], originalTranslation[key], `${product.id}.${translation.locale}.${key}`);
      }
    }
  }
});

test('all public route payloads remove Coffee and old tea images, with valid Flight and inline scripts', () => {
  let checked = 0;
  for (const path of walk(join(repo, 'varathans25'))) {
    if (!/\.(html|txt)$/.test(path) || path.includes('/fonts/')) continue;
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /coffee-powder|Coffee powder|Kaffeepulver|Café moulu/, path);
    for (const product of specification.products) assert.ok(!source.includes(`/images/${product.slug}.svg`), path);
    if (path.endsWith('.txt')) flight(source);
    else for (const script of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
      if (script[1]) { if (script[0].includes('application/ld+json')) JSON.parse(script[1]); else new Script(script[1], { filename: path }); }
    }
    checked++;
  }
  assert.ok(checked > 500);
});

test('Coffee URLs are retired to localized Tea redirects without product payloads or incoming internal links', () => {
  for (const locale of ['de', 'fr', 'en']) {
    const directory = `varathans25/${locale}/product/coffee-powder`;
    assert.deepEqual(readdirSync(join(repo, directory)), ['index.html']);
    const source = read(`${directory}/index.html`);
    assert.match(source, /noindex, nofollow/);
    assert.match(source, /Content-Security-Policy/);
    assert.match(source, /script-src 'none'/);
    assert.match(source, /connect-src 'none'/);
    assert.ok(source.includes(`url=/varathans25/${locale}/shop/?selection=tea`));
    assert.doesNotMatch(source, /<script|CHF|product-card/);
  }
});

test('curry, cigar collection, original imagery, logo, carousel, and unrelated routes remain protected', () => {
  const paths = execFileSync('git', ['ls-tree', '-r', '--name-only', specification.productionBaseline], { cwd: repo, encoding: 'utf8' }).trim().split('\n');
  for (const path of paths) {
    const unrelated = !/^(varathans25\/|editorial\/|docs\/|tests\/varathans25\/)/.test(path);
    const immutable = /^varathans25\/(images\/|brand\/|fonts\/|cigar-mix-builder\.|catalogue-patch\.css|layout-delivery\.css|_next\/static\/chunks\/[^/]+\.(css|js)$)/.test(path);
    if (unrelated || immutable) assert.ok(readFileSync(join(repo, path)).equals(before(path)), path);
  }
  for (const locale of ['de', 'fr', 'en']) {
    const path = `varathans25/${locale}/cigar-collection/index.html`;
    const main = (value: string) => value.match(/<main[^>]*>[\s\S]*?<\/main>/)?.[0];
    assert.equal(main(read(path)), main(before(path).toString()), 'Editorial body is byte-identical');
    const home = `varathans25/${locale}/index.html`;
    const carousel = (value: string) => value.match(/<section[^>]*class="[^"]*hero-carousel[^"]*"[\s\S]*?<\/section>/)?.[0];
    if (carousel(read(home))) assert.equal(carousel(read(home)), carousel(html(before(home).toString(), false)));
  }
});

test('delivery calculation, tobacco restrictions and checkout behaviour are unchanged', () => {
  const path = 'varathans25/standard-delivery.mjs';
  assert.equal(read(path).split('export const deliveryCopy')[0], before(path).toString().split('export const deliveryCopy')[0]);
  const layout = 'varathans25/layout-delivery.mjs';
  assert.equal(read(layout).replace('20260927-tea', '20260922-layout'), before(layout).toString());
  const runtime = 'varathans25/_next/static/chunks/2to0v8xkzjqr9-layout-v1.js';
  assert.ok(existsSync(join(repo, runtime)));
  const transformed = javascript(before(runtime).toString(), runtime);
  new Script(transformed);
});

test('catalogue transformations are idempotent and safely preserve quotes in all three languages', () => {
  assert.deepEqual(catalogue(current), current);
  const value = ['$', 'section', null, { products: baseline.products, title: 'L’origine "confirmée" <script>' }];
  const result = flight(`a:${JSON.stringify(value)}\n`);
  assert.equal(flight(result), result);
  assert.equal(JSON.parse(result.slice(2)).at(-1).title, 'L’origine "confirmée" <script>');
});
