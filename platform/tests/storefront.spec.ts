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
