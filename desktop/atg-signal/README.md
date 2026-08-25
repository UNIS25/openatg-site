# ATG Signal for macOS

This project packages the authoritative browser-native application in `../../signal/` as a
self-contained Tauri 2 application for Apple Silicon Macs. The web application and its
calculation/report modules remain authoritative and are not edited by the desktop build.

## Architecture

- `scripts/stage-frontend.mjs` copies the local web assets into the ignored `dist/` directory.
  It applies only desktop-shell adaptations: Tauri IPC CSP entries, a native save bridge,
  desktop wording/navigation, and an explicit PWA/service-worker skip.
- The copied `signal-core.mjs` and `report-downloads.mjs` are byte-for-byte identical to the
  website versions. Spreadsheet and Word libraries remain vendored and offline.
- Native file selection continues to use the WebView file control. Reports use the official
  Tauri dialog and filesystem plugins. The capability grants only `dialog:allow-save` and
  `fs:allow-write-file`; the save dialog adds the user-selected path to the runtime scope.
- No localhost server, Python process, shell plugin, HTTP plugin, updater, telemetry, analytics,
  CDN, or remote API is included.

## Build (maintainers only)

From this directory on Apple Silicon macOS:

```sh
npm install
npm run icons
npm run licenses
APPLE_SIGNING_IDENTITY=- npm run build
```

Node and Rust are build-time dependencies only. The resulting `.app` and `.dmg` contain the
compiled application and need no developer toolchain or Terminal at runtime.

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
mocks. Bundle architecture, signatures, LaunchServices startup and runtime sockets are inspected
separately against the release `.app`. The release configuration always keeps developer tools
disabled.
