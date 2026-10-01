import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const references = JSON.parse(readFileSync("src/data/restricted-references.json", "utf8"));
function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const next = resolve(path, entry.name);
    return entry.isDirectory() ? files(next) : [next];
  });
}
for (const file of files(".next/static")) {
  const bytes = readFileSync(file);
  for (const reference of references) {
    assert.ok(!bytes.includes(Buffer.from(reference.slug)), `Reference data leaked into client bundle: ${file}`);
    assert.ok(!bytes.includes(Buffer.from(reference.name)), `Reference name leaked into client bundle: ${file}`);
  }
}
const trace = JSON.parse(readFileSync(".next/server/app/api/club/media/[view]/route.js.nft.json", "utf8"));
for (const reference of references)
  assert.ok(trace.files.some((file) => file.endsWith(`/private-media/club/${reference.slug}.webp`)), `Missing production media: ${reference.slug}`);
const preserved = [
  "src/components/verification.tsx",
  "src/components/verification-admin.tsx",
  "src/components/membership-comparison.tsx",
  "src/app/style.css",
  "src/app/api/action/route.ts",
  "src/lib/server.ts",
];
for (const file of preserved) {
  const before = execFileSync("git", ["show", `fc8d400:platform/${file}`]);
  assert.ok(before.equals(readFileSync(file)), `Approved non-collection file changed: ${file}`);
}
assert.match(readFileSync("src/app/api/auth/route.ts", "utf8"), /emailRedirectTo:.*auth\/callback/);
assert.match(readFileSync("src/app/auth/callback/route.ts", "utf8"), /verifyOtp/);
assert.match(readFileSync("src/app/auth/refresh/route.ts", "utf8"), /refreshSession/);
console.log(JSON.stringify({
  passed: true,
  references: references.length,
  referenceDataAbsentFromClientBundles: true,
  protectedMediaIncludedInProductionBuild: true,
  preservedFiles: preserved.length,
}));
