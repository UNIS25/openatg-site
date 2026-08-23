import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, "../..");
const artifactRoot = path.join(repositoryRoot, "artifacts", "signal");
const pythonOutput = path.join(artifactRoot, "python-results.json");
const javascriptOutput = path.join(artifactRoot, "javascript-results.json");
const finalOutput = path.join(artifactRoot, "parity-results.json");
const defaultPython = "/Users/adrianvasu/Desktop/ATG-SIGNAL/atg-social-analysis-merged/.venv/bin/python3";
const python = process.env.ATG_SIGNAL_PYTHON || defaultPython;

await access(python);
await mkdir(artifactRoot, { recursive: true });

function run(command, args) {
  const completed = spawnSync(command, args, { cwd: repositoryRoot, encoding: "utf8" });
  if (completed.status !== 0) {
    throw new Error(`${command} failed:\n${completed.stdout}\n${completed.stderr}`);
  }
  if (completed.stdout.trim()) process.stdout.write(completed.stdout);
}

run(process.execPath, [path.join(here, "generate-fixtures.mjs")]);
run(python, [path.join(here, "python-reference-runner.py"), pythonOutput]);
run(process.execPath, [path.join(here, "javascript-runner.mjs"), javascriptOutput]);

const pythonResults = JSON.parse(await readFile(pythonOutput, "utf8"));
const javascriptResults = JSON.parse(await readFile(javascriptOutput, "utf8"));
const cases = [];

for (const [platform, expected] of Object.entries(pythonResults.top)) {
  assert.deepEqual(javascriptResults.top[platform], expected, `Top 3 mismatch for ${platform}`);
  cases.push({ section: "Top 3 Posts", platform, status: "pass", rows: expected.length });
}

for (const [platform, expected] of Object.entries(pythonResults.comparison)) {
  assert.deepEqual(javascriptResults.comparison[platform], expected, `Comparison mismatch for ${platform}`);
  cases.push({ section: "Compare Weeks", platform, status: "pass", metrics: expected.length });
}

const report = {
  status: "pass",
  summary: {
    cases: cases.length,
    passed: cases.length,
    failed: 0,
    top_post_rows_compared: cases
      .filter((testCase) => testCase.section === "Top 3 Posts")
      .reduce((sum, testCase) => sum + testCase.rows, 0),
    comparison_metric_rows_compared: cases
      .filter((testCase) => testCase.section === "Compare Weeks")
      .reduce((sum, testCase) => sum + testCase.metrics, 0),
  },
  cases,
  reference_hashes: pythonResults.reference_hashes,
};

await writeFile(finalOutput, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `Parity passed: ${report.summary.passed}/${report.summary.cases} platform cases, ` +
    `${report.summary.top_post_rows_compared} top-post rows and ` +
    `${report.summary.comparison_metric_rows_compared} comparison metric rows.`,
);
