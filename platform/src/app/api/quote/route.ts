import { z } from "zod";
import {
  body,
  failure,
  json,
  mutation,
  rate,
  session,
  supabase,
} from "@/lib/server";

// The same database calculation supplies guest baskets, member baskets and checkout.
// This endpoint cannot reserve stock, create orders or accept a client-supplied price.
export async function POST(request: Request) {
  try {
    await mutation(request);
    const s = await session();
    await rate(`quote:${s?.user.id || "local-guest"}`, 60);
    const input = z
      .object({
        guest: z.boolean().optional(),
        lines: z
          .array(
            z
              .object({
                product_id: z.uuid(),
                quantity: z.number().int().min(1).max(20),
              })
              .strict(),
          )
          .min(1)
          .max(30),
      })
      .strict()
      .parse(await body(request));
    // Guest checkout always uses ordinary delivery/pricing, even when the
    // browser has a signed-in Gold session. Membership benefits require the
    // member order journey and must match the server's final order quote.
    const db = input.guest ? supabase() : s?.db || supabase();
    const { data, error } = await db.rpc(
      "v25_platform_preview_quote",
      { lines: input.lines },
    );
    if (error) throw error;
    return json(data);
  } catch (e) {
    return failure(e);
  }
}
