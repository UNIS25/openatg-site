import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  openSync,
  closeSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
if (!process.argv.includes("--confirm-local-fixtures"))
  throw new Error(
    "Explicit --confirm-local-fixtures is required; this resets only the named local test database.",
  );
if (
  !readFileSync("supabase/config.toml", "utf8").startsWith(
    'project_id = "varathans25-premium-platform"',
  )
)
  throw new Error("Unexpected project");
mkdirSync(".local", { recursive: true, mode: 0o700 });
const backup = execFileSync(
  "docker",
  [
    "exec",
    "supabase_db_varathans25-premium-platform",
    "pg_dump",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-Fc",
  ],
  { maxBuffer: 100 * 1024 * 1024 },
);
writeFileSync(`.local/before-reset-${Date.now()}.dump`, backup, {
  mode: 0o600,
});
const log = openSync(".local/reset.log", "w", 0o600);
try {
  execFileSync(
    "node_modules/.bin/supabase",
    ["db", "reset", "--local", "--network-id", "varathans25-premium-loopback"],
    { stdio: ["ignore", log, log] },
  );
} finally {
  closeSync(log);
}
await import("./bind-loopback.mjs");
execFileSync("node", ["scripts/setup-local.mjs"], { stdio: "inherit" });
execFileSync("npm", ["run", "local:seed"], { stdio: "inherit" });
