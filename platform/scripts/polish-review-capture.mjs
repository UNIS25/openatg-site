import { chromium, expect } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
const output = "artifacts/final-polish";
const base = "http://127.0.0.1:4190";
const accounts = JSON.parse(
  await readFile(".local/review-accounts.json", "utf8"),
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
async function login(page, role) {
  await page.goto(`${base}/en/login`);
  await page.getByLabel("Email", { exact: true }).fill(accounts[role].email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(accounts[role].password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
}
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
    ["tea", "/de/shop?category=tea"],
    ["catalogue", "/de/shop"],
    ["club", "/de/club"],
    ["member-sign-in", "/de/club/member"],
  ]) {
    await page.goto(base + path);
    await page.waitForLoadState("networkidle");
    if (section === "tea" || section === "catalogue")
      await expect(page.locator(".product-card .button").first()).toBeEnabled();
    await page.locator("main img").evaluateAll(async (images) => {
      await Promise.all(
        images.map(async (img) => {
          img.loading = "eager";
          await img.decode();
        }),
      );
    });
    await page.screenshot({
      path: `${output}/${section}-${name}.png`,
      fullPage: true,
    });
    if (section === "tea" && width === 1440) {
      const grid = await page.locator(".product-grid").boundingBox();
      const card = await page.locator(".product-card").first().boundingBox();
      await page.screenshot({
        path: `${output}/tea-controls-desktop.png`,
        clip: { x: grid.x, y: card.y, width: grid.width, height: card.height },
      });
    }
    if (section === "store")
      for (const [selector, label] of [
        [".spice-film-chapter", "spice"],
        [".curry-editorial", "curry"],
        [".restaurant-closing", "restaurant"],
      ])
        await page
          .locator(selector)
          .screenshot({ path: `${output}/${label}-${name}.png` });
    if (section === "club")
      await page
        .locator(".membership-comparison")
        .screenshot({ path: `${output}/comparison-${name}.png` });
  }
  await login(page, "gold");
  await page.goto(base + "/de/club/member");
  await expect(page.locator(".digital-pass")).toContainText("GOLD");
  await page.screenshot({
    path: `${output}/member-${name}.png`,
    fullPage: true,
  });
  await context.close();
  const adminContext = await browser.newContext({
    viewport: { width, height },
    isMobile: width < 700,
    hasTouch: width < 700,
  });
  const admin = await adminContext.newPage();
  await login(admin, "administrator");
  await admin.goto(base + "/en/admin");
  await admin
    .locator(".admin-sidebar")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await expect(admin.locator(".polish-settings")).toBeVisible();
  await admin
    .locator(".polish-settings")
    .evaluate((element) =>
      window.scrollTo(
        0,
        window.scrollY + element.getBoundingClientRect().top - 24,
      ),
    );
  await admin.screenshot({
    path: `${output}/admin-store-settings-${name}.png`,
  });
  await admin
    .getByLabel("EN · Gold · Positioning", { exact: true })
    .evaluate((element) =>
      window.scrollTo(
        0,
        window.scrollY + element.getBoundingClientRect().top - 80,
      ),
    );
  await admin.screenshot({ path: `${output}/admin-benefits-${name}.png` });
  await adminContext.close();
}
await browser.close();
console.log(
  "Captured final polish review at four widths; no account credentials are recorded.",
);
