import { test, expect } from "./browser-fixture";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, mkdirSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { translate, languageKey } from "../src/i18n";
import { locales, translationFields } from "../src/domain";

const env = parseEnv(readFileSync(".env.local", "utf8"));
if (env.SUPABASE_URL !== "http://127.0.0.1:57431")
  throw Error("Local language tests only");
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const accounts = JSON.parse(readFileSync(".local/e2e-accounts.json", "utf8"));

for (const locale of locales)
  test(`admin ${locale}: create, edit, order management, all sections and language persistence`, async ({
    page,
  }, info) => {
    const t = (key: string) => translate(locale, key);
    const customer = await service
      .from("v25_customers")
      .insert({
        name: `Synthetic language ${locale}`,
        email: "local-language@example.invalid",
      })
      .select("id")
      .single();
    expect(customer.error).toBeNull();
    const address = await service
      .from("v25_addresses")
      .insert({
        customer_id: customer.data!.id,
        line1: "Local test only",
        postal_code: "6210",
        city: "Synthetic fixture",
      })
      .select("id")
      .single();
    expect(address.error).toBeNull();
    // Synthetic local paid fixture; real UI/RPC transitions are tested below, no checkout flags changed.
    const order = await service
      .from("v25_orders")
      .insert({
        customer_id: customer.data!.id,
        address_id: address.data!.id,
        locale,
        idempotency_key: randomUUID(),
        request_hash: "LOCAL TEST",
        status: "paid",
        subtotal_rappen: 1234,
        discount_rappen: 0,
        delivery_rappen: 0,
        adult_delivery_rappen: 0,
        tax_rappen: 0,
        total_rappen: 1234,
      })
      .select("id,number")
      .single();
    expect(order.error).toBeNull();
    await page.goto("/adminpage/");
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(
      page.getByRole("heading", { name: "Willkommen zurück" }),
    ).toBeVisible();
    const languageButtons = page.locator(".language-selector");
    await languageButtons
      .getByRole("button", { name: locale.toUpperCase(), exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: t("Welcome back") }),
    ).toBeVisible();
    await page.getByRole("button", { name: t("Sign in"), exact: true }).click();
    await expect(page.getByLabel(t("Email"), { exact: true })).toHaveJSProperty(
      "validationMessage",
      t("Complete this field."),
    );
    const login = async () => {
      await page
        .getByLabel(t("Email"), { exact: true })
        .fill(accounts.admin.email);
      await page
        .getByLabel(t("Password"), { exact: true })
        .fill(accounts.admin.password);
      await page
        .getByRole("button", { name: t("Sign in"), exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: t("Dashboard"), exact: true }),
      ).toBeVisible();
    };
    const nav = async (key: string) => {
      await page
        .getByRole("navigation")
        .getByRole("button", { name: t(key), exact: true })
        .click();
    };
    const screenshot = async (name: string) => {
      mkdirSync(".local/screenshots", { recursive: true });
      await page.screenshot({
        path: `.local/screenshots/${info.project.name}-${locale}-${name}.png`,
        fullPage: true,
      });
    };
    await screenshot("login");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await login();
    await expect(
      page.getByRole("heading", { name: t("System status"), exact: true }),
    ).toBeVisible();
    await screenshot("dashboard");
    await nav("Products");
    await page
      .getByRole("button", { name: t("Create product"), exact: true })
      .click();
    const slug = `locale-${locale}-${randomUUID()}`;
    await page.getByLabel(t("Product slug"), { exact: true }).fill(slug);
    await page.getByLabel("SKU", { exact: true }).fill(`LOCAL-${slug}`);
    await page
      .getByLabel(t("Supplier"), { exact: true })
      .fill("Synthetic shared supplier");
    await page.getByLabel(t("Price CHF"), { exact: true }).fill("12.345");
    await expect(
      page.getByLabel(t("Price CHF"), { exact: true }),
    ).toHaveJSProperty(
      "validationMessage",
      t("Enter CHF with at most two decimal places."),
    );
    await page.getByLabel(t("Price CHF"), { exact: true }).fill("12.34");
    const contentTabs = page.getByRole("group", {
      name: t("Product content language"),
      exact: true,
    });
    for (const contentLocale of locales) {
      await contentTabs
        .getByRole("button", { name: contentLocale.toUpperCase(), exact: true })
        .click();
      for (const field of translationFields) {
        const input = page.getByLabel(
          `${contentLocale.toUpperCase()} ${t(field)}`,
          { exact: true },
        );
        await expect(input).toHaveValue("");
        await expect(input).toHaveAttribute("aria-describedby", /incomplete/);
        if (!["ingredients", "allergens"].includes(field))
          await input.fill(`Synthetic ${contentLocale} ${field}`);
      }
    }
    // Switch the interface without changing the active content tab or unsaved facts.
    const alternate = locale === "de" ? "fr" : "de";
    await languageButtons
      .getByRole("button", { name: alternate.toUpperCase(), exact: true })
      .click();
    await expect(
      page.getByLabel(translate(alternate, "Supplier"), { exact: true }),
    ).toHaveValue("Synthetic shared supplier");
    await expect(
      page.getByLabel(`EN ${translate(alternate, "description")}`, {
        exact: true,
      }),
    ).toHaveValue("Synthetic en description");
    await expect(
      page.getByLabel(translate(alternate, "Status"), { exact: true }),
    ).toHaveValue("draft");
    await languageButtons
      .getByRole("button", { name: locale.toUpperCase(), exact: true })
      .click();
    await page
      .getByLabel(t("Nutrition (verified JSON, including units)"), {
        exact: true,
      })
      .fill("[]");
    await page
      .getByRole("button", { name: t("Save product"), exact: true })
      .click();
    await expect(page.getByRole("alert")).toHaveText(
      t("Nutrition must be an object."),
    );
    await page
      .getByLabel(t("Nutrition (verified JSON, including units)"), {
        exact: true,
      })
      .fill("{}");
    await page
      .getByRole("button", {
        name: t("Preview before publishing"),
        exact: true,
      })
      .click();
    await screenshot("product-editor");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page
      .getByRole("button", { name: t("Save product"), exact: true })
      .click();
    await expect(
      page.getByText(t("Product saved."), { exact: true }),
    ).toBeVisible();
    await page.getByLabel(t("Search product slug"), { exact: true }).fill(slug);
    await page
      .getByRole("button", { name: `${t("Edit")} ${slug}`, exact: true })
      .click();
    for (const contentLocale of locales) {
      await contentTabs
        .getByRole("button", { name: contentLocale.toUpperCase(), exact: true })
        .click();
      await expect(
        page.getByLabel(
          `${contentLocale.toUpperCase()} ${t("short_description")}`,
          { exact: true },
        ),
      ).toHaveValue(`Synthetic ${contentLocale} short_description`);
      await expect(
        page.getByLabel(`${contentLocale.toUpperCase()} ${t("ingredients")}`, {
          exact: true,
        }),
      ).toHaveValue("");
      await expect(
        page.getByLabel(`${contentLocale.toUpperCase()} ${t("allergens")}`, {
          exact: true,
        }),
      ).toHaveValue("");
    }
    await contentTabs.getByRole("button", { name: "FR", exact: true }).click();
    await page
      .getByLabel(`FR ${t("description")}`, { exact: true })
      .fill("Synthetic FR edited");
    await page
      .getByRole("button", { name: t("Save product"), exact: true })
      .click();
    await expect(
      page.getByText(t("Product saved."), { exact: true }),
    ).toBeVisible();
    const saved = await service
      .from("v25_products")
      .select(
        "price_rappen,sku,supplier,status,translations:v25_product_translations(*)",
      )
      .eq("slug", slug)
      .single();
    expect(saved.error).toBeNull();
    expect(saved.data!.price_rappen).toBe(1234);
    expect(saved.data!.supplier).toBe("Synthetic shared supplier");
    expect(saved.data!.status).toBe("draft");
    expect(
      saved.data!.translations.find((tr) => tr.locale === "fr").description,
    ).toBe("Synthetic FR edited");
    expect(
      saved.data!.translations.find((tr) => tr.locale === "de").description,
    ).toBe("Synthetic de description");
    await nav("Orders");
    await page
      .getByLabel(t("Search order number or ID"), { exact: true })
      .fill(String(order.data!.number));
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page
      .getByRole("button", {
        name: `${t("View order")} ${order.data!.number}`,
        exact: true,
      })
      .click();
    await page
      .getByLabel(t("New order status"), { exact: true })
      .selectOption("preparing");
    await page
      .getByLabel(t("Fulfilment notes"), { exact: true })
      .fill(`Synthetic ${locale} fulfilment`);
    await screenshot("orders");
    await page
      .getByRole("button", { name: t("Save order update"), exact: true })
      .click();
    await expect(
      page.getByText(t("Order updated."), { exact: true }),
    ).toBeVisible();
    const updated = await service
      .from("v25_orders")
      .select("status,fulfillment_notes")
      .eq("id", order.data!.id)
      .single();
    expect(updated.data?.status).toBe("preparing");
    expect(updated.data?.fulfillment_notes).toBe(
      `Synthetic ${locale} fulfilment`,
    );
    await page
      .getByRole("button", {
        name: `${t("View order")} ${order.data!.number}`,
        exact: true,
      })
      .click();
    await page
      .getByLabel(t("New order status"), { exact: true })
      .selectOption("cancelled");
    await page
      .getByRole("button", { name: t("Save order update"), exact: true })
      .click();
    const confirmation = page.getByRole("dialog", {
      name: t("Confirm order cancellation?"),
      exact: true,
    });
    await expect(confirmation).toBeVisible();
    await expect(
      confirmation.getByRole("button", { name: t("Confirm"), exact: true }),
    ).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await confirmation
      .getByRole("button", { name: t("Cancel"), exact: true })
      .click();
    expect(
      (
        await service
          .from("v25_orders")
          .select("status")
          .eq("id", order.data!.id)
          .single()
      ).data?.status,
    ).toBe("preparing");
    for (const view of [
      "Customers",
      "Delivery settings",
      "Discounts",
      "Cigar-box configuration",
      "Settings",
      "Inventory",
      "Audit",
    ]) {
      await nav(view);
      await expect(
        page.getByRole("heading", { name: t(view), level: 1, exact: true }),
      ).toBeVisible();
      for (const l of locales)
        await expect(
          languageButtons.getByRole("button", {
            name: l.toUpperCase(),
            exact: true,
          }),
        ).toBeVisible();
      if (
        [
          "Delivery settings",
          "Discounts",
          "Cigar-box configuration",
          "Settings",
        ].includes(view)
      ) {
        await expect(
          page.getByRole("button", { name: t("Save settings"), exact: true }),
        ).toBeVisible();
      }
      if (["Inventory", "Audit", "Discounts"].includes(view)) {
        await expect(page.locator("tbody tr").first()).toBeVisible();
      }
      if (view === "Cigar-box configuration") {
        await expect(
          page.getByLabel(
            t("Cigar box discount basis points (0 = no discount)"),
          ),
        ).toHaveValue("0");
        await expect(
          page.getByLabel(t("tobacco_checkout_enabled"), { exact: true }),
        ).toBeDisabled();
      }
      if (view === "Settings") {
        await expect(
          page.getByLabel(t("support_email"), { exact: true }),
        ).toBeVisible();
      }
      if (view === "Delivery settings") {
        await expect(
          page.getByLabel(t("Free standard delivery threshold CHF")),
        ).toHaveValue("100.00");
        await page
          .getByRole("button", { name: t("Save settings"), exact: true })
          .click();
        await expect(
          page.getByText(t("Settings saved."), { exact: true }),
        ).toBeVisible();
      }
      if (view === "Customers") {
        await page
          .getByLabel(t("Search customer name"))
          .fill(`Synthetic language ${locale}`);
        await expect(
          page
            .getByRole("button", {
              name: `${t("View contact")} · Synthetic language ${locale}`,
            })
            .first(),
        ).toBeVisible();
        await page
          .getByRole("button", {
            name: `${t("View contact")} · Synthetic language ${locale}`,
          })
          .first()
          .click();
        await expect(
          page.getByText("local-language@example.invalid", { exact: true }),
        ).toBeVisible();
      }
      await screenshot(view.toLowerCase().replaceAll(" ", "-"));
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
    await page
      .getByRole("button", { name: t("Sign out"), exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: t("Welcome back") }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await login();
    await expect(
      languageButtons.getByRole("button", {
        name: locale.toUpperCase(),
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      await page.evaluate((key) => localStorage.getItem(key), languageKey),
    ).toBe(locale);
    expect(
      await page.evaluate(() =>
        Object.keys(localStorage).filter((key) => /auth|token/i.test(key)),
      ),
    ).toEqual([]);
    await page
      .getByRole("button", { name: t("Sign out"), exact: true })
      .click();
  });
