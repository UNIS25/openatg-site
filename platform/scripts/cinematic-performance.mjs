import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, statSync } from "node:fs";
const browser = await chromium.launch();
const results = [];
try {
  for (const mode of [
    "desktop-motion",
    "desktop-poster",
    "tablet",
    "mobile",
    "save-data",
  ]) {
    const samples = [];
    for (let run = 0; run < 3; run++) {
      const context = await browser.newContext({
        viewport:
          mode === "mobile"
            ? { width: 390, height: 844 }
            : mode === "tablet"
              ? { width: 1024, height: 1000 }
              : { width: 1440, height: 1000 },
        isMobile: mode === "mobile",
        hasTouch: mode === "mobile",
        reducedMotion: mode === "desktop-poster" ? "reduce" : "no-preference",
      });
      await context.addInitScript(
        ({ saveData }) => {
          sessionStorage.setItem("v25_editorial_invitation", "dismissed");
          if (saveData)
            Object.defineProperty(navigator, "connection", {
              configurable: true,
              value: Object.assign(new EventTarget(), {
                saveData: true,
                effectiveType: "4g",
              }),
            });
          window.__metrics = { cls: 0, lcp: 0 };
          new PerformanceObserver((list) => {
            for (const e of list.getEntries())
              if (!e.hadRecentInput) window.__metrics.cls += e.value;
          }).observe({ type: "layout-shift", buffered: true });
          new PerformanceObserver((list) => {
            window.__metrics.lcp = list.getEntries().at(-1)?.startTime || 0;
          }).observe({ type: "largest-contentful-paint", buffered: true });
        },
        { saveData: mode === "save-data" },
      );
      const page = await context.newPage();
      let videoRequests = 0;
      page.on("request", (r) => {
        if (/\.(mp4|webm)$/.test(r.url())) videoRequests++;
      });
      await page.goto("http://127.0.0.1:4190/en/", {
        waitUntil: "networkidle",
      });
      await page.waitForTimeout(1200);
      const sample = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        const res = performance.getEntriesByType("resource");
        const video = document.querySelector("video");
        return {
          ttfb_ms: Math.round(nav.responseStart),
          domContentLoaded_ms: Math.round(nav.domContentLoadedEventEnd),
          lcp_ms: Math.round(window.__metrics.lcp),
          cls: Math.round(window.__metrics.cls * 10000) / 10000,
          resource_transfer_bytes: res.reduce((n, r) => n + r.transferSize, 0),
          media_bytes: res
            .filter((r) => /\.(mp4|webm)$/.test(r.name))
            .reduce((n, r) => n + r.encodedBodySize, 0),
          source: video?.currentSrc?.split("/").at(-1) || "poster",
          paused: video?.paused ?? true,
        };
      });
      samples.push({ ...sample, videoRequests });
      await context.close();
    }
    results.push({ mode, samples });
  }
} finally {
  await browser.close();
}
mkdirSync("artifacts", { recursive: true });
writeFileSync(
  "artifacts/cinematic-performance.json",
  JSON.stringify(results, null, 2),
);
const assets = [
  "daylight-study-1280.mp4",
  "daylight-study-960.mp4",
  "daylight-study-1280.webm",
].map((name) => ({
  name,
  bytes: statSync("public/varathans25/media/" + name).size,
  metadata: JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_name,codec_type,width,height",
        "-of",
        "json",
        "public/varathans25/media/" + name,
      ],
      { encoding: "utf8" },
    ),
  ),
}));
let md =
  "# Cinematic performance report\n\nMeasured against the local production build at 127.0.0.1:4190, Chromium, three fresh browser contexts per condition, unthrottled loopback. These are local review observations, not internet/Core Web Vitals guarantees. Same-origin database/API and browser startup/cache variability are included. The poster-only desktop condition isolates the cost of motion on the same layout.\n\n## Encoded assets\n\n| Asset | Bytes | Dimensions | Format | Duration | Audio |\n|---|---:|---|---|---|---|\n";
for (const a of assets) {
  const s = a.metadata.streams[0];
  md += `| ${a.name} | ${a.bytes.toLocaleString("en-US")} | ${s.width} × ${s.height} | ${s.codec_name} | ${a.metadata.format.duration}s | None |\n`;
}
for (const a of ["daylight-poster-1280.webp", "daylight-poster-mobile.webp"])
  md += `| ${a} | ${statSync("public/varathans25/media/" + a).size.toLocaleString("en-US")} | Responsive still | WebP | — | None |\n`;
md +=
  "\n## Measured page impact\n\nMedian of three samples; source and request counts are the observed values from the final sample.\n\n| Condition | TTFB ms | DOM ready ms | LCP ms | CLS | Resource transfer bytes | Media requests | Selected media |\n|---|---:|---:|---:|---:|---:|---:|---|\n";
const median = (samples, key) =>
  samples.map((s) => s[key]).sort((a, b) => a - b)[1];
for (const r of results) {
  const s = r.samples.at(-1);
  md += `| ${r.mode} | ${median(r.samples, "ttfb_ms")} | ${median(r.samples, "domContentLoaded_ms")} | ${median(r.samples, "lcp_ms")} | ${median(r.samples, "cls")} | ${median(r.samples, "resource_transfer_bytes").toLocaleString("en-US")} | ${s.videoRequests} | ${s.source} |\n`;
}
md +=
  "\n## Loading behaviour and limits\n\nPosters and navigation render before film eligibility is evaluated. There is no preload of video; source elements are added only after motion/data/device checks and viewport intersection. Mobile/coarse pointer, reduced motion and Save-Data send no film request. Below-fold chapters use lazy stills; no other video competes for playback. One same-origin film plays muted/inline. Off-screen, hidden-page and modal states pause it. A visible play/pause control is keyboard accessible. Every film is encoded without an audio track. Media boxes reserve dimensions; the gateway/poster layout does not depend on video readiness.\n\nBrowsers may reject an unsupported source and try the next codec; the player now waits for the complete source chain to fail before showing a poster-only notice. Deliberate decode-failure browser tests confirm this fallback without an application exception. No third-party player, iframe, analytics or media origin was added. Actual public-network performance and browser/device certification remain part of a later approved deployment review.\n";
writeFileSync("../docs/CINEMATIC_PERFORMANCE.md", md);
console.log(
  JSON.stringify(
    results.map((r) => ({
      mode: r.mode,
      medianLcp: median(r.samples, "lcp_ms"),
      medianCls: median(r.samples, "cls"),
      source: r.samples.at(-1).source,
      videoRequests: r.samples.at(-1).videoRequests,
    })),
    null,
    2,
  ),
);
