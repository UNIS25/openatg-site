import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", cwd: resolve("..") }).trim();
const source = "cfcd90a6b60a1751856f7ed275c32f22b66dfab0";
if (
  git("rev-parse", "origin/work/varathans25-premium-club-platform") !== source
)
  throw new Error("Functional source checkpoint moved");
const paths = git("diff", source, "--name-only").split("\n").filter(Boolean);
if (paths.some((p) => !p.startsWith("platform/") && !p.startsWith("docs/")))
  throw new Error("Changes outside platform and review docs");
const protectedPaths = [
  "varathans25",
  "index.html",
  "signal",
  "store",
  "platform/supabase/migrations/202609200001_schema.sql",
  "platform/supabase/migrations/202609200002_admin_operations.sql",
  "platform/supabase/migrations/202609200003_commerce.sql",
  "platform/supabase/migrations/202609200004_dashboard.sql",
  "platform/supabase/migrations/202609200005_access.sql",
  "platform/supabase/migrations/202609200006_preserved_references.sql",
  "platform/supabase/migrations/202609220007_admin_languages.sql",
  "platform/supabase/migrations/202609270008_platform_schema.sql",
  "platform/supabase/migrations/202609270009_platform_operations.sql",
  "platform/supabase/migrations/202609270010_platform_hardening.sql",
  "platform/supabase/migrations/202609270011_retention.sql",
  "platform/supabase/migrations/202609270012_account_suspension.sql",
  "platform/public/varathans25/images",
  "platform/public/varathans25/brand",
  "platform/src/data/catalogue.json",
  "platform/src/lib/server.ts",
  "platform/src/lib/config.ts",
  "platform/src/lib/domain.ts",
];
if (git("diff", source, "--name-only", "--", ...protectedPaths))
  throw new Error("Protected source changed");
console.log(
  "PASS: functional checkpoint, original storefront/catalogue/logo, migrations, roles and commerce/security foundation preserved.",
);
