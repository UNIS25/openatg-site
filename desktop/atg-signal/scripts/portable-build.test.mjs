import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { resolveTauriCli } from "./generate-windows-icon.mjs";
import {
  normalizeLineEndings,
  transformDesktopApp,
  transformDesktopHtml,
} from "./stage-frontend.mjs";

const canonical = '    <link rel="canonical" href="https://openatg.com/signal/" />';
const sourceHtml = [
  "<!doctype html>",
  '<meta http-equiv="Content-Security-Policy" content="connect-src \'none\'; worker-src \'self\'; manifest-src \'self\'">',
  canonical,
  '    <link rel="manifest" href="manifest.webmanifest" />',
  '    <img src="../atg-mark-transparent.png" alt="">',
  '    <script src="pwa.js" defer></script>',
  "",
].join("\n");
const sourceApp = "function downloadBlob(blob, filename) {\n  return { blob, filename };\n}\n";

function withLineEndings(source, lineEnding) {
  return source.replaceAll("\n", lineEnding);
}

test("desktop transforms are identical for LF, CRLF and CR sources", () => {
  const htmlOutputs = ["\n", "\r\n", "\r"].map((lineEnding) =>
    transformDesktopHtml(normalizeLineEndings(withLineEndings(sourceHtml, lineEnding))),
  );
  const appOutputs = ["\n", "\r\n", "\r"].map((lineEnding) =>
    transformDesktopApp(normalizeLineEndings(withLineEndings(sourceApp, lineEnding))),
  );

  assert.equal(htmlOutputs[1], htmlOutputs[0]);
  assert.equal(htmlOutputs[2], htmlOutputs[0]);
  assert.equal(appOutputs[1], appOutputs[0]);
  assert.equal(appOutputs[2], appOutputs[0]);
  assert.doesNotMatch(htmlOutputs[0], /\r/);
  assert.doesNotMatch(appOutputs[0], /\r/);
  assert.doesNotMatch(htmlOutputs[0], /rel="canonical"/);
});

test("missing desktop canonical block fails strictly", () => {
  const missing = sourceHtml.replace(`${canonical}\n`, "");
  assert.throws(
    () => transformDesktopHtml(normalizeLineEndings(missing)),
    /desktop canonical removal: expected one source match, found 0/,
  );
});

test("duplicated desktop canonical block fails strictly", () => {
  const duplicated = sourceHtml.replace(canonical, `${canonical}\n${canonical}`);
  assert.throws(
    () => transformDesktopHtml(normalizeLineEndings(duplicated)),
    /desktop canonical removal: expected one source match, found 2/,
  );
});

test("Windows resolves the Tauri command shim", () => {
  assert.equal(
    resolveTauriCli("project", "win32"),
    path.join("project", "node_modules", ".bin", "tauri.cmd"),
  );
});

test("macOS and Linux resolve the extensionless Tauri executable", () => {
  for (const platform of ["darwin", "linux"]) {
    assert.equal(
      resolveTauriCli("project", platform),
      path.join("project", "node_modules", ".bin", "tauri"),
    );
  }
});
