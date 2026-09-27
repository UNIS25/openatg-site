export const locales = ["de", "fr", "en"] as const;
export type Locale = (typeof locales)[number];
export type Role =
  | "owner"
  | "administrator"
  | "product_editor"
  | "order_manager";
export type Translation = {
  locale: Locale;
  name: string;
  description: string;
  short_description: string;
  preparation_instructions: string;
  seo_title: string;
  seo_description: string;
  ingredients: string;
  allergens: string;
  storage_instructions: string;
};
export type ProductImage = {
  id?: string;
  storage_path: string | null;
  legacy_path: string | null;
  position: number;
  alt: Record<string, string>;
};
export type ProductDocument = {
  id?: string;
  slug: string;
  sku: string | null;
  barcode: string | null;
  category: string;
  brand: string;
  supplier: string;
  price_rappen: number | null;
  promotion_rappen: number | null;
  display_order: number;
  weight_grams: number | null;
  origin: string;
  nutrition: Record<string, unknown>;
  status: "draft" | "active" | "archived";
  available: boolean;
  featured: boolean;
  most_picked: boolean;
  adult_only: boolean;
  information_confirmed: boolean;
  price_confirmed: boolean;
  translations: Translation[];
  images: ProductImage[];
};
export type Product = ProductDocument & {
  id: string;
  revision: number;
  inventory: {
    quantity: number;
    low_stock_threshold: number;
    confirmed: boolean;
  } | null;
};
export type Settings = {
  id: boolean;
  standard_delivery_rappen: number | null;
  free_delivery_threshold_rappen: 10000;
  adult_delivery_rappen: number | null;
  tax_configuration_confirmed: boolean;
  vat_registered: boolean;
  vat_number: string;
  vat_bps: number | null;
  prices_include_vat: true;
  contact_name: string;
  contact_address: string;
  contact_phone: string;
  support_email: string;
  store_available: boolean;
  maintenance_mode: boolean;
  payment_enabled: boolean;
  tobacco_checkout_enabled: boolean;
  payment_provider_reference: string;
  legal_review_reference: string;
  age_verification_reference: string;
  adult_delivery_reference: string;
  bundle_discount_bps: number;
  revision: number;
};
export const orderStatuses = [
  "pending",
  "paid",
  "preparing",
  "dispatched",
  "completed",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export type Order = {
  id: string;
  number: number;
  status: OrderStatus;
  subtotal_rappen: number;
  discount_rappen: number;
  delivery_rappen: number;
  adult_delivery_rappen: number;
  tax_rappen: number;
  total_rappen: number;
  refund_status: string;
  fulfillment_notes: string;
  tracking_number: string;
  revision: number;
  created_at: string;
  customer_id: string;
  address_id: string;
};
export function blankProduct(): ProductDocument {
  return {
    slug: "",
    sku: null,
    barcode: null,
    category: "",
    brand: "",
    supplier: "",
    price_rappen: null,
    promotion_rappen: null,
    display_order: 0,
    weight_grams: null,
    origin: "",
    nutrition: {},
    status: "draft",
    available: false,
    featured: false,
    most_picked: false,
    adult_only: false,
    information_confirmed: false,
    price_confirmed: false,
    translations: locales.map((locale) => ({
      locale,
      name: "",
      description: "",
      short_description: "",
      preparation_instructions: "",
      seo_title: "",
      seo_description: "",
      ingredients: "",
      allergens: "",
      storage_instructions: "",
    })),
    images: [],
  };
}
export function formatMoney(rappen: number, locale: Locale = "en") {
  return new Intl.NumberFormat(`${locale}-CH`, {
    style: "currency",
    currency: "CHF",
  }).format((Object.is(rappen, -0) ? 0 : rappen) / 100);
}
export function parseMoney(value: string): number | null {
  if (value.trim() === "") return null;
  if (!/^\d{1,7}([.,]\d{1,2})?$/.test(value.trim()))
    throw new Error("Enter CHF with at most two decimal places.");
  const [whole, fraction = ""] = value.trim().replace(",", ".").split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (result > 100000000) throw new Error("Amount is too large.");
  return result;
}
export function moneyInput(value: number | null) {
  return value === null
    ? ""
    : `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}
export function integer(value: number, min = 0, max = 100000000) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new Error("Invalid integer amount");
  return value;
}
export function delivery(
  subtotal: number,
  discount: number,
  standard: number | null,
  adult: number | null = 0,
) {
  integer(subtotal);
  integer(discount, 0, subtotal);
  if (standard !== null) integer(standard);
  if (adult !== null) integer(adult);
  const net = subtotal - discount,
    remaining = Math.max(10000 - net, 0),
    standardCharge = net >= 10000 ? 0 : standard;
  return {
    net,
    remaining,
    standard: standardCharge,
    adult,
    total:
      standardCharge === null || adult === null
        ? null
        : net + standardCharge + adult,
  };
}
// These are independent content values, never inferred from another language.
export const translationFields = [
  "name",
  "short_description",
  "description",
  "ingredients",
  "allergens",
  "preparation_instructions",
  "storage_instructions",
  "seo_title",
  "seo_description",
] as const;
export function missingTranslationFields(translation?: Translation) {
  return translationFields.filter((key) => !translation?.[key]?.trim());
}
