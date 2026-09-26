import { failure, identity, json, mutation, body } from "@/lib/server";
import { parseReconciliation } from "@/lib/reconciliation";
export async function POST(request: Request) {
  try {
    await mutation(request);
    const { identity: who, db } = await identity();
    if (!who.admin) throw new Error("Not authorized");
    const input = await body(request);
    const rows = parseReconciliation(String(input.csv));
    const { data, error } = await db.rpc("v25_platform_action", {
      action: "reconcile_import",
      document: { rows },
      request_key: crypto.randomUUID(),
    });
    if (error) throw error;
    return json({ rows: data });
  } catch (e) {
    return failure(e);
  }
}
