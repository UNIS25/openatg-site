import { execFileSync } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceLogo = path.resolve(projectRoot, "../../atg-mark.png");
const outputIcon = path.join(projectRoot, "src-tauri", "icons", "icon.ico");
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "atg-signal-windows-icon-"));
const tauriCli = path.join(projectRoot, "node_modules", ".bin", "tauri");

try {
  execFileSync(tauriCli, ["icon", sourceLogo, "-o", temporaryRoot], { stdio: "inherit" });
  await cp(path.join(temporaryRoot, "icon.ico"), outputIcon);
  console.log(`Generated the Windows icon at ${outputIcon}`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
