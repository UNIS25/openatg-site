import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, "..");
const artifactRoot = path.join(repositoryRoot, "artifacts", "store");
const screenshotRoot = path.join(artifactRoot, "screenshots");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profilePath = await mkdtemp(path.join(tmpdir(), "openstore-chrome-"));
const downloadUrl =
  "https://github.com/UNIS25/openatg-site/releases/download/atg-base-32m-lightning-v2/ATG-Base-32M-Lightning-v2-Research.tar";
const modelCardUrl =
  "https://github.com/UNIS25/openatg-site/releases/download/atg-base-32m-lightning-v2/MODEL_CARD.md";
const licenceUrl =
  "https://github.com/UNIS25/openatg-site/releases/download/atg-base-32m-lightning-v2/LICENSE";
const archiveFilename = "ATG-Base-32M-Lightning-v2-Research.tar";
const archiveBytes = 378_429_440;
const archiveSha256 = "eb907924aedf9e8c6bc070db4b2cd3aa047aedb28edccb257d1a06a87be967dd";
const signalBrowserUrl = "https://openatg.com/signal/";
const windowsExeUrl =
  "https://github.com/UNIS25/openatg-site/releases/download/atg-signal-v1.0.0-windows-beta.1/ATG-Signal-1.0.0-Windows-x64-Setup.exe";
const windowsMsiUrl =
  "https://github.com/UNIS25/openatg-site/releases/download/atg-signal-v1.0.0-windows-beta.1/ATG-Signal-1.0.0-Windows-x64.msi";
const windowsChecksumUrl =
  "https://github.com/UNIS25/openatg-site/releases/download/atg-signal-v1.0.0-windows-beta.1/SHA256SUMS-Windows.txt";
const windowsReleaseUrl =
  "https://github.com/UNIS25/openatg-site/releases/tag/atg-signal-v1.0.0-windows-beta.1";
const macDmgUrl =
  "https://github.com/UNIS25/openatg-site/releases/download/atg-signal-v1.0.0-macos-beta.1/ATG-Signal-1.0.0-macOS-Apple-Silicon.dmg";
const macChecksumUrl =
  "https://github.com/UNIS25/openatg-site/releases/download/atg-signal-v1.0.0-macos-beta.1/SHA256SUMS-macOS.txt";
const macReleaseUrl =
  "https://github.com/UNIS25/openatg-site/releases/tag/atg-signal-v1.0.0-macos-beta.1";
const windowsUnsignedWarning =
  "This beta is currently unsigned. Microsoft Defender SmartScreen or organisation-managed security controls may display a warning or block installation.";
const macNotarisationWarning =
  "This beta is ad-hoc signed and has not yet been Apple-notarised. macOS or organisation-managed security controls may display a warning or block installation.";
const expectedTopNavigation = ["OpenStore", "New Releases", "Purpose", "Downloads", "Contact"];
const expectedOpenStoreItems = [
  ["Base 32M New", "Research checkpoint"],
  ["Guard", "Verification and safety"],
  ["Apply", "Career applications"],
  ["Signal", "Social media analysis"],
  ["Browse OpenStore", "View the complete catalogue"],
];
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".zip": "application/zip",
};

const [catalogue, homepageHtml, storeHtml, detailHtml, storeSource, detailSource] = await Promise.all([
  readFile(path.join(repositoryRoot, "store", "catalog.json"), "utf8").then(JSON.parse),
  readFile(path.join(repositoryRoot, "index.html"), "utf8"),
  readFile(path.join(repositoryRoot, "store", "index.html"), "utf8"),
  readFile(path.join(repositoryRoot, "store", "base-32m", "index.html"), "utf8"),
  readFile(path.join(repositoryRoot, "store", "store.js"), "utf8"),
  readFile(path.join(repositoryRoot, "store", "base-32m", "base-32m.js"), "utf8"),
]);

