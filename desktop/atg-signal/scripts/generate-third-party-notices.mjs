import { execFileSync } from "node:child_process";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(projectRoot, "../..");
const cargoRoot = path.join(projectRoot, "src-tauri");
const output = path.join(projectRoot, "THIRD_PARTY_NOTICES.md");
const licensePattern = /^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/i;

const metadata = JSON.parse(
  execFileSync(
    "cargo",
    [
      "metadata",
      "--format-version",
      "1",
      "--locked",
      "--filter-platform",
      "aarch64-apple-darwin",
    ],
    { cwd: cargoRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  ),
);

const compiledPackageIds = new Set(metadata.resolve.nodes.map((entry) => entry.id));
const packages = metadata.packages
  .filter((entry) => entry.name !== "atg-signal" && compiledPackageIds.has(entry.id))
  .sort((left, right) => left.name.localeCompare(right.name) || left.version.localeCompare(right.version));

async function licenseFiles(manifestPath) {
  const packageRoot = path.dirname(manifestPath);
  const names = (await readdir(packageRoot)).filter((name) => licensePattern.test(name)).sort();
  const files = [];
  for (const name of names) {
    const filename = path.join(packageRoot, name);
    if ((await stat(filename)).isFile()) files.push({ name, text: await readFile(filename, "utf8") });
  }
  return files;
}

const sections = [
  "# ATG Signal third-party notices",
  "",
  "ATG Signal 1.0.0 includes the local browser libraries listed below and the Rust crates " +
    "compiled into the Tauri application. No dependency is loaded from a network service at runtime.",
  "",
  "## Browser libraries",
  "",
  await readFile(path.join(repositoryRoot, "signal", "THIRD_PARTY_NOTICES.md"), "utf8"),
  "",
  "The complete SheetJS and docx licence texts are retained in the application frontend under " +
    "`vendor/LICENSE.sheetjs.txt` and `vendor/LICENSE.docx.txt`.",
  "",
  "## Tauri build tooling",
  "",
  "- @tauri-apps/cli 2.11.4 — Apache-2.0 OR MIT — build-time only; it is not shipped in the app.",
  "",
  "## Compiled Rust components",
  "",
];

for (const entry of packages) {
  const source = entry.repository || entry.homepage || entry.source || "Source recorded in Cargo.lock";
  sections.push(`### ${entry.name} ${entry.version}`, "");
  sections.push(`- Licence expression: ${entry.license || "See retained licence files"}`);
  sections.push(`- Source: ${source}`, "");
  const files = await licenseFiles(entry.manifest_path);
  if (!files.length) {
    sections.push("No standalone licence file was present in the published crate; the licence expression above is retained from its Cargo metadata.", "");
    continue;
  }
  for (const file of files) {
    sections.push(`<details><summary>${file.name}</summary>`, "", "```text", file.text.trimEnd(), "```", "", "</details>", "");
  }
}

await writeFile(output, `${sections.join("\n").trimEnd()}\n`);
console.log(`Wrote notices for ${packages.length} compiled Rust packages to ${output}`);
