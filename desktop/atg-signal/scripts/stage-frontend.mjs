import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(projectRoot, "../..");
const signalRoot = path.join(repositoryRoot, "signal");
const outputRoot = path.join(projectRoot, "dist");

function replaceExactly(source, search, replacement, label) {
  const occurrences = source.split(search).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${label}: expected one source match, found ${occurrences}.`);
  }
  return source.replace(search, replacement);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await cp(signalRoot, outputRoot, { recursive: true });
await cp(path.join(repositoryRoot, "atg-mark-transparent.png"), path.join(outputRoot, "atg-mark-transparent.png"));

let html = await readFile(path.join(outputRoot, "index.html"), "utf8");
html = replaceExactly(
  html,
  "connect-src 'none'",
  "connect-src ipc: http://ipc.localhost",
  "desktop IPC Content Security Policy",
);
html = replaceExactly(
  html,
  "worker-src 'self'; manifest-src 'self'",
  "worker-src 'none'",
  "desktop service-worker policy",
);
html = replaceExactly(
  html,
  '    <link rel="canonical" href="https://openatg.com/signal/" />\n',
  "",
  "desktop canonical removal",
);
html = html.replaceAll('../atg-mark-transparent.png', 'atg-mark-transparent.png');
html = replaceExactly(
  html,
  '    <link rel="manifest" href="manifest.webmanifest" />\n',
  "",
  "desktop manifest removal",
);
html = replaceExactly(
  html,
  '    <script src="pwa.js" defer></script>',
  '    <link rel="stylesheet" href="desktop.css" />\n    <script src="desktop-runtime.js" defer></script>',
  "desktop runtime insertion",
);
await writeFile(path.join(outputRoot, "index.html"), html);

let app = await readFile(path.join(outputRoot, "app.js"), "utf8");
app = replaceExactly(
  app,
  "function downloadBlob(blob, filename) {\n",
  "async function downloadBlob(blob, filename) {\n" +
    "  if (globalThis.ATGDesktop?.saveBlob) {\n" +
    "    await globalThis.ATGDesktop.saveBlob(blob, filename);\n" +
    "    return;\n" +
    "  }\n",
  "native report save bridge",
);
await writeFile(path.join(outputRoot, "app.js"), app);

await cp(path.join(projectRoot, "frontend", "desktop-runtime.js"), path.join(outputRoot, "desktop-runtime.js"));
await cp(path.join(projectRoot, "frontend", "desktop.css"), path.join(outputRoot, "desktop.css"));

await rm(path.join(outputRoot, "pwa.js"), { force: true });
await rm(path.join(outputRoot, "service-worker.js"), { force: true });
await rm(path.join(outputRoot, "manifest.webmanifest"), { force: true });

console.log(`Staged the local ATG Signal frontend in ${outputRoot}`);
