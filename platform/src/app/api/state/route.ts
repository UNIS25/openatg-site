import { failure, identity, json } from "@/lib/server";
export async function GET(request: Request) {
  try {
    const s = await identity();
    const exporting = new URL(request.url).searchParams.get("export") === "1";
    const admin =
      !exporting && new URL(request.url).searchParams.get("admin") === "1";
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
            "order_notification_events",
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
      // Explicit ownership also applies to administrators exporting their own account.
      if (!admin && table === "order_items")
        q = q.in(
          "order_id",
          ((rows.orders || []) as { id: string }[]).map((row) => row.id),
        );
      if (!admin && table === "cart_items")
        q = q.in(
          "cart_id",
          ((rows.carts || []) as { id: string }[]).map((row) => row.id),
        );
      if (
        ["orders", "payments", "audit_events", "membership_events"].includes(
          table,
        )
      )
        q = q.order("created_at", { ascending: false });
      if (exporting) {
        const all: unknown[] = [];
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await q.range(offset, offset + 499);
          if (error) throw error;
          all.push(...(data || []));
          if (!data || data.length < 500) break;
        }
        rows[table] = all;
      } else {
        const { data, error } = await q;
        if (error) throw error;
        rows[table] = data;
      }
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
