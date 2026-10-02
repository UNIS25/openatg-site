import { test, expect } from "@playwright/test";
import { a11y, aligned, login, noErrors } from "./browser-helpers";
import { et } from "../src/lib/experience";
import { locales } from "../src/lib/domain";

for (const locale of locales)
  test(`${locale} gateway, store and club journeys`, async ({ page }, info) => {
    const check = noErrors(page);
    await page.goto(locale === "de" ? "/" : `/${locale}/`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("main.gateway")).toBeVisible();
    await expect(
      page.locator(".product-card, footer, .invitation"),
    ).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBe(page.viewportSize()!.height);
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip")).toBeFocused();
    await a11y(page);
    await aligned(page);
    if (locale === "de")
      await page.screenshot({
        path: `artifacts/final-polish/gateway-${info.project.name}.png`,
        fullPage: true,
      });
    await page
      .getByRole("link", { name: et(locale, "explore"), exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/store$`));
    await expect(page.locator("[data-film=tea]")).toBeVisible();
    await expect(page.locator("[data-film=highlands]")).toBeVisible();
    await expect(page.locator(".store-tea-grid .product-card")).toHaveCount(5);
    await expect(page.locator("img[src*=restaurant]")).toHaveCount(1);
    await expect(page.locator("[data-film=kitchen]")).toBeVisible();
    await page.locator("main img").evaluateAll(async (images) => {
      await Promise.all(
        images.map(async (image) => {
          const img = image as HTMLImageElement;
          img.loading = "eager";
          await img.decode();
        }),
      );
    });
    await a11y(page);
    await aligned(page);
    if (locale === "de")
      await page.screenshot({
        path: `artifacts/final-polish/store-${info.project.name}.png`,
        fullPage: true,
      });
    await page.locator(".header a[aria-label=Varathans25]").click();
    await expect(page.locator(".gateway")).toBeVisible();
    await page
      .getByRole("link", { name: et(locale, "enter"), exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/club$`));
    await expect(page.getByRole("link", { name: et(locale, "viewProducts") })).toBeVisible();
    await expect(page.getByRole("link", { name: et(locale, "joinClub") })).toBeVisible();
    await expect(page.locator(".digital-pass,.restricted-study")).toHaveCount(
      0,
    );
    await a11y(page);
    await aligned(page);
    if (locale === "de")
      await page.screenshot({ path: `artifacts/final-polish/club-${info.project.name}.png`, fullPage: true });
    check();
  });

test("ordinary products can create a guest test order with a protected non-payable QR bill", async ({ page }) => {
  await page.goto("/en/shop?category=tea");
  await expect(page.locator(".product-card .purchase-row .button").first()).toBeEnabled();
  await page.locator(".product-card .purchase-row .button").first().click();
  await expect(page.locator(".bag-link span")).toHaveText("1");
  await page.locator(".bag-link").click();
  await expect(page.locator(".checkout-choices")).toContainText("Continue as Guest");
  await page.getByRole("button", { name: "Continue as Guest No membership required. Tea and curry only." }).click();
  const form = page.locator(".guest-checkout");
  await form.locator('input[name="email"]').fill(`guest-browser-${crypto.randomUUID()}@v25.local.test`);
  await form.locator('input[name="name"]').fill("LOCAL GUEST TEST");
  await form.locator('input[name="street"]').fill("Teststrasse");
  await form.locator('input[name="house_number"]').fill("1");
  await form.locator('input[name="postal_code"]').fill("8000");
  await form.locator('input[name="city"]').fill("Zürich");
  await form.locator('input[name="consent"]').check();
  await page.getByRole("button", { name: "Create test order" }).click();
  await expect(page.locator(".payment-result")).toContainText("TEST · NOT PAYABLE");
  const url = await page.locator(".payment-result a").getAttribute("href");
  expect(url).toContain("/api/guest/payment?");
  const bill = await page.request.get(url!);
  expect(bill.status()).toBe(200);
  expect(bill.headers()["content-type"]).toBe("application/pdf");
  expect((await bill.body()).subarray(0, 4).toString()).toBe("%PDF");
  const invalid = new URL(url!, "http://127.0.0.1:4190");
  invalid.searchParams.set("token", "0".repeat(64));
  expect((await page.request.get(invalid.toString())).status()).toBe(403);
  await a11y(page);
  await aligned(page);
});

