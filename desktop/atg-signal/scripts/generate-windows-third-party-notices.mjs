import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cargoRoot = path.join(projectRoot, "src-tauri");
const output = path.join(projectRoot, "WINDOWS_THIRD_PARTY_NOTICES.md");
const licensePattern = /^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/i;

function cargoMetadata(target) {
  return JSON.parse(
    execFileSync(
      "cargo",
      ["metadata", "--format-version", "1", "--locked", "--filter-platform", target],
      { cwd: cargoRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    ),
  );
}

function resolvedPackageIds(metadata) {
  return new Set(metadata.resolve.nodes.map((entry) => entry.id));
}

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

const macMetadata = cargoMetadata("aarch64-apple-darwin");
const windowsMetadata = cargoMetadata("x86_64-pc-windows-msvc");
const macPackages = resolvedPackageIds(macMetadata);
const windowsPackages = resolvedPackageIds(windowsMetadata);
const packages = windowsMetadata.packages
  .filter(
    (entry) =>
      entry.name !== "atg-signal" && windowsPackages.has(entry.id) && !macPackages.has(entry.id),
  )
  .sort((left, right) => left.name.localeCompare(right.name) || left.version.localeCompare(right.version));

const retainedTexts = new Map();
const packageNotices = [];

for (const entry of packages) {
  const source = entry.repository || entry.homepage || entry.source || "Source recorded in Cargo.lock";
  const files = await licenseFiles(entry.manifest_path);
  const references = [];
  for (const file of files) {
    const normalized = file.text.trimEnd();
    const sha256 = createHash("sha256").update(normalized).digest("hex");
    const retained = retainedTexts.get(sha256) || { text: normalized, packages: [] };
    retained.packages.push(`${entry.name} ${entry.version} (${file.name})`);
    retainedTexts.set(sha256, retained);
    references.push(`${file.name}: licence text ${sha256.slice(0, 12)}`);
  }
  packageNotices.push({ entry, source, references });
}

const sections = [
  "# ATG Signal Windows third-party notices",
  "",
  "This supplement covers Windows-only Rust dependencies for x86_64-pc-windows-msvc. It is " +
    "packaged alongside `THIRD_PARTY_NOTICES.md` and the browser-library licence files. No " +
    "dependency is loaded from a network service at runtime.",
  "",
  "## Windows-only compiled components",
  "",
];

for (const { entry, source, references } of packageNotices) {
  sections.push(`### ${entry.name} ${entry.version}`, "");
  sections.push(`- Licence expression: ${entry.license || "See retained licence texts"}`);
  sections.push(`- Source: ${source}`);
  if (references.length) {
    sections.push(`- Retained files: ${references.join("; ")}`, "");
  } else {
    sections.push(
      "- No standalone licence file was present in the published crate; the licence expression " +
        "above is retained from its Cargo metadata.",
      "",
    );
  }
}

sections.push("## Retained licence texts", "");
for (const [sha256, retained] of [...retainedTexts].sort(([left], [right]) => left.localeCompare(right))) {
  sections.push(`### Licence text ${sha256.slice(0, 12)}`, "");
  sections.push(`- SHA-256: \`${sha256}\``);
  sections.push(`- Used by: ${retained.packages.sort().join("; ")}`, "");
  sections.push("```text", retained.text, "```", "");
}

await writeFile(output, `${sections.join("\n").trimEnd()}\n`);
console.log(
  `Wrote notices for ${packages.length} Windows-only Rust packages and ` +
    `${retainedTexts.size} unique licence texts to ${output}`,
);
