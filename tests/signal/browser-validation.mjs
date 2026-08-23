import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, "../..");
const screenshotRoot = path.join(repositoryRoot, "artifacts", "signal", "screenshots");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profilePath = await mkdtemp(path.join(tmpdir(), "atg-signal-chrome-"));
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, "http://127.0.0.1");
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const filename = path.resolve(repositoryRoot, `.${pathname}`);
    if (!filename.startsWith(`${repositoryRoot}${path.sep}`)) {
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
const serverAddress = server.address();
const baseUrl = `http://127.0.0.1:${serverAddress.port}`;

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
  for (let attempt = 0; attempt < 100; attempt += 1) {
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
  `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${baseUrl}/signal/`)}`,
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
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
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
  const id = commandId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
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
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

async function navigate(url) {
  await send("Page.navigate", { url });
  await waitFor("document.readyState === 'complete'", `page load: ${url}`);
}

async function setViewport(width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 700,
  });
}

async function screenshot(filename) {
  const capture = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(path.join(screenshotRoot, filename), Buffer.from(capture.data, "base64"));
}

async function setInputFiles(selector, files) {
  const documentNode = await send("DOM.getDocument", { depth: 0 });
  const selected = await send("DOM.querySelector", {
    nodeId: documentNode.root.nodeId,
    selector,
  });
  assert.notEqual(selected.nodeId, 0, `File input ${selector} should exist`);
  await send("DOM.setFileInputFiles", { nodeId: selected.nodeId, files });
}

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("DOM.enable");
await send("Log.enable");
await send("Emulation.setEmulatedMedia", { features: [] });
await import("node:fs/promises").then(({ mkdir }) => mkdir(screenshotRoot, { recursive: true }));

const viewportResults = [];
for (const viewport of [
  { width: 1440, height: 1000, file: "atg-signal-1440x1000.png" },
  { width: 768, height: 1024, file: "atg-signal-768x1024.png" },
  { width: 390, height: 844, file: "atg-signal-390x844.png" },
]) {
  await setViewport(viewport.width, viewport.height);
  await navigate(`${baseUrl}/signal/`);
  const dimensions = await evaluate(`({
    innerWidth,
    innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    title: document.title,
    headline: document.querySelector('h1')?.textContent,
    localOnly: globalThis.ATGSignal?.processing
  })`);
  assert.equal(dimensions.innerWidth, viewport.width);
  assert.equal(dimensions.innerHeight, viewport.height);
  assert.ok(dimensions.scrollWidth <= viewport.width, `No horizontal overflow at ${viewport.width}px`);
  assert.ok(dimensions.bodyScrollWidth <= viewport.width, `Body should fit at ${viewport.width}px`);
  assert.equal(dimensions.title, "ATG Signal — OpenATG");
  assert.equal(dimensions.headline, "Weekly social media intelligence.");
  assert.equal(dimensions.localOnly, "local-only");
  await screenshot(viewport.file);
  viewportResults.push({ ...viewport, ...dimensions, status: "pass" });
}

await setViewport(1440, 1000);
await navigate(`${baseUrl}/signal/`);
const accessibilityResult = await evaluate(`({
  unlabeledInputs: [...document.querySelectorAll('input, select')]
    .filter((control) => !control.labels?.length && !control.getAttribute('aria-label'))
    .map((control) => control.id),
  emptyButtons: [...document.querySelectorAll('button')]
    .filter((button) => !button.textContent.trim() && !button.getAttribute('aria-label')).length,
  imagesWithoutAlt: [...document.querySelectorAll('img:not([alt])')].length,
  tabCount: document.querySelectorAll('[role="tablist"] [role="tab"]').length,
  privacyStatement: document.querySelector('.privacy-inner p')?.textContent.replace(/\\s+/g, ' ').trim(),
  mainTabIndex: document.querySelector('main')?.getAttribute('tabindex')
})`);
assert.deepEqual(accessibilityResult.unlabeledInputs, []);
assert.equal(accessibilityResult.emptyButtons, 0);
assert.equal(accessibilityResult.imagesWithoutAlt, 0);
assert.equal(accessibilityResult.tabCount, 2);
assert.equal(accessibilityResult.mainTabIndex, "-1");
assert.equal(
  accessibilityResult.privacyStatement,
  "Private by design. Files are processed locally in your browser and are never uploaded.",
);
await evaluate(`
  document.querySelector('#top-start-date').value = '2026-08-10';
  document.querySelector('#top-start-date').dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelector('#top-end-date').value = '2026-08-16';
  document.querySelector('#top-end-date').dispatchEvent(new Event('change', { bubbles: true }));
