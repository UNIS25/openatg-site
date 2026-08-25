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
const researchUrl = "https://atg-base-32m-research.adrianvasu1998.chatgpt.site/";
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

const [catalogue, homepageHtml, storeHtml, storeSource] = await Promise.all([
  readFile(path.join(repositoryRoot, "store", "catalog.json"), "utf8").then(JSON.parse),
  readFile(path.join(repositoryRoot, "index.html"), "utf8"),
  readFile(path.join(repositoryRoot, "store", "index.html"), "utf8"),
  readFile(path.join(repositoryRoot, "store", "store.js"), "utf8"),
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
assert.equal(researchEntry.action.url, researchUrl);
assert.equal(researchEntry.action.label, "View research");
assert.equal(researchEntry.status, "Research checkpoint");
assert.equal(researchEntry.privacy, "Designed for local research and offline experimentation.");
assert.equal(signalEntry.links.windows, undefined);
assert.match(JSON.stringify(signalEntry.compatibility), /Windows 10 and Windows 11/);
assert.match(JSON.stringify(signalEntry.compatibility), /64-bit x86_64/);
assert.match(
  JSON.stringify(signalEntry.compatibility),
  /Installer not public until the GitHub Windows build succeeds/,
);
assert.match(storeHtml, /<title>OpenStore — OpenATG<\/title>/);
assert.match(storeHtml, /<link rel="canonical" href="https:\/\/openatg\.com\/store\/"/);
assert.doesNotMatch(storeSource, /\.innerHTML\s*=/);

const homepageStoreLinks = [...homepageHtml.matchAll(/<a\b[^>]*href="\/store\/"[^>]*>([\s\S]*?)<\/a>/g)].map(
  (match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
);
assert.deepEqual(homepageStoreLinks, ["OpenStore", "OpenStore", "View in OpenStore →"]);

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

for (const localPath of [
  "/",
  "/store/",
  signalEntry.links.open,
  signalEntry.links.install,
  signalEntry.links.download,
  signalEntry.links.thirdPartyNotices,
]) {
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
  `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${baseUrl}/store/`)}`,
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

async function pressKey(key, code, windowsVirtualKeyCode) {
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code, windowsVirtualKeyCode });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode });
}

let report;
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Log.enable");
  await mkdir(screenshotRoot, { recursive: true });

  const viewportResults = [];
  for (const viewport of [
    {
      width: 1440,
      height: 1000,
      file: "openatg-1440x1000.png",
      researchFile: "openstore-research-1440x1000.png",
    },
    {
      width: 768,
      height: 1024,
      file: "openatg-768x1024.png",
      researchFile: "openstore-research-768x1024.png",
    },
    {
      width: 390,
      height: 844,
      file: "openatg-390x844.png",
      researchFile: "openstore-research-390x844.png",
    },
  ]) {
    await setViewport(viewport.width, viewport.height);
    await navigate(`${baseUrl}/store/`);
    await waitFor("document.querySelectorAll('.catalogue-item').length === 2", "catalogue rendering");
    const dimensions = await evaluate(`({
      path: location.pathname,
      innerWidth,
      innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      title: document.title,
      headline: document.querySelector('h1')?.innerText.replace(/\\s+/g, ' ').trim(),
      itemNames: [...document.querySelectorAll('.application-title')].map((node) => node.textContent),
      itemTypes: [...document.querySelectorAll('.catalogue-item')].map((node) => node.dataset.itemType),
      clippedHeadline: (() => {
        const box = document.querySelector('h1').getBoundingClientRect();
        return box.left < 0 || box.right > innerWidth;
      })()
    })`);
    assert.equal(dimensions.path, "/store/");
    assert.equal(dimensions.innerWidth, viewport.width);
    assert.equal(dimensions.innerHeight, viewport.height);
    assert.ok(dimensions.scrollWidth <= viewport.width, `No horizontal overflow at ${viewport.width}px`);
    assert.ok(dimensions.bodyScrollWidth <= viewport.width, `Body should fit at ${viewport.width}px`);
    assert.equal(dimensions.title, "OpenStore — OpenATG");
    assert.equal(dimensions.headline, "Local tools. Shared responsibly.");
    assert.deepEqual(dimensions.itemNames, ["ATG Signal", "ATG Base 32M"]);
    assert.deepEqual(dimensions.itemTypes, ["application", "research"]);
    assert.equal(dimensions.clippedHeadline, false);
    await screenshot(viewport.file);
    await evaluate(
      `document.querySelector('.research-item').scrollIntoView({ block: 'center', behavior: 'instant' })`,
    );
    await screenshot(viewport.researchFile);
    viewportResults.push({ ...viewport, ...dimensions, status: "pass" });
  }

  await setViewport(1440, 1000);
  await navigate(`${baseUrl}/store/`);
  await waitFor("document.querySelectorAll('.catalogue-item').length === 2", "catalogue rendering");

  const catalogueResult = await evaluate(`(() => {
    const signal = document.querySelector('[data-application-id="atg-signal"]');
    const research = document.querySelector('[data-research-id="atg-base-32m"]');
    const researchAction = research.querySelector('.application-actions a');
    return {
      signalActions: [...signal.querySelectorAll('.application-actions a')].map((link) => ({
        label: link.textContent.trim(),
        path: link.pathname + link.hash,
        target: link.target,
        rel: link.rel,
        download: link.getAttribute('download')
      })),
      signalStatus: signal.querySelector('.status')?.textContent,
      signalCapabilities: signal.querySelectorAll('.capability-list li').length,
      research: {
        badge: research.querySelector('.research-badge')?.textContent,
        status: research.querySelector('.research-status')?.textContent,
        description: research.querySelector('.application-description')?.textContent,
        privacy: research.querySelector('.privacy-statement')?.textContent,
        actionLabel: researchAction?.textContent.trim(),
        actionHref: researchAction?.href,
        actionTarget: researchAction?.target,
        actionRel: researchAction?.rel,
        downloadActions: research.querySelectorAll('a[download]').length,
        operatingSystemSelectors: research.querySelectorAll('select, [role="listbox"]').length,
        actionCount: research.querySelectorAll('.application-actions a, .application-actions button').length
      },
      accessibility: {
        imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
        emptyButtons: [...document.querySelectorAll('button')]
          .filter((button) => !button.textContent.trim() && !button.getAttribute('aria-label')).length,
        itemRoles: [...document.querySelectorAll('.catalogue-item')].map((item) => item.getAttribute('role')),
        catalogueLabel: document.querySelector('#application-list')?.getAttribute('aria-label'),
        mainTabIndex: document.querySelector('main')?.getAttribute('tabindex')
      }
    };
  })()`);

  assert.deepEqual(
    catalogueResult.signalActions.map((action) => action.label),
    ["Open ATG Signal", "Install locally", "Download offline package"],
  );
  assert.deepEqual(
    catalogueResult.signalActions.map((action) => action.path),
    ["/signal/", "/signal/#install", "/downloads/atg-signal-1.0.0.zip"],
  );
  assert.ok(catalogueResult.signalActions.every((action) => !action.target && !action.rel));
  assert.equal(catalogueResult.signalActions[2].download, "atg-signal-1.0.0.zip");
  assert.equal(catalogueResult.signalStatus, "Available");
  assert.equal(catalogueResult.signalCapabilities, 4);
  assert.deepEqual(catalogueResult.research, {
    badge: "Research",
    status: "Research checkpoint",
    description:
      "An independently pretrained compact generative language model exploring local, private and accessible AI for English, Sinhala and Tamil.",
    privacy: "Designed for local research and offline experimentation.",
    actionLabel: "View research",
    actionHref: researchUrl,
    actionTarget: "_blank",
    actionRel: "noopener noreferrer",
    downloadActions: 0,
    operatingSystemSelectors: 0,
    actionCount: 1,
  });
  assert.deepEqual(catalogueResult.accessibility.itemRoles, ["listitem", "listitem"]);
  assert.equal(catalogueResult.accessibility.imagesWithoutAlt, 0);
  assert.equal(catalogueResult.accessibility.emptyButtons, 0);
  assert.equal(catalogueResult.accessibility.catalogueLabel, "OpenStore catalogue items");
  assert.equal(catalogueResult.accessibility.mainTabIndex, "-1");

  await pressKey("Tab", "Tab", 9);
  const focusResult = await evaluate(`(() => {
    const active = document.activeElement;
    const style = getComputedStyle(active);
    return {
      className: active.className,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      transform: style.transform
    };
  })()`);
  assert.equal(focusResult.className, "skip-link");
  assert.equal(focusResult.outlineStyle, "solid");
  assert.equal(focusResult.outlineWidth, "3px");

  const detailsControl = await evaluate(`(() => {
    const button = document.querySelector('[data-application-id="atg-signal"] .text-button');
    button.focus();
    return {
      tagName: document.activeElement.tagName,
      type: document.activeElement.type,
      label: document.activeElement.textContent.trim(),
      outlineStyle: getComputedStyle(document.activeElement).outlineStyle
    };
  })()`);
  assert.deepEqual(detailsControl, {
    tagName: "BUTTON",
    type: "button",
    label: "View permissions and details",
    outlineStyle: "solid",
  });
  await evaluate(`document.activeElement.click()`);
  await waitFor("document.querySelector('#application-dialog').open", "application details dialog");
  const dialogResult = await evaluate(`({
    title: document.querySelector('#dialog-title')?.textContent,
    modal: document.querySelector('#application-dialog')?.matches(':modal'),
    compatibility: [...document.querySelectorAll('.compatibility-item')].map((item) => ({
      label: item.querySelector('.detail-label')?.textContent,
      details: [...item.querySelectorAll('li')].map((detail) => detail.textContent)
    })),
    permissionCount: [...document.querySelectorAll('.detail-section')]
      .find((section) => section.querySelector('h3')?.textContent === 'Permissions')
      ?.querySelectorAll('li').length
  })`);
  assert.equal(dialogResult.title, "ATG Signal");
  assert.equal(dialogResult.modal, true);
  assert.equal(dialogResult.permissionCount, 3);
  assert.deepEqual(dialogResult.compatibility, signalEntry.compatibility);
  await pressKey("Escape", "Escape", 27);
  await waitFor("!document.querySelector('#application-dialog').open", "dialog close");

  const originalTargetIds = new Set(
    (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).map((item) => item.id),
  );
  await evaluate(`document.querySelector('[data-research-id="atg-base-32m"] .primary-action').click()`);
  let openedResearchTarget = null;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    openedResearchTarget = targets.find(
      (item) => !originalTargetIds.has(item.id) && item.url === researchUrl,
    );
    if (openedResearchTarget) break;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(openedResearchTarget, "Research action should open the exact external URL in a new tab");

  const externalRequests = requests.filter((requestUrl) => {
    const url = new URL(requestUrl);
    return url.hostname !== "127.0.0.1" && url.protocol !== "data:";
  });
  assert.deepEqual(externalRequests, []);
  assert.deepEqual(consoleErrors, []);

  report = {
    status: "pass",
    viewports: viewportResults,
    catalogue: catalogueResult,
    accessibility: {
      focus: focusResult,
      detailsControl,
      dialog: dialogResult,
    },
    homepage: {
      storeLinks: homepageStoreLinks,
      route: "/store/",
    },
    privacy: {
      externalRequestsOnStorePage: externalRequests,
      consoleErrors,
    },
    externalResearchAction: {
      url: researchUrl,
      target: "_blank",
      rel: "noopener noreferrer",
      openedInNewTarget: true,
    },
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
