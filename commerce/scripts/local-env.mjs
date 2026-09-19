import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const raw = execFileSync(
  "npx",
  ["supabase", "status", "--workdir", "..", "--output", "json"],
  { encoding: "utf8" },
);
const status = JSON.parse(raw);
if (!new URL(status.API_URL).hostname.match(/^(127\.0\.0\.1|localhost)$/))
  throw Error("Local project required");
const content =
  [
    `VITE_SUPABASE_URL=${status.API_URL}`,
    `VITE_SUPABASE_PUBLISHABLE_KEY=${status.ANON_KEY}`,
    `SUPABASE_URL=${status.API_URL}`,
    `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
  ].join("\n") + "\n";
writeFileSync(".env.local", content, { mode: 0o600 });
console.log(
  "Local environment written to ignored .env.local. No credentials printed.",
);
