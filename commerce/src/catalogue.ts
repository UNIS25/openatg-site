import { assertPublicKey } from "./public-config";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { locales, type CartLine } from "./domain";
const publicProduct = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  sku: z.string(),
  category: z.string(),
  brand: z.string(),
  price_rappen: z.number().int().nonnegative(),
  promotion_rappen: z.number().int().nonnegative().nullable(),
  weight_grams: z.number().int().nullable(),
  origin: z.string(),
  nutrition: z.record(z.string(), z.unknown()),
  adult_only: z.boolean(),
  featured: z.boolean(),
  most_picked: z.boolean(),
  available: z.boolean(),
  translations: z.array(
    z.object({
      locale: z.enum(locales),
      name: z.string(),
      description: z.string(),
      ingredients: z.string(),
      allergens: z.string(),
      storage_instructions: z.string(),
    }),
  ),
  images: z.array(
    z.object({
      id: z.string().optional(),
      storage_path: z.string().nullable(),
      legacy_path: z.string().nullable(),
      position: z.number().int(),
      alt: z.record(z.string(), z.string()),
    }),
  ),
});
export type PublishedProduct = z.infer<typeof publicProduct>;
export const publicCatalogue = z.array(publicProduct);
export type PublicSettings = {
  standard_delivery_rappen: number | null;
  free_delivery_threshold_rappen: 10000;
  adult_delivery_rappen: number | null;
  payment_enabled: boolean;
  tobacco_checkout_enabled: boolean;
  store_available: boolean;
  maintenance_mode: boolean;
  bundle_discount_bps: number;
};
export type Quote = {
  subtotal_rappen: number;
  discount_rappen: number;
  net_rappen: number;
  delivery_rappen: number | null;
  adult_delivery_rappen: number | null;
  total_rappen: number | null;
  remaining_rappen: number;
  adult_only: boolean;
  purchasable: boolean;
};
export const closedSettings: PublicSettings = {
  standard_delivery_rappen: null,
  free_delivery_threshold_rappen: 10000,
  adult_delivery_rappen: null,
  payment_enabled: false,
  tobacco_checkout_enabled: false,
  store_available: false,
  maintenance_mode: false,
  bundle_discount_bps: 0,
};
export function publicStore(url: string, key: string) {
  assertPublicKey(key);
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "varathans25_public_catalogue",
    },
  });
  return {
    async catalogue() {
      const { data, error } = await client.rpc("v25_catalogue");
      if (error) throw Error(error.message);
      return publicCatalogue.parse(data);
    },
    async settings() {
      const { data, error } = await client.rpc("v25_public_settings");
      if (error) throw Error(error.message);
      return data as PublicSettings;
    },
    async quote(lines: CartLine[], adult: boolean) {
      const { data, error } = await client.rpc("v25_quote", {
        lines,
        adult_confirmed: adult,
      });
      if (error) throw Error(error.message);
      return data as Quote;
    },
    async image(path: string) {
      const { data, error } = await client.storage
        .from("v25-products")
        .createSignedUrl(path, 60);
      if (error) throw Error(error.message);
      return data.signedUrl;
    },
  };
}
export type StoreAPI = ReturnType<typeof publicStore>;
