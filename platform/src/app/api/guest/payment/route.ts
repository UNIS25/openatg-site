import { z } from "zod";
import { requireLocal } from "@/lib/config";
import { failure, supabase } from "@/lib/server";
import { validGuestPaymentToken } from "@/lib/guest-payment";
import { createTestBill } from "@/lib/qr-bill";

export async function GET(request: Request) {
  try {
    requireLocal();
    const params = new URL(request.url).searchParams;
    const orderId = z.uuid().parse(params.get("order"));
    const paymentId = z.uuid().parse(params.get("id"));
    if (!validGuestPaymentToken(orderId, paymentId, params.get("token") || "")) throw new Error("Not authorized");
    const db = supabase(undefined, true);
    const { data: payment, error } = await db.from("v25_payments")
      .select("reference,amount_rappen,expires_at,is_test,member_id")
      .eq("id", paymentId).eq("order_id", orderId).single();
    if (error || !payment?.is_test || payment.member_id !== null || Date.parse(payment.expires_at) <= Date.now()) throw new Error("Not authorized");
    const { data: order, error: orderError } = await db.from("v25_orders")
      .select("address_snapshot,is_test")
      .eq("id", orderId).is("member_id", null).single();
    if (orderError || !order?.is_test) throw new Error("Not authorized");
    const pdf = await createTestBill({
      ...order.address_snapshot,
      order_id: orderId,
      reference: payment.reference,
      amount_rappen: payment.amount_rappen,
      expires_at: payment.expires_at,
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="TEST-NOT-PAYABLE-${paymentId}.pdf"`,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
