export type Locale = "de" | "fr" | "en";
export const locales: Locale[] = ["de", "fr", "en"];
export const money = (n: number, l: Locale = "de") =>
  new Intl.NumberFormat(`${l}-CH`, {
    style: "currency",
    currency: "CHF",
  }).format(n / 100);
export type Line = { product_id: string; quantity: number };
export type QuoteLine = Line & { unit_rappen: number; discount_rappen: number };
export type Quote = {
  lines: QuoteLine[];
  subtotal_rappen: number;
  discount_rappen: number;
  delivery_rappen: number;
  total_rappen: number;
  remaining_rappen: number;
  gold: boolean;
};
export type Product = {
  id: string;
  slug: string;
  category: string;
  image: string;
  translations: {
    locale: string;
    name: string;
    description: string;
    short_description?: string;
    ingredients?: string;
    allergens?: string;
    preparation_instructions?: string;
    storage_instructions?: string;
  }[];
  images?: { url: string; alt: Record<string, string> }[];
  weight_grams?: number | null;
  origin?: string;
  nutrition?: Record<string, unknown>;
  information_confirmed?: boolean;
  available_quantity?: number;
  stock_confirmed?: boolean;
  promotion_rappen?: number | null;
  price_rappen: number | null;
  is_test: boolean;
  gold_eligible: boolean;
};
export function safeInteger(value: number, min = 0, max = 100000000) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new Error("Invalid money or quantity");
  return value;
}
export function calculate(
  lines: {
    quantity: number;
    price: number;
    promotion?: number;
    goldEligible: boolean;
    adult?: boolean;
  }[],
  gold = false,
  bps = 1000,
  delivery = 1000,
): Quote {
  safeInteger(bps, 0, 10000);
  safeInteger(delivery);
  let subtotal = 0,
    discount = 0;
  const items = lines.map((l, i) => {
    if (l.adult) throw new Error("Tobacco purchasing unavailable");
    safeInteger(l.quantity, 1, 20);
    safeInteger(l.price, 1, 1000000);
    if (l.promotion !== undefined) safeInteger(l.promotion, 0, l.price);
    const sub = l.quantity * l.price;
    const d = Math.max(
      gold && l.goldEligible ? Math.floor((sub * bps + 5000) / 10000) : 0,
      l.promotion === undefined ? 0 : (l.price - l.promotion) * l.quantity,
    );
    subtotal += sub;
    discount += d;
    return {
      product_id: String(i),
      quantity: l.quantity,
      unit_rappen: l.price,
      discount_rappen: d,
    };
  });
  const shipping = gold || subtotal - discount >= 10000 ? 0 : delivery;
  return {
    lines: items,
    subtotal_rappen: subtotal,
    discount_rappen: discount,
    delivery_rappen: shipping,
    total_rappen: subtotal - discount + shipping,
    remaining_rappen: Math.max(0, 10000 - (subtotal - discount)),
    gold,
  };
}
export function goldActive(
  m: {
    status: string;
    period_start: string;
    period_end: string;
    cancel_at_period_end: boolean;
  },
  verification: { status: string; expires_at: string },
  now = Date.now(),
) {
  return (
    m.status === "active" &&
    Date.parse(m.period_start) <= now &&
    Date.parse(m.period_end) > now &&
    verification.status === "verified" &&
    Date.parse(verification.expires_at) > now
  );
}
export function paymentTransition(from: string, to: string) {
  return (
    (["awaiting_payment", "processing"].includes(from) &&
      [
        "processing",
        "paid",
        "matched",
        "failed",
        "expired",
        "cancelled",
      ].includes(to)) ||
    (["paid", "matched", "partially_refunded"].includes(from) &&
      ["refunded", "partially_refunded"].includes(to))
  );
}
