import { createClient } from "@supabase/supabase-js";
import type {
  Product,
  Settings,
  Order,
  ProductDocument,
  OrderStatus,
} from "./domain";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const invitationCallback =
  typeof window !== "undefined" &&
  /type=(invite|recovery)/.test(window.location.hash);
export const configured = Boolean(url && key);
// Genuine GoTrue authentication. Tokens remain in memory; refresh requires sign-in.
export const client = configured
  ? createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "varathans25_admin_auth",
      },
    })
  : null;
export function db() {
  if (!client) throw new Error("The secured backend has not been configured.");
  return client;
}
export async function rpc<T = unknown>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await db().rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
export async function products(search = "", page = 0): Promise<Product[]> {
  let q = db()
    .from("v25_products")
    .select(
      "*,translations:v25_product_translations(*),images:v25_product_images(*),inventory:v25_inventory(*)",
    )
    .order("created_at", { ascending: false })
    .range(page * 50, page * 50 + 49);
  if (search) q = q.ilike("slug", `%${search.replace(/[%_]/g, "")}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as Product[];
}
export const saveProduct = (
  document: ProductDocument,
  revision: number | null,
) => rpc<string>("v25_save_product", { document, expected_revision: revision });
export async function settings(): Promise<Settings> {
  const { data, error } = await db()
    .from("v25_store_settings")
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Settings;
}
export async function orders(
  status = "",
  search = "",
  page = 0,
): Promise<Order[]> {
  let q = db()
    .from("v25_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .range(page * 50, page * 50 + 49);
  if (status) q = q.eq("status", status);
  if (search) {
    if (/^\d+$/.test(search)) q = q.eq("number", Number(search));
    else if (/^[a-f\d-]{36}$/i.test(search)) q = q.eq("id", search);
    else return [];
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as Order[];
}
export const updateOrder = (
  id: string,
  status: OrderStatus,
  notes: string,
  tracking: string,
  revision: number,
  refund: boolean,
) =>
  rpc("v25_update_order", {
    order_id: id,
    next_status: status,
    notes,
    tracking,
    expected_revision: revision,
    request_refund: refund,
  });
export async function imageUrl(path: string) {
  const { data, error } = await db()
    .storage.from("v25-products")
    .createSignedUrl(path, 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
