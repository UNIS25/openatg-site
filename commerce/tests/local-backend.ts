import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { TOTP, Secret } from "otpauth";
import type { Role } from "../src/domain";
export const url = process.env.SUPABASE_URL ?? "",
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
if (new URL(url).origin !== "http://127.0.0.1:57431")
  throw Error(
    "Tests require the isolated local Varathans25 backend on port 57431.",
  );
export const service = createClient(
  url,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
export function publicClient() {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export function ok<
  T extends { error: { message: string } | null; data?: unknown },
>(result: T): NonNullable<T["data"]> {
  if (result.error) throw Error(result.error.message);
  return result.data as NonNullable<T["data"]>;
}
export async function actor(role: Role | null) {
  const email = `v25-${role ?? "outsider"}-${randomBytes(6).toString("hex")}@example.invalid`,
    password = `V25!${randomBytes(24).toString("base64url")}aZ7`;
  const { user } = ok(
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    }),
  );
  if (!user) throw Error("Fixture creation failed");
  if (role)
    ok(await service.from("v25_profiles").insert({ id: user.id, role }));
  const client = publicClient();
  ok(await client.auth.signInWithPassword({ email, password }));
  return { client, id: user.id, email, password };
}
export async function mfa(client: SupabaseClient) {
  const data = ok(
    await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Test ${Date.now()}`,
    }),
  );
  const totp = new TOTP({
    secret: Secret.fromBase32(data.totp.secret),
    digits: 6,
    period: 30,
  });
  ok(
    await client.auth.mfa.challengeAndVerify({
      factorId: data.id,
      code: totp.generate(),
    }),
  );
  return data.totp.secret;
}
