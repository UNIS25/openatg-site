import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { rt } from "../src/lib/reference-copy";
const read = (path: string) => readFileSync(path, "utf8");
const records = JSON.parse(read("src/data/restricted-references.json"));
const manifest = JSON.parse(read("docs/RESTRICTED_REFERENCE_SOURCES.json"));
const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");

function referenceArrays(value: unknown): Record<string, unknown>[][] {
  if (Array.isArray(value)) {
    if (value.length === 23 && value[0]?.referencePriceCents !== undefined) return [value];
    return value.flatMap(referenceArrays);
  }
  return value && typeof value === "object"
    ? Object.values(value).flatMap(referenceArrays)
    : [];
}

test("the entire existing reference set is preserved without prices, stock or invented specifications", () => {
  const source = read(`../${manifest.dataSource}`);
  assert.equal(hash(source), manifest.dataSourceSha256);
  const original = source.split("\n").flatMap((line) => {
    try { return referenceArrays(JSON.parse(line.slice(line.indexOf(":") + 1))); }
    catch { return []; }
  });
  assert.equal(original.length, 1);
  const fields = ["slug", "name", "brand", "collection", "format", "lengthMm", "ringGauge", "status"];
  assert.deepEqual(records, original[0].map((row) => Object.fromEntries(fields.map((key) => [key, row[key]]))));
  assert.equal(new Set(records.map((r) => r.slug)).size, 23);
  const migration = read("supabase/migrations/202609200006_preserved_references.sql");
  for (const row of records) {
    assert.ok(migration.includes(`'${row.slug}'`));
    assert.ok(migration.includes(`'${row.name}'`));
    assert.equal(row.status, "PREVIEW");
    assert.equal(row.lengthMm, null);
    assert.equal(row.ringGauge, null);
  }
});

test("every reference image preserves its repository bytes and is absent from the public app directory", () => {
  assert.equal(manifest.images.length, 23);
  for (const media of manifest.images) {
    const privateBytes = readFileSync(`private-media/club/${media.slug}.webp`);
    assert.equal(hash(privateBytes), media.sha256);
    assert.equal(hash(readFileSync(`../${media.source}`)), media.sha256);
    assert.equal(existsSync(`public/${media.source}`), false);
    assert.equal(privateBytes.subarray(8, 12).toString(), "WEBP");
  }
});

test("reference navigation and qualification copy have independent German, French and English text", () => {
  for (const key of ["title", "intro", "browse", "references", "filter", "all", "index", "detail", "format", "preview", "availability", "unknownSize", "readOnly", "fourText", "sixText"] as const) {
    const values = ["de", "fr", "en"].map((locale) => rt(locale as "de" | "fr" | "en", key));
    assert.equal(new Set(values).size, 3, key);
    assert.ok(values.every((value) => value.trim().length > 0));
  }
});
