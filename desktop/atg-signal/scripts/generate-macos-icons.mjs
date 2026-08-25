import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceLogo = path.resolve(projectRoot, "../../atg-mark.png");
const outputRoot = path.join(projectRoot, "src-tauri", "icons");
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "atg-signal-icons-"));
const tauriCli = path.join(projectRoot, "node_modules", ".bin", "tauri");
const macIconFiles = ["32x32.png", "64x64.png", "128x128.png", "128x128@2x.png", "icon.icns"];

try {
  execFileSync(tauriCli, ["icon", sourceLogo, "-o", temporaryRoot], { stdio: "inherit" });
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  for (const filename of macIconFiles) {
    await cp(path.join(temporaryRoot, filename), path.join(outputRoot, filename));
  }
  console.log(`Generated ${macIconFiles.length} macOS icon assets in ${outputRoot}`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
