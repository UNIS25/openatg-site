import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
test("single cigars, complete 4/6 boxes, persistence and free-delivery progress in three languages", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/commerce-test/");
  const single = page
    .getByRole("region")
    .filter({
      has: page.getByRole("heading", { name: "Single cigars", exact: true }),
    });
  // The integration fixture has one published cigar; preserved real references remain private drafts.
  await expect(
    page.getByRole("heading", { name: "Synthetic cigar fixture", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".cigar-purchase")
      .getByRole("button", { name: "Add", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Confirm 18+", exact: true }).click();
  await page
    .locator(".cigar-purchase")
    .getByRole("button", { name: "Add", exact: true })
    .click();
  const cart = page.getByRole("region", { name: "Shopping bag", exact: true });
  await expect(cart.getByLabel("Quantity 1", { exact: true })).toHaveValue("1");
  await cart.getByLabel("Quantity 1", { exact: true }).fill("2");
  await expect(cart.getByLabel("Quantity 1", { exact: true })).toHaveValue("2");
  mkdirSync(".local/screenshots", { recursive: true });
  await page.screenshot({
    path: `.local/screenshots/${info.project.name}-single-cart.png`,
    fullPage: true,
  });
  const builder = page.getByRole("region", {
    name: "Build your cigar box",
    exact: true,
  });
  const add = builder.getByRole("button", {
    name: "Add Synthetic cigar fixture",
    exact: true,
  });
  const complete = builder.getByRole("button", {
    name: "Add complete box",
    exact: true,
  });
  await add.click();
  await expect(complete).toBeDisabled();
  await page.reload();
  await expect(
    page.getByText("1 / 4 cigars selected", { exact: true }),
  ).toBeVisible();
  await add.click();
  await add.click();
  await add.click();
  await expect(complete).toBeEnabled();
  await page.screenshot({
    path: `.local/screenshots/${info.project.name}-four-box.png`,
    fullPage: true,
  });
  await builder.getByRole("button", { name: "Remove 2", exact: true }).click();
  await expect(complete).toBeDisabled();
  await add.click();
  await complete.click();
  await expect(cart.getByLabel("Quantity 2", { exact: true })).toHaveValue("1");
  await builder.getByRole("button", { name: "Box of 6", exact: true }).click();
  for (let n = 0; n < 6; n++) await add.click();
  await expect(complete).toBeEnabled();
  await page.screenshot({
    path: `.local/screenshots/${info.project.name}-six-box.png`,
    fullPage: true,
  });
  await complete.click();
  await expect(cart.getByLabel("Quantity 3", { exact: true })).toHaveValue("1");
  await expect(
    cart.getByRole("button", { name: "Checkout unavailable" }),
  ).toBeDisabled();
  await page.reload();
  await expect(cart.getByLabel("Quantity 3", { exact: true })).toHaveValue("1");
  for (const locale of ["de", "fr", "en"]) {
    await page.getByLabel("Language", { exact: true }).selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator(".free-delivery").last()).toContainText(
      {
        de: "Kostenlose Standardlieferung erreicht.",
        fr: "La livraison standard est gratuite.",
        en: "Free standard delivery unlocked.",
      }[locale]!,
    );
    await page.screenshot({
      path: `.local/screenshots/${info.project.name}-delivery-${locale}.png`,
      fullPage: true,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  expect(errors).toEqual([]);
  void single;
});
