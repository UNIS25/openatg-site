import { test, expect } from "@playwright/test";
import { a11y, login, noErrors } from "./browser-helpers";
import { t } from "../src/lib/messages";

test("protected benefit editor saves independent translations and closing settings with audit and revision checks", async ({
  page,
}) => {
  const check = noErrors(page);
  await login(page, "administrator");
  const original = await (await page.request.get("/api/admin/polish")).json();
  try {
    await page.goto("/en/admin");
    await page
      .locator(".admin-sidebar")
      .getByRole("button", { name: t("en", "settings"), exact: true })
      .click();
    const editor = page.locator(".polish-settings");
    await expect(editor).toBeVisible();
    await editor
      .getByLabel("EN · Gold · Complimentary drink", { exact: true })
      .fill(
        "One complimentary drink per verified restaurant or lounge visit · review",
      );
    await editor
      .getByLabel("DE · Restaurant · Titel", { exact: true })
      .fill("Ein Ort, an den man zurückkehrt.");
    await a11y(page);
    await editor
      .getByRole("button", { name: t("en", "save"), exact: true })
      .click();
    await expect(page.locator(".notice")).toHaveText(t("en", "saved"));
    const saved = await (await page.request.get("/api/admin/polish")).json();
    expect(saved.copy.en.goldDrink).toContain("· review");
    expect(saved.copy.fr.goldDrink).toBe(original.copy.fr.goldDrink);
    await page.goto("/en/club/membership");
    await expect(page.locator(".comparison-panel.gold")).toContainText(
      "· review",
    );
    const { csrf } = await (await page.request.get("/api/auth")).json();
    const rejected = await page.request.post("/api/admin/polish", {
      headers: { Origin: "http://127.0.0.1:4190", "x-csrf-token": csrf },
      data: original,
    });
    expect(rejected.ok()).toBe(false);
    const noCsrf = await page.request.post("/api/admin/polish", {
      headers: { Origin: "http://127.0.0.1:4190" },
      data: saved,
    });
    expect(noCsrf.ok()).toBe(false);
  } finally {
    const current = await (await page.request.get("/api/admin/polish")).json();
    const { csrf } = await (await page.request.get("/api/auth")).json();
    const restored = await page.request.post("/api/admin/polish", {
      headers: { Origin: "http://127.0.0.1:4190", "x-csrf-token": csrf },
      data: { ...original, revision: current.revision },
    });
    expect(restored.ok()).toBe(true);
  }
  await page.goto("/en/admin");
  await page
    .locator(".admin-sidebar")
    .getByRole("button", { name: t("en", "settings"), exact: true })
    .click();
  await expect(page.locator(".polish-settings")).toBeVisible();
  await page.locator(".polish-settings").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "artifacts/final-polish/admin-benefits-desktop.png",
  });
  check();
});

test("current membership is identified without treating sign-in as verification", async ({
  page,
}) => {
  await login(page, "gold");
  await page.goto("/en/club/membership");
  await expect(page.locator(".comparison-panel.gold")).toHaveAttribute(
    "data-current",
    "true",
  );
  await expect(page.locator(".comparison-panel.silver")).toHaveAttribute(
    "data-current",
    "false",
  );
  await page.goto("/en/club/member");
  await expect(page.locator(".digital-pass")).toContainText("Gold");
  await a11y(page);
  await page.screenshot({
    path: "artifacts/final-polish/signed-in-member.png",
    fullPage: true,
  });
});

test("profile languages, saved addresses and test Gold activation remain connected", async ({
  page,
  browser,
}) => {
  const { temporaryMember } = await import("./browser-helpers");
  const member = await temporaryMember("silver");
  await page.goto("/en/login");
  await page.getByLabel(t("en", "email"), { exact: true }).fill(member.email);
  await page
    .getByLabel(t("en", "password"), { exact: true })
    .fill(member.password);
  await page
    .getByRole("button", { name: t("en", "login"), exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/account$/);
  for (const locale of ["de", "fr", "en"] as const) {
    await page.goto(`/${locale}/account`);
    const profile = page.locator("section.panel").filter({
      has: page.getByRole("heading", {
        name: t(locale, "profile"),
        exact: true,
      }),
    });
    await profile
      .getByLabel(t(locale, "name"), { exact: true })
      .fill(`Local profile ${locale}`);
    await profile
      .locator("form")
      .filter({ has: page.locator("input[name=name]") })
      .getByRole("button", { name: t(locale, "save"), exact: true })
      .click();
    await expect(page.locator(".notice")).toHaveText(t(locale, "saved"));
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      `Local profile ${locale}`,
    );
    const state = await (await page.request.get("/api/state")).json();
    expect(state.rows.members[0].locale).toBe(locale);
  }
  const address = page.locator("section.panel").filter({
    has: page.getByRole("heading", {
      name: t("en", "addresses"),
      exact: true,
    }),
  });
  for (const [name, value] of [
    ["street", "Teststrasse"],
    ["house_number", "42"],
    ["postal_code", "8000"],
    ["city", "Zürich"],
  ])
    await address.locator(`input[name=${name}]`).fill(value);
  await address
    .getByRole("button", { name: t("en", "addAddress"), exact: true })
    .click();
  await expect(address).toContainText("Teststrasse 42");
  await page.reload();
  await expect(address).toContainText("Teststrasse 42");
  // Review-state security is exercised through the authorized workflow in verified-access tests.
  await expect(page.getByTestId("verification-status")).toHaveText(
    "Verified 18+",
  );
  await page.goto("/en/membership");
  await page
    .getByRole("button", { name: t("en", "chooseMonthly"), exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/account$/);
  const state = await (await page.request.get("/api/state")).json();
  expect(state.identity.gold).toBe(false);
  const payment = state.rows.payments[0];
  expect(payment.is_test).toBe(true);
  const context = await browser.newContext();
  const admin = await context.newPage();
  await login(admin, "administrator");
  const { csrf } = await (await admin.request.get("/api/auth")).json();
  const settled = await admin.request.post("/api/action", {
    headers: { Origin: "http://127.0.0.1:4190", "x-csrf-token": csrf },
    data: {
      action: "reconcile",
      document: {
        payment_id: payment.id,
        state: "matched",
        amount_rappen: payment.amount_rappen,
        event_id: crypto.randomUUID(),
        reason: "Local test membership review only",
      },
      key: crypto.randomUUID(),
    },
  });
  expect(settled.ok()).toBe(true);
  await context.close();
  await page.goto("/en/club/member");
  await expect(page.locator(".digital-pass")).toContainText("Gold");
  await page
    .getByRole("button", { name: t("en", "createPass"), exact: true })
    .click();
  await expect(page.locator(".member-qr img")).toBeVisible();
  await a11y(page);
});
