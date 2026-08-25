import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(projectRoot, "../..");
const distRoot = path.join(projectRoot, "dist");
const fixtureRoot = path.join(repositoryRoot, "tests", "signal", "fixtures");
const validationRoot = path.join(projectRoot, "src-tauri", "target", "validation");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profilePath = await mkdtemp(path.join(tmpdir(), "atg-signal-desktop-chrome-"));
const downloadPath = path.join(profilePath, "downloads");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
};

await mkdir(downloadPath, { recursive: true });
await mkdir(validationRoot, { recursive: true });

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, "http://127.0.0.1");
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname === "/") pathname = "/index.html";
    const filename = path.resolve(distRoot, `.${pathname}`);
    if (!filename.startsWith(`${distRoot}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const contents = await readFile(filename);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filename)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(contents);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${profilePath}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function waitForDebugPort() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const contents = await readFile(path.join(profilePath, "DevToolsActivePort"), "utf8");
      return Number(contents.split("\n")[0]);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error("Chrome debugging port did not become available.");
}

const debugPort = await waitForDebugPort();
const targetResponse = await fetch(
  `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${baseUrl}/`)}`,
  { method: "PUT" },
);
const target = await targetResponse.json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let commandId = 0;
const pending = new Map();
const requests = [];
const consoleErrors = [];

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const callbacks = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) callbacks.reject(new Error(message.error.message));
    else callbacks.resolve(message.result);
    return;
  }
  if (message.method === "Network.requestWillBeSent") requests.push(message.params.request.url);
  if (message.method === "Runtime.exceptionThrown") {
    consoleErrors.push(message.params.exceptionDetails.text || "Runtime exception");
  }
  if (message.method === "Log.entryAdded" && ["error", "warning"].includes(message.params.entry.level)) {
    consoleErrors.push(message.params.entry.text);
  }
});