assert.equal(catalogue.schemaVersion, 2);
assert.deepEqual(
  catalogue.items.map((item) => item.type),
  ["application", "research"],
);
const signalEntry = catalogue.items.find((item) => item.id === "atg-signal");
const researchEntry = catalogue.items.find((item) => item.id === "atg-base-32m");
assert.ok(signalEntry);
assert.ok(researchEntry);
assert.deepEqual(researchEntry.action, { label: "View checkpoint", path: "/store/base-32m/" });
assert.equal(researchEntry.typeLabel, "Research checkpoint");
assert.equal(researchEntry.version, "Lightning v2");
assert.equal(researchEntry.status, "Research checkpoint");
assert.equal(researchEntry.privacy, "Designed for local research and offline experimentation.");
assert.deepEqual(signalEntry.privacyStatements, [
  "Files are processed locally.",
  "Report data is not uploaded.",
  "The browser version also processes selected files locally.",
]);
assert.deepEqual(signalEntry.compatibility, [
  { label: "Browser", details: ["Modern Windows, macOS and Linux browsers."] },
  {
    label: "Windows native beta",
    details: [
      "Windows 10 and Windows 11",
      "64-bit x86 systems",
      "Version 1.0.0",
      "EXE recommended for individual users",
      "MSI intended for organisational IT deployment",
    ],
  },
  {
    label: "macOS native beta",
    details: [
      "macOS 11 or later",
      "Apple Silicon only",
      "Intel Macs are not currently supported",
      "Version 1.0.0",
    ],
  },
]);
assert.equal(signalEntry.availability.browser.url, signalBrowserUrl);
assert.deepEqual(signalEntry.availability.windows.recommended, {
  label: "EXE recommended for individual users",
  filename: "ATG-Signal-1.0.0-Windows-x64-Setup.exe",
  url: windowsExeUrl,
  sizeBytes: 218_863_321,
  sha256: "bea0260319b6ce911407cebbbf4bf725dfcaa5376534cff92c232d445a0cd4ab",
});
assert.deepEqual(signalEntry.availability.windows.alternative, {
  label: "MSI for IT administrators",
  description: "Intended for organisational IT deployment",
  filename: "ATG-Signal-1.0.0-Windows-x64.msi",
  url: windowsMsiUrl,
  sizeBytes: 217_436_160,
  sha256: "25992e57001bc5ba6f181f7f1567498a01f71187face876c8fedc0712c47b254",
});
assert.equal(signalEntry.availability.windows.checksumFile, windowsChecksumUrl);
assert.equal(signalEntry.availability.windows.releasePage, windowsReleaseUrl);
assert.equal(signalEntry.availability.windows.securityNotice, windowsUnsignedWarning);
assert.deepEqual(signalEntry.availability.macos.installer, {
  filename: "ATG-Signal-1.0.0-macOS-Apple-Silicon.dmg",
  url: macDmgUrl,
  sizeBytes: 4_343_812,
  sha256: "9942a1b1864f01ed5023e6f82fcac54d749e4f8780c3af871c3f402911b92c3d",
});
assert.equal(signalEntry.availability.macos.checksumFile, macChecksumUrl);
assert.equal(signalEntry.availability.macos.releasePage, macReleaseUrl);
assert.equal(signalEntry.availability.macos.securityNotice, macNotarisationWarning);
assert.deepEqual(
  [
    signalEntry.availability.windows.recommended.url,
    signalEntry.availability.windows.alternative.url,
    signalEntry.availability.windows.checksumFile,
    signalEntry.availability.macos.installer.url,
    signalEntry.availability.macos.checksumFile,
  ],
  [windowsExeUrl, windowsMsiUrl, windowsChecksumUrl, macDmgUrl, macChecksumUrl],
);
assert.match(storeHtml, /<title>OpenStore — OpenATG<\/title>/);
assert.match(storeHtml, /<link rel="canonical" href="https:\/\/openatg\.com\/store\/"/);
assert.match(detailHtml, /<link rel="canonical" href="https:\/\/openatg\.com\/store\/base-32m\/"/);
assert.match(detailHtml, new RegExp(downloadUrl.replaceAll(".", "\\.")));
assert.match(homepageHtml, new RegExp(downloadUrl.replaceAll(".", "\\.")));
assert.match(detailHtml, new RegExp(archiveSha256));
assert.match(homepageHtml, new RegExp(archiveSha256));
assert.match(detailHtml, /378,429,440 bytes \(360\.90 MiB\)/);
assert.match(detailHtml, /connect-src 'none'/);
assert.doesNotMatch(`${homepageHtml}\n${storeHtml}\n${detailHtml}\n${storeSource}`, /chatgpt\.site/);
assert.doesNotMatch(storeSource, /\.innerHTML\s*=/);
assert.doesNotMatch(`${storeSource}\n${detailSource}`, /github\.com.*fetch|fetch\([^)]*github/i);
assert.doesNotMatch(storeSource, /api\.github\.com/);
assert.doesNotMatch(
  `${homepageHtml}\n${storeHtml}\n${storeSource}\n${JSON.stringify(catalogue)}`,
  /Windows download unavailable|macOS coming soon|Downloads coming later|Installer not public until/i,
);
assert.doesNotMatch(detailHtml, new RegExp(`href="${downloadUrl.replaceAll(".", "\\.")}"[^>]*download`));

