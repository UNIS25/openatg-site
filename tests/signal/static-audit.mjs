import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, "../..");
const signalRoot = path.join(repositoryRoot, "signal");
const signalHtml = await readFile(path.join(signalRoot, "index.html"), "utf8");
const homepageHtml = await readFile(path.join(repositoryRoot, "index.html"), "utf8");
const runtimeSource = (
  await Promise.all(
    ["app.js", "signal-core.mjs", "report-downloads.mjs"].map((filename) =>
      readFile(path.join(signalRoot, filename), "utf8"),
    ),
  )
).join("\n");

const runtimeAssetReferences = [
  ...signalHtml.matchAll(/<(?:script|img)[^>]+src="([^"]+)"/g),
  ...signalHtml.matchAll(/<link[^>]+rel="(?:stylesheet|icon)"[^>]+href="([^"]+)"/g),
].map((match) => match[1]);
const externalRuntimeAssets = runtimeAssetReferences.filter((reference) => /^https?:/i.test(reference));
assert.deepEqual(externalRuntimeAssets, []);

for (const reference of runtimeAssetReferences) {
  if (/^(?:https?:|data:|\/)/i.test(reference)) continue;
  await access(path.resolve(signalRoot, reference));
}

assert.match(signalHtml, /connect-src 'none'/);
assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(/);
assert.doesNotMatch(runtimeSource, /\b(?:analytics|gtag|googletagmanager|segment|mixpanel)\b/i);

const signalTags = [...homepageHtml.matchAll(/<a\b[^>]*href="\/signal\/"[^>]*>/g)].map(
  (match) => match[0],
);
assert.equal(signalTags.length, 4);
assert.ok(signalTags.every((tag) => !/\btarget=|\brel=/.test(tag)));
assert.match(homepageHtml, /<section class="product-section product-signal" id="signal">/);

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

const dependencyHashes = {
  "vendor/xlsx.full.min.js": sha256(
    await readFile(path.join(signalRoot, "vendor", "xlsx.full.min.js")),
  ),
  "vendor/docx.umd.js": sha256(await readFile(path.join(signalRoot, "vendor", "docx.umd.js"))),
};
assert.equal(
  dependencyHashes["vendor/xlsx.full.min.js"],
  "cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41",
);
assert.equal(
  dependencyHashes["vendor/docx.umd.js"],
  "096ce30fdd0a8ddc94fe44a86ab1d5ce58165c88d8be797005eba8788fab7203",
);

const report = {
  status: "pass",
  runtime_asset_references: runtimeAssetReferences,
  external_runtime_assets: externalRuntimeAssets,
  network_api_calls_in_application_source: 0,
  analytics_integrations: 0,
  homepage_signal_links: signalTags.length,
  homepage_editorial_section_preserved: true,
  dependency_hashes: dependencyHashes,
};

await writeFile(
  path.join(repositoryRoot, "artifacts", "signal", "static-audit.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log("Static, privacy and integration audit passed.");