function send(method, params = {}) {
  commandId += 1;
  return new Promise((resolve, reject) => {
    pending.set(commandId, { resolve, reject });
    socket.send(JSON.stringify({ id: commandId, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, label) {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

async function waitForFile(filename) {
  const fullPath = path.join(downloadPath, filename);
  for (let attempt = 0; attempt < 160; attempt += 1) {
    try {
      await access(fullPath);
      return fullPath;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error(`Timed out waiting for ${filename}.`);
}

async function navigate() {
  await send("Page.navigate", { url: `${baseUrl}/` });
  await waitFor("document.readyState === 'complete'", "staged frontend load");
}

async function setInputFiles(selector, files) {
  const documentNode = await send("DOM.getDocument", { depth: 0 });
  const selected = await send("DOM.querySelector", { nodeId: documentNode.root.nodeId, selector });
  assert.notEqual(selected.nodeId, 0, `File input ${selector} should exist`);
  await send("DOM.setFileInputFiles", { nodeId: selected.nodeId, files });
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("DOM.enable");
  await send("Log.enable");
  await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath });
  await navigate();

  const initial = await evaluate(`({
    title: document.title,
    processing: globalThis.ATGSignal?.processing,
    nativeBridge: Boolean(globalThis.ATGDesktop),
    serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller),
    serviceWorkerScriptPresent: Boolean(document.querySelector('script[src="pwa.js"]'))
  })`);
  assert.deepEqual(initial, {
    title: "ATG Signal — OpenATG",
    processing: "local-only",
    nativeBridge: false,
    serviceWorkerControlled: false,
    serviceWorkerScriptPresent: false,
  });

  await evaluate(`
    document.querySelector('#top-start-date').value = '2026-08-10';
    document.querySelector('#top-start-date').dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('#top-end-date').value = '2026-08-16';
    document.querySelector('#top-end-date').dispatchEvent(new Event('change', { bubbles: true }));
  `);
  const requestsBeforeProcessing = requests.length;
  await setInputFiles("#top-x-english", [path.join(fixtureRoot, "top", "x-english.csv")]);
  await waitFor("document.querySelectorAll('#top-combined-table tbody tr').length === 3", "Top 3 rows");
  const topResult = await evaluate(`({
    rows: document.querySelectorAll('#top-combined-table tbody tr').length,
    firstPost: document.querySelector('#top-combined-table tbody tr td[data-column="Post text"]')?.textContent,
    status: document.querySelector('#top-status')?.textContent
  })`);
  assert.deepEqual(topResult, {
    rows: 3,
    firstPost: "Policy explainer",
    status: "Processed 1 platform locally.",
  });

  await evaluate("document.querySelector('#download-top-excel').click()");
  const topExcelPath = await waitForFile("Social_Media_Report.xlsx");
  await evaluate("document.querySelector('#download-top-word').click()");
  const wordPath = await waitForFile("Weekly_Social_Media_Report.docx");

  await evaluate("document.querySelector('#tab-compare-weeks').click()");
  await setInputFiles("#comparison-week-before", [path.join(fixtureRoot, "comparison", "x-english-before.csv")]);
  await setInputFiles("#comparison-week-review", [path.join(fixtureRoot, "comparison", "x-english-review.csv")]);
  await waitFor("document.querySelectorAll('#comparison-table tbody tr').length === 5", "comparison rows");
  const comparisonResult = await evaluate(`({
    rows: document.querySelectorAll('#comparison-table tbody tr').length,
    firstChange: document.querySelector('#comparison-table tbody tr td[data-column="Change"]')?.textContent,
    status: document.querySelector('#comparison-status')?.textContent
  })`);
  assert.deepEqual(comparisonResult, {
    rows: 5,
    firstChange: "▲ +1 (+25.00%)",
    status: "Comparison completed locally.",
  });
  await evaluate("document.querySelector('#download-comparison').click()");
  const comparisonExcelPath = await waitForFile("X_English_Week_Comparison.xlsx");

  const XLSX = require(path.join(repositoryRoot, "signal", "vendor", "xlsx.full.min.js"));
  const topWorkbook = XLSX.read(await readFile(topExcelPath), { type: "buffer" });
  const comparisonWorkbook = XLSX.read(await readFile(comparisonExcelPath), { type: "buffer" });
  assert.equal(XLSX.utils.sheet_to_json(topWorkbook.Sheets.Sheet1).length, 3);
  assert.equal(XLSX.utils.sheet_to_json(comparisonWorkbook.Sheets.Sheet1).length, 5);
  const wordBytes = await readFile(wordPath);
  assert.equal(wordBytes.subarray(0, 2).toString("ascii"), "PK");
  assert.ok(wordBytes.includes(Buffer.from("word/document.xml")));
  assert.equal(requests.length, requestsBeforeProcessing, "Processing and exports must not request assets or APIs");

  await send("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
    connectionType: "none",
  });
  const offlineResult = await evaluate(`({
    processing: globalThis.ATGSignal.processing,
    topRows: document.querySelectorAll('#top-combined-table tbody tr').length,
    comparisonRows: document.querySelectorAll('#comparison-table tbody tr').length
  })`);
  assert.deepEqual(offlineResult, { processing: "local-only", topRows: 3, comparisonRows: 5 });
  await send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
    connectionType: "wifi",
  });

  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(path.join(validationRoot, "atg-signal-staged.png"), Buffer.from(screenshot.data, "base64"));

  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      Object.defineProperty(globalThis, '__TAURI_INTERNALS__', { value: {}, configurable: true });
      Object.defineProperty(globalThis, '__TAURI__', {
        value: {
          dialog: { save: async () => '/mock/Social_Media_Report.xlsx' },
          fs: { writeFile: async (path, contents) => { globalThis.__ATG_MOCK_SAVE__ = { path, bytes: contents.length }; } }
        },
        configurable: true
      });
    `,
  });
  await navigate();
  assert.deepEqual(
    await evaluate(`({
      runtime: globalThis.ATGDesktop?.runtime,
      pwaRegistration: globalThis.ATGDesktop?.pwaRegistration,
      installHidden: getComputedStyle(document.querySelector('.installation')).display === 'none'
    })`),
    { runtime: "tauri", pwaRegistration: "skipped", installHidden: true },
  );
  await evaluate(`
    document.querySelector('#top-start-date').value = '2026-08-10';
    document.querySelector('#top-start-date').dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('#top-end-date').value = '2026-08-16';
    document.querySelector('#top-end-date').dispatchEvent(new Event('change', { bubbles: true }));
  `);
  await setInputFiles("#top-x-english", [path.join(fixtureRoot, "top", "x-english.csv")]);
  await waitFor("document.querySelectorAll('#top-combined-table tbody tr').length === 3", "native-bridge Top 3 rows");
  await evaluate("document.querySelector('#download-top-excel').click()");
  await waitFor("document.documentElement.dataset.lastSave === 'saved'", "mocked native save");
  const nativeSave = await evaluate("globalThis.__ATG_MOCK_SAVE__");
  assert.equal(nativeSave.path, "/mock/Social_Media_Report.xlsx");
  assert.ok(nativeSave.bytes > 1000);

  const desktopScreenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(
    path.join(validationRoot, "atg-signal-desktop-runtime.png"),
    Buffer.from(desktopScreenshot.data, "base64"),
  );

  const externalRequests = requests.filter((url) => /^https?:/i.test(url) && new URL(url).origin !== baseUrl);
  assert.deepEqual(externalRequests, []);
  assert.deepEqual(consoleErrors, []);

  console.log(
    JSON.stringify({
      status: "pass",
      top_posts: topResult,
      comparison: comparisonResult,
      excel_exports: { top_rows: 3, comparison_rows: 5 },
      word_export: { zip_structure: "valid", bytes: wordBytes.length },
      offline: offlineResult,
      native_save_bridge: nativeSave,
      pwa_registration: "skipped",
      external_requests: externalRequests.length,
      console_errors: consoleErrors.length,
    }),
  );
} finally {
  socket.close();
  chrome.kill("SIGTERM");
  server.close();
  await rm(profilePath, { recursive: true, force: true });
}
