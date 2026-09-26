import { test, expect } from "@playwright/test";
import { TOTP, Secret } from "otpauth";
import { randomUUID } from "node:crypto";
import {
  accounts,
  temporaryMember,
  a11y,
  login,
  noErrors,
  screenshot,
} from "./browser-helpers";
import { t } from "../src/lib/messages";
import { locales } from "../src/lib/domain";
for (const locale of locales)
  test(`${locale} real registration, email confirmation, age test and logout/login persistence`, async ({
    page,
    request,
  }) => {
    const check = noErrors(page);
    const email = `journey-${locale}-${randomUUID()}@v25.local.test`,
      password = `Review!${randomUUID()}Aa1`;
    await page.goto(`/${locale}/register`);
    await page
      .getByLabel(t(locale, "name"), { exact: true })
      .fill(`Local ${locale} registration`);
    await page.getByLabel(t(locale, "email"), { exact: true }).fill(email);
    await page
      .getByLabel(t(locale, "password"), { exact: true })
      .fill(password);
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: t(locale, "register"), exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      t(locale, "confirmEmail"),
    );
    let id = "";
    await expect
      .poll(async () => {
        const response = await request.get(
          "http://127.0.0.1:58534/api/v1/messages",
        );
        const data = await response.json();
        const msg = data.messages?.find((m: { To: { Address: string }[] }) =>
          m.To.some((to) => to.Address === email),
        );
        id = msg?.ID || "";
        return !!id;
      })
      .toBe(true);
    const message = await (
      await request.get(`http://127.0.0.1:58534/api/v1/message/${id}`)
    ).json();
    const link = message.HTML.match(
      /href="([^"]*token_hash[^\"]+)"/,
    )?.[1]?.replaceAll("&amp;", "&");
    expect(link).toBeTruthy();
    await page.goto(link);
    await expect(page).toHaveURL(new RegExp(`/${locale}/account`));
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: t(locale, "save"), exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: `Local ${locale} registration` }),
    ).toBeVisible();
    await page.getByRole("button", { name: t(locale, "runVerify") }).click();
    await expect(page.getByTestId("verification-status")).toHaveText(
      t(locale, "verified"),
    );
    await a11y(page);
    await page.getByRole("button", { name: t(locale, "logout") }).click();
    await page.getByLabel(t(locale, "email"), { exact: true }).fill(email);
    await page
      .getByLabel(t(locale, "password"), { exact: true })
      .fill(password);
    await page
      .getByRole("button", { name: t(locale, "login"), exact: true })
      .click();
    await expect(page.getByTestId("verification-status")).toHaveText(
      t(locale, "verified"),
    );
    check();
  });
