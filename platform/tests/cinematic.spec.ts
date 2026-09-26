import { test, expect } from "@playwright/test";
import { ct } from "../src/lib/cinematic-copy";
import { locales } from "../src/lib/domain";
import { a11y, aligned, noErrors, screenshot } from "./browser-helpers";
for (const locale of locales)
  test(`${locale} cinematic chapters and accessible invitation`, async ({
    page,
  }, info) => {
    const check = noErrors(page);
    await page.addInitScript(() =>
      sessionStorage.setItem("v25_editorial_invitation", "dismissed"),
    );
    await page.goto(`/${locale}/`);
    await expect(page.locator(".cinema-hero")).toBeVisible();
    await expect(page.locator(".product-card")).toHaveCount(5);
    await expect(page.locator(".cinema-hero h1")).toHaveText(
      ct(locale, "heroTitle"),
    );
    await aligned(page);
    await a11y(page);
    await page.locator("main img").evaluateAll(async (images) => {
      await Promise.all(
        images.map(async (image) => {
          const img = image as HTMLImageElement;
          img.loading = "eager";
          await img.decode();
        }),
      );
    });
    await page.screenshot({
      path: `artifacts/screenshots/cinematic-${locale}-${info.project.name}.jpg`,
      type: "jpeg",
      quality: 85,
      fullPage: true,
      animations: "disabled",
    });
    for (const chapter of ["tea", "spice", "evening", "restaurant"]) {
      await page.locator(`#chapter-${chapter}`).scrollIntoViewIfNeeded();
      await page.locator(`#chapter-${chapter}`).screenshot({
        path: `artifacts/screenshots/${chapter}-${locale}-${info.project.name}.png`,
        animations: "disabled",
      });
    }
    await page.evaluate(() =>
      sessionStorage.removeItem("v25_editorial_invitation"),
    );
    await page.locator(".cinema-hero").scrollIntoViewIfNeeded();
    const trigger = page.locator(".cinema-hero [data-club-entry]");
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(
      dialog.getByRole("link", { name: ct(locale, "join"), exact: true }),
    ).toHaveAttribute("href", `/${locale}/register`);
    await expect(
      dialog.getByRole("link", { name: ct(locale, "signin"), exact: true }),
    ).toHaveAttribute("href", `/${locale}/login`);
    await expect(dialog).toContainText(ct(locale, "popupFooter"));
    await a11y(page);
    await page.screenshot({
      path: `artifacts/screenshots/invitation-${locale}-${info.project.name}.jpg`,
      type: "jpeg",
      quality: 90,
      fullPage: false,
      animations: "disabled",
    });
    const close = dialog.getByRole("button", { name: ct(locale, "close") });
    await close.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(
      dialog.getByRole("link", { name: new RegExp(ct(locale, "editorial")) }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await page.reload();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.locator(".cinema-hero [data-club-entry]").click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/club`));
    check();
  });
test("reduced-motion, Save-Data and mobile use posters without video requests", async ({
  page,
}, info) => {
  const check = noErrors(page);
  const media: string[] = [];
  page.on("request", (r) => {
    if (/\.(mp4|webm)(\?|$)/.test(r.url())) media.push(r.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".cinema-film")).toHaveAttribute(
    "data-motion",
    "poster",
  );
  await expect(page.locator("video")).toHaveCount(0);
  await a11y(page);
  await screenshot(page, `gateway-reduced-${info.project.name}`);
  await page.goto("/en/");
  await page.screenshot({
    path: `artifacts/screenshots/cinematic-reduced-${info.project.name}.jpg`,
    type: "jpeg",
    quality: 90,
    fullPage: false,
    animations: "disabled",
  });
  await expect(page.locator("video")).toHaveCount(0);
  expect(media).toEqual([]);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: Object.assign(new EventTarget(), {
        saveData: true,
        effectiveType: "4g",
      }),
    }),
  );
  await page.goto("/en/");
  await expect(page.locator(".cinema-film")).toHaveAttribute(
    "data-motion",
    "poster",
  );
  await expect(page.locator("video")).toHaveCount(0);
  expect(media).toEqual([]);
  check();
});
test("invitation timing, backdrop dismissal and secure route exclusions", async ({
  page,
}, info) => {
  const check = noErrors(page);
  await page.clock.install();
  await page.goto("/en/");
  await expect(page.locator("dialog")).toHaveAttribute("data-eligible", "true");
  await page.clock.fastForward(11000);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.clock.fastForward(2000);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await page.clock.fastForward(30000);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  for (const route of [
    "/",
    "/en/login",
    "/en/register",
    "/en/admin",
    "/en/bag",
  ]) {
    await page.goto(route);
    await page.clock.fastForward(30000);
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  expect(info.project.name).toBeTruthy();
  check();
});
test("silent video pauses manually, off-screen and under invitation", async ({
  page,
}, info) => {
  const check = noErrors(page);
  await page.goto("/en/");
  await expect(page.locator("dialog")).toHaveAttribute("data-eligible", "true");
  if (info.project.name === "mobile") {
    await expect(page.locator("video")).toHaveCount(0);
    check();
    return;
  }
  const video = page.locator("video");
  await expect(video).toHaveCount(1);
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused))
    .toBe(false);
  expect(await video.evaluate((v) => (v as HTMLVideoElement).muted)).toBe(true);
  await page
    .getByRole("button", { name: ct("en", "pause"), exact: true })
    .click();
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused))
    .toBe(true);
  await page
    .getByRole("button", { name: ct("en", "play"), exact: true })
    .click();
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused))
    .toBe(false);
  await page.locator("#chapter-restaurant").scrollIntoViewIfNeeded();
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused))
    .toBe(true);
  await page.locator(".cinema-hero").scrollIntoViewIfNeeded();
  await page.locator(".cinema-hero [data-club-entry]").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused))
    .toBe(true);
  check();
});
test("failed video decoding leaves an accessible unbroken poster", async ({
  page,
}, info) => {
  const check = noErrors(page);
  await page.route(/\.(webm|mp4)$/, (r) =>
    r.fulfill({
      status: 200,
      contentType: "video/mp4",
      body: "invalid test video",
    }),
  );
  await page.goto("/en/");
  if (info.project.name !== "mobile")
    await expect(page.locator(".cinema-film").getByRole("status")).toHaveText(
      ct("en", "fallback"),
    );
  const poster = page.locator(".cinema-film picture img");
  await expect(poster).toBeVisible();
  expect(
    await poster.evaluate(
      (i: HTMLImageElement) => i.complete && i.naturalWidth > 0,
    ),
  ).toBe(true);
  await a11y(page);
  check();
});

test("unavailable editorial configuration starts with a static poster and no invitation", async ({
  page,
}) => {
  const check = noErrors(page);
  const videos: string[] = [];
  page.on("request", (r) => {
    if (/\.(mp4|webm)$/.test(r.url())) videos.push(r.url());
  });
  await page.route("**/api/editorial", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "null" }),
  );
  await page.goto("/en/");
  await expect(page.locator(".cinema-film")).toHaveAttribute(
    "data-motion",
    "poster",
  );
  await expect(page.locator("video")).toHaveCount(0);
  await expect(page.locator("dialog")).toHaveAttribute(
    "data-eligible",
    "false",
  );
  expect(videos).toEqual([]);
  check();
});
