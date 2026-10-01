import { cookies } from "next/headers";
import { z } from "zod";
import {
  body,
  clearSession,
  csrfToken,
  failure,
  json,
  mutation,
  rate,
  session,
  setSession,
  supabase,
} from "@/lib/server";
import { config } from "@/lib/config";
export async function GET() {
  try {
    let active = !!(await session());
    const refresh = (await cookies()).get("v25_refresh")?.value;
    if (!active && refresh) {
      const { data, error } = await supabase().auth.refreshSession({
        refresh_token: refresh,
      });
      if (!error && data.session) {
        await setSession(data.session);
        active = true;
      } else await clearSession();
    }
    return json({ csrf: await csrfToken(), authenticated: active });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    await mutation(request);
    const input = await body(request);
    const action = z
      .enum([
        "login",
        "register",
        "logout",
        "reset",
        "password",
        "refresh",
        "mfa_enroll",
        "mfa_verify",
      ])
      .parse(input.action);
    // Bound all unauthenticated traffic as well as individual identities. Proxy-derived IPs are deliberately not trusted.
    await rate("auth-global", 100);
    if (input.email)
      await rate(`auth:${String(input.email).toLowerCase()}`, 12);
    const db = supabase();
    if (action === "refresh") {
      const refresh = (await cookies()).get("v25_refresh")?.value;
      if (!refresh) throw new Error("Authentication required");
      const { data, error } = await db.auth.refreshSession({
        refresh_token: refresh,
      });
      if (error || !data.session) {
        await clearSession();
        throw new Error("Authentication required");
      }
      await setSession(data.session);
      return json({ ok: true });
    }
    if (action === "logout") {
      const s = await session();
      if (s) {
        const { error } = await s.db.auth.admin.signOut(s.token, "local");
        if (error) throw error;
      }
      await clearSession();
      return json({ ok: true });
    }
    if (
      action === "mfa_enroll" ||
      action === "mfa_verify" ||
      action === "password"
    ) {
      const s = await session();
      if (!s) throw new Error("Authentication required");
      const refresh = (await cookies()).get("v25_refresh")?.value;
      const { error: se } = await s.db.auth.setSession({
        access_token: s.token,
        refresh_token: refresh!,
      });
      if (se) throw se;
      if (action === "password") {
        const password = z.string().min(14).max(128).parse(input.password);
        const { error } = await s.db.auth.updateUser({ password });
        if (error) throw error;
        return json({ ok: true });
      }
      if (action === "mfa_enroll") {
        const { data, error } = await s.db.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "Varathans25 authenticator",
        });
        if (error) throw error;
        return json(data);
      }
      const { data, error } = await s.db.auth.mfa.challengeAndVerify({
        factorId: z.string().uuid().parse(input.factor_id),
        code: z
          .string()
          .regex(/^\d{6}$/)
          .parse(input.code),
      });
      if (error) throw error;
      await setSession(data as unknown as Parameters<typeof setSession>[0]);
      return json({ ok: true });
    }
    const email = z.email().max(254).parse(input.email);
    const locale = z.enum(["de", "fr", "en"]).catch("de").parse(input.locale);
    if (action === "reset") {
      await db.auth.resetPasswordForEmail(email, {
        redirectTo: `${config().origin}/auth/callback?locale=${locale}`,
      });
      return json({ ok: true });
    }
    const password = z.string().min(14).max(128).parse(input.password);
    if (action === "register") {
      z.literal(true).parse(input.consent);
      const name = z.string().min(1).max(120).parse(input.name);
      const { error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { name, locale },
          emailRedirectTo: `${config().origin}/auth/callback?locale=${locale}${input.next === "bag" ? "&next=bag" : ""}`,
        },
      });
      if (error) throw error;
      return json({ ok: true, confirmation: true });
    }
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) throw new Error("Invalid login credentials");
    await setSession(data.session);
    return json({
      ok: true,
      factors:
        data.user?.factors
          ?.filter((f) => f.factor_type === "totp" && f.status === "verified")
          .map((f) => ({ id: f.id })) || [],
    });
  } catch (e) {
    return failure(e);
  }
}
