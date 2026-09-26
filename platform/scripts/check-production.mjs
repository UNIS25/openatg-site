import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
const root = resolve("..");
const expected = "ad680205287c323005c2e92f0f1ffa514939ec52";
if (
  execFileSync("git", ["rev-parse", "origin/main"], {
    cwd: root,
    encoding: "utf8",
  }).trim() !== expected
)
  throw new Error("Production reference changed");
const changed = execFileSync("git", ["diff", expected, "--name-only"], {
  cwd: root,
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);
if (changed.some((p) => !p.startsWith("platform/") && !p.startsWith("docs/")))
  throw new Error("Existing public files changed");
const tracked = execFileSync("git", ["ls-files"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\n")
  .filter((p) => p.startsWith("platform/"));
if (
  tracked.some((p) =>
    /(^|\/)(\.env(?!\.example$)|\.local|node_modules|\.next|.*\.db$)/.test(p),
  )
)
  throw new Error("Private file is tracked");
const example = readFileSync(".env.example", "utf8");
for (const flag of [
  "PRODUCTION_WRITES_ENABLED",
  "CIGAR_CHECKOUT_ENABLED",
  "LIVE_PAYMENTS_ENABLED",
  "SUBSCRIPTIONS_ENABLED",
])
  if (!example.includes(`${flag}=false`)) throw new Error(`Unsafe ${flag}`);
if (/NEXT_PUBLIC_\w+\s*=/.test(example))
  throw new Error("Browser credentials found");
const privateValues = Object.entries(process.env).filter(
  ([key, value]) =>
    /KEY|SECRET|PASSWORD/.test(key) && value && value.length > 20,
);
function walk(path) {
  for (const name of readdirSync(path)) {
    const file = resolve(path, name);
    if (statSync(file).isDirectory()) walk(file);
    else {
      const data = readFileSync(file);
      for (const [key, value] of privateValues)
        if (data.includes(Buffer.from(value)))
          throw new Error(`Client bundle contains server variable ${key}`);
    }
  }
}
if (existsSync(".next/static")) walk(".next/static");
else throw new Error("Run production build first");
console.log(
  "PASS: production base, public file preservation, disabled flags, tracked-file exclusions and client-bundle secret checks.",
);
