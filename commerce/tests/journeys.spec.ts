import { test, expect } from "./browser-fixture";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { TOTP, Secret } from "otpauth";
const accounts = JSON.parse(readFileSync(".local/e2e-accounts.json", "utf8"));
test("admin direct load, login, product editor, orders, settings, refresh and accessibility", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/adminpage/");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex.*nofollow/,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  mkdirSync(".local/screenshots", { recursive: true });
  await page.screenshot({
    path: `.local/screenshots/${info.project.name}-login.png`,
    fullPage: true,
  });
  await page.getByLabel("Email", { exact: true }).fill(accounts.admin.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(accounts.admin.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("System status", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `.local/screenshots/${info.project.name}-dashboard.png`,
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page.getByRole("button", { name: "Create product" }).click();
  const slug = `browser-${info.project.name}-${Date.now()}`;
  await page.getByLabel("Product slug", { exact: true }).fill(slug);
  await page.getByLabel("DE name", { exact: true }).fill("Browser test draft");
  await page.getByRole("button", { name: "Preview before publishing" }).click();
  await expect(
    page.getByRole("article", { name: "Product preview" }),
  ).toContainText("Browser test draft");
  await page.screenshot({
    path: `.local/screenshots/${info.project.name}-product-editor.png`,
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByText("Product saved.", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Edit ${slug}`, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "Orders", exact: true }).click();
  await expect(page.getByLabel("Order status", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "View order 1", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View order 1", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Items and cigar composition",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: `.local/screenshots/${info.project.name}-orders.png`,
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByLabel("Free standard delivery threshold CHF"),
  ).toHaveValue("100.00");
  await expect(
    page.getByLabel("payment enabled", { exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: `.local/screenshots/${info.project.name}-delivery-settings.png`,
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Audit", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => /auth|token/i.test(k)),
    ),
  ).toEqual([]);
});
test("owner TOTP is required before the dashboard", async ({ page }) => {
  await page.goto("/adminpage/");
  await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(accounts.owner.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Owner verification" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toHaveCount(0);
  const totp = new TOTP({
    secret: Secret.fromBase32(accounts.owner.totpSecret),
    period: 30,
    digits: 6,
  });
  await page.getByLabel("Authenticator code").fill(totp.generate());
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
});
test("preserved storefront routes remain available and mobile navigation works", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/signal/",
    "/store/",
    "/store/base-32m/",
    "/varathans25/",
    "/varathans25/de/",
    "/varathans25/fr/",
    "/varathans25/en/",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    const locale = path.match(/^\/varathans25\/(de|fr|en)\/$/)?.[1];
    if (locale) {
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("main")).toBeVisible();
    }
  }
  for (const locale of ["de", "fr", "en"]) {
    await page.goto(`/varathans25/${locale}/product/gelber-curry-kokos/`);
    await page.locator(".gallery-thumbs button").first().click();
    await expect(page.locator(".product-facts dd").first()).toHaveText("80 g");
    await expect(page.locator("main .product-data")).toContainText("609 kcal");
    await expect(page.locator("main .product-page .purchase-row")).toBeHidden();
    await page.goto(`/varathans25/${locale}/product/cardamom-tea/`);
    await page.locator(".gallery-thumbs button").first().click();
    await expect(page.locator(".product-facts dd").first()).toHaveText("—");
    await page.goto(`/varathans25/${locale}/`);
  }
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  if ((page.viewportSize()?.width ?? 1440) < 900) {
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  }
});
