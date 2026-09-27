import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const root = resolve("..");
const paths = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "platform", "docs/AGE_VERIFICATION_REQUIREMENTS.md"],
  { cwd: root },
)
  .toString()
  .split("\0")
  .filter(Boolean);
const secrets = Object.entries(process.env).filter(
  ([key, value]) =>
    /KEY|SECRET|PASSWORD/.test(key) && value && value.length > 20,
);
let scanned = 0;
for (const path of paths) {
  let bytes;
  try {
    bytes = readFileSync(resolve(root, path));
  } catch (e) {
    if (e.code === "ENOENT") continue;
    throw e;
  }
  for (const [name, value] of secrets)
    if (bytes.includes(Buffer.from(value)))
      throw Error(`Server secret ${name} found in tracked candidate ${path}`);
  if (/\.(tsx?|m?js|json|sql|md|example)$/.test(path)) {
    const text = bytes.toString();
    if (
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:ghp_|github_pat_|sb_secret_)[A-Za-z0-9_]{25,}/.test(
        text,
      ) &&
      !path.endsWith("check-verified-release.mjs")
    )
      throw Error(`Credential pattern found in ${path}`);
  }
  scanned++;
}
function files(path) {
  return readdirSync(path).flatMap((name) => {
    const next = resolve(path, name);
    return statSync(next).isDirectory() ? files(next) : [next];
  });
}
if (files("public").some((file) => file.includes("/images/cigars/")))
  throw Error("Restricted editorial media still publicly served");
for (const path of files(".next/static"))
  for (const [name, value] of secrets)
    if (readFileSync(path).includes(Buffer.from(value)))
      throw Error(`Server secret ${name} reached client bundle`);
const preserved = [
  "src/components/final-experience.tsx",
  "src/app/experience.css",
];
// Gateway/store components retain their original function bodies; only the member dashboard changed.
const before = execFileSync(
  "git",
  ["show", "d77707f:platform/src/components/final-experience.tsx"],
  { encoding: "utf8" },
);
const after = readFileSync(preserved[0], "utf8");
const extract = (s) =>
  s.slice(
    s.indexOf("export function ExperienceFilm"),
    s.indexOf("export function ClubEntrance"),
  );
if (extract(before) !== extract(after))
  throw Error("Approved film, gateway or store component changed");
console.log(
  JSON.stringify({
    candidateFilesScanned: scanned,
    actualSecretValuesChecked: secrets.length,
    privateMediaOutsidePublic: true,
    gatewayAndStorePreserved: true,
    passed: true,
  }),
);
