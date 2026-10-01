import { z } from "zod";
import { requireLocal } from "@/lib/config";
import { body, failure, json, mutation, rate, supabase } from "@/lib/server";
import { guestPaymentToken } from "@/lib/guest-payment";

const orderSchema = z.object({
  key: z.uuid(),
  lines: z.array(z.object({ product_id: z.uuid(), quantity: z.number().int().min(1).max(20) }).strict()).min(1).max(30),
  email: z.email().max(254),
  name: z.string().trim().min(1).max(120),
  street: z.string().trim().min(1).max(100),
  house_number: z.string().trim().min(1).max(20),
  postal_code: z.string().regex(/^[1-9][0-9]{3}$/),
  city: z.string().trim().min(1).max(100),
  locale: z.enum(["de", "fr", "en"]),
  consent: z.literal(true),
}).strict();

export async function POST(request: Request) {
  try {
    requireLocal();
    await mutation(request);
    await rate("guest-order:local", 20);
    const { key, ...document } = orderSchema.parse(await body(request));
    const { data, error } = await supabase(undefined, true).rpc("v25_guest_create_order", { document, request_key: key });
    if (error) throw error;
    const orderId = z.uuid().parse(data.order_id);
    const paymentId = z.uuid().parse(data.payment_id);
    const { data: payment, error: paymentError } = await supabase(undefined, true)
      .from("v25_payments").select("reference,amount_rappen,expires_at,state,is_test")
      .eq("id", paymentId).eq("order_id", orderId).single();
    if (paymentError || !payment?.is_test) throw new Error("Guest payment unavailable");
    const token = guestPaymentToken(orderId, paymentId);
    return json({
      order_id: orderId,
      payment_id: paymentId,
      reference: payment.reference,
      amount_rappen: payment.amount_rappen,
      state: payment.state,
      bill_url: `/api/guest/payment?order=${orderId}&id=${paymentId}&token=${token}`,
      is_test: true,
      replayed: Boolean(data.replayed),
    });
  } catch (error) {
    return failure(error);
  }
}
