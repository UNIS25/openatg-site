import { z } from "zod";
import type { Zone } from "./types";
export const postcodeSchema = z
  .string()
  .regex(/^[1-9]\d{3}$/, "POSTCODE_INVALID");
// Format validation is not an authoritative address/deliverability lookup.
export function deliveryEligibility(
  fulfillment: string,
  postcode: string,
  zones: Zone[],
) {
  if (["ADULT_SIGNATURE_NATIONAL", "AGE_VERIFIED_PICKUP"].includes(fulfillment))
    return { eligible: false, reason: "ADULT_DELIVERY_REQUIRED" };
  if (!postcodeSchema.safeParse(postcode).success)
    return { eligible: false, reason: "POSTCODE_REQUIRED" };
  if (fulfillment === "AMBIENT_NATIONAL")
    return { eligible: true, reason: "NATIONAL" };
  if (fulfillment === "DELIVERY_UNAVAILABLE")
    return { eligible: false, reason: "UNAVAILABLE" };
  const zone = zones.find(
    (z) =>
      z.active &&
      z.verified &&
      z.provider.trim() &&
      (z.fulfillment === fulfillment ||
        (fulfillment === "PICKUP" && z.fulfillment === "RESTAURANT_PICKUP")) &&
      z.postcodes
        .split(",")
        .map((p) => p.trim())
        .includes(postcode),
  );
  return {
    eligible: !!zone,
    reason: zone
      ? ["PICKUP", "RESTAURANT_PICKUP"].includes(fulfillment)
        ? "PICKUP"
        : "REGIONAL"
      : "NOT_CONFIGURED",
  };
}
export function deliveryMethodFor(classes: string[]) {
  if (classes.every((c) => c === "AMBIENT_NATIONAL")) return "NATIONAL";
  if (classes.every((c) => ["PICKUP", "RESTAURANT_PICKUP"].includes(c)))
    return "PICKUP";
  if (
    new Set(classes).size === 1 &&
    ["CHILLED_REGIONAL", "FROZEN_REGIONAL"].includes(classes[0])
  )
    return "REGIONAL";
  throw new Error("MIXED_FULFILLMENT");
}
