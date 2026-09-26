import { z } from "zod";
import { failure, json, supabase, boundedBytes } from "@/lib/server";
import { config, requireLocal } from "@/lib/config";
import { hash, verifyWebhook } from "@/lib/tokens";
export async function POST(request: Request) {
  try {
    requireLocal();
    const raw = (await boundedBytes(request, 8192)).toString("utf8");
    if (raw.length > 8192) throw new Error("Request too large");
    verifyWebhook(
      raw,
      request.headers.get("x-v25-timestamp") || "",
      request.headers.get("x-v25-signature") || "",
      config().webhookKey,
    );
    const e = z
      .object({
        payment: z.uuid(),
        target: z.enum([
          "processing",
          "paid",
          "matched",
          "failed",
          "expired",
          "cancelled",
          "refunded",
        ]),
        amount: z.number().int().positive(),
        event_id: z.string().min(1).max(100),
      })
      .parse(JSON.parse(raw));
    const { data, error } = await supabase(undefined, true).rpc(
      "v25_platform_webhook",
      { ...e, hash: hash(raw) },
    );
    if (error) throw error;
    return json(data);
  } catch (e) {
    return failure(e);
  }
}
