import { chromium } from "@playwright/test";
import { mkdir, copyFile } from "node:fs/promises";
const output = "artifacts/final-experience";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
for (const [name, width, height] of [
  ["desktop", 1440, 1000],
  ["tablet", 1024, 1000],
  ["mobile", 390, 844],
  ["narrow", 350, 780],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: width < 700,
    hasTouch: width < 700,
  });
  const page = await context.newPage();
  for (const [section, path] of [
    ["gateway", "/"],
    ["store", "/de/store"],
    ["catalogue", "/de/shop"],
    ["tea", "/de/shop?category=tea"],
    ["club", "/de/club"],
  ]) {
    await page.goto("http://127.0.0.1:4190" + path);
    await page.waitForLoadState("networkidle");
    await page.locator("main img").evaluateAll(async (images) => {
      await Promise.all(
        images.map(async (img) => {
          img.loading = "eager";
          await img.decode();
        }),
      );
    });
    if (section === "store" && width > 700) {
      await page.locator("video").evaluate(async (video) => {
        if (video.readyState >= 2) {
          video.currentTime = 4;
          await new Promise((resolve) =>
            video.addEventListener("seeked", resolve, { once: true }),
          );
        }
      });
    }
    await page.screenshot({
      path: `${output}/${section}-${name}.png`,
      fullPage: true,
    });
  }
  await context.close();
}
await browser.close();
try {
  await copyFile(
    `${output}/member-desktop.png`,
    `${output}/signed-in-member.png`,
  );
} catch {
  /* The authenticated screenshot is produced by the browser test suite. */
}
console.log("Captured final desktop, tablet, mobile and narrow review images.");
