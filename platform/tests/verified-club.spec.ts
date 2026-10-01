import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { t } from "../src/lib/messages";
import { vt } from "../src/lib/verification-copy";
import { locales } from "../src/lib/domain";
import {
  a11y,
  aligned,
  login,
  noErrors,
  temporaryMember,
} from "./browser-helpers";

for (const locale of locales)
  test(`${locale}: email, pending review, administrator decision, restricted editorial and Silver`, async ({
    page,
    request,
    browser,
  }, info) => {
    const check = noErrors(page);
    const name = `Local ${locale} verified ${randomUUID().slice(0, 8)}`;
    const email = `verified-browser-${randomUUID()}@v25.local.test`,
      password = `Test!${randomUUID()}Aa1`;
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/register`);
    await page.getByLabel(t(locale, "name"), { exact: true }).fill(name);
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
        const data = await (
          await request.get("http://127.0.0.1:58534/api/v1/messages")
        ).json();
        id =
          data.messages?.find((m: { To: { Address: string }[] }) =>
            m.To.some((to) => to.Address === email),
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
    await expect(page).toHaveURL(new RegExp(`/${locale}/account$`));
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: t(locale, "save"), exact: true })
      .click();
    await expect(page.getByTestId("verification-status")).toHaveText(
      vt(locale, "registered_unverified"),
    );
    await page.goto(`/${locale}/verify-age`);
    // The registration consent checkbox has not verified identity or granted restricted access.
    await page.goto(`/${locale}/club/collection`);
    await expect(page).toHaveURL(new RegExp(`/${locale}/verify-age$`));
    expect((await page.request.get("/api/club/media/open")).ok()).toBe(false);
    await a11y(page);
    await aligned(page);
    await page.screenshot({
      path: `artifacts/screenshots/verification-${locale}-${info.project.name}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: vt(locale, "submit"), exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/${locale}/verification-pending$`),
    );
    await expect(page.getByTestId("verification-status")).toHaveText(
      vt(locale, "verification_pending"),
    );
    await page.reload();
    await expect(page.getByTestId("verification-status")).toHaveText(
      vt(locale, "verification_pending"),
    );
    await page.goto(`/${locale}/club`);
    await expect(page).toHaveURL(new RegExp(`/${locale}/club$`));
    const alternate = locale === "de" ? "fr" : "de";
    await page
      .locator(".language-links")
      .getByRole("link", { name: alternate.toUpperCase(), exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${alternate}/club$`));
    await page.goto(`/${locale}/verification-pending`);
    await a11y(page);
    await aligned(page);
    const context = await browser.newContext({
      viewport: page.viewportSize()!,
      reducedMotion: "reduce",
    });
    const admin = await context.newPage();
    await login(admin, "administrator", locale);
    await admin.goto(`/${locale}/admin/verification`);
    const review = admin
      .locator(".verification-admin article")
      .filter({ has: admin.getByRole("heading", { name, exact: true }) });
    await expect(review).toBeVisible();
    await review
      .getByLabel(vt(locale, "decision"), { exact: true })
      .selectOption("approve");
    await review
      .getByRole("button", { name: vt(locale, "review"), exact: true })
      .click();
    await expect(review).toContainText(vt(locale, "verified_18_plus"));
    await review
      .getByRole("button", { name: vt(locale, "history"), exact: true })
      .click();
    await expect(review.locator(".verification-history")).toBeVisible();
    await a11y(admin);
    await aligned(admin);
    if (locale === "de")
      await admin.screenshot({
        path: `artifacts/screenshots/verification-admin-${info.project.name}.png`,
        fullPage: true,
      });
    await context.close();
    await expect(page).toHaveURL(new RegExp(`/${locale}/club/collection(?:#reference-library)?$`));
    await expect(page.locator(".restricted-study img")).toHaveCount(1);
    await expect(
      page.locator(
        ".restricted-study .button,.restricted-study input,.restricted-study button",
      ),
    ).toHaveCount(0);
    await expect(page.locator("video[src*=mp4]")).toHaveCount(0);
    expect((await page.request.get("/api/club/media/open")).status()).toBe(200);
    expect(
      (
        await page.request.get(
          "/varathans25/images/cigars/varathans-cigars-box-open.webp",
        )
      ).status(),
    ).toBe(404);
    await page
      .locator(".restricted-study img")
      .evaluate((img: HTMLImageElement) => img.decode());
    await a11y(page);
    await aligned(page);
    await page.reload();
    await expect(page.locator(".restricted-study")).toBeVisible();
    await page.screenshot({
      path: `artifacts/screenshots/restricted-editorial-${locale}-${info.project.name}.png`,
      fullPage: true,
    });
    await page.goto(`/${locale}/club/membership`);
    await expect(page.locator(".comparison-panel")).toHaveCount(2);
    await page.locator(".comparison-panel.silver button").click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/account$`));
    const state = await (await page.request.get("/api/state")).json();
    expect(state.identity.account_state).toBe("verified_18_plus");
    expect(state.identity.membership_state).toBe("silver");
    await page.goto(`/${locale}/club/member`);
    await expect(page.locator(".digital-pass")).toContainText("Silver");
    await a11y(page);
    await aligned(page);
    if (locale === "de")
      await page.screenshot({
        path: `artifacts/screenshots/verified-dashboard-${info.project.name}.png`,
        fullPage: true,
      });
    await page.goto(`/${locale}/account`);
    await page
      .getByRole("button", { name: t(locale, "logout"), exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/login$`));
    await page.goto(`/${locale}/club/collection`);
    await expect(page).toHaveURL(new RegExp(`/${locale}/login`));
    expect((await page.request.get("/api/club/media/open")).status()).toBe(401);
    check();
  });

