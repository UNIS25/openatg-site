import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(projectRoot, "../..");
const tauriRoot = path.join(projectRoot, "src-tauri");

async function text(filename) {
  return readFile(filename, "utf8");
}

const [
  packageJson,
  packageLock,
  cargoToml,
  cargoLock,
  tauriConfig,
  windowsConfig,
  capability,
  mainRust,
  notices,
  windowsNotices,
  workflow,
  storeScript,
  storeCatalogue,
] = await Promise.all([
  text(path.join(projectRoot, "package.json")).then(JSON.parse),
  text(path.join(projectRoot, "package-lock.json")).then(JSON.parse),
  text(path.join(tauriRoot, "Cargo.toml")),
  text(path.join(tauriRoot, "Cargo.lock")),
  text(path.join(tauriRoot, "tauri.conf.json")).then(JSON.parse),
  text(path.join(tauriRoot, "tauri.windows.conf.json")).then(JSON.parse),
  text(path.join(tauriRoot, "capabilities", "main.json")).then(JSON.parse),
  text(path.join(tauriRoot, "src", "main.rs")),
  text(path.join(projectRoot, "THIRD_PARTY_NOTICES.md")),
  text(path.join(projectRoot, "WINDOWS_THIRD_PARTY_NOTICES.md")),
  text(path.join(repositoryRoot, ".github", "workflows", "atg-signal-windows.yml")),
  text(path.join(repositoryRoot, "store", "store.js")),
  text(path.join(repositoryRoot, "store", "catalog.json")),
]);

assert.equal(packageJson.version, "1.0.0");
assert.equal(packageJson.devDependencies["@tauri-apps/cli"], "2.11.4");
assert.equal(packageLock.lockfileVersion, 3);
assert.equal(packageLock.packages["node_modules/@tauri-apps/cli"].version, "2.11.4");
assert.match(packageJson.scripts.build, /aarch64-apple-darwin --bundles app,dmg$/);
assert.match(packageJson.scripts["build:windows"], /x86_64-pc-windows-msvc --bundles nsis,msi/);
assert.match(packageJson.scripts["build:windows"], /--no-sign -- --locked$/);

assert.match(cargoToml, /tauri = \{ version = "=2\.11\.5", features = \[\] \}/);
assert.match(cargoToml, /tauri-plugin-dialog = "=2\.7\.2"/);
assert.match(cargoToml, /tauri-plugin-fs = "=2\.5\.1"/);
for (const [name, version] of [
  ["tauri", "2.11.5"],
  ["tauri-build", "2.6.3"],
  ["tauri-plugin-dialog", "2.7.2"],
  ["tauri-plugin-fs", "2.5.1"],
]) {
  assert.match(cargoLock, new RegExp(`name = "${name}"\\nversion = "${version.replaceAll(".", "\\.")}"`));
}

assert.equal(tauriConfig.productName, "ATG Signal");
assert.equal(tauriConfig.identifier, "com.openatg.signal");
assert.equal(tauriConfig.version, "1.0.0");
assert.deepEqual(tauriConfig.bundle.targets, ["app", "dmg"]);
assert.equal(tauriConfig.bundle.macOS.minimumSystemVersion, "11.0");
assert.equal(tauriConfig.app.windows[0].devtools, false);
assert.deepEqual(tauriConfig.bundle.resources, [
  "../THIRD_PARTY_NOTICES.md",
  "../WINDOWS_THIRD_PARTY_NOTICES.md",
]);
assert.equal(tauriConfig.bundle.createUpdaterArtifacts, false);

assert.deepEqual(windowsConfig.bundle.targets, ["nsis", "msi"]);
assert.equal(windowsConfig.bundle.publisher, "OpenATG");
assert.equal(windowsConfig.bundle.windows.webviewInstallMode.type, "offlineInstaller");
assert.equal(windowsConfig.bundle.windows.nsis.installMode, "currentUser");
assert.equal(windowsConfig.bundle.windows.nsis.installerIcon, "icons/icon.ico");
assert.equal(windowsConfig.bundle.windows.wix.language, "en-US");
assert.equal(
  windowsConfig.bundle.windows.wix.upgradeCode,
  "7451b7a7-afe9-5daa-901b-c9dd44c41e48",
);

assert.deepEqual(capability.platforms, ["macOS", "windows"]);
assert.deepEqual(capability.permissions, ["dialog:allow-save", "fs:allow-write-file"]);
assert.equal(capability.remote, undefined);
assert.doesNotMatch(cargoToml, /tauri-plugin-(?:http|shell|updater)/);
assert.doesNotMatch(mainRust, /(?:shell|http|updater|Command::new|std::process)/i);

