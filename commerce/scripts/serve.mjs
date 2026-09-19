import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve(".."),
  dist = resolve("dist/adminpage"),
  harness = resolve(".local/harness");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://127.0.0.1").pathname,
    );
    let base = root,
      relative = path;
    if (path.startsWith("/adminpage/")) {
      base = dist;
      relative = path.slice("/adminpage/".length);
    } else if (path.startsWith("/commerce-test/")) {
      base = harness;
      relative =
        path === "/commerce-test/"
          ? "harness/index.html"
          : path.slice("/commerce-test/".length);
    }
    const file = resolve(
      base,
      "." + (relative.startsWith("/") ? relative : "/" + relative),
    );
    if (!file.startsWith(base + "/") && file !== base) throw Error();
    let target = file;
    if ((await stat(file)).isDirectory()) target = resolve(file, "index.html");
    res.setHeader(
      "Content-Type",
      types[extname(target)] ?? "application/octet-stream",
    );
    res.setHeader("Cache-Control", "no-store");
    res.end(await readFile(target));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(4175, "127.0.0.1", () =>
  console.log("Static verification server: http://127.0.0.1:4175/adminpage/"),
);
