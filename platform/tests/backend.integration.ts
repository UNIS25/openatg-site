import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { blankProduct } from "../src/legacy-admin/domain";
const url = process.env.SUPABASE_URL!,
  key = process.env.SUPABASE_ANON_KEY!;
if (url !== "http://127.0.0.1:58531") throw new Error("Local integration only");
const make = (keyValue = key) =>
  createClient(url, keyValue, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const service = make(process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = make();
const accounts = JSON.parse(
  readFileSync(".local/review-accounts.json", "utf8"),
);
let silver: SupabaseClient,
  gold: SupabaseClient,
  staff: SupabaseClient,
  admin: SupabaseClient,
  owner: SupabaseClient;
let product: string;
let order: { order_id: string; payment_id: string };
const check = <R extends { data?: unknown; error: unknown }>(
  r: R,
): NonNullable<R["data"]> => {
  assert.equal(r.error, null);
  return r.data as NonNullable<R["data"]>;
};
const call = (
  db: SupabaseClient,
  action: string,
  document: Record<string, unknown> = {},
  request_key = randomUUID(),
) => db.rpc("v25_platform_action", { action, document, request_key });
before(async () => {
  for (const role of ["silver", "gold"]) {
    const email = `integration-${role}-${randomUUID()}@v25.local.test`;
    const password = `Test!${randomUUID()}Aa1`;
    const result = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (result.error) throw result.error;
    const id = result.data.user.id;
    accounts[role] = { email, password, id };
    check(
      await service
        .from("v25_members")
        .insert({ id, name: `Local ${role} reviewer`, locale: "en" }),
    );
    check(
      await service.from("v25_member_verifications").insert({
        member_id: id,
        provider_reference: `integration-${id}`,
        status: "verified",
        age_threshold: 18,
        method: "legacy-test",
        verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000 * 365).toISOString(),
        is_test: true,
      }),
    );
    check(
      await service.from("v25_memberships").insert({
        member_id: id,
        plan_id: role === "gold" ? "gold-yearly" : "silver",
        status: "active",
        period_start: new Date().toISOString(),
        period_end:
          role === "gold"
            ? new Date(Date.now() + 86400000 * 365).toISOString()
            : null,
      }),
    );
    check(
      await service.from("v25_member_addresses").insert({
        member_id: id,
        name: "INTEGRATION TEST",
        street: "Teststrasse",
        house_number: "1",
        postal_code: "8000",
        city: "Zürich",
      }),
    );
  }
  [silver, gold, staff, admin, owner] = await Promise.all(
    ["silver", "gold", "staff", "administrator", "owner"].map(async (role) => {
      const db = make();
      const login = await db.auth.signInWithPassword(accounts[role]);
      assert.equal(login.error, null);
      return db;
    }),
  );
  const p = check(
    await service
      .from("v25_products")
      .insert({
        slug: `test-fixture-${randomUUID().slice(0, 8)}`,
        category: "tea",
        brand: "LOCAL TEST",
      })
      .select("id")
      .single(),
  );
  product = p.id;
  check(
    await service
      .from("v25_product_presentations")
      .insert({ product_id: product, test_price_rappen: 9999, enabled: true }),
  );
  check(
    await service
      .from("v25_inventory")
      .insert({ product_id: product, quantity: 100, confirmed: false }),
  );
  check(
    await service.from("v25_product_translations").insert(
      ["de", "fr", "en"].map((locale) => ({
        product_id: product,
        locale,
        name: "LOCAL TEST FIXTURE",
      })),
    ),
  );
});
after(async () => {
  if (product) {
    await service
      .from("v25_product_presentations")
      .update({ enabled: false })
      .eq("product_id", product);
    await service
      .from("v25_products")
      .update({ status: "archived" })
      .eq("id", product);
  }
  for (const db of [silver, gold, staff, admin, owner])
    await db?.auth.signOut({ scope: "local" });
});
test("anonymous public projection never contains coffee or tobacco", async () => {
  const data = check(await anon.rpc("v25_platform_catalogue"));
  assert.ok(
    data.every(
      (p: { category: string; slug: string }) =>
        ["tea", "pantry"].includes(p.category) && !p.slug.includes("coffee"),
    ),
  );
});
test("anonymous cannot read profiles, customer records or payments", async () => {
  for (const table of [
    "v25_members",
    "v25_orders",
    "v25_payments",
    "v25_member_verifications",
    "v25_audit_events",
  ]) {
    const { data, error } = await anon.from(table).select("*");
    assert.ok(error || data?.length === 0, table);
  }
});
test("guest tea order is server-priced, atomic, idempotent and payment stays pending", async () => {
  const request_key = randomUUID();
  const document = {
    lines: [{ product_id: product, quantity: 1 }],
    email: `guest-${randomUUID()}@v25.local.test`,
    name: "LOCAL GUEST TEST",
    street: "Teststrasse",
    house_number: "1",
    postal_code: "8000",
    city: "Zürich",
    locale: "en",
    consent: true,
  };
  assert.ok((await anon.rpc("v25_guest_create_order", { document, request_key })).error);
  assert.ok((await silver.rpc("v25_guest_create_order", { document, request_key })).error);
  const first = check(await service.rpc("v25_guest_create_order", { document, request_key }));
  assert.equal(first.quote.total_rappen, 10999);
  assert.equal(first.replayed, false);
  const repeat = check(await service.rpc("v25_guest_create_order", { document, request_key }));
  assert.equal(repeat.order_id, first.order_id);
  assert.equal(repeat.payment_id, first.payment_id);
  assert.equal(repeat.replayed, true);
  const changed = await service.rpc("v25_guest_create_order", { document: { ...document, city: "Bern" }, request_key });
  assert.ok(changed.error);
  const orderRow = check(await service.from("v25_orders").select("member_id,status,total_rappen,is_test").eq("id", first.order_id).single());
  assert.equal(orderRow.member_id, null);
  assert.equal(orderRow.status, "pending");
  assert.equal(orderRow.is_test, true);
  const paymentRow = check(await service.from("v25_payments").select("member_id,state,amount_rappen,reference,is_test").eq("id", first.payment_id).single());
  assert.equal(paymentRow.member_id, null);
  assert.equal(paymentRow.state, "awaiting_payment");
  assert.equal(paymentRow.amount_rappen, 10999);
  assert.match(paymentRow.reference, /^RF\d{2}/);
  assert.equal(paymentRow.is_test, true);
  const receivedNotification = check(await service.from("v25_order_notification_events").select("kind,state").eq("order_id", first.order_id));
  assert.deepEqual(receivedNotification.map((r: {kind: string; state: string}) => [r.kind,r.state]), [["order_received","not_configured"]]);
  for (const [table, id] of [["v25_orders", first.order_id], ["v25_payments", first.payment_id]]) {
    const read = await anon.from(table).select("id").eq("id", id);
    assert.ok(read.error || read.data?.length === 0);
  }
  const settlement = {
    payment_id: first.payment_id,
    state: "matched",
    amount_rappen: 10999,
    event_id: randomUUID(),
    reason: "Local guest settlement test",
  };
  check(await call(admin, "reconcile", settlement));
  const paid = check(await service.from("v25_orders").select("status").eq("id", first.order_id).single());
  assert.equal(paid.status, "paid");
  const replay = check(await call(admin, "reconcile", settlement));
  assert.equal(replay.replayed, true);
  const paymentEvents = check(await service.from("v25_platform_payment_events").select("id").eq("payment_id", first.payment_id));
  assert.equal(paymentEvents.length, 1);
  const notifications = check(await service.from("v25_order_notification_events").select("kind,state").eq("order_id", first.order_id));
  assert.equal(notifications.length, 2);
  assert.ok(notifications.every((r: {state: string}) => r.state === "not_configured"));
});
test("member row ownership and direct-write denial", async () => {
  const data = check(await silver.from("v25_members").select("*"));
  assert.equal(data.length, 1);
  assert.equal(data[0].id, accounts.silver.id);
  const other = check(
    await silver
      .from("v25_member_addresses")
      .select("*")
      .eq("member_id", accounts.gold.id),
  );
  assert.equal(other.length, 0);
  const result = await silver
    .from("v25_members")
    .update({ state: "suspended" })
    .eq("id", accounts.gold.id);
  assert.ok(result.error);
});
test("staff cannot alter plans, member verification or payments", async () => {
  for (const action of ["plan_settings", "verification_review", "reconcile"])
    assert.ok((await call(staff, action, {})).error);
});
test("owner privileges require AAL2 while named administrator has its assigned role", async () => {
  assert.equal(check(await owner.rpc("v25_platform_identity")).admin, false);
  assert.equal(check(await admin.rpc("v25_platform_identity")).admin, true);
});
test("legacy tobacco/order endpoints denied even to service role", async () => {
  assert.ok((await service.rpc("v25_create_order", { request: {} })).error);
  assert.ok(
    (await silver.rpc("v25_quote", { lines: [], lock_stock: false })).error,
  );
});
test("Silver database threshold matches CHF boundaries", async () => {
  for (const [amount, delivery] of [
    [9999, 1000],
    [10000, 0],
    [10001, 0],
  ]) {
    check(
      await service
        .from("v25_product_presentations")
        .update({ test_price_rappen: amount })
        .eq("product_id", product),
    );
    const q = check(
      await call(silver, "quote", {
        lines: [{ product_id: product, quantity: 1 }],
      }),
    );
    assert.equal(q.delivery_rappen, delivery);
    assert.equal(q.total_rappen, amount + delivery);
  }
});
test("Gold quote applies exactly one eligible discount", async () => {
  check(
    await service
      .from("v25_product_presentations")
      .update({ test_price_rappen: 9999 })
      .eq("product_id", product),
  );
  const q = check(
    await call(gold, "quote", {
      lines: [{ product_id: product, quantity: 1 }],
    }),
  );
  assert.equal(q.discount_rappen, 1000);
  assert.equal(q.delivery_rappen, 0);
});
test("duplicate cart components aggregate before stock validation", async () => {
  check(
    await service
      .from("v25_inventory")
      .update({ quantity: 3 })
      .eq("product_id", product),
  );
  assert.ok(
    (
      await call(silver, "quote", {
        lines: [
          { product_id: product, quantity: 2 },
          { product_id: product, quantity: 2 },
        ],
      })
    ).error,
  );
  check(
    await service
      .from("v25_inventory")
      .update({ quantity: 100 })
      .eq("product_id", product),
  );
});
test("tobacco and mixed orders fail in database", async () => {
  const tobacco = check(
    await service
      .from("v25_products")
      .select("id")
      .eq("adult_only", true)
      .limit(1)
      .single(),
  );
  assert.ok(
    (
      await call(silver, "quote", {
        lines: [{ product_id: tobacco.id, quantity: 1 }],
      })
    ).error,
  );
  assert.ok(
    (
      await call(gold, "quote", {
        lines: [
          { product_id: product, quantity: 1 },
          { product_id: tobacco.id, quantity: 1 },
        ],
      })
    ).error,
  );
});
test("expired verification blocks restricted access without cancelling paid Gold", async () => {
  check(
    await service
      .from("v25_member_verifications")
      .update({ status: "expired" })
      .eq("member_id", accounts.gold.id),
  );
  assert.equal(check(await gold.rpc("v25_platform_identity")).gold, true);
  assert.ok((await call(gold, "pass", { token_hash: "a".repeat(64) })).error);
  check(
    await service
      .from("v25_member_verifications")
      .update({ status: "verified", age_threshold: 18 })
      .eq("member_id", accounts.gold.id),
  );
});
test("pending verification does not block an ordinary Gold payment request", async () => {
  check(
    await service
      .from("v25_member_verifications")
      .update({ status: "pending" })
      .eq("member_id", accounts.silver.id),
  );
  const selected = check(await call(silver, "membership", { plan_id: "gold-monthly" }));
  assert.ok(selected.payment_id);
  assert.equal(check(await silver.rpc("v25_platform_identity")).gold, false);
  check(await service.from("v25_payments").update({ state: "cancelled" }).eq("id", selected.payment_id));
  check(await service.from("v25_memberships").update({ plan_id: "silver", status: "active" }).eq("member_id", accounts.silver.id));
  check(
    await service
      .from("v25_member_verifications")
      .update({ status: "verified", age_threshold: 18 })
      .eq("member_id", accounts.silver.id),
  );
});
test("scheduled cancellation retains paid Gold; cancelled status removes it", async () => {
  check(await call(gold, "cancel_membership"));
  assert.equal(check(await gold.rpc("v25_platform_identity")).gold, true);
  check(
    await service
      .from("v25_memberships")
      .update({ status: "cancelled" })
      .eq("member_id", accounts.gold.id),
  );
  assert.equal(check(await gold.rpc("v25_platform_identity")).gold, false);
  check(
    await service
      .from("v25_memberships")
      .update({ status: "active", cancel_at_period_end: false })
      .eq("member_id", accounts.gold.id),
  );
});
test("order creation is atomic and idempotent under concurrency", async () => {
  const address = check(
    await silver.from("v25_member_addresses").select("id").limit(1).single(),
  );
  const key = randomUUID();
  const doc = {
    lines: [{ product_id: product, quantity: 2 }],
    address_id: address.id,
  };
  const outcomes = await Promise.all([
    call(silver, "order", doc, key),
    call(silver, "order", doc, key),
  ]);
  order = check(outcomes[0]);
  assert.equal(check(outcomes[1]).order_id, order.order_id);
  assert.equal(
    check(
      await service
        .from("v25_inventory")
        .select("quantity")
        .eq("product_id", product)
        .single(),
    ).quantity,
    98,
  );
  assert.ok(
    (
      await call(
        silver,
        "order",
        { ...doc, lines: [{ product_id: product, quantity: 3 }] },
        key,
      )
    ).error,
  );
});
test("unpaid orders cannot enter fulfilment", async () =>
  assert.ok(
    (
      await call(admin, "order_status", {
        id: order.order_id,
        status: "preparing",
      })
    ).error,
  ));
test("reconciliation validates exact amount and deduplicates events", async () => {
  const p = check(
    await admin
      .from("v25_payments")
      .select("*")
      .eq("id", order.payment_id)
      .single(),
  );
  assert.ok(
    (
      await call(admin, "reconcile", {
        payment_id: p.id,
        state: "matched",
        amount_rappen: p.amount_rappen - 1,
        event_id: randomUUID(),
        reason: "Local test bank line",
      })
    ).error,
  );
  const doc = {
    payment_id: p.id,
    state: "matched",
    amount_rappen: p.amount_rappen,
    event_id: randomUUID(),
    reason: "Local test bank line",
  };
  check(await call(admin, "reconcile", doc));
  assert.equal(check(await call(admin, "reconcile", doc)).replayed, true);
  assert.equal(
    check(
      await silver
        .from("v25_orders")
        .select("status")
        .eq("id", order.order_id)
        .single(),
    ).status,
    "paid",
  );
});
test("paid order lifecycle and audit history", async () => {
  for (const status of ["preparing", "dispatched", "completed"])
    check(
      await call(admin, "order_status", {
        id: order.order_id,
        status,
        tracking: "LOCAL-TEST",
        notes: "Local review",
      }),
    );
  assert.ok(
    (await call(admin, "order_status", { id: order.order_id, status: "paid" }))
      .error,
  );
  const audit = check(
    await admin
      .from("v25_audit_events")
      .select("*")
      .eq("entity", "v25_orders")
      .eq("entity_id", order.order_id),
  );
  assert.ok(audit.length >= 4);
  assert.ok(
    audit.every((r) => !JSON.stringify(r.detail).includes("Teststrasse")),
  );
});
test("payment events are immutable even with service access", async () => {
  const event = check(
    await service
      .from("v25_platform_payment_events")
      .select("id")
      .eq("payment_id", order.payment_id)
      .single(),
  );
  assert.ok(
    (
      await service
        .from("v25_platform_payment_events")
        .update({ state: "failed" })
        .eq("id", event.id)
    ).error,
  );
  assert.ok(
    (
      await service
        .from("v25_platform_payment_events")
        .delete()
        .eq("id", event.id)
    ).error,
  );
});
test("staff sees named pass and duplicate redemption is blocked across venues", async () => {
  const token = createHash("sha256").update(randomUUID()).digest("hex");
  check(await call(gold, "pass", { token_hash: token }));
  const doc = { token_hash: token, venue: "restaurant" };
  const p = check(await call(staff, "pass_check", doc));
  assert.equal(p.name, "Local gold reviewer");
  assert.equal(p.eligible, true);
  assert.ok((await call(staff, "redeem", doc)).error);
  const results = await Promise.all([
    call(staff, "redeem", { ...doc, identity_confirmed: true }),
    call(staff, "redeem", {
      ...doc,
      venue: "lounge",
      identity_confirmed: true,
    }),
  ]);
  assert.equal(results.filter((r) => !r.error).length, 1);
  assert.equal(results.filter((r) => r.error).length, 1);
});
test("suspending a member revokes pass and account access", async () => {
  check(
    await call(admin, "member_state", {
      id: accounts.gold.id,
      state: "suspended",
    }),
  );
  assert.equal(check(await gold.rpc("v25_platform_identity")).active, false);
  assert.ok(
    (
      await call(gold, "quote", {
        lines: [{ product_id: product, quantity: 1 }],
      })
    ).error,
  );
  check(
    await call(admin, "member_state", {
      id: accounts.gold.id,
      state: "active",
    }),
  );
});
test("product CRUD retains independent DE FR EN fields and revision conflicts", async () => {
  const doc = blankProduct();
  doc.slug = `local-editor-${randomUUID().slice(0, 8)}`;
  doc.category = "tea";
  doc.translations.forEach((t) => (t.name = `LOCAL TEST ${t.locale}`));
  const id = check(
    await admin.rpc("v25_save_product", {
      document: doc,
      expected_revision: null,
    }),
  );
  const p = check(
    await admin.from("v25_products").select("*").eq("id", id).single(),
  );
  assert.equal(p.status, "draft");
  check(
    await admin.rpc("v25_save_product", {
      document: { ...doc, id, status: "archived" },
      expected_revision: p.revision,
    }),
  );
  assert.ok(
    (
      await admin.rpc("v25_save_product", {
        document: { ...doc, id },
        expected_revision: p.revision,
      })
    ).error,
  );
});
test("administrator cannot assign own owner role", async () =>
  assert.ok(
    (
      await call(admin, "staff", {
        id: accounts.administrator.id,
        role: "manager",
        enabled: true,
      })
    ).error,
  ));
test("signed-out JWT no longer grants database session access", async () => {
  const db = make();
  const result = await db.auth.signInWithPassword(accounts.silver);
  assert.equal(result.error, null);
  const token = result.data.session!.access_token;
  check(await db.auth.signOut({ scope: "local" }));
  const stale = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const i = check(await stale.rpc("v25_platform_identity"));
  assert.equal(i, null);
});
test("monthly and yearly fees are undiscounted and activation requires test settlement", async () => {
  for (const [plan, fee] of [
    ["gold-monthly", 6900],
    ["gold-yearly", 50000],
  ] as const) {
    if (plan === "gold-yearly")
      check(
        await service
          .from("v25_memberships")
          .update({
            status: "expired",
            period_start: "2025-01-01",
            period_end: "2026-01-01",
          })
          .eq("member_id", accounts.silver.id),
      );
    const selected = check(await call(silver, "membership", { plan_id: plan }));
    const p = check(
      await silver
        .from("v25_payments")
        .select("*")
        .eq("id", selected.payment_id)
        .single(),
    );
    assert.equal(p.amount_rappen, fee);
    assert.equal(check(await silver.rpc("v25_platform_identity")).gold, false);
    check(
      await call(admin, "reconcile", {
        payment_id: p.id,
        state: "matched",
        amount_rappen: fee,
        event_id: randomUUID(),
        reason: "Local membership payment test",
      }),
    );
    assert.equal(check(await silver.rpc("v25_platform_identity")).gold, true);
  }
});
test("bank import is atomic and duplicate transaction IDs cannot settle twice", async () => {
  check(
    await service
      .from("v25_memberships")
      .update({
        status: "expired",
        period_start: "2025-01-01",
        period_end: "2026-01-01",
      })
      .eq("member_id", accounts.silver.id),
  );
  const selected = check(
    await call(silver, "membership", { plan_id: "gold-monthly" }),
  );
  const p = check(
    await silver
      .from("v25_payments")
      .select("*")
      .eq("id", selected.payment_id)
      .single(),
  );
  const row = {
    transaction_id: randomUUID(),
    reference: p.reference,
    amount_rappen: p.amount_rappen,
    currency: "CHF",
    booked_at: "2026-09-27",
  };
  assert.ok(
    (
      await call(admin, "reconcile_import", {
        rows: [
          row,
          { ...row, transaction_id: randomUUID(), reference: "RF001" },
        ],
      })
    ).error,
  );
  assert.equal(
    check(
      await silver.from("v25_payments").select("state").eq("id", p.id).single(),
    ).state,
    "awaiting_payment",
  );
  check(await call(admin, "reconcile_import", { rows: [row] }));
  assert.ok((await call(admin, "reconcile_import", { rows: [row] })).error);
});
test("partial refund accumulates exact rappen and final refund closes order", async () => {
  const p = check(
    await admin
      .from("v25_payments")
      .select("*")
      .eq("id", order.payment_id)
      .single(),
  );
  check(
    await call(admin, "reconcile", {
      payment_id: p.id,
      state: "partially_refunded",
      amount_rappen: 100,
      event_id: randomUUID(),
      reason: "Partial local refund",
    }),
  );
  assert.equal(
    check(
      await admin
        .from("v25_payments")
        .select("refunded_rappen")
        .eq("id", p.id)
        .single(),
    ).refunded_rappen,
    100,
  );
  check(
    await call(admin, "reconcile", {
      payment_id: p.id,
      state: "refunded",
      amount_rappen: p.amount_rappen - 100,
      event_id: randomUUID(),
      reason: "Remaining local refund",
    }),
  );
  assert.equal(
    check(
      await admin
        .from("v25_orders")
        .select("status")
        .eq("id", order.order_id)
        .single(),
    ).status,
    "refunded",
  );
});

test("missing consent and empty/malformed carts are rejected", async () => {
  assert.ok(
    (await call(silver, "onboard", { name: "Local test", locale: "en" })).error,
  );
  for (const lines of [null, [], [{ product_id: product }], {}])
    assert.ok((await call(silver, "quote", { lines })).error);
});

test("editorial configuration is readable but private media data is denied to guests and members", async () => {
  const publicConfig = check(await anon.rpc("v25_editorial_public")) as {
    chapter_order: string[];
  };
  assert.equal(publicConfig.chapter_order.length, 4);
  assert.ok((await anon.from("v25_media_assets").select("*")).error);
  assert.deepEqual(
    check(await silver.from("v25_media_assets").select("*")),
    [],
  );
  assert.deepEqual(
    check(await silver.from("v25_editorial_settings").select("*")),
    [],
  );
});
test("staff and unverified owner cannot edit editorial scheduling", async () => {
  const input = check(await admin.rpc("v25_editorial_public"));
  for (const db of [silver, staff, owner])
    assert.ok((await db.rpc("v25_editorial_save", { input })).error);
});
test("admin scheduling, revision conflicts and audit history remain enforced", async () => {
  const initial = check(await admin.rpc("v25_editorial_public")) as {
    revision: number;
  };
  const saved = check(
    await admin.rpc("v25_editorial_save", {
      input: { ...initial, invitation_enabled: false },
    }),
  ) as { revision: number; invitation_enabled: boolean };
  assert.equal(saved.invitation_enabled, false);
  assert.equal(saved.revision, initial.revision + 1);
  assert.ok((await admin.rpc("v25_editorial_save", { input: initial })).error);
  const events = check(
    await admin
      .from("v25_audit_events")
      .select("id")
      .eq("entity", "v25_editorial_settings"),
  ) as unknown[];
  assert.ok(events.length > 0);
  check(
    await admin.rpc("v25_editorial_save", {
      input: { ...initial, revision: saved.revision },
    }),
  );
});
test("database rejects unsafe editorial mutations even when bypassing the API", async () => {
  const input = check(await admin.rpc("v25_editorial_public")) as Record<
    string,
    unknown
  >;
  for (const patch of [
    { invitation_enabled: null },
    { invitation_delay_ms: 0 },
    { chapter_order: ["tea", "tea", "spice", "evening"] },
    { active_film: "https://untrusted.example/movie.mp4" },
    { copy: { en: { heroTitle: null } } },
  ])
    assert.ok(
      (await admin.rpc("v25_editorial_save", { input: { ...input, ...patch } }))
        .error,
    );
});

test("guest server quote uses the same boundary calculation and rejects tobacco", async () => {
  for (const [price, shipping] of [
    [9999, 1000],
    [10000, 0],
  ] as const) {
    check(
      await service
        .from("v25_product_presentations")
        .update({ test_price_rappen: price })
        .eq("product_id", product),
    );
    const result = check(
      await anon.rpc("v25_platform_preview_quote", {
        lines: [{ product_id: product, quantity: 1 }],
      }),
    );
    assert.equal(result.delivery_rappen, shipping);
  }
  check(
    await service
      .from("v25_products")
      .update({ adult_only: true })
      .eq("id", product),
  );
  try {
    assert.ok(
      (
        await anon.rpc("v25_platform_preview_quote", {
          lines: [{ product_id: product, quantity: 1 }],
        })
      ).error,
    );
  } finally {
    check(
      await service
        .from("v25_products")
        .update({ adult_only: false })
        .eq("id", product),
    );
  }
});

test("publication requires confirmed facts and preparation in every language", async () => {
  const document = {
    ...blankProduct(),
    slug: `publication-gate-${randomUUID().slice(0, 8)}`,
    category: "tea",
    translations: blankProduct().translations.map((t) => ({
      ...t,
      name: "LOCAL GATE TEST",
      description: "LOCAL TEST",
    })),
  };
  const id = check(
    await admin.rpc("v25_save_product", { document, expected_revision: null }),
  );
  const unavailable = await admin.rpc("v25_save_product", {
    document: { ...document, id, status: "active" },
    expected_revision: 1,
  });
  assert.match(
    unavailable.error?.message || "",
    /Verified information and confirmed price/,
  );
  check(
    await admin.rpc("v25_adjust_inventory", {
      product: id,
      delta: 1,
      reason: "LOCAL publication gate test",
    }),
  );
  const complete = {
    ...document,
    id,
    status: "active",
    sku: `GATE-${randomUUID()}`,
    price_rappen: 100,
    price_confirmed: true,
    information_confirmed: true,
    weight_grams: 1,
    origin: "LOCAL TEST",
    nutrition: { energy_kj: "0 kJ · LOCAL TEST" },
    translations: document.translations.map((t) => ({
      ...t,
      ingredients: "LOCAL TEST",
      allergens: "LOCAL TEST",
      storage_instructions: "LOCAL TEST",
      preparation_instructions: t.locale === "fr" ? "" : "LOCAL TEST",
    })),
    images: [
      {
        legacy_path: "/varathans25/images/varathans25-green-tea-powder.webp",
        position: 0,
        alt: { de: "LOCAL TEST", fr: "LOCAL TEST", en: "LOCAL TEST" },
      },
    ],
  };
  const missing = await admin.rpc("v25_save_product", {
    document: complete,
    expected_revision: 1,
  });
  assert.match(missing.error?.message || "", /Verified food label/);
  for (const nutrition of [null, [], {}]) {
    const result = await admin.rpc("v25_save_product", {
      document: {
        ...complete,
        nutrition,
        translations: complete.translations.map((t) => ({
          ...t,
          preparation_instructions: "LOCAL TEST",
        })),
      },
      expected_revision: 1,
    });
    assert.match(result.error?.message || "", /Verified food label/);
  }

  const persisted = check(
    await service
      .from("v25_products")
      .select("status,information_confirmed")
      .eq("id", id)
      .single(),
  );
  assert.equal(persisted.status, "draft");
  assert.equal(persisted.information_confirmed, false);
});

test("polish settings enforce administrator access, revision checks and safe content", async () => {
  const original = check(await admin.rpc("v25_polish_public"));
  assert.ok((await anon.rpc("v25_polish_save", { input: original })).error);
  assert.ok((await silver.rpc("v25_polish_save", { input: original })).error);
  assert.ok(
    (
      await admin.rpc("v25_polish_save", {
        input: { ...original, restaurant_url: "javascript:alert(1)" },
      })
    ).error,
  );
  assert.ok(
    (
      await admin.rpc("v25_polish_save", {
        input: { ...original, spice_film: "unapproved-film" },
      })
    ).error,
  );
  assert.ok(
    (
      await admin.rpc("v25_polish_save", {
        input: { ...original, copy: { en: original.copy.en } },
      })
    ).error,
  );
  const saved = check(
    await admin.rpc("v25_polish_save", {
      input: { ...original, spice_film: "poster-only" },
    }),
  );
  try {
    assert.equal(saved.spice_film, "poster-only");
    assert.ok((await admin.rpc("v25_polish_save", { input: original })).error);
    const audit = check(
      await admin
        .from("v25_audit_events")
        .select("id")
        .eq("entity", "v25_polish_settings")
        .eq("actor", accounts.administrator.id),
    );
    assert.ok(audit.length);
  } finally {
    check(
      await admin.rpc("v25_polish_save", {
        input: { ...original, revision: saved.revision },
      }),
    );
  }
});

test("configured delivery threshold controls both charges and remaining amount", async () => {
  const original = check(
    await admin
      .from("v25_delivery_methods")
      .select("*")
      .eq("id", "standard-ch")
      .single(),
  );
  const input = {
    standard_rappen: 1250,
    threshold_rappen: 12000,
    revision: original.revision,
  };
  assert.ok(
    (
      await silver.rpc("v25_platform_action", {
        action: "delivery_settings",
        document: input,
        request_key: randomUUID(),
      })
    ).error,
  );
  check(await call(admin, "delivery_settings", input));
  try {
    assert.ok((await call(admin, "delivery_settings", input)).error);
    check(
      await service
        .from("v25_product_presentations")
        .update({ test_price_rappen: 11999 })
        .eq("product_id", product),
    );
    const q = check(
      await anon.rpc("v25_platform_preview_quote", {
        lines: [{ product_id: product, quantity: 1 }],
      }),
    );
    assert.equal(q.delivery_rappen, 1250);
    assert.equal(q.remaining_rappen, 1);
    check(
      await service
        .from("v25_product_presentations")
        .update({ test_price_rappen: 12000 })
        .eq("product_id", product),
    );
    const free = check(
      await anon.rpc("v25_platform_preview_quote", {
        lines: [{ product_id: product, quantity: 1 }],
      }),
    );
    assert.equal(free.delivery_rappen, 0);
    assert.equal(free.remaining_rappen, 0);
  } finally {
    const current = check(
      await admin
        .from("v25_delivery_methods")
        .select("revision")
        .eq("id", "standard-ch")
        .single(),
    );
    check(
      await call(admin, "delivery_settings", {
        standard_rappen: original.standard_rappen,
        threshold_rappen: original.threshold_rappen,
        revision: current.revision,
      }),
    );
  }
});
