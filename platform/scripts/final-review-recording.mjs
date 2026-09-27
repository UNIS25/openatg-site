import { chromium } from "@playwright/test";
import { mkdir, rename } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const output = "artifacts/final-experience";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: output, size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
await page.goto("http://127.0.0.1:4190/");
await page.waitForLoadState("networkidle");
await page.waitForTimeout(3500);
await page.getByRole("link", { name: "Store entdecken", exact: true }).click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(4000);
await page.mouse.wheel(0, 820);
await page.waitForTimeout(2200);
await page.mouse.wheel(0, 650);
await page.waitForTimeout(1800);
await page.locator(".header a[aria-label=Varathans25]").click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(2200);
await page
  .getByRole("link", { name: "Premium Cigar Club betreten · 18+", exact: true })
  .click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(3500);
const video = page.video();
await context.close();
await rename(await video.path(), `${output}/gateway-store-club.webm`);
await browser.close();
const conversion = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-loglevel",
    "error",
    "-i",
    `${output}/gateway-store-club.webm`,
    "-c:v",
    "libx264",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-an",
    "-movflags",
    "+faststart",
    `${output}/gateway-store-club.mp4`,
  ],
  { stdio: "inherit" },
);
if (conversion.status !== 0) throw new Error("Video conversion failed");
console.log(`${output}/gateway-store-club.mp4`);
