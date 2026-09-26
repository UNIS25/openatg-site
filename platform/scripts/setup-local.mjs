import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
const values = JSON.parse(
  execFileSync("node_modules/.bin/supabase", ["status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }),
);
if (values.API_URL !== "http://127.0.0.1:58531")
  throw new Error("Wrong local project");
const previous = existsSync(".env.local")
  ? Object.fromEntries(
      readFileSync(".env.local", "utf8")
        .trim()
        .split("\n")
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        }),
    )
  : {};
if (previous.SUPABASE_URL && previous.SUPABASE_URL !== values.API_URL)
  throw new Error("Refusing to replace a different environment");
const settings = {
  PLATFORM_ENV: "local",
  APP_ORIGIN: "http://127.0.0.1:4190",
  SUPABASE_URL: values.API_URL,
  SUPABASE_ANON_KEY: values.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: values.SERVICE_ROLE_KEY,
  PASS_SIGNING_KEY:
    previous.PASS_SIGNING_KEY || randomBytes(32).toString("hex"),
  RATE_LIMIT_KEY: previous.RATE_LIMIT_KEY || randomBytes(32).toString("hex"),
  WEBHOOK_SIGNING_KEY:
    previous.WEBHOOK_SIGNING_KEY || randomBytes(32).toString("hex"),
  PRODUCTION_WRITES_ENABLED: "false",
  CIGAR_CHECKOUT_ENABLED: "false",
  LIVE_PAYMENTS_ENABLED: "false",
  SUBSCRIPTIONS_ENABLED: "false",
  AGE_VERIFICATION_MODE: "test",
};
writeFileSync(
  ".env.local",
  Object.entries(settings)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);
mkdirSync(".local", { recursive: true });
execFileSync(
  "docker",
  [
    "exec",
    "supabase_db_varathans25-premium-platform",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    "update v25_private.platform_runtime set local_test=true where id;",
  ],
  { stdio: "ignore" },
);
console.log(
  "Local environment written with mode 0600. No credentials printed.",
);
