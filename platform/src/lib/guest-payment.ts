import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config";

export function guestPaymentToken(orderId: string, paymentId: string) {
  return createHmac("sha256", config().passKey)
    .update(`guest-payment:v1:${orderId}:${paymentId}`)
    .digest("hex");
}

export function validGuestPaymentToken(orderId: string, paymentId: string, supplied: string) {
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  const expected = guestPaymentToken(orderId, paymentId);
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(supplied, "hex"));
}