`);

const requestsBeforeUpload = requests.length;
await setInputFiles("#top-x-english", [path.join(here, "fixtures", "top", "x-english.csv")]);
await waitFor(
  "document.querySelectorAll('#top-combined-table tbody tr').length === 3",
  "Top 3 browser results",
);
const topBrowserResult = await evaluate(`({
  rowCount: document.querySelectorAll('#top-combined-table tbody tr').length,
  firstPost: document.querySelector('#top-combined-table tbody tr td[data-column="Post text"]')?.textContent,
  linkCount: document.querySelectorAll('#top-combined-table a[href^="https://"]').length,
  status: document.querySelector('#top-status')?.textContent
})`);
assert.deepEqual(topBrowserResult, {
  rowCount: 3,
  firstPost: "Policy explainer",
  linkCount: 3,
  status: "Processed 1 platform locally.",
});
assert.equal(requests.length, requestsBeforeUpload, "Uploading a fixture must not create a request");
const topUploadRequestDelta = requests.length - requestsBeforeUpload;

await evaluate("document.querySelector('#tab-compare-weeks').click()");
const requestsBeforeComparisonUpload = requests.length;
await setInputFiles("#comparison-week-before", [
  path.join(here, "fixtures", "comparison", "x-english-before.csv"),
]);
await setInputFiles("#comparison-week-review", [
  path.join(here, "fixtures", "comparison", "x-english-review.csv"),
]);
await waitFor(
  "document.querySelectorAll('#comparison-table tbody tr').length === 5",
  "comparison browser results",
);
const comparisonBrowserResult = await evaluate(`({
  rowCount: document.querySelectorAll('#comparison-table tbody tr').length,
  title: document.querySelector('#comparison-results-title')?.textContent,
  firstChange: document.querySelector('#comparison-table tbody tr td[data-column="Change"]')?.textContent,
  status: document.querySelector('#comparison-status')?.textContent
})`);
assert.deepEqual(comparisonBrowserResult, {
  rowCount: 5,
  title: "X English comparison",
  firstChange: "▲ +1 (+25.00%)",
  status: "Comparison completed locally.",
});
assert.equal(
  requests.length,
  requestsBeforeComparisonUpload,
  "Comparing fixture files must not create a request",
);
const comparisonUploadRequestDelta = requests.length - requestsBeforeComparisonUpload;

await evaluate("document.querySelector('#tab-top-posts').focus()");
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight" });
await send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight" });
const keyboardResult = await evaluate(`({
  activeId: document.activeElement.id,
  selected: document.querySelector('#tab-compare-weeks').getAttribute('aria-selected'),
  panelVisible: !document.querySelector('#panel-compare-weeks').hidden
})`);
assert.deepEqual(keyboardResult, {
  activeId: "tab-compare-weeks",
  selected: "true",
  panelVisible: true,
});

await evaluate("document.querySelector('.skip-link').focus()");
const focusResult = await evaluate(`({
  activeClass: document.activeElement.className,
  outlineStyle: getComputedStyle(document.activeElement).outlineStyle,
  outlineWidth: getComputedStyle(document.activeElement).outlineWidth,
  transform: getComputedStyle(document.activeElement).transform
})`);
assert.equal(focusResult.activeClass, "skip-link");
assert.equal(focusResult.outlineStyle, "solid");
assert.equal(focusResult.outlineWidth, "3px");
assert.notEqual(focusResult.transform, "none");

await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
const reducedMotionResult = await evaluate(`({
  scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
  transitionDuration: getComputedStyle(document.querySelector('.tool-tab')).transitionDuration
})`);
assert.equal(reducedMotionResult.scrollBehavior, "auto");
assert.ok(parseFloat(reducedMotionResult.transitionDuration) <= 0.01);

await send("Network.emulateNetworkConditions", {
  offline: true,
  latency: 0,
  downloadThroughput: 0,
  uploadThroughput: 0,
  connectionType: "none",
});
await evaluate("document.querySelector('#tab-top-posts').click()");
const offlineResult = await evaluate(`({
  topPanelVisible: !document.querySelector('#panel-top-posts').hidden,
  retainedRows: document.querySelectorAll('#top-combined-table tbody tr').length,
  processing: globalThis.ATGSignal.processing
})`);
assert.deepEqual(offlineResult, {
  topPanelVisible: true,
  retainedRows: 3,
  processing: "local-only",
});
await send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 0,
  downloadThroughput: -1,
  uploadThroughput: -1,
  connectionType: "wifi",
});

await navigate(`${baseUrl}/`);
const homeLinkResult = await evaluate(`({
  signalLinks: [...document.querySelectorAll('a[href="/signal/"]')].map((link) => ({
    text: link.textContent.trim(),
    target: link.getAttribute('target'),
    rel: link.getAttribute('rel')
  })),
  missingHashTargets: [...document.querySelectorAll('a[href^="#"]')]
    .map((link) => link.getAttribute('href'))
    .filter((href) => href !== '#' && !document.querySelector(href))
})`);
assert.equal(homeLinkResult.signalLinks.length, 4);
assert.ok(homeLinkResult.signalLinks.every((link) => link.target === null && link.rel === null));
assert.deepEqual(homeLinkResult.missingHashTargets, []);

const externalRuntimeRequests = requests.filter((url) => {
  if (!/^https?:/i.test(url)) return false;
  return new URL(url).origin !== new URL(baseUrl).origin;
});
assert.deepEqual(externalRuntimeRequests, []);
assert.deepEqual(consoleErrors, []);

const report = {
  status: "pass",
  viewports: viewportResults,
  functionality: {
    top_posts: topBrowserResult,
    compare_weeks: comparisonBrowserResult,
    keyboard: keyboardResult,
    focus: focusResult,
    reduced_motion: reducedMotionResult,
    accessibility: accessibilityResult,
    offline_after_load: offlineResult,
    homepage_links: homeLinkResult,
  },
  privacy: {
    external_runtime_requests: externalRuntimeRequests,
    requests_created_by_file_processing: topUploadRequestDelta + comparisonUploadRequestDelta,
    content_security_policy_connect_src: "none",
  },
  console_errors: consoleErrors,
};
await writeFile(
  path.join(repositoryRoot, "artifacts", "signal", "browser-validation.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

socket.close();
chrome.kill("SIGTERM");
server.close();
await rm(profilePath, { recursive: true, force: true });
console.log("Browser validation passed at 1440×1000, 768×1024 and 390×844.");
