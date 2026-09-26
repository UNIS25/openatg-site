import { z } from "zod";
import { body, failure, identity, json, mutation, rate } from "@/lib/server";
import { LocalAgeAdapter } from "@/lib/tokens";
export async function POST(request: Request) {
  try {
    await mutation(request);
    const { db, user } = await identity();
    await rate(`action:${user.id}`, 100);
    const input = z
      .object({
        action: z.string().min(1).max(40),
        document: z.record(z.string(), z.unknown()).default({}),
        key: z.uuid(),
      })
      .parse(await body(request));
    if (["pass", "redeem", "pass_check"].includes(input.action))
      throw new Error("Protected pass endpoint required");
    if (input.action === "test_verification") {
      const adapter = new LocalAgeAdapter();
      const outcome = await adapter.verify(String(input.document.scenario));
      input.document = { status: outcome.status };
    }
    const { data, error } = await db.rpc("v25_platform_action", {
      action: input.action,
      document: input.document,
      request_key: input.key,
    });
    if (error) throw error;
    return json(data);
  } catch (e) {
    return failure(e);
  }
}
