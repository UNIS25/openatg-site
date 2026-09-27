import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSession, rate, setSession, supabase } from "@/lib/server";
import { config } from "@/lib/config";
export async function GET(request: Request) {
  const url = new URL(request.url),
    requested = url.searchParams.get("next") || "/de/account";
  const next =
    /^\/(de|fr|en)\/(club(?:\/(collection|membership|account|member))?|membership|account|admin(?:\/verification)?|verify-age|verification-pending|verification-result)$/.test(
      requested,
    )
      ? requested
      : "/de/account";
  const locale = next.split("/")[1];
  try {
    const token = (await cookies()).get("v25_refresh")?.value;
    if (!token) throw Error("Session required");
    await rate(`session-refresh:${token}`, 10);
    const { data, error } = await supabase().auth.refreshSession({
      refresh_token: token,
    });
    if (error || !data.session) throw Error("Session required");
    // The database enforces absolute expiry independently of the Auth token lifetime.
    // Do not create a refresh/redirect loop when that session has expired or been revoked.
    const refreshed = await supabase(data.session.access_token).rpc(
      "v25_platform_identity",
    );
    if (refreshed.error || !refreshed.data) throw Error("Session expired");
    await setSession(data.session);
    return NextResponse.redirect(`${config().origin}${next}`);
  } catch {
    await clearSession();
    return NextResponse.redirect(`${config().origin}/${locale}/login`);
  }
}
