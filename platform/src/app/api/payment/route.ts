import { failure, identity } from "@/lib/server";
import { createTestBill } from "@/lib/qr-bill";
import { requireLocal } from "@/lib/config";
export async function GET(request: Request) {
  try {
    requireLocal();
    const { db } = await identity();
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid payment");
    const { data: p, error } = await db
      .from("v25_payments")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !p.is_test) throw new Error("Not authorized");
    let address = {
      name: "LOCAL TEST MEMBER",
      street: "Teststrasse",
      house_number: "1",
      postal_code: "8000",
      city: "Zürich",
    };
    if (p.order_id) {
      const { data: o, error } = await db
        .from("v25_orders")
        .select("address_snapshot")
        .eq("id", p.order_id)
        .single();
      if (error) throw error;
      address = o.address_snapshot;
    }
    const pdf = await createTestBill({
      ...address,
      reference: p.reference,
      amount_rappen: p.amount_rappen,
      order_id: p.order_id || p.membership_id,
      expires_at: p.expires_at,
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="TEST-NOT-PAYABLE-${id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
