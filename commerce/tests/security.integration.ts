import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { TOTP, Secret } from "otpauth";
import { service, publicClient, ok, url, key } from "./local-backend";
const credentials = JSON.parse(
  readFileSync(".local/e2e-accounts.json", "utf8"),
);
test("Storage, protected Edge Functions and cancellation", async (t) => {
  const admin = publicClient(),
    owner = publicClient(),
    anon = publicClient();
  ok(await admin.auth.signInWithPassword(credentials.admin));
  ok(
    await owner.auth.signInWithPassword({
      email: credentials.owner.email,
      password: credentials.owner.password,
    }),
  );
  const factors = ok(await owner.auth.mfa.listFactors());
  ok(
    await owner.auth.mfa.challengeAndVerify({
      factorId: factors.totp[0].id,
      code: new TOTP({
        secret: Secret.fromBase32(credentials.owner.totpSecret),
      }).generate(),
    }),
  );
  await t.test(
    "draft images are private and published images readable with short-lived URLs",
    async () => {
      const draft = ok(
        await service
          .from("v25_products")
          .select("id")
          .eq("status", "draft")
          .limit(1)
          .single(),
      );
      const path = `${draft.id}/${randomUUID()}.png`;
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=",
        "base64",
      );
      assert.ok(
        (
          await anon.storage
            .from("v25-products")
            .upload(path, png, { contentType: "image/png" })
        ).error,
      );
      ok(
        await admin.storage
          .from("v25-products")
          .upload(path, png, { contentType: "image/png" }),
      );
      ok(
        await service
          .from("v25_product_images")
          .insert({
            product_id: draft.id,
            storage_path: path,
            position: 30,
            alt: { de: "Test", fr: "Test", en: "Test" },
          }),
      );
      assert.ok(
        (await anon.storage.from("v25-products").createSignedUrl(path, 60))
          .error,
      );
      ok(await admin.storage.from("v25-products").createSignedUrl(path, 60));
      const activePath = `${credentials.productId}/${randomUUID()}.png`;
      ok(
        await admin.storage
          .from("v25-products")
          .upload(activePath, png, { contentType: "image/png" }),
      );
      ok(
        await service
          .from("v25_product_images")
          .insert({
            product_id: credentials.productId,
            storage_path: activePath,
            position: 30,
            alt: { de: "Test", fr: "Test", en: "Test" },
          }),
      );
      ok(
        await anon.storage.from("v25-products").createSignedUrl(activePath, 60),
      );
      assert.ok(
        (
          await admin.storage
            .from("v25-products")
            .upload(`${draft.id}/forbidden.svg`, Buffer.from("<svg/>"), {
              contentType: "image/svg+xml",
            })
        ).error,
      );
    },
  );
  await t.test(
    "Edge invitation rejects unauthenticated and non-owner requests",
    async () => {
      const response = await fetch(`${url}/functions/v1/invite-admin`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.invalid", role: "owner" }),
      });
      assert.equal(response.status, 401);
      const token = ok(await admin.auth.getSession()).session!.access_token;
      const denied = await fetch(`${url}/functions/v1/invite-admin`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "test@example.invalid", role: "owner" }),
      });
      assert.equal(denied.status, 403);
    },
  );
  await t.test(
    "owner invitation provisions an account through local mail only",
    async () => {
      const email = `invited-${randomUUID()}@example.invalid`;
      const { data, error } = await owner.functions.invoke("invite-admin", {
        body: { email, role: "product_editor" },
      });
      assert.equal(error, null, error?.message);
      assert.equal(data?.invited, true);
      const users = ok(await service.auth.admin.listUsers());
      const user = users.users.find((u) => u.email === email);
      assert.ok(user);
      const profile = ok(
        await service
          .from("v25_profiles")
          .select("role,invited_by")
          .eq("id", user.id)
          .single(),
      );
      assert.equal(profile.role, "product_editor");
      assert.ok(profile.invited_by);
    },
  );
  await t.test(
    "checkout Edge Function stays closed without provider configuration",
    async () => {
      const response = await fetch(`${url}/functions/v1/checkout`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: "{}",
      });
      assert.equal(response.status, 503);
      assert.equal(
        (await response.json()).error,
        "PAYMENT_PROVIDER_NOT_CONFIGURED",
      );
    },
  );
  await t.test(
    "cancellation returns reserved stock once, stale updates fail",
    async () => {
      const pending = ok(
        await service
          .from("v25_orders")
          .select("*")
          .eq("status", "pending")
          .limit(1)
          .single(),
      );
      const before = ok(
        await service
          .from("v25_inventory")
          .select("quantity")
          .eq("product_id", credentials.productId)
          .single(),
      ).quantity;
      const args = {
        order_id: pending.id,
        next_status: "cancelled",
        notes: "Synthetic cancellation test",
        tracking: "",
        expected_revision: pending.revision,
      };
      ok(await admin.rpc("v25_update_order", args));
      const after = ok(
        await service
          .from("v25_inventory")
          .select("quantity")
          .eq("product_id", credentials.productId)
          .single(),
      ).quantity;
      assert.equal(after - before, 10);
      assert.ok((await admin.rpc("v25_update_order", args)).error);
      ok(
        await admin.rpc("v25_update_order", {
          ...args,
          expected_revision: pending.revision + 1,
        }),
      );
      assert.equal(
        ok(
          await service
            .from("v25_inventory")
            .select("quantity")
            .eq("product_id", credentials.productId)
            .single(),
        ).quantity,
        after,
      );
    },
  );
});
