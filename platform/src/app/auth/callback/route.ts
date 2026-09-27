import { NextResponse } from "next/server";
import { supabase, setSession } from "@/lib/server";
import { config } from "@/lib/config";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = ["de", "fr", "en"].includes(
    url.searchParams.get("locale") || "",
  )
    ? url.searchParams.get("locale")
    : "de";
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (
    token_hash &&
    ["signup", "recovery", "email", "invite"].includes(type || "")
  ) {
    const { data, error } = await supabase().auth.verifyOtp({
      token_hash,
      type: type as "email",
    });
    if (!error && data.session) {
      await setSession(data.session);
      return NextResponse.redirect(
        `${config().origin}/${locale}/${type === "recovery" ? "account?recovery=1" : "verify-age"}`,
      );
    }
  }
  return NextResponse.redirect(
    `${config().origin}/${locale}/login?error=confirmation`,
  );
}
