import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { locales } from "../src/lib/domain";
import { rt } from "../src/lib/reference-copy";
import { t } from "../src/lib/messages";
import { a11y, aligned, login, noErrors, temporaryMember } from "./browser-helpers";
const references = JSON.parse(readFileSync("src/data/restricted-references.json", "utf8")) as {
  slug: string; name: string; brand: string; format: string;
}[];

for (const locale of locales) {
  test(`${locale}: complete protected references, brand filters, details, concepts and language continuity`, async ({ page }, info) => {
    const check = noErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, "silver", locale);
    await page.goto(`/${locale}/club/collection`);
    await expect(page.locator(".reference-index a")).toHaveCount(23);
    await expect(page.locator(".restricted-study img")).toHaveCount(1);
    await expect(page.locator('img[src*="/api/club/media/closed"]')).toHaveCount(0);
    await expect(page.locator("[data-box-concept]")).toHaveCount(2);
    await expect(page.locator(".restricted-editorial input,.restricted-editorial button")).toHaveCount(0);
    expect(await page.locator(".restricted-editorial").innerText()).not.toMatch(/CHF|USD|EUR/);
    for (const reference of references)
      await expect(page.locator(".reference-index").getByRole("link", { name: `${reference.name} ${reference.format}`, exact: true })).toHaveCount(1);
    const response = await page.request.get("/api/club/references");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const data = await response.json();
    expect(data.references.map((r: { image?: string }) => { const { image: ignored, ...row } = r; void ignored; return row; })).toEqual(references);
    if (locale === "en" && info.project.name === "desktop") {
      for (const reference of data.references) {
        const image = await page.request.get(reference.image);
        expect(image.status()).toBe(200);
        expect(image.headers()["cache-control"]).toContain("no-store");
        expect(image.headers()["content-type"]).toBe("image/webp");
      }
    }
    await page.locator(".reference-detail img").evaluate((img: HTMLImageElement) => img.decode());
    await a11y(page);
    await aligned(page);
    await page.screenshot({ path: `artifacts/screenshots/reference-collection-${locale}-${info.project.name}.png`, fullPage: true });
    for (const brand of ["Davidoff", "Patoro"]) {
      const filter = page.getByRole("navigation", { name: rt(locale, "filter"), exact: true }).getByRole("link", { name: brand, exact: true });
      await filter.focus();
      await page.keyboard.press("Enter");
      const matching = references.filter((r) => r.brand === brand);
      await expect(page.locator(".reference-index a")).toHaveCount(matching.length);
      await expect(page.locator(".reference-filters a[aria-current]")).toHaveText(brand);
      const selected = matching.at(-1)!;
      await page.locator(".reference-index").getByRole("link", { name: `${selected.name} ${selected.format}`, exact: true }).click();
      await expect(page.locator(".reference-detail")).toHaveAttribute("data-reference", selected.slug);
      await expect(page.locator("#reference-name")).toHaveText(selected.name);
      await expect(page.locator(".reference-detail dl")).toContainText(selected.format);
      await page.locator(".reference-detail img").evaluate((img: HTMLImageElement) => img.decode());
      await page.reload();
      await expect(page.locator(".reference-detail")).toHaveAttribute("data-reference", selected.slug);
    }
    const alternate = locale === "de" ? "fr" : "de";
    await page.locator(".language-links").getByRole("link", { name: alternate.toUpperCase(), exact: true }).click();
    const url = new URL(page.url());
    expect(url.pathname).toBe(`/${alternate}/club/collection`);
    expect(url.searchParams.get("brand")).toBe("Patoro");
    expect(url.searchParams.get("reference")).toBe("patoro-series-p-balthasar");
    await expect(page.locator("#reference-name")).toHaveText("Patoro Series P Balthasar");
    await a11y(page);
    await aligned(page);
    await page.locator(".reference-detail").screenshot({ path: `artifacts/screenshots/reference-detail-${locale}-${info.project.name}.png` });
    await page.goto(`/${locale}/account`);
    await page.getByRole("button", { name: t(locale, "logout"), exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/login$`));
    expect((await page.request.get("/api/club/references")).status()).toBe(401);
    expect((await page.request.get("/api/club/media/patoro-series-p-balthasar")).status()).toBe(401);
    await page.goto(`/${locale}/club/collection?reference=patoro-series-p-balthasar`);
    await expect(page).toHaveURL(new RegExp(`/${locale}/login`));
    check();
  });
}

test("reference pages, data and every media request deny all non-verified states", async ({ page, request }, info) => {
  test.skip(info.project.name !== "desktop", "Authorization checks are viewport independent");
  expect((await request.get("/api/club/references")).status()).toBe(401);
  expect((await request.get("/api/club/media/davidoff-aniversario-double-r")).status()).toBe(401);
  const member = await temporaryMember("silver");
  const service = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  await page.goto("/en/login");
  await page.getByLabel("Email", { exact: true }).fill(member.email);
  await page.getByLabel("Password", { exact: true }).fill(member.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  for (const [status, submitted, target] of [
    ["pending", null, "verify-age"],
    ["pending", new Date().toISOString(), "verification-pending"],
    ["rejected", new Date().toISOString(), "verification-result"],
    ["expired", new Date().toISOString(), "verify-age"],
    ["revoked", new Date().toISOString(), "verification-result"],
  ]) {
    expect((await service.from("v25_member_verifications").update({ status, submitted_at: submitted }).eq("member_id", member.id)).error).toBeNull();
    await page.goto("/en/club/collection?reference=patoro-gran-anejo-toro");
    await expect(page).toHaveURL(new RegExp(`/en/${target}$`));
    await expect(page.locator(".reference-library")).toHaveCount(0);
    expect((await page.request.get("/api/club/references")).status()).toBe(403);
    for (const reference of references)
      expect((await page.request.get(`/api/club/media/${reference.slug}`)).status()).toBe(403);
    const flight = await page.request.get("/en/club/collection", { headers: { RSC: "1" } });
    expect(await flight.text()).not.toContain("Davidoff Aniversario Double R");
  }
  expect((await service.from("v25_member_verifications").update({ status: "verified", age_threshold: 18 }).eq("member_id", member.id)).error).toBeNull();
  expect((await page.request.get("/api/club/references")).status()).toBe(200);
  expect((await page.request.get("/api/club/media/unknown")).status()).toBe(404);
  expect((await page.request.get("/api/club/media/%2e%2e%2f.env.local")).status()).toBe(404);
  expect((await page.request.get("/private-media/club/davidoff-aniversario-double-r.webp")).status()).toBe(404);
  expect((await page.request.get("/varathans25/images/cigars/davidoff-aniversario-double-r.webp")).status()).toBe(404);
  expect((await page.request.get("/api/club/references?brand=Unknown")).status()).toBe(400);
  expect((await page.request.post("/api/club/references", { data: { action: "order" } })).status()).toBe(405);
  expect((await service.from("v25_members").update({ state: "suspended" }).eq("id", member.id)).error).toBeNull();
  expect((await page.request.get("/api/club/references")).status()).toBe(403);
  expect((await page.request.get("/api/club/media/open")).status()).toBe(403);
  await page.goto("/en/club/collection");
  await expect(page).toHaveURL(/\/en\/verification-result$/);
});
