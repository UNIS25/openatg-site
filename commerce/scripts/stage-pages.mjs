import { execFileSync } from "node:child_process";
import { cp, mkdir, readdir, rm, readFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
const root = resolve(".."),
  out = resolve(".local/pages"),
  admin = resolve("dist/adminpage");
const html = await readFile(join(admin, "index.html"), "utf8");
if (!html.includes("/adminpage/assets/")) throw Error("Build the admin first.");
// Preserve the complete existing site; exclude this project's source and local data.
const paths = execFileSync("git", ["ls-files", "-z"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean)
  .filter(
    (p) =>
      !p.startsWith("commerce/") &&
      !p.startsWith("supabase/") &&
      !p.startsWith("adminpage/") &&
      !/^docs\/VARATHANS25_(ADMIN_BACKEND|COMMERCE_VERIFICATION)\.md$/.test(p),
  );
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const path of paths) {
  const target = join(out, path);
  await mkdir(dirname(target), { recursive: true });
  await cp(join(root, path), target);
}
await cp(admin, join(out, "adminpage"), { recursive: true });
for (const name of await readdir(out))
  if (["commerce", "supabase", ".env", ".local", "node_modules"].includes(name))
    throw Error("Non-public content in static payload");
console.log(
  `Static payload prepared at ${out}. Existing ${paths.length} tracked files preserved. No hosting settings changed.`,
);
