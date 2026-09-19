import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { headers, response } from "../_shared/http.ts";
Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: headers(request) });
  if (request.method !== "POST")
    return response(request, 405, { error: "Method not allowed" });
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer "))
    return response(request, 401, { error: "Sign-in required" });
  const url = Deno.env.get("SUPABASE_URL")!,
    anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: identity, error: identityError } =
    await userClient.auth.getUser(auth.slice(7));
  if (identityError || !identity.user)
    return response(request, 401, { error: "Session invalid" });
  const { error: ownerError } = await userClient.rpc("v25_owner_authorized");
  if (ownerError)
    return response(request, 403, { error: "Owner MFA required" });
  let body;
  try {
    const text = await request.text();
    if (text.length > 2048) throw Error();
    body = JSON.parse(text);
  } catch {
    return response(request, 400, { error: "Invalid request" });
  }
  if (
    typeof body.email !== "string" ||
    body.email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
    !["owner", "administrator", "product_editor", "order_manager"].includes(
      body.role,
    )
  )
    return response(request, 400, {
      error: "Valid email and administrator role required",
    });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const redirect =
    Deno.env.get("ADMIN_REDIRECT_URL") ?? "https://openatg.com/adminpage/";
  const { data, error } = await admin.auth.admin.inviteUserByEmail(body.email, {
    redirectTo: redirect,
  });
  if (error || !data.user)
    return response(request, 400, {
      error:
        "Invitation could not be created. Check the account and SMTP configuration.",
    });
  const { error: recheck } = await userClient.rpc("v25_owner_authorized");
  const result = recheck
    ? { error: recheck }
    : await admin
        .from("v25_profiles")
        .insert({
          id: data.user.id,
          role: body.role,
          invited_by: identity.user.id,
        });
  if (result.error) {
    await admin.auth.admin.deleteUser(data.user.id);
    return response(request, 500, {
      error:
        "Invitation provisioning failed; no administrator access was granted.",
    });
  }
  const audit = await admin
    .from("v25_audit_events")
    .insert({
      actor: identity.user.id,
      action: "INVITE",
      entity: "v25_profiles",
      entity_id: data.user.id,
      detail: { role: body.role },
    });
  if (audit.error)
    return response(request, 500, {
      error:
        "Invitation created but audit confirmation failed. Review administrator access.",
    });
  return response(request, 200, { invited: true });
});
