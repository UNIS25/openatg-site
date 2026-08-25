# ATG Signal for macOS and Windows

This project packages the authoritative browser-native application in `../../signal/` as a
self-contained Tauri 2 application for Apple Silicon Macs and 64-bit Windows 10/11 computers.
The web application and its calculation/report modules remain authoritative and are not edited
by the desktop build.

## Architecture

- `scripts/stage-frontend.mjs` copies the local web assets into the ignored `dist/` directory.
  It applies only desktop-shell adaptations: Tauri IPC CSP entries, a native save bridge,
  desktop wording/navigation, and an explicit PWA/service-worker skip.
- The copied `signal-core.mjs` and `report-downloads.mjs` are byte-for-byte identical to the
  website versions. Spreadsheet and Word libraries remain vendored and offline.
- Native file selection continues to use the WebView file control. Reports use the official
  Tauri dialog and filesystem plugins. The capability grants only `dialog:allow-save` and
  `fs:allow-write-file` on macOS and Windows; the save dialog adds the user-selected path to the
  runtime scope.
- No localhost server, Python process, shell plugin, HTTP plugin, updater, telemetry, analytics,
  CDN, or remote API is included.
- `THIRD_PARTY_NOTICES.md`, the Windows-only `WINDOWS_THIRD_PARTY_NOTICES.md` supplement,
  and the vendored browser licence texts are packaged with the application.

## Build (maintainers only)

From this directory on Apple Silicon macOS:

```sh
npm ci
npm run icons
npm run licenses
APPLE_SIGNING_IDENTITY=- npm run build
```

From this directory on 64-bit Windows 10 or Windows 11:

```powershell
npm ci
npm run licenses
npm run build:windows
```

The Windows build creates an English NSIS current-user installer and an English WiX MSI. Both
embed the WebView2 offline installer, so installation and runtime use do not need a network
connection. The application itself, including Node and Rust, is compiled into the installer;
users do not need Python, Node, Rust, a terminal, or administrator access after installation.

Expected version 1.0.0 outputs:

- `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/ATG Signal_1.0.0_x64-setup.exe`
- `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/ATG Signal_1.0.0_x64_en-US.msi`

Node and Rust are build-time dependencies only. The resulting `.app` and `.dmg` contain the
compiled application and need no developer toolchain or Terminal at runtime. The same is true of
the Windows installers and installed application.

The initial Windows beta is deliberately unsigned. Microsoft Defender SmartScreen may show a
warning, and organisation-managed computers may block it. No signing credentials are configured.
Prepared, inactive store compatibility copy and the publication gate are documented in
`WINDOWS_BETA_RELEASE.md`; there is no Windows download button or public release URL yet.

## Verification

From the repository root, run the authoritative test suite before and after the desktop build:

```sh
node tests/signal/run-parity.mjs
node tests/signal/export-smoke.mjs
node tests/signal/static-audit.mjs
node tests/signal/browser-validation.mjs
```

Desktop frontend validation is in `scripts/validate-staged-frontend.mjs`. It drives the staged
assets in an isolated local browser, verifies calculations and exports, emulates offline mode,
checks network/console activity, and exercises the native save bridge with local dialog/filesystem
mocks. `npm run test:config` checks the platform-specific bundle settings, dependency pins,
workflow artifact paths, capability scope, icon, packaged notices, and byte parity of the
authoritative calculation/report modules. Bundle architecture, signatures, LaunchServices startup
and runtime sockets are inspected separately against the release `.app`. The release configuration
always keeps developer tools disabled.