test("guest has no admin access or private data; forged writes are rejected", async ({
  page,
  request,
}) => {
  const check = noErrors(page);
  await page.goto("/de/admin");
  await expect(page.locator(".admin-content")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: t("de", "login"), exact: true }),
  ).toBeVisible();
  await a11y(page);
  expect(
    (
      await request.post("/api/action", { data: { action: "member_state" } })
    ).status(),
  ).toBe(403);
  const loginResponse = await request.post("/api/auth", {
    data: {
      action: "login",
      email: accounts.administrator.email,
      password: accounts.administrator.password,
    },
    headers: { Origin: "https://evil.example" },
  });
  expect(loginResponse.status()).toBe(403);
  check();
});
test("Silver tea checkout creates real local order and test QR document", async ({
  page,
}) => {
  const check = noErrors(page);
  await login(page, "silver");
  await page.goto("/en/tea");
  await expect(page.locator(".product-card .button").first()).toBeEnabled();
  await page.locator(".product-card .button").first().click();
  await page.goto("/en/bag");
  await page
    .getByLabel("Delivery address", { exact: true })
    .selectOption({ index: 1 });
  await page
    .getByRole("button", { name: "Review test order", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Create test order with QR document",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText("Test order created");
  await page.goto("/en/account");
  await expect(
    page.getByRole("link", { name: "Download TEST QR document" }).last(),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Download TEST QR document" })
    .last()
    .click();
  expect((await download).suggestedFilename()).toMatch(/^TEST-NOT-PAYABLE/);
  check();
});
test("admin reconciles pending payment and updates paid order fulfilment", async ({
  page,
}) => {
  const check = noErrors(page);
  await login(page, "administrator");
  await page.goto("/en/admin");
  await page
    .locator(".admin-sidebar")
    .getByRole("button", { name: "Reconciliation", exact: true })
    .click();
  const form = page
    .locator("form")
    .filter({
      has: page.getByRole("button", { name: "Reconcile test payment" }),
    })
    .first();
  await form.getByLabel("Reason").fill("Local bank review confirmed");
  await form.getByRole("button", { name: "Reconcile test payment" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await screenshot(page, "admin-reconciliation-desktop");
  await page
    .locator(".admin-sidebar")
    .getByRole("button", { name: "Orders", exact: true })
    .click();
  const order = page
    .locator("article.panel")
    .filter({ has: page.locator("p").filter({ hasText: /^Paid$/ }) })
    .first();
  await order.getByLabel("Status", { exact: true }).selectOption("preparing");
  await order.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  check();
});
test("staff validates personal pass and records one drink for a visit", async ({
  browser,
  page,
}) => {
  const check = noErrors(page);
  const member = await temporaryMember("gold");
  await page.goto("/en/login");
  await page.getByLabel("Email", { exact: true }).fill(member.email);
  await page.getByLabel("Password", { exact: true }).fill(member.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/account/);
  const token = await page.evaluate(async () => {
    const { csrf } = await (await fetch("/api/auth")).json();
    const data = await (
      await fetch("/api/pass", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify({ action: "pass", key: crypto.randomUUID() }),
      })
    ).json();
    return data.token as string;
  });
  const context = await browser.newContext();
  const staff = await context.newPage();
  await login(staff, "staff");
  await staff.goto("/en/admin");
  await staff.getByLabel("Scan QR code or paste token").fill(token);
  await staff.getByRole("button", { name: "Check pass", exact: true }).click();
  await expect(
    staff.getByRole("heading", { name: "Local gold journey · GOLD" }),
  ).toBeVisible();
  await staff.getByRole("checkbox").check();
  await staff.getByRole("button", { name: "Confirm drink redemption" }).click();
  await expect(
    staff.getByRole("button", { name: "Confirm drink redemption" }),
  ).toBeDisabled();
  await a11y(staff);
  await screenshot(staff, "staff-redemption-desktop");
  await context.close();
  check();
});
test("Gold discounts and free delivery shown for multiple tea products", async ({
  page,
}) => {
  const check = noErrors(page);
  await login(page, "gold");
  await page.goto("/en/tea");
  await expect(page.locator(".product-card .button").first()).toBeEnabled();
  for (const index of [0, 1])
    await page.locator(".product-card .button").nth(index).click();
  await page.goto("/en/bag");
  await expect(page.locator(".bag-item")).toHaveCount(2);
  await expect(page.locator(".delivery-progress")).toContainText("unlocked");
  await expect(page.locator(".totals").getByText("CHF 0.00")).toBeVisible();
  await screenshot(page, "gold-bag-desktop");
  check();
});

test("owner TOTP enrollment, protected role and MFA login challenge", async ({
  page,
}) => {
  const check = noErrors(page),
    member = await temporaryMember("owner");
  await page.goto("/en/login");
  await page.getByLabel("Email", { exact: true }).fill(member.email);
  await page.getByLabel("Password", { exact: true }).fill(member.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/account/);
  const enrolled = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/auth") &&
      r.request().postDataJSON()?.action === "mfa_enroll",
  );
  await page.getByRole("button", { name: "Set up authenticator" }).click();
  const data = await (await enrolled).json();
  const totp = new TOTP({
    secret: Secret.fromBase32(data.totp.secret),
    digits: 6,
    period: 30,
    algorithm: "SHA1",
  });
  await page.getByLabel("Six-digit code").fill(totp.generate());
  await page.getByRole("button", { name: "Verify code" }).click();
  await expect(
    page.getByRole("link", { name: "Administration", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(member.email);
  await page.getByLabel("Password", { exact: true }).fill(member.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Two-factor authentication" }),
  ).toBeVisible();
  await page.getByLabel("Six-digit code").fill(totp.generate());
  await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page).toHaveURL(/\/en\/account/);
  await page.goto("/en/admin");
  await expect(page.locator(".metrics")).toBeVisible();
  check();
});

test("admin creates multilingual draft, uploads private image and reloads an edit", async ({
  page,
}) => {
  const check = noErrors(page);
  // Exercise save/reopen while the product list is still refreshing.
  await page.route("**/rest/v1/v25_products?*", async (route) => {
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ response });
  });
  await login(page, "administrator");
  await page.goto("/en/admin");
  await page
    .locator(".admin-sidebar")
    .getByRole("button", { name: "Products", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create product", exact: true })
    .click();
  const slug = `journey-product-${randomUUID().slice(0, 8)}`;
  await page.getByLabel("Product slug", { exact: true }).fill(slug);
  await page.getByLabel("Category", { exact: true }).fill("tea");
  for (const locale of locales) {
    await page
      .locator(".tabs")
      .getByRole("button", { name: locale.toUpperCase(), exact: true })
      .click();
    await page
      .locator(`textarea[lang="${locale}"]`)
      .first()
      .fill(`LOCAL TEST ${locale}`);
  }
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByText("Product saved.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Edit ${slug}`, exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles(
      "public/varathans25/images/varathans25-green-tea-powder-640.webp",
    );
  await expect(page.locator(".image-row")).toHaveCount(1);
  for (const locale of locales)
    await page
      .getByLabel(`${locale.toUpperCase()} image 1 alt text`, { exact: true })
      .fill(`LOCAL TEST ${locale}`);
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByText("Product saved.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Edit ${slug}`, exact: true }).click();
  await expect(page.locator(".image-row img")).toBeVisible();
  await page
    .locator(".tabs")
    .getByRole("button", { name: "FR", exact: true })
    .click();
  await page.locator("textarea[lang=fr]").first().fill("LOCAL TEST FR révisé");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByText("Product saved.", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .locator(".admin-sidebar")
    .getByRole("button", { name: "Products", exact: true })
    .click();
  await page.getByRole("button", { name: `Edit ${slug}`, exact: true }).click();
  await page
    .locator(".tabs")
    .getByRole("button", { name: "FR", exact: true })
    .click();
  await expect(page.locator("textarea[lang=fr]").first()).toHaveValue(
    "LOCAL TEST FR révisé",
  );
  await a11y(page);
  check();
});

test("password recovery uses a one-time email link and preserves private account access", async ({
  page,
  request,
}) => {
  const check = noErrors(page);
  const member = await temporaryMember("gold");
  await page.goto("/de/reset");
  await page.getByLabel(t("de", "email"), { exact: true }).fill(member.email);
  await page
    .getByRole("button", { name: t("de", "sendReset"), exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(t("de", "resetSent"));
  let id = "";
  await expect
    .poll(async () => {
      const data = await (
        await request.get("http://127.0.0.1:58534/api/v1/messages")
      ).json();
      id =
        data.messages?.find((m: { To: { Address: string }[] }) =>
          m.To.some((to) => to.Address === member.email),
        )?.ID || "";
      return !!id;
    })
    .toBe(true);
  const message = await (
    await request.get(`http://127.0.0.1:58534/api/v1/message/${id}`)
  ).json();
  const link = message.HTML.match(
    /href="([^"]*token_hash[^\"]+)"/,
  )?.[1]?.replaceAll("&amp;", "&");
  expect(link).toBeTruthy();
  await page.goto(link);
  await expect(page).toHaveURL(/\/de\/account\?recovery=1/);
  const password = `Recovery!${randomUUID()}Aa1`;
  const field = page.getByLabel(t("de", "password"), { exact: true });
  await field.fill(password);
  await field
    .locator("xpath=ancestor::form")
    .getByRole("button", { name: t("de", "save"), exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(t("de", "saved"));
  await page
    .getByRole("button", { name: t("de", "logout"), exact: true })
    .click();
  await page.getByLabel(t("de", "email"), { exact: true }).fill(member.email);
  await page.getByLabel(t("de", "password"), { exact: true }).fill(password);
  await page
    .getByRole("button", { name: t("de", "login"), exact: true })
    .click();
  await expect(page).toHaveURL(/\/de\/account/);
  await expect(page.getByTestId("verification-status")).toHaveText(
    t("de", "verified"),
  );
  await a11y(page);
  check();
});
