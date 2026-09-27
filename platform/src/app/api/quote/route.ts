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
    const { data, error } = await (s?.db || supabase()).rpc(
      "v25_platform_preview_quote",
      input,
    );
    if (error) throw error;
    return json(data);
  } catch (e) {
    return failure(e);
  }
}
