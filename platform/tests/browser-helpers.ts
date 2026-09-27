import { expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import type { Locale } from "../src/lib/domain";
import { t } from "../src/lib/messages";
export const accounts = JSON.parse(
  readFileSync(".local/review-accounts.json", "utf8"),
);
export async function login(page: Page, role: string, locale: Locale = "en") {
  await page.goto(`/${locale}/login`);
  await page
    .getByLabel(t(locale, "email"), { exact: true })
    .fill(accounts[role].email);
  await page
    .getByLabel(t(locale, "password"), { exact: true })
    .fill(accounts[role].password);
  await page
    .getByRole("button", { name: t(locale, "login"), exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/account`));
  await expect(
    page.getByRole("heading", { name: `Local ${role} reviewer`, exact: true }),
  ).toBeVisible();
}
export async function a11y(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
export async function screenshot(page: Page, name: string) {
  mkdirSync("artifacts/screenshots", { recursive: true });
  await page.screenshot({
    path: `artifacts/screenshots/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
export async function aligned(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  const logo = page.locator(".header .logo");
  if (await logo.count()) {
    const box = await logo.boundingBox();
    const header = await page.locator("header").boundingBox();
    expect(box!.y - header!.y).toBeGreaterThan(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(
      header!.y + header!.height,
    );
    expect(box!.height).toBeGreaterThan(40);
    expect(
      await logo.evaluate(
        (i: HTMLImageElement) => i.complete && i.naturalWidth > 0,
      ),
    ).toBe(true);
  }
}
export function noErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return () => expect(errors).toEqual([]);
}

export async function temporaryMember(kind: "gold" | "silver" | "owner") {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const email = `journey-${kind}-${crypto.randomUUID()}@v25.local.test`,
    password = `Test!${crypto.randomUUID()}Aa1`;
  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const id = created.data.user.id;
  for (const [table, value] of [
    ["v25_members", { id, name: `Local ${kind} journey`, locale: "en" }],
    [
      "v25_member_verifications",
      {
        member_id: id,
        provider_reference: `journey-${id}`,
        status: "verified",
        is_test: true,
        verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000 * 365).toISOString(),
      },
    ],
    [
      "v25_memberships",
      {
        member_id: id,
        plan_id: kind === "gold" ? "gold-yearly" : "silver",
        status: "active",
        period_start: new Date().toISOString(),
        period_end:
          kind === "gold"
            ? new Date(Date.now() + 86400000 * 365).toISOString()
            : null,
      },
    ],
  ] as const) {
    const { error } = await db.from(table).insert(value);
    if (error) throw error;
  }
  if (kind === "owner") {
    const { error } = await db
      .from("v25_profiles")
      .insert({ id, role: "owner", enabled: true });
    if (error) throw error;
  }
  return { id, email, password };
}
