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
const experience = readFileSync("src/components/final-experience.tsx", "utf8");
const rights = readFileSync("docs/GATEWAY_MEDIA_RIGHTS.md", "utf8");
for (const required of ["name=\"evening\"", "name=\"highlands\"", "name=\"tea\"", "name=\"kitchen\"", "restaurant-closing", "varathans25-transparent.png"])
  if (!experience.includes(required)) throw Error(`Approved experience component missing ${required}`);
for (const selected of ["v25-premium-hero-1600.webp", "v25-premium-hero-mobile.webp", "v25-premium-hero-1600.mp4", "evening-1600.mp4", "highlands-1600.mp4", "tea-1600.mp4", "kitchen-1600.mp4", "varathans25-transparent.png"])
  if (!rights.includes(selected)) throw Error(`Media-rights register missing ${selected}`);
if (!readFileSync("public/varathans25/brand/varathans25-original.png").equals(readFileSync("public/varathans25/brand/varathans25-transparent.png")))
  throw Error("Official logo derivative changed artwork");
console.log(
  JSON.stringify({
    candidateFilesScanned: scanned,
    actualSecretValuesChecked: secrets.length,
    privateMediaOutsidePublic: true,
    approvedExperienceAssetsPresent: true,
    passed: true,
  }),
);
