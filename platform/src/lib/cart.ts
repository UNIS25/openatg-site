import type { Line } from "./domain";

export function validCart(value: unknown): Line[] {
  if (!Array.isArray(value) || value.length > 30) return [];
  return value.filter(
    (line): line is Line =>
      !!line &&
      typeof line.product_id === "string" &&
      /^[a-f0-9-]{36}$/i.test(line.product_id) &&
      Number.isInteger(line.quantity) &&
      line.quantity >= 1 &&
      line.quantity <= 20,
  );
}
export function guestCart(allowLegacy = true): Line[] {
  try {
    const current = localStorage.getItem("v25_guest_cart");
    // Preserve pre-existing guest baskets once, without borrowing another account's basket.
    return validCart(
      JSON.parse(
        current ??
          (allowLegacy && !localStorage.getItem("v25_cart_owner")
            ? localStorage.getItem("v25_test_cart") || "[]"
            : "[]"),
      ),
    );
  } catch {
    return [];
  }
}
export function mergeCart(server: Line[], guest: Line[]): Line[] {
  const merged = new Map(
    server.map((line) => [line.product_id, line.quantity]),
  );
  for (const line of guest)
    merged.set(
      line.product_id,
      Math.min(20, (merged.get(line.product_id) || 0) + line.quantity),
    );
  return Array.from(merged, ([product_id, quantity]) => ({
    product_id,
    quantity,
  }));
}
export function pendingCart(
  user: string,
): { lines: Line[]; revision: string } | null {
  try {
    const pending = JSON.parse(
      localStorage.getItem(`v25_pending_cart_${user}`) || "null",
    );
    return pending &&
      typeof pending.revision === "string" &&
      Array.isArray(pending.lines)
      ? { lines: validCart(pending.lines), revision: pending.revision }
      : null;
  } catch {
    return null;
  }
}
export function clearPendingCart(user: string, revision: string) {
  try {
    if (pendingCart(user)?.revision === revision)
      localStorage.removeItem(`v25_pending_cart_${user}`);
  } catch {
    /* Storage is optional; the server is authoritative. */
  }
}
