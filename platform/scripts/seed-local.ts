import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import catalogue from "../src/data/catalogue.json" with { type: "json" };
if (
  process.env.PLATFORM_ENV !== "local" ||
  process.env.SUPABASE_URL !== "http://127.0.0.1:58531"
)
  throw new Error("Local isolated seed only");
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const check = <T>(result: { data: T; error: unknown }) => {
  if (result.error) throw result.error;
  return result.data;
};
mkdirSync(".local", { recursive: true });
type Account = { email: string; password: string; id: string };
const file = ".local/review-accounts.json";
const accounts: Record<string, Account> = existsSync(file)
  ? JSON.parse(readFileSync(file, "utf8"))
  : {};
for (const role of ["silver", "gold", "staff", "administrator", "owner"]) {
  if (accounts[role]) {
    const found = await db.auth.admin.getUserById(accounts[role].id);
    if (found.error) {
      const a = accounts[role];
      const created = await db.auth.admin.createUser({
        id: a.id,
        email: a.email,
        password: a.password,
        email_confirm: true,
        user_metadata: { name: `Local ${role} reviewer`, locale: "de" },
      });
      if (created.error) throw created.error;
    }
  }
  if (!accounts[role]) {
    const email = `${role}@v25.local.test`;
    const password = `V25!${randomBytes(24).toString("base64url")}a1`;
    const result = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: `Local ${role} reviewer`, locale: "de" },
    });
    if (result.error) throw result.error;
    const user = result.data.user!;
    accounts[role] = { email, password, id: user.id };
    writeFileSync(file, JSON.stringify(accounts, null, 2) + "\n", {
      mode: 0o600,
    });
  }
  const a = accounts[role];
  check(
    await db.from("v25_members").upsert({
      id: a.id,
      name: `Local ${role} reviewer`,
      locale: "de",
      state: "active",
    }),
  );
  check(
    await db.from("v25_member_verifications").upsert({
      member_id: a.id,
      provider_reference: `local-fixture-${a.id}`,
      status: "verified",
      verified_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000 * 365).toISOString(),
      is_test: true,
    }),
  );
  check(
    await db.from("v25_memberships").upsert(
      {
        member_id: a.id,
        plan_id: role === "gold" ? "gold-yearly" : "silver",
        status: "active",
        period_start: new Date().toISOString(),
        period_end:
          role === "gold"
            ? new Date(Date.now() + 86400000 * 365).toISOString()
            : null,
      },
      { onConflict: "member_id" },
    ),
  );
  if (role === "staff")
    check(
      await db
        .from("v25_staff_roles")
        .upsert({ member_id: a.id, role: "staff", enabled: true }),
    );
  if (["administrator", "owner"].includes(role))
    check(
      await db.from("v25_profiles").upsert({ id: a.id, role, enabled: true }),
    );
  const { data: addresses } = await db
    .from("v25_member_addresses")
    .select("id")
    .eq("member_id", a.id);
  if (!addresses?.length)
    check(
      await db.from("v25_member_addresses").insert({
        member_id: a.id,
        label: "Local test",
        name: `Local ${role} reviewer`,
        street: "Teststrasse",
        house_number: "1",
        postal_code: "8000",
        city: "Zürich",
      }),
    );
}
for (const p of catalogue) {
  let { data: product } = await db
    .from("v25_products")
    .select("id")
    .eq("slug", p.slug)
    .maybeSingle();
  if (!product)
    product = check(
      await db
        .from("v25_products")
        .insert({ slug: p.slug, brand: "Varathans25", category: p.category })
        .select("id")
        .single(),
    );
  check(
    await db
      .from("v25_products")
      .update({ category: p.category })
      .eq("id", product!.id),
  );
  check(
    await db.from("v25_product_translations").upsert(
      p.translations.map((t) => ({
        product_id: product!.id,
        locale: t.locale,
        name: t.name,
      })),
      { onConflict: "product_id,locale" },
    ),
  );
  check(
    await db.from("v25_product_images").upsert(
      {
        product_id: product!.id,
        legacy_path: p.image,
        storage_path: null,
        position: 0,
        alt: Object.fromEntries(p.translations.map((t) => [t.locale, t.name])),
      },
      { onConflict: "product_id,position" },
    ),
  );
  check(
    await db.from("v25_inventory").upsert({
      product_id: product!.id,
      quantity: 200,
      confirmed: false,
      low_stock_threshold: 5,
    }),
  );
  check(
    await db.from("v25_product_presentations").upsert({
      product_id: product!.id,
      enabled: true,
      gold_eligible: true,
      test_price_rappen: p.test_price_rappen,
    }),
  );
}
// Remove coffee from this isolated application's public presentation without deleting supplier or historical records.
const { data: coffee } = await db
  .from("v25_products")
  .select("id")
  .eq("slug", "coffee-powder")
  .maybeSingle();
if (coffee)
  check(
    await db
      .from("v25_products")
      .update({ status: "archived", published_at: null, available: false })
      .eq("id", coffee.id),
  );
console.log(
  "Five private test accounts and six presentation records prepared. Credentials: .local/review-accounts.json (0600). Inventory and prices are explicit test fixtures.",
);