test("HTTP boundary rejects forged review, checkbox approval, identity uploads and unverified states", async ({
  page,
  request,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "HTTP boundary is viewport independent",
  );
  const member = await temporaryMember("silver");
  const service = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  await page.goto("/en/login");
  await page.getByLabel("Email", { exact: true }).fill(member.email);
  await page.getByLabel("Password", { exact: true }).fill(member.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  const { csrf } = await (await page.request.get("/api/auth")).json();
  const headers = { Origin: "http://127.0.0.1:4190", "x-csrf-token": csrf };
  expect(
    (
      await page.request.post("/api/verification", {
        headers,
        data: {
          action: "review",
          member: member.id,
          decision: "approve",
          reason: "age_confirmed",
          revision: 1,
        },
      })
    ).status(),
  ).toBe(403);
  expect((await page.request.get("/api/verification?review=1")).status()).toBe(
    403,
  );
  expect((await request.get("/api/verification")).status()).toBe(401);
  expect(
    (
      await page.request.post("/api/verification", {
        headers,
        data: { action: "submit", is18: true, status: "verified" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/verification", {
        headers,
        multipart: {
          action: "submit",
          document: {
            name: "identity.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("SYNTHETIC TEST ONLY"),
          },
        },
      })
    ).ok(),
  ).toBe(false);
  expect(
    (
      await page.request.post("/api/verification", {
        headers: { Origin: "https://invalid.test", "x-csrf-token": csrf },
        data: { action: "submit" },
      })
    ).status(),
  ).toBe(403);
  for (const [status, target] of [
    ["pending", "verification-pending"],
    ["rejected", "verification-result"],
    ["expired", "verify-age"],
  ] as const) {
    const change = await service
      .from("v25_member_verifications")
      .update({ status, submitted_at: new Date().toISOString() })
      .eq("member_id", member.id);
    expect(change.error).toBeNull();
    for (const route of [
      "club/account",
      "club/membership",
      "club/collection",
    ]) {
      await page.goto(`/en/${route}`);
      await expect(page).toHaveURL(new RegExp(`/en/${target}$`));
      await expect(page.locator(".restricted-study")).toHaveCount(0);
    }
    expect((await page.request.get("/api/club/media/open")).ok()).toBe(false);
    await a11y(page);
  }
  const suspended = await service
    .from("v25_members")
    .update({ state: "suspended" })
    .eq("id", member.id);
  expect(suspended.error).toBeNull();
  await page.goto("/en/club/collection");
  await expect(page).toHaveURL(/\/en\/verification-result$/);
  await expect(page.getByTestId("verification-status")).toHaveText(
    "Access suspended",
  );
  await expect(
    page.getByRole("button", { name: vt("en", "resubmit") }),
  ).toHaveCount(0);
  await page.goto("/en/admin/verification");
  await expect(page).toHaveURL(/\/en\/account\?access=denied$/);
  expect((await page.request.get("/api/club/media/open")).ok()).toBe(false);
});
