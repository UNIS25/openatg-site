import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  compareReports,
  processTopPosts,
  readComparisonFile,
  readTopPostsFile,
} from "../../signal/signal-core.mjs";

const require = createRequire(import.meta.url);
const XLSX = require("../../signal/vendor/xlsx.full.min.js");
const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(here, "fixtures");
const manifest = JSON.parse(await readFile(path.join(fixtureRoot, "manifest.json"), "utf8"));
const result = { top: {}, comparison: {} };

for (const [platform, relativePath] of Object.entries(manifest.top)) {
  const fixturePath = path.join(fixtureRoot, relativePath);
  const bytes = await readFile(fixturePath);
  const rows = readTopPostsFile(bytes, path.basename(fixturePath), platform, XLSX);
  result.top[platform] = processTopPosts(
    rows,
    platform,
    manifest.reportingPeriod.start,
    manifest.reportingPeriod.end,
    XLSX,
  );
}

for (const [platform, fixturePair] of Object.entries(manifest.comparison)) {
  const before = readComparisonFile(await readFile(path.join(fixtureRoot, fixturePair[0])), platform, XLSX);
  const review = readComparisonFile(await readFile(path.join(fixtureRoot, fixturePair[1])), platform, XLSX);
  result.comparison[platform] = compareReports(platform, before, review);
}

await writeFile(process.argv[2], `${JSON.stringify(result, null, 2)}\n`);
