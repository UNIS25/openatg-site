export const locales = ["de", "fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const fulfillmentClasses = [
  "AMBIENT_NATIONAL",
  "CHILLED_REGIONAL",
  "FROZEN_REGIONAL",
  "RESTAURANT_PICKUP",
  "PICKUP",
  "ADULT_SIGNATURE_NATIONAL",
  "AGE_VERIFIED_PICKUP",
  "DELIVERY_UNAVAILABLE",
] as const;
export type Fulfillment = (typeof fulfillmentClasses)[number];
export type Translation = {
  locale: string;
  name: string;
  description: string;
  ingredients: string;
  allergens: string;
  preparation: string;
};
export type Product = {
  id: string;
  slug: string;
  categoryId: string;
  supplierId: string;
  priceCents: number;
  launchPriceCents: number | null;
  vatBps: number;
  stock: number;
  weight: string;
  spice: number;
  dietary: string;
  origin: string;
  fulfillment: string;
  image: string;
  gallery: unknown;
  nutrition: unknown;
  verification: string;
  active: boolean;
  featured: boolean;
  translations: Translation[];
  tobaccoProduct?: boolean;
  houseSelection?: boolean;
  introducedAt?: Date | string;
};
export type Zone = {
  id?: string;
  name: string;
  fulfillment: string;
  postcodes: string;
  provider: string;
  verified: boolean;
  active: boolean;
};
export type Category = { id: string; slug: string; names: unknown };
export type CartItem = { productId: string; quantity: number };
export function translation(product: Product, locale: Locale) {
  return (
    product.translations.find((t) => t.locale === locale) ??
    product.translations.find((t) => t.locale === "en") ??
    product.translations[0]
  );
}
export function localized(value: unknown, locale: Locale): string {
  const v = value as Record<string, string>;
  return v?.[locale] ?? v?.en ?? "";
}
export function price(
  product: Pick<Product, "priceCents" | "launchPriceCents">,
) {
  return product.launchPriceCents ?? product.priceCents;
}
export function money(cents: number, locale: Locale = "en") {
  return new Intl.NumberFormat(locale === "en" ? "en-CH" : `${locale}-CH`, {
    style: "currency",
    currency: "CHF",
  }).format((Object.is(cents, -0) ? 0 : cents) / 100);
}