const icon = await readFile(path.join(tauriRoot, "icons", "icon.ico"));
assert.deepEqual([...icon.subarray(0, 4)], [0, 0, 1, 0]);
assert.match(notices, /compiled into the Tauri application/);
assert.match(windowsNotices, /Windows-only Rust dependencies for x86_64-pc-windows-msvc/);
assert.match(windowsNotices, /## Retained licence texts/);

for (const filename of ["signal-core.mjs", "report-downloads.mjs"]) {
  const [authoritative, staged] = await Promise.all([
    readFile(path.join(repositoryRoot, "signal", filename)),
    readFile(path.join(projectRoot, "dist", filename)),
  ]);
  assert.equal(Buffer.compare(authoritative, staged), 0, `${filename} must be staged byte-for-byte`);
}

assert.match(workflow, /runs-on: windows-latest/);
assert.match(workflow, /permissions:\n  contents: read/);
assert.match(workflow, /tauri-apps\/tauri-action@v1/);
assert.match(workflow, /x86_64-pc-windows-msvc --bundles nsis,msi --ci --no-sign -- --locked/);
assert.match(
  workflow,
  /src-tauri\/target\/x86_64-pc-windows-msvc\/release\/bundle\/nsis\/\*\.exe/,
);
assert.match(
  workflow,
  /src-tauri\/target\/x86_64-pc-windows-msvc\/release\/bundle\/msi\/\*\.msi/,
);
assert.ok(workflow.includes('"ATG Signal_${version}_x64-setup.exe"'));
assert.ok(workflow.includes('"ATG Signal_${version}_x64_en-US.msi"'));
assert.doesNotMatch(workflow, /(?:releaseName|releaseId|GITHUB_TOKEN|secrets\.)/);
assert.doesNotMatch(storeScript, /api\.github\.com|fetch\([^)]*github/i);
const signalCatalogueEntry = JSON.parse(storeCatalogue).items.find(
  (item) => item.id === "atg-signal",
);
assert.equal(signalCatalogueEntry.availability.browser.url, "https://openatg.com/signal/");
assert.deepEqual(
  {
    filename: signalCatalogueEntry.availability.windows.recommended.filename,
    sizeBytes: signalCatalogueEntry.availability.windows.recommended.sizeBytes,
    sha256: signalCatalogueEntry.availability.windows.recommended.sha256,
  },
  {
    filename: "ATG-Signal-1.0.0-Windows-x64-Setup.exe",
    sizeBytes: 218863321,
    sha256: "bea0260319b6ce911407cebbbf4bf725dfcaa5376534cff92c232d445a0cd4ab",
  },
);
assert.deepEqual(
  {
    filename: signalCatalogueEntry.availability.windows.alternative.filename,
    sizeBytes: signalCatalogueEntry.availability.windows.alternative.sizeBytes,
    sha256: signalCatalogueEntry.availability.windows.alternative.sha256,
  },
  {
    filename: "ATG-Signal-1.0.0-Windows-x64.msi",
    sizeBytes: 217436160,
    sha256: "25992e57001bc5ba6f181f7f1567498a01f71187face876c8fedc0712c47b254",
  },
);
assert.deepEqual(
  {
    filename: signalCatalogueEntry.availability.macos.installer.filename,
    sizeBytes: signalCatalogueEntry.availability.macos.installer.sizeBytes,
    sha256: signalCatalogueEntry.availability.macos.installer.sha256,
  },
  {
    filename: "ATG-Signal-1.0.0-macOS-Apple-Silicon.dmg",
    sizeBytes: 4343812,
    sha256: "9942a1b1864f01ed5023e6f82fcac54d749e4f8780c3af871c3f402911b92c3d",
  },
);
assert.match(signalCatalogueEntry.availability.windows.securityNotice, /currently unsigned/);
assert.match(signalCatalogueEntry.availability.macos.securityNotice, /not yet been Apple-notarised/);

console.log(
  JSON.stringify({
    status: "pass",
    identity: "ATG Signal 1.0.0 (com.openatg.signal)",
    macOS: "aarch64 app,dmg; minimum 11.0",
    windows: "x86_64-pc-windows-msvc nsis,msi; offline WebView2",
    native_save_permissions: capability.permissions,
    production_devtools: false,
    authoritative_modules: "byte-identical in staged frontend",
    public_downloads: "browser, Windows EXE/MSI and macOS DMG activated in OpenStore",
  }),
);
