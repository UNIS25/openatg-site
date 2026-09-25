import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(app, '..');
const sha256 = data => createHash('sha256').update(data).digest('hex');
const manifestPath = join(app, 'assets/export-manifest.json');
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { files: {} };
const files = {};
const originals = {};

// Only these editorial-owned destinations may be written. An existing, unrelated
// file with different bytes is a hard error, including a Next chunk collision.
function publish(relative, content) {
  if (!/^varathans25\/(?:images\/cigars\/varathans-cigars-box-|(?:de|fr|en)\/cigar-collection\/|_next\/)/.test(relative)) throw new Error(`Unexpected export: ${relative}`);
  const destination = join(repo, relative);
  if (existsSync(destination)) {
    const existing = readFileSync(destination);
    if (!existing.equals(content) && sha256(existing) !== previous.files[relative]) throw new Error(`Refusing to overwrite an existing file: ${relative}`);
  }
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
  files[relative] = sha256(content);
}

for (const view of ['closed', 'open']) {
  const source = join(app, `assets/originals/varathans-cigars-box-${view}.png`);
  const input = readFileSync(source);
  const metadata = await sharp(input).metadata();
  if (metadata.width !== 1536 || metadata.height !== 1024) throw new Error('Approved image dimensions changed');
  originals[view] = { sha256: sha256(input), width: metadata.width, height: metadata.height };
  for (const width of [480, 960, 1536]) {
    const suffix = width === 1536 ? '' : `-${width}`;
    const output = await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 90, effort: 6 }).toBuffer();
    publish(`varathans25/images/cigars/varathans-cigars-box-${view}${suffix}.webp`, output);
  }
}

const next = join(app, 'node_modules/next/dist/bin/next');
// No .env files, database clients, deployment credentials or process secrets are
// read or forwarded. The app consumes its bundled public shell snapshot only.
for (const entry of readdirSync(app)) if (/^\.env(?:\.|$)/.test(entry)) throw new Error('Remove local .env files before this static build');
const result = spawnSync(process.execPath, [next, 'build', '--webpack'], {
  cwd: app, stdio: 'inherit', env: {
    PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
    NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
  },
});
if (result.status !== 0) process.exit(result.status || 1);

function copyTree(source, target, locale) {
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const path = join(source, entry.name);
    const relative = `${target}/${entry.name}`;
    if (entry.isDirectory()) copyTree(path, relative, locale);
    else {
      let content = readFileSync(path);
      if (locale && entry.name.endsWith('.html')) {
        content = Buffer.from(content.toString().replace('<html lang="de"', `<html lang="${locale}"`));
        if (!content.toString().includes('noindex, nofollow')) throw new Error(`Missing noindex: ${relative}`);
      }
      publish(relative, content);
    }
  }
}
for (const locale of ['de', 'fr', 'en']) copyTree(join(app, `out/${locale}/cigar-collection`), `varathans25/${locale}/cigar-collection`, locale);
copyTree(join(app, 'out/_next'), 'varathans25/_next');
writeFileSync(manifestPath, JSON.stringify({ sourceCommit: '87c81681931a3a90c6034164e1f98c8471acd150', originals, files }, null, 2) + '\n');
console.log(`Exported ${Object.keys(files).length} editorial files; existing routes were not rewritten.`);