const homepageDownloadsSection = homepageHtml.match(
  /<section class="downloads-section"[\s\S]*?<\/section>/,
)?.[0];
assert.ok(homepageDownloadsSection);
assert.match(homepageDownloadsSection, /href="\/store\/"/);
assert.doesNotMatch(homepageDownloadsSection, /atg-signal-v1\.0\.0-(?:windows|macos)-beta/);

for (const [url, label] of [
  [modelCardUrl, "View model card"],
  [licenceUrl, "View Apache 2.0 licence"],
]) {
  const escapedUrl = url.replaceAll(".", "\\.");
  assert.match(
    detailHtml,
    new RegExp(
      `href="${escapedUrl}"[\\s\\S]*?target="_blank"[\\s\\S]*?rel="noopener noreferrer"[\\s\\S]*?>${label}<`,
    ),
  );
}

function anchorHrefs(source) {
  return [...source.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]);
}

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

const requiredLocalPaths = new Set([
  "/",
  "/store/",
  "/store/base-32m/",
  signalEntry.entryPoint,
  signalEntry.links.thirdPartyNotices,
]);
for (const href of [
  ...anchorHrefs(homepageHtml),
  ...anchorHrefs(storeHtml),
  ...anchorHrefs(detailHtml),
]) {
  const url = new URL(href, baseUrl);
  if (url.origin === baseUrl) requiredLocalPaths.add(`${url.pathname}${url.search}`);
}
for (const localPath of requiredLocalPaths) {
  const response = await fetch(new URL(localPath, baseUrl));
  assert.equal(response.status, 200, `${localPath} should resolve locally`);
}

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
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
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

async function pressKey(key, code, windowsVirtualKeyCode) {
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
    text: key === "Enter" ? "\r" : key === " " ? " " : undefined,
  });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode });
}

function externalRequestsSince(index) {
  return requests.slice(index).filter((requestUrl) => {
    const url = new URL(requestUrl);
    return url.hostname !== "127.0.0.1" && url.protocol !== "data:";
  });
}

async function pageLayout() {
  return evaluate(`(() => {
    const candidates = [...document.querySelectorAll('h1, h2, a.primary-button, a.primary-action, a.signal-secondary-link, button, summary')]
      .filter((node) => node.getClientRects().length > 0);
    const clipped = candidates
      .filter((node) => {
        const box = node.getBoundingClientRect();
        return box.left < -0.5 || box.right > innerWidth + 0.5;
      })
      .map((node) => node.textContent.trim().replace(/\\s+/g, ' '));
    const header = document.querySelector('.site-header')?.getBoundingClientRect();
    return {
      path: location.pathname,
      innerWidth,
      innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      clipped,
      headerFits: !header || (header.left >= -0.5 && header.right <= innerWidth + 0.5)
    };
  })()`);
}

async function navigationSnapshot() {
  return evaluate(`(() => {
    const nav = document.querySelector('.site-nav');
    const top = [...nav.children].map((child) =>
      child.matches('.openstore-nav-group')
        ? child.querySelector('.openstore-nav-link').textContent.trim()
        : child.textContent.trim()
    );
    const menu = nav.querySelector('[data-openstore-menu]');
    const items = [...menu.querySelectorAll('.openstore-menu-item')].map((item) => [
      item.querySelector('.openstore-menu-title').textContent.trim().replace(/\\s+/g, ' '),
      item.querySelector('.openstore-menu-supporting').textContent.trim()
    ]);
    return {
      top,
      items,
      hrefs: [...menu.querySelectorAll('.openstore-menu-item')].map((item) => item.pathname + item.hash),
      newCount: menu.querySelectorAll('.new-indicator').length,
      disclosureLabel: menu.querySelector('summary').getAttribute('aria-label'),
      controls: menu.querySelector('summary').getAttribute('aria-controls'),
      fallbackDetails: menu.tagName === 'DETAILS'
    };
  })()`);
}

const viewports = [
  { width: 1440, height: 1000, suffix: "1440x1000" },
  { width: 768, height: 1024, suffix: "768x1024" },
  { width: 390, height: 844, suffix: "390x844" },
];

