import { test, expect, type Page } from "@playwright/test";
import { accounts, noErrors, a11y } from "./browser-helpers";

async function tabTo(page: Page, selector: string) {
  for (let i = 0; i < 100; i++) {
    await page.keyboard.press("Tab");
    if (
      await page
        .locator(selector)
        .evaluate((el) => el === document.activeElement)
    )
      return;
  }
  throw new Error(`Keyboard could not reach ${selector}`);
}
test("keyboard-only gateway, catalogue, add to basket and club navigation", async ({
  page,
}) => {
  const check = noErrors(page);
  await page.goto("/en/");
  await page.waitForLoadState("networkidle");
  await tabTo(page, '.gateway-choices a[href="/en/store"]');
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/store$/);
  await tabTo(page, '.desktop-nav a[href="/en/shop"]');
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/shop$/);
  await expect(page.locator(".product-card .button").first()).toBeEnabled();
  await tabTo(page, ".product-card:first-child .purchase-row .button");
  await page.keyboard.press("Enter");
  await expect(page.locator(".bag-link span")).toHaveText("1");
  await tabTo(page, ".bag-link");
  await page.keyboard.press("Enter");
  await expect(page.locator(".bag-item")).toHaveCount(1);
  await expect(page.locator(".totals")).toBeVisible();
  await tabTo(page, '.header a[aria-label="Varathans25"]');
  await page.keyboard.press("Enter");
  await expect(page.locator(".gateway")).toBeVisible();
  await tabTo(page, '.gateway-choices a[href="/en/club"]');
  await page.keyboard.press("Enter");
  await expect(page.locator(".club-entrance")).toBeVisible();
  check();
});
test("autoplay rejection never hides the poster; trusted play restores film", async ({
  page,
}) => {
  const check = noErrors(page);
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    let trusted = false;
    document.addEventListener(
      "click",
      (event) => {
        if (event.isTrusted) trusted = true;
      },
      { capture: true },
    );
    HTMLMediaElement.prototype.play = function () {
      return trusted
        ? original.call(this)
        : Promise.reject(
            new DOMException("Autoplay rejected", "NotAllowedError"),
          );
    };
  });
  await page.goto("/en/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("video")).toHaveAttribute(
    "src",
    /evening-1600.mp4/,
  );
  await expect(page.locator("video")).not.toHaveClass(/film-started/);
  await expect(page.locator(".film-poster")).toBeVisible();
  await page.getByRole("button", { name: "Play film", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause film", exact: true }),
  ).toBeVisible();
  check();
});
test("Save-Data and reduced motion never request film files", async ({
  browser,
}) => {
  for (const mode of ["data", "motion"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: mode === "motion" ? "reduce" : "no-preference",
    });
    if (mode === "data")
      await context.addInitScript(() =>
        Object.defineProperty(navigator, "connection", {
          value: { saveData: true, effectiveType: "4g" },
        }),
      );
    const page = await context.newPage();
    const films: string[] = [];
    page.on("request", (r) => {
      if (/\.mp4/.test(r.url())) films.push(r.url());
    });
    for (const path of ["/", "/de/store", "/de/club"]) {
      await page.goto(`http://127.0.0.1:4190${path}`);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("video[src*=mp4]")).toHaveCount(0);
    }
    expect(films).toEqual([]);
    await context.close();
  }
});
test("club sign-in returns to the protected member route after language switch", async ({
  page,
}) => {
  const check = noErrors(page);
  await page.goto("/de/club");
  await page
    .locator(".language-links")
    .getByRole("link", { name: "EN", exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/club$/);
  await page.getByRole("link", { name: "Existing Member Sign In" }).click();
  await expect(page).toHaveURL(/\/en\/login\?next=club\/member$/);
  await page.getByLabel("Email", { exact: true }).fill(accounts.gold.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(accounts.gold.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/club\/member$/);
  await expect(page.locator(".digital-pass")).toBeVisible();
  await a11y(page);
  check();
});
