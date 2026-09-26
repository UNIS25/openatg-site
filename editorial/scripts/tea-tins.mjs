// Narrow, repeatable migration of the existing static export. This deliberately
// does not build or import the backend branch or replace unrelated routes.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { Script } from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';

export const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const specification = JSON.parse(readFileSync(join(repo, 'editorial/assets/tea-tins.json'), 'utf8'));
const baseline = path => execFileSync('git', ['show', `${specification.productionBaseline}:${path}`], { cwd: repo, maxBuffer: 10_000_000 }).toString();
const original = JSON.parse(baseline('editorial/src/data/shell.json'));
const replacements = new Map([
  ['Curry, tea and coffee from Varathans25 in Sursee.', 'Curry and tea from Varathans25 in Sursee.'],
  ['layout-delivery.mjs?v=20260922-layout', 'layout-delivery.mjs?v=20260927-tea'],
  ['Tea & infusions and coffee', 'Tea'], ['Tee & Aufgüsse und Kaffee', 'Tee'], ['Thés & infusions et café', 'Thé'],
  ['Ceylon tea and coffee', 'Tea'], ['Ceylon-Tee und Kaffee', 'Tee'], ['Thé de Ceylan et café', 'Thé'],
  ['Tea & Coffee', 'Tea'], ['Tee & Kaffee', 'Tee'], ['Thé & Café', 'Thé'],
  ['Tea & infusions', 'Tea'], ['Tee & Aufgüsse', 'Tee'], ['Thés & infusions', 'Thé'],
  ['Tea, coffee and', 'Tea and'], ['tea, coffee and', 'tea and'],
  ['Tee, Kaffee und', 'Tee und'], ['Thé, café et', 'Thé et'], ['thé, café et', 'thé et'],
  ['thé de Ceylan, du café et', 'thé de Ceylan et'], ['tea, coffee and', 'tea and'],
  ['Tee, Kaffee und', 'Tee und'], ['thé de Ceylan, café et', 'thé de Ceylan et'],
  ['Sri Lankan coffee', 'Tea'], ['Kaffee aus Sri Lanka', 'Tee'], ['Café du Sri Lanka', 'Thé'],
  ['shop?selection=tea-coffee', 'shop?selection=tea'], ['shop/?selection=tea-coffee', 'shop/?selection=tea'],
]);
// Remove the obsolete packet description; retain the existing pending-facts
// statements. The artwork's printed weight does not approve a product weight.
const greenDescriptions = {
  de: 'Herkunft und Packungsgrösse werden noch bestätigt.',
  en: 'Origin and pack size are being confirmed.',
  fr: 'L’origine et le format sont en cours de confirmation.',
};
for (const product of specification.products) {
  const before = original.products.find(p => p.slug === product.slug);
  replacements.set(before.image, product.image);
  for (const translation of before.translations) {
    replacements.set(translation.name, product.names[translation.locale]);
    if (product.slug === 'green-tea-powder') replacements.set(translation.description, greenDescriptions[translation.locale]);
  }
}
const ordered = [...replacements].filter(([a, b]) => a !== b).sort((a, b) => b[0].length - a[0].length);
export function text(value) {
  for (const [before, after] of ordered) value = value.split(before).join(after);
  return value;
}
export function catalogue(value) {
  if (typeof value === 'string') return text(value);
  if (Array.isArray(value)) return value.filter(item => item !== 'coffee-powder' && !(item && typeof item === 'object' && ['coffee-powder', 'coffee'].includes(item.id))).map(catalogue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, catalogue(item)]));
  return value;
}
export function flight(value) {
  return value.split('\n').map(line => {
    // Static Flight JSON records; the X/C end markers contain no JSON.
    const match = line.match(/^([\da-f]*:(?:I|HL)?)([\[{"].*)$/);
    if (!match) {
      assert.ok(!line.includes('coffee-powder'), 'Unrecognised catalogue record');
      return line;
    }
    return match[1] + JSON.stringify(catalogue(JSON.parse(match[2])));
  }).join('\n');
}
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export function html(value, withStyle = true) {
  value = value.replace(/self\.__next_f\.push\((\[1,"(?:[^"\\]|\\.)*"\])\)/g, (_, json) => {
    const record = JSON.parse(json);
    record[1] = flight(record[1]);
    return `self.__next_f.push(${JSON.stringify(record).replaceAll('<', '\\u003c')})`;
  });
  // Each catalogue card is one article without nested articles. Only Coffee's
  // card is retired; no other product's markup or price is rewritten.
  value = value.replace(/<article\b[^>]*>[\s\S]*?<\/article>/g, article => article.includes('/product/coffee-powder/') ? '' : article);
  for (const [before, after] of ordered) value = value.split(escapeHtml(before)).join(escapeHtml(after));
  if (withStyle && !value.includes('/varathans25/tea-tins.css')) value = value.replace('</head>', '<link rel="stylesheet" href="/varathans25/tea-tins.css"/></head>');
  return value;
}
// Parse string literals instead of editing escaped/minified JS by hand.
export function javascript(source, path) {
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const edits = [];
  function visit(node) {
    if (ts.isStringLiteral(node)) {
      const updated = text(node.text);
      if (updated !== node.text) edits.push({ start: node.getStart(ast), end: node.end, value: JSON.stringify(updated) });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const edit of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.value + source.slice(edit.end);
  for (const [query, locale] of [['g', 'a'], ['j', 'i']]) {
    const before = `("tea-coffee"!==${query}.get("selection")||["tea","coffee"].includes(e.categoryId))`;
    if (source.includes(before)) {
      source = source.replace(before, `(!["tea","tea-coffee"].includes(${query}.get("selection"))||"tea"===e.categoryId)`);
      source = source.replace('children:e.catalogueTitle', `children:["tea","tea-coffee"].includes(${query}.get("selection"))?{de:"Tee",fr:"Thé",en:"Tea"}[${locale}]:e.catalogueTitle`);
    }
  }
  source = source.replaceAll('["tea","coffee"].includes(e.categoryId)', '"tea"===e.categoryId');
  source = source.replace('t.data.filter((t,i,r)=>r.findIndex(i=>i.productId===t.productId)===i)', 't.data.filter((t,i,r)=>t.productId!=="coffee-powder"&&r.findIndex(i=>i.productId===t.productId)===i)');
  new Script(source, { filename: path });
  return source;
}
function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(path, entry.name)) : [join(path, entry.name)]);
}
function write(path, content) {
  if (readFileSync(path, 'utf8') !== content) writeFileSync(path, content);
}
async function prepare() {
  const shell = join(repo, 'editorial/src/data/shell.json');
  write(shell, JSON.stringify(catalogue(JSON.parse(readFileSync(shell, 'utf8'))), null, 2) + '\n');
  for (const path of [...walk(join(repo, 'editorial/src/messages')), join(repo, 'editorial/src/components/store.tsx')]) {
    write(path, text(readFileSync(path, 'utf8')));
  }
  for (const product of specification.products) {
    const input = readFileSync(join(repo, product.master));
    assert.equal(createHash('sha256').update(input).digest('hex'), product.sha256, 'Master image changed');
    const dimensions = await sharp(input).metadata();
    assert.equal(dimensions.width, 1254); assert.equal(dimensions.height, 1254);
    // No crop, composite, recolour, enlargement or artificial background.
    await sharp(input).webp({ quality: 90, effort: 6 }).toFile(join(repo, product.image));
  }
}
function publish() {
  const chunks = join(repo, 'varathans25/_next/static/chunks');
  const names = new Map();
  // Immutable original chunks remain available to already-open browser tabs.
  // Fresh HTML/Flight use versioned chunks so caches cannot retain old labels.
  for (const entry of readdirSync(chunks)) {
    if (!entry.endsWith('.js') || entry.includes('-tea-tins-v1')) continue;
    const source = readFileSync(join(chunks, entry), 'utf8');
    const output = javascript(source, entry);
    if (source !== output) names.set(entry, entry.replace('.js', '-tea-tins-v1.js'));
  }
  const references = value => {
    for (const [before, after] of names) value = value.split(before).join(after);
    return value;
  };
  for (const [before, after] of names) writeFileSync(join(chunks, after), references(javascript(readFileSync(join(chunks, before), 'utf8'), before)));
  for (const path of walk(join(repo, 'varathans25'))) {
    if (!/\.(html|txt)$/.test(path) || path.includes('/fonts/')) continue;
    if (path.includes('/product/coffee-powder/')) { if (!path.endsWith('/index.html')) rmSync(path); continue; }
    // Editorial was rebuilt from the updated shell; keep its owned export and
    // manifest intact, including the exact approved collection-page content.
    if (path.includes('/cigar-collection/')) continue;
    const input = readFileSync(path, 'utf8');
    const output = path.endsWith('.html') ? html(input, /varathans25\/(de|fr|en)\//.test(path)) : flight(input);
    write(path, references(output));
  }
  for (const [locale, label] of Object.entries({ de: 'Tee', fr: 'Thé', en: 'Tea' })) {
    const destination = `/varathans25/${locale}/shop/?selection=tea`;
    // GitHub Pages cannot issue custom HTTP redirects. Retire the product with
    // a noindex static redirect plus an accessible, script-free fallback link.
    writeFileSync(join(repo, `varathans25/${locale}/product/coffee-powder/index.html`), `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta http-equiv="refresh" content="0; url=${destination}"><link rel="canonical" href="https://openatg.com${destination}"><title>${label} — Varathans25</title></head><body><main><h1>${label}</h1><a href="${destination}">Varathans25 · ${label}</a></main></body></html>\n`);
  }
  console.log(`Updated public catalogue and ${names.size} versioned storefront chunks; retired three Coffee product pages.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'prepare') await prepare();
  else if (process.argv[2] === 'publish') publish();
  else throw new Error('Use prepare before the editorial build, then publish after it.');
}
