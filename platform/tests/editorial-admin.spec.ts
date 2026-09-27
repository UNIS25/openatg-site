import { test, expect } from "@playwright/test";
import { login, a11y, noErrors } from "./browser-helpers";
import { ct } from "../src/lib/cinematic-copy";
import { locales } from "../src/lib/domain";
import { defaultExperience } from "../src/lib/experience";

test("admin saves independent DE FR EN gateway content and paired films with revisions", async ({
  page,
}) => {
  const check = noErrors(page);
  await login(page, "administrator");
  const original = (
    await (await page.request.get("/api/admin/editorial")).json()
  ).config;
  try {
    await page.goto("/en/admin");
    await page
      .locator(".admin-sidebar")
      .getByRole("button", { name: ct("en", "media"), exact: true })
      .click();
    await expect(page.locator(".editorial-settings")).toBeVisible();
    for (const locale of locales) {
      await expect(page.locator(`textarea[lang=${locale}]`)).toHaveCount(13);
      await page
        .locator(`textarea[lang=${locale}]`)
        .first()
        .fill(`LOCAL REVIEW ${locale}`);
    }
    await page
      .locator(".editorial-settings select")
      .nth(0)
      .selectOption("poster-only");
    await a11y(page);
    await page
      .getByRole("button", { name: ct("en", "save"), exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText(ct("en", "saved"));
    const saved = await (await page.request.get("/api/editorial")).json();
    expect(saved.experience.gateway_film).toBe("poster-only");
    for (const locale of locales) {
      await page.goto(`/${locale}/`);
      await expect(page.locator(".gateway h1")).toHaveText(
        `LOCAL REVIEW ${locale}`,
      );
      await expect(page.locator("video")).not.toHaveAttribute("src", /mp4/);
    }
    const { csrf } = await (await page.request.get("/api/auth")).json();
    const stale = await page.request.post("/api/admin/editorial", {
      headers: { Origin: "http://127.0.0.1:4190", "x-csrf-token": csrf },
      data: { ...saved, revision: original.revision },
    });
    expect(stale.ok()).toBe(false);
  } finally {
    const current = (
      await (await page.request.get("/api/admin/editorial")).json()
    ).config;
    const { csrf } = await (await page.request.get("/api/auth")).json();
    const response = await page.request.post("/api/admin/editorial", {
      headers: { Origin: "http://127.0.0.1:4190", "x-csrf-token": csrf },
      data: {
        ...original,
        experience: original.experience || defaultExperience,
        revision: current.revision,
      },
    });
    expect(response.ok()).toBe(true);
  }
  check();
});
