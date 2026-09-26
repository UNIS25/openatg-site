import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { collectionCopy, adjacentView, packagingImage, packagingSrcSet } from '../src/lib/collection-copy';

test('all editorial text and controls are complete in DE/FR/EN', () => {
  const keys = Object.keys(collectionCopy.en).sort();
  for (const copy of Object.values(collectionCopy)) {
    assert.deepEqual(Object.keys(copy).sort(), keys);
    for (const text of Object.values(copy)) assert.ok(text.trim().length > 0);
    assert.match(copy.adults, /18/);
    assert.doesNotMatch(Object.values(copy).join(' '), /Swiss Made|Swiss Cigars|Swiss Premium|CHF|discount|rabatt|réduction|buy now|limited edition/i);
  }
});

test('manual gallery loops in both directions without losing a view', () => {
  assert.equal(adjacentView(0, 1), 1);
  assert.equal(adjacentView(1, 1), 0);
  assert.equal(adjacentView(0, -1), 1);
  assert.equal(adjacentView(1, -1), 0);
});

test('responsive image references resolve to the two approved views', () => {
  for (const view of ['closed', 'open'] as const) {
    assert.match(packagingImage(view), new RegExp(`box-${view}\\.webp$`));
    assert.match(packagingSrcSet(view), /480w, .*960w, .*1536w$/);
    assert.equal(packagingSrcSet(view).split(',').length, 3);
  }
});

test('export is noindex, correctly localised, and contains no transactional page controls', () => {
  for (const [locale, copy] of Object.entries(collectionCopy)) {
    const html = readFileSync(`../varathans25/${locale}/cigar-collection/index.html`, 'utf8');
    assert.match(html, new RegExp(`<html lang="${locale}"`));
    assert.match(html, /name="robots" content="noindex, nofollow, noarchive"/);
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] || '';
    assert.ok(main.includes(copy.status));
    assert.equal((main.match(/<button /g) || []).length, 2, 'Only manual image controls in the editorial page');
    assert.doesNotMatch(main, /CHF|add to bag|checkout|payment|reserve|discount|Rabatt|réduction/i);
    assert.doesNotMatch(html, /service_role|SUPABASE_SERVICE|DATABASE_URL|BEGIN PRIVATE KEY/);
  }
});

test('export hashes and untouched baseline protect existing routes and assets', () => {
  const manifest = JSON.parse(readFileSync('assets/export-manifest.json', 'utf8'));
  for (const [file, hash] of Object.entries(manifest.files)) {
    assert.equal(createHash('sha256').update(readFileSync(`../${file}`)).digest('hex'), hash);
  }
  for (const [view, original] of Object.entries(manifest.originals)) {
    assert.equal(createHash('sha256').update(readFileSync(`assets/originals/varathans-cigars-box-${view}.png`)).digest('hex'), (original as { sha256: string }).sha256);
  }
  // This release cherry-picks the editorial onto public main. The manifest's
  // sourceCommit records catalogue provenance, not the production baseline.
  const productionBaseline = 'd7012ead4eb2291847f130c30891d70fd0abb173';
  execFileSync('git', ['merge-base', '--is-ancestor', productionBaseline, 'HEAD'], { cwd: '..' });
  const protectedPaths = ['index.html', 'signal', 'store', 'varathans25/images/cigars', 'varathans25/images/gelber-curry-kokos*', 'varathans25/brand', 'varathans25/cigar-mix-builder.js', 'varathans25/cigar-mix-builder.css'];
  const modified = execFileSync('git', ['diff', '--name-only', '--diff-filter=MDR', productionBaseline, '--', ...protectedPaths], { cwd: '..', encoding: 'utf8' }).trim();
  assert.equal(modified, '', 'Existing OpenATG, curry, cigar, logo and delivery assets are protected');
});