let report;
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Log.enable");
  await mkdir(screenshotRoot, { recursive: true });

  const viewportResults = [];
  for (const viewport of viewports) {
    await setViewport(viewport.width, viewport.height);

    let requestStart = requests.length;
    await navigate(`${baseUrl}/`);
    await waitFor("document.querySelector('#new-releases')", "homepage release section");
    const homepage = await pageLayout();
    assert.equal(homepage.path, "/");
    assert.equal(homepage.innerWidth, viewport.width);
    assert.equal(homepage.innerHeight, viewport.height);
    assert.ok(homepage.scrollWidth <= viewport.width, `Homepage should fit at ${viewport.width}px`);
    assert.ok(homepage.bodyScrollWidth <= viewport.width, `Homepage body should fit at ${viewport.width}px`);
    assert.deepEqual(homepage.clipped, []);
    assert.equal(homepage.headerFits, true);
    assert.deepEqual(externalRequestsSince(requestStart), []);

    requestStart = requests.length;
    await navigate(`${baseUrl}/store/`);
    await waitFor("document.querySelectorAll('.catalogue-item').length === 2", "catalogue rendering");
    const store = await pageLayout();
    assert.equal(store.path, "/store/");
    assert.ok(store.scrollWidth <= viewport.width, `OpenStore should fit at ${viewport.width}px`);
    assert.ok(store.bodyScrollWidth <= viewport.width, `OpenStore body should fit at ${viewport.width}px`);
    assert.deepEqual(store.clipped, []);
    assert.equal(store.headerFits, true);
    assert.equal(await evaluate("document.title"), "OpenStore — OpenATG");
    assert.deepEqual(externalRequestsSince(requestStart), []);
    await evaluate("scrollTo({ top: 0, behavior: 'instant' })");
    await screenshot(`openstore-${viewport.suffix}.png`);
    await evaluate(
      "document.querySelector('.signal-availability').scrollIntoView({block: 'start', behavior: 'instant'})",
    );
    const signalDownloadLayout = await pageLayout();
    assert.ok(signalDownloadLayout.scrollWidth <= viewport.width);
    assert.ok(signalDownloadLayout.bodyScrollWidth <= viewport.width);
    assert.deepEqual(signalDownloadLayout.clipped, []);
    await screenshot(`atg-signal-downloads-${viewport.suffix}.png`);
    await evaluate("document.querySelector('[data-signal-technical]').open = true");
    const signalTechnicalLayout = await pageLayout();
    assert.ok(signalTechnicalLayout.scrollWidth <= viewport.width);
    assert.ok(signalTechnicalLayout.bodyScrollWidth <= viewport.width);
    assert.deepEqual(signalTechnicalLayout.clipped, []);
    await evaluate("document.querySelector('[data-signal-technical]').open = false");

    requestStart = requests.length;
    await navigate(`${baseUrl}/store/base-32m/`);
    const detail = await pageLayout();
    assert.equal(detail.path, "/store/base-32m/");
    assert.ok(detail.scrollWidth <= viewport.width, `Checkpoint detail should fit at ${viewport.width}px`);
    assert.ok(detail.bodyScrollWidth <= viewport.width, `Checkpoint body should fit at ${viewport.width}px`);
    assert.deepEqual(detail.clipped, []);
    assert.equal(detail.headerFits, true);
    assert.deepEqual(externalRequestsSince(requestStart), []);

    viewportResults.push({
      viewport,
      homepage,
      store,
      signalDownloads: signalDownloadLayout,
      signalTechnical: signalTechnicalLayout,
      detail,
      status: "pass",
    });
  }

  await setViewport(1440, 1000);
  await navigate(`${baseUrl}/`);
  const navigation = await navigationSnapshot();
  assert.deepEqual(navigation.top, expectedTopNavigation);
  assert.deepEqual(navigation.items, expectedOpenStoreItems);
  assert.deepEqual(navigation.hrefs, [
    "/store/base-32m/",
    "/#guard",
    "/#apply",
    "/signal/",
    "/store/",
  ]);
  assert.equal(navigation.newCount, 1);
  assert.equal(navigation.disclosureLabel, "OpenStore products menu");
  assert.ok(navigation.controls);
  assert.equal(navigation.fallbackDetails, true);

  const desktopSummarySelector = ".site-nav [data-openstore-menu] > summary";
  await evaluate(`document.querySelector('${desktopSummarySelector}').focus()`);
  await pressKey("Enter", "Enter", 13);
  await waitFor("document.querySelector('.site-nav [data-openstore-menu]').open", "desktop menu open");
  await waitFor(
    `document.querySelector('${desktopSummarySelector}').getAttribute('aria-expanded') === 'true'`,
    "desktop menu expanded state",
  );
  assert.equal(
    await evaluate(`document.querySelector('${desktopSummarySelector}').getAttribute('aria-expanded')`),
    "true",
  );
  const desktopFocus = await evaluate(`(() => {
    const active = document.activeElement;
    return { outline: getComputedStyle(active).outlineStyle, width: getComputedStyle(active).outlineWidth };
  })()`);
  assert.equal(desktopFocus.outline, "solid");
  assert.equal(desktopFocus.width, "3px");
  await pressKey("Escape", "Escape", 27);
  await waitFor("!document.querySelector('.site-nav [data-openstore-menu]').open", "desktop menu close");
  assert.equal(await evaluate(`document.activeElement.matches('${desktopSummarySelector}')`), true);

  await pressKey(" ", "Space", 32);
  await waitFor("document.querySelector('.site-nav [data-openstore-menu]').open", "desktop menu space open");
  await evaluate("document.querySelector('main').click()");
  await waitFor("!document.querySelector('.site-nav [data-openstore-menu]').open", "outside click close");

  await navigate(`${baseUrl}/`);
  await evaluate("document.querySelector('.site-nav a[href=\"/#new-releases\"]').focus()");
  await pressKey("Enter", "Enter", 13);
  await waitFor("location.hash === '#new-releases'", "new release fragment");
  await waitFor(
    "document.querySelector('#new-releases').getBoundingClientRect().top < 100",
    "new release section scroll",
  );
  const releaseResult = await evaluate(`(() => {
    const section = document.querySelector('#new-releases');
    const download = section.querySelector('a[href^="https://github.com/"]');
    return {
      id: section.id,
      heading: section.querySelector('h2').textContent.trim(),
      top: section.getBoundingClientRect().top,
      downloadHref: download.href,
      downloadAttribute: download.getAttribute('download'),
      detailHref: section.querySelector('a[href="/store/base-32m/"]').pathname,
      status: section.querySelector('.release-status').textContent.trim().replace(/\\s+/g, ' ')
    };
  })()`);
  assert.equal(releaseResult.id, "new-releases");
  assert.equal(releaseResult.heading, "A compact model, released for research.");
  assert.ok(releaseResult.top >= 40 && releaseResult.top < 100);
  assert.equal(releaseResult.downloadHref, downloadUrl);
  assert.equal(releaseResult.downloadAttribute, null);
  assert.equal(releaseResult.detailHref, "/store/base-32m/");
  assert.equal(releaseResult.status, "Research checkpoint. Not production-ready.");

  await navigate(`${baseUrl}/store/`);
  await waitFor("document.querySelectorAll('.catalogue-item').length === 2", "catalogue rendering");
  const catalogueResult = await evaluate(`(() => {
    const signal = document.querySelector('[data-application-id="atg-signal"]');
    const research = document.querySelector('[data-research-id="atg-base-32m"]');
    const action = research.querySelector('.application-actions a');
    const technical = signal.querySelector('[data-signal-technical]');
    return {
      itemNames: [...document.querySelectorAll('.application-title')].map((node) => node.textContent),
      itemTypes: [...document.querySelectorAll('.catalogue-item')].map((node) => node.dataset.itemType),
      signalChoices: [...signal.querySelectorAll('.signal-choice .primary-action')].map((link) => ({
        label: link.textContent.trim(), href: link.href, target: link.target,
        download: link.getAttribute('download')
      })),
      msiAction: (() => {
        const link = signal.querySelector('.signal-secondary-link');
        return { label: link.textContent.trim(), href: link.href, target: link.target,
          download: link.getAttribute('download') };
      })(),
      securityNotices: [...signal.querySelectorAll('.signal-security-notice')]
        .map((notice) => notice.textContent),
      privacyStatements: [...signal.querySelectorAll('.signal-privacy-list li')]
        .map((statement) => statement.textContent),
      technical: {
        tagName: technical.tagName,
        initiallyOpen: technical.open,
        summary: technical.querySelector('summary').textContent,
        fields: [...technical.querySelectorAll('.release-technical-content dl > div')].map((field) => ({
          label: field.querySelector('dt').textContent,
          value: field.querySelector('dd').textContent
        })),
        resources: [...technical.querySelectorAll('.release-resource-links a')].map((link) => ({
          label: link.textContent.trim(), href: link.href, target: link.target, rel: link.rel
        }))
      },
      signalCapabilities: signal.querySelectorAll('.capability-list li').length,
      research: {
        badge: research.querySelector('.research-badge').textContent,
        status: research.querySelector('.research-status').textContent,
        description: research.querySelector('.application-description').textContent,
        privacy: research.querySelector('.privacy-statement').textContent,
        actionLabel: action.textContent.trim(),
        actionPath: action.pathname,
        actionTarget: action.target,
        downloadActions: research.querySelectorAll('a[download]').length,
        operatingSystemSelectors: research.querySelectorAll('select, [role="listbox"]').length,
        actionCount: research.querySelectorAll('.application-actions a, .application-actions button').length
      },
      activeOpenStore: document.querySelector('.openstore-nav-link').getAttribute('aria-current'),
      imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
      emptyButtons: [...document.querySelectorAll('button')]
        .filter((button) => !button.textContent.trim() && !button.getAttribute('aria-label')).length
    };
  })()`);
  assert.deepEqual(catalogueResult.itemNames, ["ATG Signal", "ATG Base 32M"]);
  assert.deepEqual(catalogueResult.itemTypes, ["application", "research"]);
  assert.deepEqual(
    catalogueResult.signalChoices.map((action) => action.label),
    ["Use in browser", "Download for Windows", "Download for Mac"],
  );
  assert.deepEqual(
    catalogueResult.signalChoices.map((action) => action.href),
    [signalBrowserUrl, windowsExeUrl, macDmgUrl],
  );
  assert.ok(catalogueResult.signalChoices.every((action) => !action.target && !action.download));
  assert.deepEqual(catalogueResult.msiAction, {
    label: "MSI for IT administrators",
    href: windowsMsiUrl,
    target: "",
    download: null,
  });
  assert.deepEqual(catalogueResult.securityNotices, [
    windowsUnsignedWarning,
    macNotarisationWarning,
  ]);
  assert.deepEqual(catalogueResult.privacyStatements, signalEntry.privacyStatements);
  assert.deepEqual(
    catalogueResult.technical.resources,
    [
      { label: "View checksum file", href: windowsChecksumUrl, target: "_blank", rel: "noopener noreferrer" },
      { label: "View GitHub Release", href: windowsReleaseUrl, target: "_blank", rel: "noopener noreferrer" },
      { label: "View checksum file", href: macChecksumUrl, target: "_blank", rel: "noopener noreferrer" },
      { label: "View GitHub Release", href: macReleaseUrl, target: "_blank", rel: "noopener noreferrer" },
    ],
  );
  assert.equal(catalogueResult.technical.tagName, "DETAILS");
  assert.equal(catalogueResult.technical.initiallyOpen, false);
  assert.equal(catalogueResult.technical.summary, "Technical details");
  for (const requiredField of [
    { label: "Version", value: "1.0.0" },
    { label: "Supported platform", value: "Windows 10 and Windows 11" },
    { label: "Architecture", value: "64-bit x86 systems" },
    { label: "Filename", value: "ATG-Signal-1.0.0-Windows-x64-Setup.exe" },
    { label: "Exact size", value: "218,863,321 bytes" },
    { label: "SHA-256", value: "bea0260319b6ce911407cebbbf4bf725dfcaa5376534cff92c232d445a0cd4ab" },
    { label: "Filename", value: "ATG-Signal-1.0.0-Windows-x64.msi" },
    { label: "Exact size", value: "217,436,160 bytes" },
    { label: "SHA-256", value: "25992e57001bc5ba6f181f7f1567498a01f71187face876c8fedc0712c47b254" },
    { label: "Supported platform", value: "macOS 11 or later" },
    { label: "Architecture", value: "Apple Silicon only" },
    { label: "Filename", value: "ATG-Signal-1.0.0-macOS-Apple-Silicon.dmg" },
    { label: "Exact size", value: "4,343,812 bytes" },
    { label: "SHA-256", value: "9942a1b1864f01ed5023e6f82fcac54d749e4f8780c3af871c3f402911b92c3d" },
  ]) {
    assert.ok(
      catalogueResult.technical.fields.some(
        (field) => field.label === requiredField.label && field.value === requiredField.value,
      ),
      `Technical details should include ${requiredField.label}: ${requiredField.value}`,
    );
  }
  assert.equal(catalogueResult.signalCapabilities, 4);
  assert.deepEqual(catalogueResult.research, {
    badge: "Research",
    status: "Research checkpoint",
    description:
      "An independently pretrained compact generative language-model research checkpoint exploring local and accessible AI for English, Sinhala and Tamil.",
    privacy: "Designed for local research and offline experimentation.",
    actionLabel: "View checkpoint",
    actionPath: "/store/base-32m/",
    actionTarget: "",
    downloadActions: 0,
    operatingSystemSelectors: 0,
    actionCount: 1,
  });
  assert.equal(catalogueResult.activeOpenStore, "page");
  assert.equal(catalogueResult.imagesWithoutAlt, 0);
  assert.equal(catalogueResult.emptyButtons, 0);

  const downloadFocus = await evaluate(`(() => {
    const controls = [...document.querySelectorAll(
      '[data-application-id="atg-signal"] .signal-choice-actions a'
    )];
    return controls.map((control) => {
      control.focus();
      const style = getComputedStyle(control);
      return {
        label: control.textContent.trim(),
        tagName: control.tagName,
        tabIndex: control.tabIndex,
        outline: style.outlineStyle,
        width: style.outlineWidth
      };
    });
  })()`);
  assert.deepEqual(
    downloadFocus.map(({ label, tagName, tabIndex }) => ({ label, tagName, tabIndex })),
    [
      { label: "Use in browser", tagName: "A", tabIndex: 0 },
      { label: "Download for Windows", tagName: "A", tabIndex: 0 },
      { label: "MSI for IT administrators", tagName: "A", tabIndex: 0 },
      { label: "Download for Mac", tagName: "A", tabIndex: 0 },
    ],
  );
  assert.ok(downloadFocus.every(({ outline, width }) => outline === "solid" && width === "3px"));

  const technicalSummarySelector = "[data-application-id=\"atg-signal\"] [data-signal-technical] > summary";
  await evaluate(`document.querySelector('${technicalSummarySelector}').focus()`);
  const technicalFocus = await evaluate(`({
    outline: getComputedStyle(document.activeElement).outlineStyle,
    width: getComputedStyle(document.activeElement).outlineWidth
  })`);
  assert.deepEqual(technicalFocus, { outline: "solid", width: "3px" });
  await pressKey("Enter", "Enter", 13);
  await waitFor(
    "document.querySelector('[data-signal-technical]').open",
    "Signal technical details keyboard open",
  );
  await pressKey(" ", "Space", 32);
  await waitFor(
    "!document.querySelector('[data-signal-technical]').open",
    "Signal technical details keyboard close",
  );

  const signalDetails = await evaluate(`(() => {
    const button = document.querySelector('[data-application-id="atg-signal"] .text-button');
    button.focus();
    return { label: button.textContent.trim(), tagName: button.tagName, type: button.type };
  })()`);
  await pressKey("Enter", "Enter", 13);
  await waitFor("document.querySelector('#application-dialog').open", "Signal details dialog");
  assert.deepEqual(signalDetails, {
    label: "View permissions and details",
    tagName: "BUTTON",
    type: "button",
  });
  const compatibility = await evaluate(`([...document.querySelectorAll('.compatibility-item')].map((item) => ({
    label: item.querySelector('.detail-label').textContent,
    details: [...item.querySelectorAll('li')].map((detail) => detail.textContent)
  })))`);
  assert.deepEqual(compatibility, signalEntry.compatibility);
  await pressKey("Escape", "Escape", 27);

  await navigate(`${baseUrl}/store/base-32m/`);
  const detailResult = await evaluate(`(() => {
    const download = document.querySelector('.checkpoint-download');
    const secondary = [...document.querySelectorAll('.download-secondary-actions a')].map((link) => ({
      label: link.textContent.trim(), href: link.href, target: link.target, rel: link.rel
    }));
    return {
      title: document.title,
      activeOpenStore: document.querySelector('.openstore-nav-link').getAttribute('aria-current'),
      notice: document.querySelector('.research-notice').textContent.trim().replace(/\\s+/g, ' '),
      filename: document.querySelector('.download-filename').textContent,
      checksum: document.querySelector('#checkpoint-sha').textContent,
      downloadHref: download.href,
      downloadTarget: download.target,
      downloadAttribute: download.getAttribute('download'),
      secondary,
      copyTag: document.querySelector('#copy-checksum').tagName,
      copyType: document.querySelector('#copy-checksum').type
    };
  })()`);
  assert.deepEqual(detailResult, {
    title: "ATG Base 32M — OpenStore",
    activeOpenStore: "page",
    notice: "Research checkpoint. Not production-ready.",
    filename: archiveFilename,
    checksum: archiveSha256,
    downloadHref: downloadUrl,
    downloadTarget: "",
    downloadAttribute: null,
    secondary: [
      { label: "View model card", href: modelCardUrl, target: "_blank", rel: "noopener noreferrer" },
      { label: "View Apache 2.0 licence", href: licenceUrl, target: "_blank", rel: "noopener noreferrer" },
    ],
    copyTag: "BUTTON",
    copyType: "button",
  });

  await evaluate("document.querySelector('#copy-checksum').focus()");
  const copyFocus = await evaluate(`({
    outline: getComputedStyle(document.activeElement).outlineStyle,
    width: getComputedStyle(document.activeElement).outlineWidth
  })`);
  assert.deepEqual(copyFocus, { outline: "solid", width: "3px" });
  await pressKey("Enter", "Enter", 13);
  await waitFor("document.querySelector('#copy-feedback').textContent.length > 0", "checksum feedback");
  const copyResult = await evaluate(`({
    feedback: document.querySelector('#copy-feedback').textContent,
    role: document.querySelector('#copy-feedback').getAttribute('role'),
    live: document.querySelector('#copy-feedback').getAttribute('aria-live')
  })`);
  assert.deepEqual(copyResult, { feedback: "Checksum copied.", role: "status", live: "polite" });

  await setViewport(390, 844);
  await navigate(`${baseUrl}/`);
  const mobileButton = ".mobile-menu > summary";
  await evaluate(`document.querySelector('${mobileButton}').focus()`);
  await pressKey("Enter", "Enter", 13);
  await waitFor("document.querySelector('.mobile-menu').open", "mobile navigation open");
  const mobileTop = await evaluate(`([...document.querySelector('.mobile-menu-panel').children].map((child) =>
    child.matches('.mobile-openstore-section')
      ? child.querySelector('.mobile-openstore-link').textContent.trim()
      : child.textContent.trim()
  ))`);
  assert.deepEqual(mobileTop, expectedTopNavigation);
  const mobileOpenStoreButton = ".mobile-openstore-menu > summary";
  await evaluate(`document.querySelector('${mobileOpenStoreButton}').focus()`);
  await pressKey(" ", "Space", 32);
  await waitFor("document.querySelector('.mobile-openstore-menu').open", "mobile OpenStore menu open");
  const mobileItems = await evaluate(`([...document.querySelectorAll('.mobile-openstore-products .openstore-menu-item')].map((item) => [
    item.querySelector('.openstore-menu-title').textContent.trim().replace(/\\s+/g, ' '),
    item.querySelector('.openstore-menu-supporting').textContent.trim()
  ]))`);
  assert.deepEqual(mobileItems, expectedOpenStoreItems);
  const mobileMenuLayout = await pageLayout();
  assert.ok(mobileMenuLayout.scrollWidth <= 390);
  assert.equal(mobileMenuLayout.headerFits, true);
  await pressKey("Escape", "Escape", 27);
  await waitFor("!document.querySelector('.mobile-openstore-menu').open", "mobile nested menu close");
  assert.equal(await evaluate(`document.activeElement.matches('${mobileOpenStoreButton}')`), true);
  await pressKey("Escape", "Escape", 27);
  await waitFor("!document.querySelector('.mobile-menu').open", "mobile navigation close");

  const allExternalRequests = requests.filter((requestUrl) => {
    const url = new URL(requestUrl);
    return url.hostname !== "127.0.0.1" && url.protocol !== "data:";
  });
  assert.deepEqual(allExternalRequests, []);
  assert.deepEqual(consoleErrors, []);

  report = {
    status: "pass",
    releases: {
      base32m: {
        downloadUrl,
        archiveFilename,
        archiveBytes,
        archiveSize: "360.90 MiB",
        archiveSha256,
      },
      signal: {
        browser: signalBrowserUrl,
        windowsExe: windowsExeUrl,
        windowsMsi: windowsMsiUrl,
        windowsChecksum: windowsChecksumUrl,
        macDmg: macDmgUrl,
        macChecksum: macChecksumUrl,
      },
    },
    localPaths: [...requiredLocalPaths].sort(),
    viewports: viewportResults,
    navigation: {
      desktop: navigation,
      mobileTop,
      mobileItems,
      keyboard: { enter: "pass", space: "pass", escapeFocusRestore: "pass", outsideClick: "pass" },
    },
    homepageRelease: releaseResult,
    catalogue: catalogueResult,
    signal: {
      catalogue: catalogueResult,
      technicalDisclosure: { downloadFocus, focus: technicalFocus, enter: "pass", space: "pass" },
      details: signalDetails,
      compatibility,
    },
    checkpoint: { detail: detailResult, checksumControl: copyResult },
    privacy: { externalRequestsOnPageLoad: allExternalRequests, consoleErrors },
  };
  await writeFile(path.join(artifactRoot, "validation.json"), `${JSON.stringify(report, null, 2)}\n`);
} finally {
  socket.close();
  if (chrome.exitCode === null) {
    const chromeExit = new Promise((resolve) => chrome.once("exit", resolve));
    chrome.kill("SIGTERM");
    await Promise.race([chromeExit, new Promise((resolve) => setTimeout(resolve, 2000))]);
  }
  server.close();
  await rm(profilePath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

console.log(JSON.stringify(report));
