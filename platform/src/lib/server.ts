import "server-only";
import type { ClubAccountState, ClubMembershipState } from "./club-state";
import { cookies } from "next/headers";
import { createClient, type Session } from "@supabase/supabase-js";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { config, requireLocal } from "./config";
export function supabase(token?: string, service = false) {
  const c = config();
  return createClient(c.url, service ? c.service : c.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });
}
const options = () => ({
  httpOnly: true,
  secure: !config().local,
  sameSite: "lax" as const,
  path: "/",
});
export async function session() {
  const jar = await cookies();
  const token = jar.get("v25_access")?.value;
  if (!token) return null;
  const db = supabase(token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return { db, user: data.user, token };
}
export async function setSession(s: Session) {
  const jar = await cookies();
  jar.set("v25_access", s.access_token, { ...options(), maxAge: s.expires_in });
  jar.set("v25_refresh", s.refresh_token, { ...options(), maxAge: 28800 });
}
export async function clearSession() {
  const jar = await cookies();
  jar.delete("v25_access");
  jar.delete("v25_refresh");
}
export async function csrfToken() {
  const jar = await cookies();
  let token = jar.get("v25_csrf")?.value;
  if (!token) {
    token = randomBytes(32).toString("hex");
    jar.set("v25_csrf", token, { ...options(), maxAge: 28800 });
  }
  return token;
}
export async function mutation(request: Request) {
  requireLocal();
  if (request.headers.get("origin") !== config().origin)
    throw new Error("Origin rejected");
  const cookie = (await cookies()).get("v25_csrf")?.value;
  const header = request.headers.get("x-csrf-token");
  if (
    !cookie ||
    !header ||
    cookie.length !== header.length ||
    !timingSafeEqual(Buffer.from(cookie), Buffer.from(header))
  )
    throw new Error("CSRF rejected");
}
export async function boundedBytes(request: Request, limit: number) {
  if (Number(request.headers.get("content-length") || 0) > limit)
    throw new Error("Request too large");
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new Error("Request too large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function body(request: Request) {
  return JSON.parse((await boundedBytes(request, 65536)).toString("utf8"));
}
export async function rate(key: string, max = 30) {
  const c = config();
  const hash = createHmac("sha256", c.rateKey).update(key).digest("hex");
  const { data, error } = await supabase(undefined, true).rpc(
    "v25_platform_rate_limit",
    { key_hash: hash, maximum: max },
  );
  if (error || !data) throw new Error("Rate limit");
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function failure(error: unknown) {
  const msg =
    error instanceof Error
      ? error.message
      : String((error as { message?: string })?.message || "");
  const code = /Rate limit/.test(msg)
    ? "rate"
    : /Authentication|session|JWT|login|credentials/i.test(msg)
      ? "auth"
      : /stock|quantity/i.test(msg)
        ? "stock"
        : /duplicate|already pending|Conflicting|Idempotency/i.test(msg)
          ? "duplicate"
          : /verification|verified|Pass invalid|Gold required/i.test(msg)
            ? "verification"
            : /Origin|CSRF|authorized|required|Writes disabled|unavailable/i.test(
                  msg,
                )
              ? "denied"
              : "invalid";
  console.info(JSON.stringify({ event: "request_rejected", code }));
  return json(
    { error: code },
    code === "rate"
      ? 429
      : code === "auth"
        ? 401
        : code === "denied"
          ? 403
          : 400,
  );
}
export async function identity() {
  const s = await session();
  if (!s) throw new Error("Authentication required");
  const { data, error } = await s.db.rpc("v25_platform_identity");
  if (error || !data) throw new Error("Authentication required");
  return {
    ...s,
    identity: data as {
      account_state: ClubAccountState;
      membership_state: ClubMembershipState;
      active: boolean;
      verified: boolean;
      gold: boolean;
      admin: boolean;
      staff: boolean;
      role: string | null;
    },
  };
}
