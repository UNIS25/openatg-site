import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import {
  service,
  publicClient,
  actor,
  mfa,
  ok,
  url,
  key,
} from "./local-backend";
import { blankProduct, type ProductDocument } from "../src/domain";
const denied = (r: { error: unknown }) =>
  assert.ok(r.error, "Expected backend denial");
test("Real Supabase authentication, RLS and commerce", async (t) => {
  const owner = await actor("owner"),
    admin = await actor("administrator"),
    editor = await actor("product_editor"),
    manager = await actor("order_manager"),
    outsider = await actor(null),
    anon = publicClient();
  await t.test("public signup is disabled", async () => {
    denied(
      await anon.auth.signUp({
        email: `v25-${randomUUID()}@example.invalid`,
        password: `Complex!${randomUUID()}9Aa`,
      }),
    );
  });
  await t.test(
    "owner cannot bypass TOTP with a password-only session",
    async () => {
      denied(await owner.client.rpc("v25_dashboard"));
      assert.equal(
        ok(await owner.client.from("v25_products").select("id")).length,
        0,
      );
    },
  );
  const totpSecret = await mfa(owner.client);
  await t.test(
    "MFA grants owner access and invitation-only profiles enforce roles",
    async () => {
      ok(await owner.client.rpc("v25_owner_authorized"));
      denied(await admin.client.rpc("v25_owner_authorized"));
      denied(await outsider.client.rpc("v25_dashboard"));
      denied(await anon.rpc("v25_dashboard"));
    },
  );
  const doc: ProductDocument = {
    ...blankProduct(),
    slug: `test-cigar-${randomUUID()}`,
    sku: `TEST-${randomUUID()}`,
    brand: "Patoro",
    adult_only: true,
    price_rappen: 2500,
    origin: "Test fixture",
    information_confirmed: true,
    price_confirmed: true,
    available: true,
  };
  doc.translations = doc.translations.map((tr) => ({
    ...tr,
    name: "Synthetic cigar fixture",
    description: "Synthetic local test data.",
  }));
  let id = "";
  await t.test(
    "product editor can create drafts; order manager and anonymous cannot",
    async () => {
      id = ok(await editor.client.rpc("v25_save_product", { document: doc }));
      denied(
        await manager.client.rpc("v25_save_product", {
          document: { ...doc, slug: "forbidden" },
        }),
      );
      denied(await anon.rpc("v25_save_product", { document: doc }));
    },
  );
  await t.test(
    "public tables, profiles, settings, customer information and drafts stay private",
    async () => {
      for (const table of [
        "v25_products",
        "v25_product_translations",
        "v25_inventory",
        "v25_customers",
        "v25_orders",
        "v25_store_settings",
        "v25_audit_events",
        "v25_profiles",
      ])
        denied(await anon.from(table).select("*"));
      assert.equal(
        ok(await outsider.client.from("v25_products").select("*")).length,
        0,
      );
      assert.equal(
        ok(await manager.client.from("v25_products").select("*")).length,
        0,
      );
      assert.ok(
        !ok(await anon.rpc("v25_catalogue")).some(
          (p: { id: string }) => p.id === id,
        ),
      );
      denied(
        await editor.client
          .from("v25_products")
          .update({ price_rappen: 1 })
          .eq("id", id),
      );
      denied(
        await editor.client
          .from("v25_profiles")
          .update({ role: "owner" })
          .eq("id", editor.id),
      );
    },
  );
  await t.test(
    "stock adjustments are atomic, reasoned and cannot make stock negative",
    async () => {
      denied(
        await editor.client.rpc("v25_adjust_inventory", {
          product: id,
          delta: 5,
          reason: "",
        }),
      );
      ok(
        await editor.client.rpc("v25_adjust_inventory", {
          product: id,
          delta: 20,
          reason: "Synthetic opening stock",
          threshold: 3,
        }),
      );
      denied(
        await editor.client.rpc("v25_adjust_inventory", {
          product: id,
          delta: -21,
          reason: "Reject negative",
        }),
      );
      assert.equal(
        ok(
          await editor.client
            .from("v25_inventory")
            .select("quantity")
            .eq("product_id", id)
            .single(),
        ).quantity,
        20,
      );
      denied(
        await manager.client.rpc("v25_adjust_inventory", {
          product: id,
          delta: 1,
          reason: "Forbidden adjustment",
        }),
      );
    },
  );
  await t.test(
    "publication requires complete data and an administrator; edits enforce revisions",
    async () => {
      denied(
        await editor.client.rpc("v25_save_product", {
          document: { ...doc, id, status: "active" },
          expected_revision: 1,
        }),
      );
      denied(
        await admin.client.rpc("v25_save_product", {
          document: {
            ...doc,
            id,
            status: "active",
            translations: doc.translations.slice(0, 2),
          },
          expected_revision: 1,
        }),
      );
      ok(
        await admin.client.rpc("v25_save_product", {
          document: { ...doc, id, status: "active" },
          expected_revision: 1,
        }),
      );
      denied(
        await admin.client.rpc("v25_save_product", {
          document: { ...doc, id },
          expected_revision: 1,
        }),
      );
      const catalogue = ok(await anon.rpc("v25_catalogue"));
      assert.ok(catalogue.some((p: { id: string }) => p.id === id));
      assert.ok(!("inventory" in catalogue[0]));
    },
  );
  await t.test(
    "duplicate, archive and restore remain drafts until reapproved",
    async () => {
      const duplicate = ok(
        await editor.client.rpc("v25_duplicate_product", {
          product: id,
          new_slug: `duplicate-${randomUUID()}`,
          new_sku: null,
        }),
      );
      const p = ok(
        await editor.client
          .from("v25_products")
          .select("*")
          .eq("id", duplicate)
          .single(),
      );
      assert.equal(p.status, "draft");
      assert.equal(p.information_confirmed, false);
      ok(
        await editor.client.rpc("v25_save_product", {
          document: {
            ...doc,
            id: duplicate,
            sku: null,
            slug: p.slug,
            status: "archived",
          },
          expected_revision: p.revision,
        }),
      );
      ok(
        await editor.client.rpc("v25_save_product", {
          document: {
            ...doc,
            id: duplicate,
            sku: null,
            slug: p.slug,
            status: "draft",
          },
          expected_revision: p.revision + 1,
        }),
      );
    },
  );
  await t.test(
    "settings have the exact threshold, unknown delivery and disabled payment defaults",
    async () => {
      const s = ok(
        await owner.client.from("v25_store_settings").select("*").single(),
      );
      assert.equal(s.free_delivery_threshold_rappen, 10000);
      assert.equal(s.standard_delivery_rappen, null);
      assert.equal(s.payment_enabled, false);
      assert.equal(s.tobacco_checkout_enabled, false);
      denied(
        await editor.client.rpc("v25_save_settings", {
          document: { standard_delivery_rappen: 790 },
          expected_revision: s.revision,
        }),
      );
      denied(
        await admin.client.rpc("v25_save_settings", {
          document: {
            payment_enabled: true,
            payment_provider_reference: "test",
          },
          expected_revision: s.revision,
        }),
      );
      ok(
        await admin.client.rpc("v25_save_settings", {
          document: {
            standard_delivery_rappen: 790,
            adult_delivery_rappen: 1500,
          },
          expected_revision: s.revision,
        }),
      );
    },
  );
  const single = [{ kind: "single", product_id: id, quantity: 1 }],
    box = (size: 4 | 6) => [
      { kind: "box", size, product_ids: Array(size).fill(id), quantity: 1 },
    ];
  await t.test(
    "single cigars and 4/6 boxes require confirmation and reject incomplete or excessive aggregate stock",
    async () => {
      denied(
        await anon.rpc("v25_quote", { lines: single, adult_confirmed: false }),
      );
      assert.equal(
        ok(
          await anon.rpc("v25_quote", { lines: single, adult_confirmed: true }),
        ).subtotal_rappen,
        2500,
      );
      for (const size of [4, 6] as const) {
        const q = ok(
          await anon.rpc("v25_quote", {
            lines: box(size),
            adult_confirmed: true,
          }),
        );
        assert.equal(q.subtotal_rappen, size * 2500);
        assert.equal(q.discount_rappen, 0);
        assert.equal(q.delivery_rappen, 0);
        assert.equal(q.adult_delivery_rappen, 1500);
        assert.equal(q.allocations[id], size);
        assert.equal(q.purchasable, false);
      }
      denied(
        await anon.rpc("v25_quote", {
          lines: [{ ...box(4)[0], product_ids: [id, id, id] }],
          adult_confirmed: true,
        }),
      );
      denied(
        await anon.rpc("v25_quote", {
          lines: [
            { ...box(6)[0], quantity: 3 },
            { ...single[0], quantity: 3 },
          ],
          adult_confirmed: true,
        }),
      );
      denied(
        await anon.rpc("v25_quote", {
          lines: [{ kind: "box", product_ids: [id], quantity: 1 }],
          adult_confirmed: true,
        }),
      );
    },
  );
  await t.test(
    "mixed Patoro and Davidoff boxes retain duplicate selections",
    async () => {
      const second = {
        ...doc,
        slug: `test-davidoff-${randomUUID()}`,
        sku: `TEST-${randomUUID()}`,
        brand: "Davidoff",
        price_rappen: 3000,
      };
      const other = ok(
        await admin.client.rpc("v25_save_product", { document: second }),
      );
      ok(
        await admin.client.rpc("v25_adjust_inventory", {
          product: other,
          delta: 4,
          reason: "Synthetic mixed-box stock",
        }),
      );
      ok(
        await admin.client.rpc("v25_save_product", {
          document: { ...second, id: other, status: "active" },
          expected_revision: 1,
        }),
      );
      const q = ok(
        await anon.rpc("v25_quote", {
          lines: [
            {
              kind: "box",
              size: 4,
              product_ids: [id, other, id, other],
              quantity: 1,
            },
          ],
          adult_confirmed: true,
        }),
      );
      assert.equal(q.subtotal_rappen, 11000);
      assert.equal(q.allocations[id], 2);
      assert.equal(q.allocations[other], 2);
      ok(
        await admin.client.rpc("v25_save_product", {
          document: { ...second, id: other, status: "archived" },
          expected_revision: 2,
        }),
      );
    },
  );
  await t.test("SQL delivery boundary matches integer cart math", async () => {
    for (const price of [9999, 10000, 10001]) {
      ok(
        await service
          .from("v25_products")
          .update({ price_rappen: price })
          .eq("id", id),
      );
      const q = ok(
        await anon.rpc("v25_quote", { lines: single, adult_confirmed: true }),
      );
      assert.equal(q.delivery_rappen, price < 10000 ? 790 : 0);
      assert.equal(q.remaining_rappen, price < 10000 ? 1 : 0);
      assert.equal(q.adult_delivery_rappen, 1500);
    }
    ok(
      await service
        .from("v25_products")
        .update({ price_rappen: 2500 })
        .eq("id", id),
    );
  });
  const request = {
    idempotency_key: randomUUID(),
    locale: "en",
    email: "synthetic-order@example.invalid",
    name: "Synthetic Test Customer",
    address: {
      line1: "Synthetic test address",
      postal_code: "6210",
      city: "Test fixture",
      country: "CH",
    },
    lines: box(4),
    adult_confirmed: true,
  };
  await t.test(
    "checkout creation is server-only and closed by default",
    async () => {
      denied(await anon.rpc("v25_create_order", { request }));
      denied(await admin.client.rpc("v25_create_order", { request }));
      denied(await service.rpc("v25_create_order", { request }));
    },
  );
  // Local-only provider and legal references exercise the backend. They are not production approvals.
  ok(
    await service
      .from("v25_store_settings")
      .update({
        payment_enabled: true,
        tax_configuration_confirmed: true,
        store_available: true,
        payment_provider_reference: "LOCAL TEST ONLY",
        tobacco_checkout_enabled: true,
        legal_review_reference: "LOCAL TEST ONLY",
        age_verification_reference: "LOCAL TEST ONLY",
        adult_delivery_reference: "LOCAL TEST ONLY",
      })
      .eq("id", true),
  );
  await t.test(
    "18+ display confirmation is never accepted as identity verification",
    async () => {
      denied(await service.rpc("v25_create_order", { request }));
    },
  );
  const { createHash } = await import("node:crypto");
  const age = ok(
    await service
      .from("v25_age_verifications")
      .insert({
        subject_hash: createHash("sha256").update(request.email).digest("hex"),
        provider_reference: randomUUID(),
        expires_at: new Date(Date.now() + 60000).toISOString(),
      })
      .select("id")
      .single(),
  );
  const verified = { ...request, age_verification_id: age.id };
  let orderId = "";
  await t.test(
    "transactional order stores exact box composition, reserves stock once and rejects idempotency changes",
    async () => {
      orderId = ok(
        await service.rpc("v25_create_order", { request: verified }),
      );
      assert.equal(
        ok(await service.rpc("v25_create_order", { request: verified })),
        orderId,
      );
      denied(
        await service.rpc("v25_create_order", {
          request: { ...verified, name: "Changed" },
        }),
      );
      const items = ok(
        await manager.client
          .from("v25_order_items")
          .select("id,bundle_size")
          .eq("order_id", orderId),
      );
      assert.equal(items[0].bundle_size, 4);
      assert.equal(
        ok(
          await manager.client
            .from("v25_cigar_bundle_items")
            .select("*")
            .eq("order_item_id", items[0].id),
        ).length,
        4,
      );
      assert.equal(
        ok(
          await editor.client
            .from("v25_inventory")
            .select("quantity")
            .eq("product_id", id)
            .single(),
        ).quantity,
        16,
      );
    },
  );
  await t.test("concurrent reservations cannot oversell", async () => {
    const req = {
      ...verified,
      lines: [{ kind: "single", product_id: id, quantity: 10 }],
    };
    const results = await Promise.all([
      service.rpc("v25_create_order", {
        request: { ...req, idempotency_key: randomUUID() },
      }),
      service.rpc("v25_create_order", {
        request: { ...req, idempotency_key: randomUUID() },
      }),
    ]);
    assert.equal(results.filter((r) => !r.error).length, 1);
    assert.equal(
      ok(
        await service
          .from("v25_inventory")
          .select("quantity")
          .eq("product_id", id)
          .single(),
      ).quantity,
      6,
    );
  });
  await t.test(
    "product editors and unrelated users cannot read customer or order data",
    async () => {
      for (const user of [editor.client, outsider.client])
        for (const table of [
          "v25_orders",
          "v25_customers",
          "v25_addresses",
          "v25_order_items",
          "v25_cigar_bundle_items",
        ])
          assert.equal(ok(await user.from(table).select("*")).length, 0);
    },
  );
  await t.test(
    "order transitions require verified payments, expected revision and tracking",
    async () => {
      const args = {
        order_id: orderId,
        next_status: "paid",
        notes: "",
        tracking: "",
        expected_revision: 1,
      };
      denied(await manager.client.rpc("v25_update_order", args));
      denied(
        await editor.client.rpc("v25_update_order", {
          ...args,
          next_status: "cancelled",
        }),
      );
      const order = ok(
        await service
          .from("v25_orders")
          .select("total_rappen")
          .eq("id", orderId)
          .single(),
      );
      const payment = {
        order_id: orderId,
        event_id: randomUUID(),
        payment_reference: `local-test-${randomUUID()}`,
        event: "paid",
        amount_rappen: order.total_rappen,
        currency: "CHF",
      };
      denied(await admin.client.rpc("v25_payment_event", payment));
      denied(
        await service.rpc("v25_payment_event", { ...payment, currency: null }),
      );
      denied(
        await service.rpc("v25_payment_event", {
          ...payment,
          payment_reference: null,
        }),
      );
      denied(
        await service.rpc("v25_payment_event", {
          ...payment,
          amount_rappen: 1,
        }),
      );
      ok(await service.rpc("v25_payment_event", payment));
      ok(await service.rpc("v25_payment_event", payment));
      ok(
        await manager.client.rpc("v25_update_order", {
          ...args,
          next_status: "preparing",
          expected_revision: 2,
        }),
      );
      denied(
        await manager.client.rpc("v25_update_order", {
          ...args,
          next_status: "dispatched",
          expected_revision: 3,
        }),
      );
      ok(
        await manager.client.rpc("v25_update_order", {
          ...args,
          next_status: "dispatched",
          tracking: "SYNTHETIC-TRACKING",
          expected_revision: 3,
        }),
      );
      ok(
        await manager.client.rpc("v25_update_order", {
          ...args,
          next_status: "completed",
          tracking: "SYNTHETIC-TRACKING",
          expected_revision: 4,
        }),
      );
      ok(
        await service.rpc("v25_payment_event", {
          ...payment,
          event_id: randomUUID(),
          event: "refunded",
        }),
      );
    },
  );
  await t.test(
    "audit log captures mutations and cannot be rewritten by any administrator",
    async () => {
      const events = ok(
        await owner.client
          .from("v25_audit_events")
          .select("*")
          .eq("entity_id", orderId),
      );
      assert.ok(events.some((e) => e.detail.status_after === "paid"));
      assert.ok(events.some((e) => e.detail.status_after === "refunded"));
      assert.ok(!JSON.stringify(events).includes(request.email));
      denied(await owner.client.from("v25_audit_events").delete().gt("id", 0));
      denied(
        await owner.client
          .from("v25_audit_events")
          .insert({ action: "FAKE", entity: "test", entity_id: "test" }),
      );
      assert.equal(
        ok(await manager.client.from("v25_audit_events").select("*")).length,
        0,
      );
    },
  );
  await t.test(
    "all nine content fields round-trip independently, with private supplier, blank legal fields and audit records",
    async () => {
      const multilingual = {
        ...blankProduct(),
        slug: `languages-${randomUUID()}`,
        supplier: "LOCAL fixture supplier",
      };
      multilingual.translations = multilingual.translations.map((tr) => ({
        ...tr,
        name: `Name ${tr.locale}`,
        short_description: `Short ${tr.locale}`,
        description: `Full ${tr.locale}`,
        preparation_instructions: `Use ${tr.locale}`,
        seo_title: `SEO ${tr.locale}`,
        seo_description: `SEO description ${tr.locale}`,
      }));
      const product = ok(
        await editor.client.rpc("v25_save_product", { document: multilingual }),
      );
      const translations = () =>
        admin.client
          .from("v25_product_translations")
          .select("*")
          .eq("product_id", product)
          .order("locale");
      const before = ok(await translations());
      for (const row of before) {
        const expected = multilingual.translations.find(
          (tr) => tr.locale === row.locale,
        )!;
        for (const [key, value] of Object.entries(expected))
          assert.equal(row[key], value);
        assert.equal(row.ingredients, "");
        assert.equal(row.allergens, "");
      }
      assert.equal(
        ok(
          await admin.client
            .from("v25_products")
            .select("supplier")
            .eq("id", product)
            .single(),
        ).supplier,
        multilingual.supplier,
      );
      multilingual.translations[1].short_description =
        "FR edited independently";
      ok(
        await editor.client.rpc("v25_save_product", {
          document: { ...multilingual, id: product },
          expected_revision: 1,
        }),
      );
      const after = ok(await translations());
      assert.equal(
        after.find((tr) => tr.locale === "fr").short_description,
        "FR edited independently",
      );
      assert.deepEqual(
        after.filter((tr) => tr.locale !== "fr"),
        before.filter((tr) => tr.locale !== "fr"),
      );
      const duplicate = ok(
        await editor.client.rpc("v25_duplicate_product", {
          product,
          new_slug: `languages-copy-${randomUUID()}`,
          new_sku: null,
        }),
      );
      const copied = ok(
        await admin.client
          .from("v25_product_translations")
          .select("*")
          .eq("product_id", duplicate)
          .order("locale"),
      );
      assert.deepEqual(
        copied.map((tr) => ({ ...tr, product_id: null })),
        after.map((tr) => ({ ...tr, product_id: null })),
      );
      denied(
        await anon
          .from("v25_product_translations")
          .select("seo_title,ingredients"),
      );
      assert.equal(
        ok(
          await manager.client
            .from("v25_product_translations")
            .select("seo_title,ingredients"),
        ).length,
        0,
      );
      assert.equal(
        ok(await editor.client.from("v25_customers").select("id,name,email"))
          .length,
        0,
      );
      assert.ok(
        !ok(await anon.rpc("v25_catalogue")).some(
          (p: { id: string }) => p.id === product,
        ),
      );
      const audit = ok(
        await admin.client
          .from("v25_audit_events")
          .select("action,entity")
          .eq("entity_id", product),
      );
      assert.ok(
        audit.some(
          (row) => row.action === "UPDATE" && row.entity === "v25_products",
        ),
      );
    },
  );
  await t.test(
    "session revocation takes effect even before access JWT expiry",
    async () => {
      const token = ok(await editor.client.auth.getSession()).session!
        .access_token;
      ok(await editor.client.auth.signOut());
      const response = await fetch(`${url}/rest/v1/rpc/v25_dashboard`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      assert.equal(response.status, 403);
    },
  );
  await t.test(
    "disabling a profile revokes role access immediately",
    async () => {
      ok(
        await owner.client.rpc("v25_change_access", {
          profile_id: manager.id,
          new_role: "order_manager",
          is_enabled: false,
        }),
      );
      denied(await manager.client.rpc("v25_dashboard"));
    },
  );
  ok(
    await service
      .from("v25_store_settings")
      .update({
        payment_enabled: false,
        tobacco_checkout_enabled: false,
        store_available: false,
      })
      .eq("id", true),
  );
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/e2e-accounts.json",
    JSON.stringify({
      admin: { email: admin.email, password: admin.password },
      owner: { email: owner.email, password: owner.password, totpSecret },
      productId: id,
    }),
    { mode: 0o600 },
  );
});
