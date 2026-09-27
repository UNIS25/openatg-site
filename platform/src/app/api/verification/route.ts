import { z } from "zod";
import { body, failure, identity, json, mutation, rate } from "@/lib/server";
import { ageProvider } from "@/lib/age-provider";
export async function GET(request: Request) {
  try {
    const s = await identity();
    const url = new URL(request.url);
    if (url.searchParams.get("review") === "1") {
      if (!s.identity.admin) throw Error("Not authorized");
      const offset = z.coerce
        .number()
        .int()
        .min(0)
        .max(100000)
        .parse(url.searchParams.get("offset") || 0);
      const { data: rows, error } = await s.db
        .from("v25_member_verifications")
        .select("*")
        .order("updated_at", { ascending: false })
        .range(offset, offset + 49);
      if (error) throw error;
      const { data: members, error: memberError } = await s.db
        .from("v25_members")
        .select("id,name,state")
        .in(
          "id",
          (rows || []).map((r) => r.member_id),
        );
      if (memberError) throw memberError;
      const { data: settings, error: settingsError } = await s.db
        .from("v25_platform_settings")
        .select("admin_mfa_required")
        .single();
      if (settingsError) throw settingsError;
      return json({
        rows: (rows || []).map((r) => ({
          ...r,
          expired:
            !!r.expires_at && new Date(r.expires_at).getTime() <= Date.now(),
          member: members?.find((m) => m.id === r.member_id),
        })),
        settings,
        hasMore: rows?.length === 50,
      });
    }
    if (url.searchParams.has("history")) {
      if (!s.identity.admin) throw Error("Not authorized");
      const member = z.uuid().parse(url.searchParams.get("history"));
      const { data, error } = await s.db
        .from("v25_audit_events")
        .select("id,actor,action,created_at,detail")
        .eq("entity", "v25_member_verifications")
        .eq("entity_id", member)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return json({ events: data });
    }
    return json({
      account_state: s.identity.account_state,
      membership_state: s.identity.membership_state,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    await mutation(request);
    const s = await identity();
    const data = await body(request);
    if (data.action === "submit") {
      z.object({ action: z.literal("submit") })
        .strict()
        .parse(data);
      await rate(`verification:${s.user.id}`, 3);
      const provider = await ageProvider().createSession(s.user.id);
      const { data: result, error } = await s.db.rpc(
        "v25_verification_submit",
        { reference: provider.reference },
      );
      if (error) throw error;
      return json(result);
    }
    if (!s.identity.admin) throw new Error("Not authorized");
    await rate(`verification-review:${s.user.id}`, 30);
    if (data.action === "mfa-policy") {
      const input = z
        .object({ action: z.literal("mfa-policy"), required: z.boolean() })
        .strict()
        .parse(data);
      const { error } = await s.db.rpc("v25_verification_mfa", {
        required: input.required,
      });
      if (error) throw error;
      return json({ ok: true });
    }
    const input = z
      .object({
        action: z.literal("review"),
        member: z.uuid(),
        decision: z.enum([
          "approve",
          "reject",
          "resubmit",
          "revoke",
          "expire",
          "suspend",
        ]),
        reason: z.enum([
          "age_confirmed",
          "age_not_confirmed",
          "evidence_incomplete",
          "expired",
          "access_revoked",
          "account_suspended",
        ]),
        revision: z.int().positive(),
      })
      .strict()
      .parse(data);
    const { data: result, error } = await s.db.rpc("v25_verification_review", {
      member: input.member,
      decision: input.decision,
      reason: input.reason,
      expected_revision: input.revision,
    });
    if (error) throw error;
    return json(result);
  } catch (e) {
    return failure(e);
  }
}
