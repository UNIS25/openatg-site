import { execFileSync } from "node:child_process";
import { mkdirSync, openSync, closeSync } from "node:fs";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const name = "varathans25-premium-loopback";
try {
  execFileSync("docker", ["network", "inspect", name], { stdio: "ignore" });
} catch {
  execFileSync(
    "docker",
    [
      "network",
      "create",
      "-o",
      "com.docker.network.bridge.host_binding_ipv4=127.0.0.1",
      name,
    ],
    { stdio: "ignore" },
  );
}
const network = JSON.parse(
  execFileSync("docker", ["network", "inspect", name], { encoding: "utf8" }),
)[0];
if (
  network.Options["com.docker.network.bridge.host_binding_ipv4"] !== "127.0.0.1"
)
  throw new Error("Local network must bind loopback only");
mkdirSync(".local", { recursive: true });
const log = openSync(".local/supabase-start.log", "w", 0o600);
try {
  execFileSync("node_modules/.bin/supabase", ["start", "--network-id", name], {
    stdio: ["ignore", log, log],
  });
} finally {
  closeSync(log);
}
await import("./bind-loopback.mjs");
for (const service of ["kong", "db", "studio", "inbucket"]) {
  const ports = execFileSync(
    "docker",
    ["port", `supabase_${service}_varathans25-premium-platform`],
    { encoding: "utf8" },
  );
  if (
    ports
      .split("\n")
      .filter(Boolean)
      .some((line) => !line.includes("127.0.0.1:"))
  )
    throw new Error("Unexpected non-loopback port binding");
}
console.log(
  "Isolated Supabase services started on loopback only. Credentials retained in .local/supabase-start.log (0600).",
);
