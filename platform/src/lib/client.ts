"use client";
let csrf = "";
export async function api<T = Record<string, unknown>>(
  path: string,
  body?: unknown,
): Promise<T> {
  if (body !== undefined && !csrf) {
    const r = await fetch("/api/auth", { cache: "no-store" });
    const d = await r.json();
    csrf = d.csrf;
  }
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    keepalive:
      path === "/api/action" &&
      typeof body === "object" &&
      body !== null &&
      "action" in body &&
      body.action === "cart",
    headers:
      body === undefined
        ? {}
        : { "Content-Type": "application/json", "x-csrf-token": csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (path === "/api/auth" && typeof result.csrf === "string")
    csrf = result.csrf;
  if (!response.ok) throw new Error(result.error || "invalid");
  return result as T;
}
export const action = <T = Record<string, unknown>>(
  name: string,
  document: Record<string, unknown> = {},
  key = crypto.randomUUID(),
) => api<T>("/api/action", { action: name, document, key });
export function errorCode(error: unknown) {
  return error instanceof Error &&
    [
      "auth",
      "rate",
      "stock",
      "duplicate",
      "verification",
      "denied",
      "invalid",
    ].includes(error.message)
    ? error.message
    : "network";
}
export type DbRow = {
  unit_rappen: number;
  address_snapshot: Record<string, string>;
  id: string;
  member_id: string;
  name: string;
  locale: string;
  state: string;
  status: string;
  plan_id: string;
  period_start: string;
  period_end: string;
  cancel_at_period_end: boolean;
  expires_at: string;
  verified_at: string;
  is_test: boolean;
  fee_rappen: number;
  discount_bps: number;
  revision: number;
  free_swiss_delivery: boolean;
  drink_benefit: boolean;
  enabled: boolean;
  tier: string;
  interval_months: number;
  role: string;
  reference: string;
  amount_rappen: number;
  total_rappen: number;
  number: number;
  created_at: string;
  action: string;
  entity: string;
  entity_id: string;
  event: string;
  provider_reference: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  label: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  tracking_number: string;
  fulfillment_notes: string;
  minimum_visit_gap_minutes: number;
  standard_rappen: number;
  gold_eligible: boolean;
  kind: string;
  purpose: string;
  granted: boolean;
  order_id: string;
  detail: Record<string, unknown>;
};
export type AccountState = {
  user: { id: string; email: string; name: string };
  identity: {
    active: boolean;
    verified: boolean;
    gold: boolean;
    admin: boolean;
    staff: boolean;
    role: string | null;
  };
  rows: Record<string, DbRow[]>;
};
