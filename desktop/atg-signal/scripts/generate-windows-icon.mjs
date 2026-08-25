import { execFileSync } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceLogo = path.resolve(projectRoot, "../../atg-mark.png");
const outputIcon = path.join(projectRoot, "src-tauri", "icons", "icon.ico");

export function resolveTauriCli(root, platform = process.platform) {
  const executable = platform === "win32" ? "tauri.cmd" : "tauri";
  return path.join(root, "node_modules", ".bin", executable);
}

export async function generateWindowsIcon() {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "atg-signal-windows-icon-"));
  const tauriCli = resolveTauriCli(projectRoot);

  try {
    execFileSync(tauriCli, ["icon", sourceLogo, "-o", temporaryRoot], { stdio: "inherit" });
    await cp(path.join(temporaryRoot, "icon.ico"), outputIcon);
    console.log(`Generated the Windows icon at ${outputIcon}`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateWindowsIcon();
}
