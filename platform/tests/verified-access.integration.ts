import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const url = process.env.SUPABASE_URL!;
if (url !== "http://127.0.0.1:58531") throw Error("Local tests only");
const make = (key = process.env.SUPABASE_ANON_KEY!) =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const service = make(process.env.SUPABASE_SERVICE_ROLE_KEY);
const fixtures = JSON.parse(
  readFileSync(".local/review-accounts.json", "utf8"),
);
let admin: SupabaseClient, member: SupabaseClient, other: SupabaseClient;
let memberId: string, otherId: string;
const checked = <T extends { error: unknown; data: unknown }>(result: T) => {
  assert.equal(result.error, null);
  return result.data as NonNullable<T["data"]>;
};
const action = (db: SupabaseClient, name: string, document = {}) =>
  db.rpc("v25_platform_action", {
    action: name,
    document,
    request_key: randomUUID(),
  });
async function createMember() {
  const email = `verified-access-${randomUUID()}@v25.local.test`,
    password = `Test!${randomUUID()}Aa1`;
  const user = checked(
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    }),
  ).user;
  const db = make();
  checked(await db.auth.signInWithPassword({ email, password }));
  checked(
    await action(db, "onboard", {
      name: "Local verification test",
      locale: "de",
      consent: true,
    }),
  );
  return { db, id: user!.id };
}
async function review(decision: string, reason: string) {
  const row = checked(
    await service
      .from("v25_member_verifications")
      .select("revision")
      .eq("member_id", memberId)
      .single(),
  );
  return admin.rpc("v25_verification_review", {
    member: memberId,
    decision,
    reason,
    expected_revision: row.revision,
  });
}
before(async () => {
  admin = make();
  checked(await admin.auth.signInWithPassword(fixtures.administrator));
  const one = await createMember(),
    two = await createMember();
  member = one.db;
  memberId = one.id;
  other = two.db;
  otherId = two.id;
});
test("new registered account has Silver but no age verification", async () => {
  const state = checked(await member.rpc("v25_platform_identity"));
  assert.equal(state.account_state, "registered_unverified");
  assert.equal(state.membership_state, "silver");
  assert.equal(state.verified, false);
});
test("no self approval through current or retained legacy RPC", async () => {
  assert.ok(
    (await action(member, "test_verification", { status: "verified" })).error,
  );
  assert.ok(
    (
      await action(member, "verification_review", {
        id: memberId,
        status: "verified",
      })
    ).error,
  );
  assert.ok(
    (
      await member.rpc("v25_verification_review", {
        member: memberId,
        decision: "approve",
        reason: "age_confirmed",
        expected_revision: 1,
      })
    ).error,
  );
  assert.ok(
    (
      await member.schema("v25_private").rpc("platform_action_legacy", {
        action: "test_verification",
        document: { status: "verified" },
      })
    ).error,
  );
});
test("RLS rejects status, membership and administrator escalation and cross-user reads", async () => {
  for (const [table, value] of [
    ["v25_member_verifications", { status: "verified" }],
    ["v25_memberships", { status: "active" }],
    ["v25_members", { state: "active" }],
  ] as const)
    assert.ok(
      (
        await member
          .from(table)
          .update(value)
          .eq(table === "v25_members" ? "id" : "member_id", memberId)
      ).error,
    );
  assert.ok(
    (
      await member
        .from("v25_profiles")
        .insert({ id: memberId, role: "owner", enabled: true })
    ).error,
  );
  assert.deepEqual(
    checked(
      await member
        .from("v25_member_verifications")
        .select("*")
        .eq("member_id", otherId),
    ),
    [],
  );
  assert.deepEqual(
    checked(await member.from("v25_audit_events").select("*")),
    [],
  );
  assert.ok(
    (
      await member
        .from("v25_audit_events")
        .insert({ action: "approve", entity: "fake", entity_id: memberId })
    ).error,
  );
});
test("submission stays pending while ordinary Silver remains available", async () => {
  checked(
    await member.rpc("v25_verification_submit", {
      reference: `local-review-${randomUUID()}`,
    }),
  );
  const state = checked(await member.rpc("v25_platform_identity"));
  assert.equal(state.account_state, "verification_pending");
  assert.equal(state.verified, false);
  assert.equal(state.membership_state, "silver");
  checked(await action(member, "membership", { plan_id: "silver" }));
  assert.equal(checked(await member.rpc("v25_platform_identity")).membership_state, "silver");
  assert.ok(
    (
      await member.rpc("v25_verification_submit", {
        reference: `local-review-${randomUUID()}`,
      })
    ).error,
  );
});
test("review requires current revision and independent administrator", async () => {
  assert.ok(
    (
      await admin.rpc("v25_verification_review", {
        member: memberId,
        decision: "approve",
        reason: "age_confirmed",
        expected_revision: 999,
      })
    ).error,
  );
  assert.ok(
    (
      await other.rpc("v25_verification_review", {
        member: memberId,
        decision: "approve",
        reason: "age_confirmed",
        expected_revision: 2,
      })
    ).error,
  );
  const self = checked(await admin.auth.getUser()).user!.id;
  const row = checked(
    await admin
      .from("v25_member_verifications")
      .select("revision")
      .eq("member_id", self)
      .single(),
  );
  assert.ok(
    (
      await admin.rpc("v25_verification_review", {
        member: self,
        decision: "approve",
        reason: "age_confirmed",
        expected_revision: row.revision,
      })
    ).error,
  );
  checked(await review("approve", "age_confirmed"));
  const state = checked(await member.rpc("v25_platform_identity"));
  assert.equal(state.account_state, "verified_18_plus");
  assert.equal(state.membership_state, "silver");
  const verification = checked(
    await member.from("v25_member_verifications").select("*").single(),
  );
  assert.equal(verification.age_threshold, 18);
  assert.equal(verification.is_test, true);
  assert.ok(verification.reviewer_id);
  assert.ok(verification.submitted_at);
  assert.ok(verification.decided_at);
});
test("verified user selects Silver separately and receives active Silver state", async () => {
  checked(await action(member, "membership", { plan_id: "silver" }));
  assert.equal(
    checked(await member.rpc("v25_platform_identity")).membership_state,
    "silver",
  );
});
test("Gold test selection waits for exact authorized test payment", async () => {
  const result = checked(
    await action(member, "membership", { plan_id: "gold-monthly" }),
  );
  assert.equal(checked(await member.rpc("v25_platform_identity")).gold, false);
  const payment = checked(
    await member
      .from("v25_payments")
      .select("*")
      .eq("id", result.payment_id)
      .single(),
  );
  assert.equal(payment.is_test, true);
  assert.equal(payment.amount_rappen, 6900);
  assert.ok(
    (
      await action(member, "reconcile", {
        id: payment.id,
        reason: "Local test",
      })
    ).error,
  );
  checked(
    await action(admin, "reconcile", {
      payment_id: payment.id,
      state: "matched",
      amount_rappen: payment.amount_rappen,
      event_id: randomUUID(),
      reason: "Local test membership review",
    }),
  );
  const state = checked(await member.rpc("v25_platform_identity"));
  assert.equal(state.membership_state, "gold");
  assert.equal(state.gold, true);
});
test("revocation removes restricted access while preserving paid ordinary benefits", async () => {
  checked(await review("revoke", "access_revoked"));
  const state = checked(await member.rpc("v25_platform_identity"));
  assert.equal(state.account_state, "verification_rejected");
  assert.equal(state.gold, true);
  assert.equal(state.membership_state, "gold");
  checked(await action(member, "membership", { plan_id: "silver" }));
});
test("expiry, rejection and suspension remain distinct states", async () => {
  checked(await review("expire", "expired"));
  assert.equal(
    checked(await member.rpc("v25_platform_identity")).account_state,
    "verification_expired",
  );
  checked(await review("reject", "age_not_confirmed"));
  assert.equal(
    checked(await member.rpc("v25_platform_identity")).account_state,
    "verification_rejected",
  );
  checked(await review("suspend", "account_suspended"));
  assert.equal(
    checked(await member.rpc("v25_platform_identity")).account_state,
    "suspended",
  );
  assert.ok(
    (
      await member.rpc("v25_verification_submit", {
        reference: `local-review-${randomUUID()}`,
      })
    ).error,
  );
});
test("past-due, cancelled and suspended memberships cannot confer Gold or verification", async () => {
  for (const [status, expected] of [
    ["past_due", "gold_past_due"],
    ["cancelled", "gold_cancelled"],
    ["suspended", "membership_suspended"],
  ]) {
    checked(
      await service.from("v25_memberships").update({ status }).eq("member_id", memberId),
    );
    const state = checked(await member.rpc("v25_platform_identity"));
    assert.equal(state.membership_state, expected);
    assert.equal(state.account_state, "suspended");
    assert.equal(state.gold, false);
    assert.equal(state.verified, false);
    assert.ok((await action(member, "membership", { plan_id: "silver" })).error);
  }
});
test("resubmission clears a prior rejection but remains pending for independent review", async () => {
  const fresh = await createMember();
  checked(
    await service.from("v25_member_verifications").update({
      status: "resubmission_required",
      decision_reason: "evidence_incomplete",
    }).eq("member_id", fresh.id),
  );
  assert.equal(
    checked(await fresh.db.rpc("v25_platform_identity")).account_state,
    "verification_rejected",
  );
  checked(await fresh.db.rpc("v25_verification_submit", {
    reference: `local-review-${randomUUID()}`,
  }));
  const state = checked(await fresh.db.rpc("v25_platform_identity"));
  assert.equal(state.account_state, "verification_pending");
  assert.equal(state.verified, false);
  const row = checked(await fresh.db.from("v25_member_verifications").select("*").single());
  assert.equal(row.decision_reason, null);
  assert.equal(row.reviewer_id, null);
  assert.equal(row.age_threshold, null);
  await fresh.db.auth.signOut();
});
test("review history is append-only and inaccessible to ordinary users", async () => {
  const events = checked(
    await admin
      .from("v25_audit_events")
      .select("id,action,detail")
      .eq("entity_id", memberId)
      .like("action", "verification_%"),
  );
  assert.ok(events.length >= 5);
  assert.ok(events.some((e) => e.action === "verification_approve"));
  assert.ok(
    (await service.from("v25_audit_events").delete().eq("id", events[0].id))
      .error,
  );
  assert.deepEqual(
    checked(
      await other
        .from("v25_member_verifications")
        .select("*")
        .eq("member_id", memberId),
    ),
    [],
  );
});
test("sign out revokes even an already issued access token at the database boundary", async () => {
  const token = checked(await other.auth.getSession()).session!.access_token;
  assert.equal((await other.auth.signOut()).error, null);
  const stale = createClient(url, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  assert.equal(checked(await stale.rpc("v25_platform_identity")), null);
});
