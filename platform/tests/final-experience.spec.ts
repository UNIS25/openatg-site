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
        path: `artifacts/final-experience/gateway-${info.project.name}.png`,
        fullPage: true,
      });
    await page
      .getByRole("link", { name: et(locale, "explore"), exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/store$`));
    await expect(page.locator("[data-film=tea]")).toBeVisible();
    await expect(
      page.locator("[data-film=highlands], img[src*=restaurant]"),
    ).toHaveCount(0);
    await expect(page.locator(".editorial-tins a")).toHaveCount(5);
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
        path: `artifacts/final-experience/store-${info.project.name}.png`,
        fullPage: true,
      });
    await page.locator(".header a[aria-label=Varathans25]").click();
    await expect(page.locator(".gateway")).toBeVisible();
    await page
      .getByRole("link", { name: et(locale, "enter"), exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/club$`));
    await expect(page.locator(".club-entrance h1")).toHaveText(
      "Premium Cigar Club",
    );
    await expect(
      page.locator("img[src*=cigars], img[src*=restaurant]"),
    ).toHaveCount(0);
    await a11y(page);
    await aligned(page);
    if (locale === "de")
      await page.screenshot({
        path: `artifacts/final-experience/club-${info.project.name}.png`,
        fullPage: true,
      });
    await page
      .getByRole("link", { name: et(locale, "member"), exact: true })
      .click();
    await expect(page.locator(".member-locked")).toBeVisible();
    await expect(page.locator(".digital-pass")).toHaveCount(0);
    check();
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
  await expect(page).toHaveURL(/\/en\/club\/member$/);
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

test("autoplay failure keeps the poster and user can explicitly play and pause", async ({
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
  await expect(page.locator(".film-poster")).toBeVisible();
  await expect(page.locator("video")).toHaveAttribute(
    "src",
    /highlands-1600.mp4/,
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
  await expect(page.locator(".digital-pass")).toContainText("GOLD");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Local gold reviewer",
  );
  await a11y(page);
  await aligned(page);
  await page.screenshot({
    path: `artifacts/final-experience/member-${info.project.name}.png`,
    fullPage: true,
  });
  check();
});
