"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Product, ProductDocument } from "./domain";
let client: SupabaseClient | null = null;
export function db() {
  if (!client)
    client = createClient(
      `${window.location.origin}/api/admin/supabase`,
      "same-origin-bff-public-placeholder",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          fetch: async (input, init) => {
            const h = new Headers(init?.headers);
            if (init?.method && init.method !== "GET") {
              const result = await fetch("/api/auth");
              const { csrf } = await result.json();
              h.set("x-csrf-token", csrf);
            }
            return fetch(input, {
              ...init,
              headers: h,
              credentials: "same-origin",
            });
          },
        },
      },
    );
  return client;
}
export async function rpc<T = unknown>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await db().rpc(name, args);
  if (error) throw error;
  return data as T;
}
export async function products(search = "", page = 0): Promise<Product[]> {
  let q = db()
    .from("v25_products")
    .select(
      "*,translations:v25_product_translations(*),images:v25_product_images(*),inventory:v25_inventory(*)",
    )
    .eq("adult_only", false)
    .neq("slug", "coffee-powder")
    .order("created_at", { ascending: false })
    .range(page * 50, page * 50 + 49);
  if (search) q = q.ilike("slug", `%${search.replace(/[%_]/g, "")}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data as Product[];
}
export const saveProduct = (
  document: ProductDocument,
  revision: number | null,
) => rpc("v25_save_product", { document, expected_revision: revision });
export async function imageUrl(path: string) {
  return `/api/admin/image?path=${encodeURIComponent(path)}`;
}
