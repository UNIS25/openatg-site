// Docker Desktop may ignore the network default when CLI port HostIp is empty.
// Recreate ONLY this project's published containers with an explicit loopback bind.
// Existing named volumes, secrets, images, aliases and container configuration are retained.
import { execFileSync, spawnSync } from "node:child_process";
import http from "node:http";
import { writeFileSync } from "node:fs";
const context = JSON.parse(
  execFileSync("docker", ["context", "inspect"], { encoding: "utf8" }),
)[0];
const endpoint = context.Endpoints.docker.Host;
if (!endpoint.startsWith("unix://"))
  throw new Error("Local Docker socket required");
async function docker(path, body) {
  return new Promise((resolve, reject) => {
    const raw = JSON.stringify(body);
    const req = http.request(
      {
        socketPath: endpoint.slice(7),
        path: `/v1.47${path}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(raw),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          res.statusCode >= 200 && res.statusCode < 300
            ? resolve(JSON.parse(data || "{}"))
            : reject(new Error(`Docker creation failed (${res.statusCode})`)),
        );
      },
    );
    req.on("error", reject);
    req.end(raw);
  });
}
for (const service of ["db", "kong", "studio", "inbucket"]) {
  const name = `supabase_${service}_varathans25-premium-platform`;
  const old = JSON.parse(
    execFileSync("docker", ["inspect", name], { encoding: "utf8" }),
  )[0];
  if (
    Object.values(old.HostConfig.PortBindings || {})
      .flat()
      .every((p) => p.HostIp === "127.0.0.1")
  )
    continue;
  const bindings = Object.fromEntries(
    Object.entries(old.HostConfig.PortBindings).map(([port, values]) => [
      port,
      values.map((p) => ({ ...p, HostIp: "127.0.0.1" })),
    ]),
  );
  const endpoints = Object.fromEntries(
    Object.entries(old.NetworkSettings.Networks).map(([network, c]) => [
      network,
      { Aliases: c.Aliases, NetworkID: c.NetworkID },
    ]),
  );
  const backup = `${name}-binding-backup`;
  let archive;
  if (service === "kong") {
    const original = execFileSync(
      "docker",
      ["cp", `${name}:/home/kong/.`, "-"],
      { maxBuffer: 8 * 1024 * 1024 },
    );
    archive = execFileSync(
      "python3",
      [
        "-c",
        "import sys,tarfile,io; src=tarfile.open(fileobj=io.BytesIO(sys.stdin.buffer.read())); out=tarfile.open(fileobj=sys.stdout.buffer,mode='w|'); [(out.addfile(m,src.extractfile(m) if m.isfile() else None)) for m in src.getmembers() if 'templates' not in m.name.split('/')]; out.close()",
      ],
      { input: original, maxBuffer: 8 * 1024 * 1024 },
    );
  }

  execFileSync("docker", ["stop", name], { stdio: "ignore" });
  execFileSync("docker", ["rename", name, backup], { stdio: "ignore" });
  try {
    await docker(`/containers/create?name=${name}`, {
      ...old.Config,
      HostConfig: { ...old.HostConfig, PortBindings: bindings },
      NetworkingConfig: { EndpointsConfig: endpoints },
    });
    if (service === "kong")
      execFileSync("docker", ["cp", "-a", "-", `${name}:/home/kong`], {
        input: archive,
        stdio: ["pipe", "pipe", "pipe"],
      });
    execFileSync("docker", ["start", name], { stdio: "ignore" });
    let healthy = false;
    for (let n = 0; n < 150; n++) {
      const state = JSON.parse(
        execFileSync(
          "docker",
          ["inspect", name, "--format", "{{json .State}}"],
          { encoding: "utf8" },
        ),
      );
      if (
        state.Running &&
        (!state.Health || state.Health.Status === "healthy")
      ) {
        healthy = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (!healthy) {
      const logs = spawnSync("docker", ["logs", "--tail", "20", name], {
        encoding: "utf8",
      });
      writeFileSync(
        ".local/binding-health-failure.log",
        String(logs.stdout) + String(logs.stderr),
        { mode: 0o600 },
      );
      throw new Error("Loopback container health check failed");
    }
    execFileSync("docker", ["rm", backup], { stdio: "ignore" });
  } catch (error) {
    try {
      execFileSync("docker", ["rm", "-f", name], { stdio: "ignore" });
    } catch {}
    execFileSync("docker", ["rename", backup, name], { stdio: "ignore" });
    execFileSync("docker", ["start", name], { stdio: "ignore" });
    throw error;
  }
}
console.log("Project container bindings restricted to 127.0.0.1.");
