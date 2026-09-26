import { test, expect } from "@playwright/test";
import { locales } from "../src/lib/domain";
import { t } from "../src/lib/messages";
import { a11y, aligned, login, noErrors, screenshot } from "./browser-helpers";
for (const locale of locales)
  test(`${locale} storefront, five tins, product reload and guest bag`, async ({
    page,
  }, info) => {
    const check = noErrors(page);
    await page.goto(`/${locale}/tea`);
    await expect(page.locator(".product-card")).toHaveCount(5);
    await expect(page.locator(".product-card .button").first()).toBeEnabled();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    expect(
      (await page.locator(".product-card").allTextContents()).join(" "),
    ).not.toMatch(/coffee|Kaffee|café/i);
    const photos = page.locator(".product-photo img");
    for (const img of await photos.all())
      expect(
        await img.evaluate(
          (i: HTMLImageElement) =>
            i.complete &&
            i.naturalWidth > 0 &&
            getComputedStyle(i).objectFit === "contain",
        ),
      ).toBe(true);
    await aligned(page);
    await a11y(page);
    await screenshot(page, `tea-${locale}-${info.project.name}`);
    await page
      .locator(".product-card")
      .first()
      .getByRole("button", { name: t(locale, "plus") })
      .click();
    await page.locator(".product-card .button").first().click();
    await expect(page.locator(".bag-link span")).toHaveText("2");
    await page.reload();
    await expect(page.locator(".bag-link span")).toHaveText("2");
    await page.locator(".product-photo").first().click();
    await page.reload();
    await expect(page.locator(".detail")).toBeVisible();
    await page.goto(`/${locale}/bag`);
    await expect(page.locator(".bag-item")).toHaveCount(1);
    await expect(
      page.getByRole("link", { name: t(locale, "loginToOrder") }),
    ).toBeVisible();
    await a11y(page);
    await aligned(page);
    await screenshot(page, `bag-${locale}-${info.project.name}`);
    check();
  });
test("language entrance, keyboard access and remembered preference", async ({
  page,
}, info) => {
  const check = noErrors(page);
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Zum Inhalt" })).toBeFocused();
  await page.getByRole("link", { name: "Français", exact: true }).click();
  await expect(page).toHaveURL(/\/fr\/?$/);
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: t("fr", "continue") }),
  ).toBeVisible();
  await a11y(page);
  await screenshot(page, `entrance-${info.project.name}`);
  check();
});
test("club editorial DE FR EN, manual images, no commerce and reduced motion", async ({
  page,
}, info) => {
  const check = noErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const locale of locales) {
    await page.goto(`/${locale}/club`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "VARATHANS25 PREMIUM CIGAR CLUB",
    );
    await expect(page.locator(".box-gallery img")).toHaveAttribute(
      "alt",
      t(locale, "closedAlt"),
    );
    await page.getByRole("button", { name: t(locale, "next") }).click();
    await expect(page.locator(".box-gallery img")).toHaveAttribute(
      "alt",
      t(locale, "openAlt"),
    );
    expect(
      await page
        .locator(".box-gallery img")
        .evaluate((i) => getComputedStyle(i).animationName),
    ).toBe("none");
    expect(await page.locator("main").innerText()).not.toMatch(
      /CHF|Add to bag|Buy now|Swiss Made|Swiss Cigars/,
    );
    await page.reload();
    await a11y(page);
    await aligned(page);
    await screenshot(page, `club-${locale}-${info.project.name}`);
  }
  check();
});
test("mobile navigation and smaller mobile route access", async ({
  page,
}, info) => {
  const check = noErrors(page);
  if (info.project.name === "mobile")
    await page.setViewportSize({ width: 350, height: 780 });
  await page.goto("/en/");
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(page.locator("#mobile-navigation")).toBeVisible();
    await page
      .locator("#mobile-navigation")
      .getByRole("link", { name: "Pantry & General Store", exact: true })
      .click();
  } else
    await page
      .locator(".desktop-nav")
      .getByRole("link", { name: "Pantry & General Store" })
      .click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card h3")).toHaveText(
    "Gelber Curry Kokos",
  );
  await aligned(page);
  await a11y(page);
  check();
});
test("Silver and Gold account, membership and QR pass layouts", async ({
  page,
}, info) => {
  const check = noErrors(page);
  await login(page, "gold");
  await page.getByRole("button", { name: "Show QR pass", exact: true }).click();
  await expect(page.locator(".pass img")).toBeVisible();
  await a11y(page);
  await aligned(page);
  await screenshot(page, `gold-account-${info.project.name}`);
  await page.goto("/en/membership");
  await expect(
    page.getByRole("button", { name: "Choose Gold monthly" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choose Gold annual" }),
  ).toBeVisible();
  await a11y(page);
  await aligned(page);
  await screenshot(page, `membership-${info.project.name}`);
  check();
});
test("protected admin dashboard and product editor in all languages", async ({
  page,
}, info) => {
  const check = noErrors(page);
  await login(page, "administrator");
  for (const locale of locales) {
    await page.goto(`/${locale}/admin`);
    await expect(page.locator(".metrics")).toBeVisible();
    await aligned(page);
    await a11y(page);
    if (locale === "de")
      await screenshot(page, `admin-dashboard-${info.project.name}`);
    await page
      .locator(".admin-sidebar")
      .getByRole("button", { name: t(locale, "products"), exact: true })
      .click();
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    await page.locator("table tbody button").first().click();
    await expect(page.locator('textarea[lang="de"]').first()).toBeVisible();
    await a11y(page);
    await aligned(page);
    if (locale === "de")
      await screenshot(page, `admin-product-${info.project.name}`);
  }
  check();
});
