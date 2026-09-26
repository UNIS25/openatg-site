import { failure, identity, json } from "@/lib/server";
export async function GET(request: Request) {
  try {
    const s = await identity();
    const admin = new URL(request.url).searchParams.get("admin") === "1";
    if (admin && !s.identity.admin && !s.identity.staff && !s.identity.role)
      throw new Error("Not authorized");
    const tables =
      admin && s.identity.admin
        ? [
            "members",
            "member_verifications",
            "memberships",
            "membership_events",
            "membership_plans",
            "orders",
            "order_items",
            "payments",
            "platform_payment_events",
            "staff_roles",
            "benefit_redemptions",
            "benefit_definitions",
            "delivery_methods",
            "audit_events",
            "privacy_requests",
            "product_presentations",
            "platform_settings",
          ]
        : [
            "members",
            "member_addresses",
            "member_verifications",
            "memberships",
            "membership_plans",
            "orders",
            "order_items",
            "payments",
            "carts",
            "cart_items",
            "consent_records",
            "privacy_requests",
            "benefit_redemptions",
          ];
    const rows: Record<string, unknown> = {};
    for (const table of tables) {
      let q = s.db.from(`v25_${table}`).select("*").limit(100);
      if (!admin) {
        if (table === "members") q = q.eq("id", s.user.id);
        else if (
          [
            "member_addresses",
            "member_verifications",
            "memberships",
            "orders",
            "payments",
            "carts",
            "consent_records",
            "privacy_requests",
            "benefit_redemptions",
          ].includes(table)
        )
          q = q.eq("member_id", s.user.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      rows[table] = data;
    }
    return json({
      user: {
        id: s.user.id,
        email: s.user.email,
        name: s.user.user_metadata.name,
      },
      identity: s.identity,
      rows,
    });
  } catch (e) {
    return failure(e);
  }
}
