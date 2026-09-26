import { test, expect } from "@playwright/test";
import { login, a11y, noErrors } from "./browser-helpers";
import { ct } from "../src/lib/cinematic-copy";
import { locales } from "../src/lib/domain";
test("admin controls editorial schedules, film, chapter order and three-language copy", async ({
  page,
}) => {
  const check = noErrors(page);
  await login(page, "administrator");
  for (const locale of locales) {
    await page.goto(`/${locale}/admin`);
    await page
      .locator(".admin-sidebar")
      .getByRole("button", { name: ct(locale, "media"), exact: true })
      .click();
    await expect(page.locator(".editorial-settings")).toBeVisible();
    await page
      .getByLabel(ct(locale, "activeFilm"), { exact: true })
      .selectOption("poster-only");
    await page
      .getByRole("button", { name: ct(locale, "save"), exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText(ct(locale, "saved"));
    await page.reload();
    await page
      .locator(".admin-sidebar")
      .getByRole("button", { name: ct(locale, "media"), exact: true })
      .click();
    await expect(
      page.getByLabel(ct(locale, "activeFilm"), { exact: true }),
    ).toHaveValue("poster-only");
    await expect(page.locator("textarea[lang=de]")).toHaveCount(10);
    await expect(page.locator("textarea[lang=fr]")).toHaveCount(10);
    await expect(page.locator("textarea[lang=en]")).toHaveCount(10);
    await a11y(page);
    await page
      .getByLabel(ct(locale, "activeFilm"), { exact: true })
      .selectOption("daylight-study");
    await page
      .getByRole("button", { name: ct(locale, "save"), exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText(ct(locale, "saved"));
  }
  const original = (
    await (await page.request.get("/api/admin/editorial")).json()
  ).config;
  try {
    for (const locale of locales)
      await page
        .locator(`textarea[lang=${locale}]`)
        .first()
        .fill(`LOCAL REVIEW ${locale}`);
    await page
      .getByRole("button", { name: `${ct("en", "up")} spice`, exact: true })
      .click();
    await page.getByLabel(ct("en", "enabled"), { exact: true }).uncheck();
    await page
      .getByRole("button", { name: ct("en", "save"), exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText(ct("en", "saved"));
    const publicConfig = await (
      await page.request.get("/api/editorial")
    ).json();
    expect(publicConfig.invitation_enabled).toBe(false);
    expect(publicConfig.chapter_order[0]).toBe("spice");
    for (const locale of locales) {
      await page.goto(`/${locale}/`);
      await expect(page.locator(".cinema-hero h1")).toHaveText(
        `LOCAL REVIEW ${locale}`,
      );
    }
  } finally {
    const current = (
      await (await page.request.get("/api/admin/editorial")).json()
    ).config;
    const { csrf } = await (await page.request.get("/api/auth")).json();
    const response = await page.request.post("/api/admin/editorial", {
      headers: { Origin: "http://127.0.0.1:4190", "x-csrf-token": csrf },
      data: { ...original, revision: current.revision },
    });
    expect(response.ok()).toBe(true);
  }
  check();
});
