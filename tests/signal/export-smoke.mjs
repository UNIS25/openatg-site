import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { COMPARISON_COLUMNS, PLATFORMS, TOP_POST_COLUMNS } from "../../signal/signal-core.mjs";
import { createExcelBlob, createWordReport } from "../../signal/report-downloads.mjs";

const require = createRequire(import.meta.url);
const XLSX = require("../../signal/vendor/xlsx.full.min.js");
const docx = require("../../signal/vendor/docx.umd.js");
const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, "../..");
const artifactRoot = path.join(repositoryRoot, "artifacts", "signal");
const javascriptResults = JSON.parse(
  await readFile(path.join(artifactRoot, "javascript-results.json"), "utf8"),
);
const topRows = PLATFORMS.flatMap((platform) => javascriptResults.top[platform]);
const comparisonRows = javascriptResults.comparison["X English"];

const topExcel = Buffer.from(await createExcelBlob(topRows, TOP_POST_COLUMNS, XLSX).arrayBuffer());
const parsedTopWorkbook = XLSX.read(topExcel, { type: "buffer" });
const parsedTopRows = XLSX.utils.sheet_to_json(parsedTopWorkbook.Sheets.Sheet1, { raw: true });
assert.equal(parsedTopRows.length, 15);
assert.deepEqual(Object.keys(parsedTopRows[0]), TOP_POST_COLUMNS);

const comparisonExcel = Buffer.from(
  await createExcelBlob(comparisonRows, COMPARISON_COLUMNS, XLSX).arrayBuffer(),
);
const parsedComparisonWorkbook = XLSX.read(comparisonExcel, { type: "buffer" });
assert.equal(
  XLSX.utils.sheet_to_json(parsedComparisonWorkbook.Sheets.Sheet1, { raw: true }).length,
  5,
);

const word = Buffer.from(await (await createWordReport(topRows, PLATFORMS, docx)).arrayBuffer());
assert.equal(word.subarray(0, 2).toString("ascii"), "PK");
assert.ok(word.includes(Buffer.from("[Content_Types].xml")));
assert.ok(word.includes(Buffer.from("word/document.xml")));

await mkdir(artifactRoot, { recursive: true });
await writeFile(
  path.join(artifactRoot, "export-smoke-results.json"),
  `${JSON.stringify(
    {
      status: "pass",
      excel: {
        top_report_rows: parsedTopRows.length,
        comparison_metric_rows: comparisonRows.length,
        top_report_bytes: topExcel.length,
        comparison_report_bytes: comparisonExcel.length,
      },
      word: { report_bytes: word.length, zip_structure: "valid" },
    },
    null,
    2,
  )}\n`,
);

console.log("Excel and Word export smoke tests passed.");