test("language retains catalogue filter, product and member routes; root stays German", async ({
  page,
}) => {
  await page.goto("/en/shop?category=tea");
  await expect(page.locator(".product-card .button").first()).toBeEnabled();
  await page
    .locator(".language-links")
    .getByRole("link", { name: "FR", exact: true })
    .click();
  await expect(page).toHaveURL(/\/fr\/shop\?category=tea$/);
  await expect(page.locator(".product-card")).toHaveCount(5);
  await page.locator(".product-photo").first().click();
  await page
    .locator(".language-links")
    .getByRole("link", { name: "DE", exact: true })
    .click();
  await expect(page).toHaveURL(/\/de\/product\/premium-black-tea-powder$/);
  await expect(page.locator(".product-facts")).toBeVisible();
  await a11y(page);
  await aligned(page);
  await page.goto("/fr/club/member");
  await page
    .locator(".language-links")
    .getByRole("link", { name: "EN", exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/login\?next=club%2Fmember$/);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
});

test("motion preferences, mobile poster, Save-Data and rejected autoplay", async ({
  page,
}) => {
  const check = noErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("video")).not.toHaveAttribute("src", /mp4/);
  await a11y(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true, effectiveType: "4g" },
    }),
  );
  await page.reload();
  await expect(page.locator("video")).not.toHaveAttribute("src", /mp4/);
  check();
});

test("premium gateway film replaces the candle footage", async ({
  page,
}, info) => {
  const check = noErrors(page);
  await page.goto("/en/");
  await expect(page.locator(".gateway .film-poster")).toBeVisible();
  await expect(page.locator(".gateway .film-poster")).toHaveAttribute(
    "src",
    /v25-premium-hero-1600.webp/,
  );
  const video = page.locator(".gateway video");
  if (info.project.name === "mobile" || info.project.name === "narrow") {
    await expect(video).not.toHaveAttribute("src", /mp4/);
  } else {
    await expect(video).toHaveAttribute("src", /v25-premium-hero-1600.mp4/);
  }
  await expect(video).not.toHaveAttribute("src", /evening-1600.mp4/);
  check();
});

test("autoplay failure keeps the premium poster and trusted controls recover", async ({
  page,
}, info) => {
  if (info.project.name === "mobile" || info.project.name === "narrow") return;
  const check = noErrors(page);
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    let reject = true;
    HTMLMediaElement.prototype.play = function () {
      if (reject) {
        reject = false;
        return Promise.reject(
          new DOMException("Autoplay rejected", "NotAllowedError"),
        );
      }
      return original.call(this);
    };
  });
  await page.goto("/en/");
  await expect(page.locator(".gateway .film-poster")).toBeVisible();
  await expect(page.locator(".gateway video")).toHaveAttribute(
    "src",
    /v25-premium-hero-1600.mp4/,
  );
  const pause = page.getByRole("button", { name: "Pause film", exact: true });
  const play = page.getByRole("button", { name: "Play film", exact: true });
  if (await play.isVisible()) await play.click();
  await expect(pause).toBeVisible();
  await pause.click();
  await expect(play).toBeVisible();
  await play.focus();
  await page.keyboard.press("Enter");
  await expect(pause).toBeVisible();
  check();
});

test("verified member dashboard retains protected account and pass access", async ({
  page,
}, info) => {
  const check = noErrors(page);
  await login(page, "gold", "de");
  await page.goto("/de/club/member");
  await expect(page.locator(".digital-pass")).toContainText("Gold");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Local gold reviewer",
  );
  await a11y(page);
  await aligned(page);
  await page.screenshot({
    path: `artifacts/final-polish/member-${info.project.name}.png`,
    fullPage: true,
  });
  check();
});
