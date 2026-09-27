import { test, expect } from "@playwright/test";
import { a11y, aligned, noErrors } from "./browser-helpers";
import { locales } from "../src/lib/domain";

for (const locale of locales)
  test(`${locale} aligned controls and every ordinary product reaches the basket`, async ({
    page,
  }, info) => {
    const check = noErrors(page);
    await page.goto(`/${locale}/shop`);
    const cards = page.locator(".product-card");
    await expect(cards).toHaveCount(6);
    await expect(cards.first().locator(".button")).toBeEnabled();
    await page.locator("main img").evaluateAll(async (images) => {
      await Promise.all(
        images.map(async (i) => {
          const image = i as HTMLImageElement;
          image.loading = "eager";
          await image.decode();
        }),
      );
    });
    const geometry = await cards.evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = (selector: string) => {
          const r = node.querySelector(selector)!.getBoundingClientRect();
          return {
            top: r.top,
            bottom: r.bottom,
            height: r.height,
            width: r.width,
          };
        };
        return {
          card: node.getBoundingClientRect().toJSON(),
          image: rect(".product-photo"),
          title: rect("h3"),
          price: rect(".price"),
          quantity: rect(".quantity"),
          button: rect(".purchase-row .button"),
        };
      }),
    );
    for (const a of geometry) {
      expect(Math.abs(a.card.height - geometry[0].card.height)).toBeLessThan(1);
      expect(a.quantity.width).toBeGreaterThanOrEqual(108);
      expect(a.button.height).toBeGreaterThanOrEqual(44);
      for (const b of geometry.filter(
        (b) => Math.abs(b.card.top - a.card.top) < 1,
      )) {
        for (const key of [
          "image",
          "title",
          "price",
          "quantity",
          "button",
        ] as const) {
          expect(Math.abs(a[key].top - b[key].top)).toBeLessThan(1);
          expect(Math.abs(a[key].height - b[key].height)).toBeLessThan(1);
        }
        expect(Math.abs(a.card.height - b.card.height)).toBeLessThan(1);
      }
    }
    for (let i = 0; i < 6; i++) {
      const card = cards.nth(i);
      await card.locator(".quantity button").last().click();
      await expect(card.locator("output")).toHaveText("2");
      await card.locator(".quantity button").first().click();
      await expect(card.locator("output")).toHaveText("1");
      await card.locator(".purchase-row .button").click();
      await expect(card.locator(".is-added")).toBeVisible();
    }
    await a11y(page);
    await aligned(page);
    if (locale === "de")
      await page.screenshot({
        path: `artifacts/final-polish/catalogue-${info.project.name}.png`,
        fullPage: true,
      });
    await page.goto(`/${locale}/bag`);
    await expect(page.locator(".bag-item")).toHaveCount(6);
    await page.reload();
    await expect(page.locator(".bag-item")).toHaveCount(6);
    await expect(page.locator(".bag-item output")).toHaveText([
      "1",
      "1",
      "1",
      "1",
      "1",
      "1",
    ]);
    check();
  });

test("restored chapter order, safe restaurant destination and aligned membership panels", async ({
  page,
}, info) => {
  const check = noErrors(page);
  await page.goto("/en/store");
  await expect(page.locator(".restaurant-closing a")).toHaveAttribute(
    "href",
    "https://www.varathans25.ch/",
  );
  await expect(page.locator(".restaurant-closing a")).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(page.locator(".restaurant-closing a")).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  const sequence = await page
    .locator(
      ".store-film-hero,.tea-editorial,.spice-film-chapter,.curry-editorial,.restaurant-closing",
    )
    .evaluateAll((nodes) => nodes.map((n) => n.className));
  expect(sequence).toEqual([
    "store-film-hero",
    "store-chapter tea-editorial container",
    "spice-film-chapter",
    "curry-editorial",
    "restaurant-closing",
  ]);
  await expect(page.locator("img[src*=restaurant]")).toHaveCount(1);
  await page
    .locator(".restaurant-closing img")
    .evaluate(async (img: HTMLImageElement) => {
      img.loading = "eager";
      await img.decode();
    });
  for (const [selector, name] of [
    [".spice-film-chapter", "spice"],
    [".curry-editorial", "curry"],
    [".restaurant-closing", "restaurant"],
  ] as const)
    await page.locator(selector).screenshot({
      path: `artifacts/final-polish/${name}-${info.project.name}.png`,
    });
  await page.goto("/en/club");
  await expect(page.locator(".comparison-price").first()).toContainText("CHF");
  const panels = await page
    .locator(".comparison-panel")
    .evaluateAll((nodes) =>
      nodes.map((n) => n.getBoundingClientRect().toJSON()),
    );
  if (page.viewportSize()!.width > 760)
    expect(Math.abs(panels[0].height - panels[1].height)).toBeLessThan(1);
  await expect(page.locator(".staging-terms")).toContainText("Staging terms");
  await a11y(page);
  await aligned(page);
  await page.locator(".membership-comparison").screenshot({
    path: `artifacts/final-polish/comparison-${info.project.name}.png`,
  });
  await page.locator(".gold .comparison-action a").click();
  await expect(page).toHaveURL(/\/en\/membership$/);
  await a11y(page);
  check();
});

test("spice film respects reduced motion and Save-Data", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/store");
  await expect(page.locator("[data-film=kitchen] video")).not.toHaveAttribute(
    "src",
    /mp4/,
  );
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true, effectiveType: "4g" },
    }),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await expect(page.locator("[data-film=kitchen] video")).not.toHaveAttribute(
    "src",
    /mp4/,
  );
});
