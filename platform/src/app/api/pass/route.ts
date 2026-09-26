import QRCode from "qrcode";
import { z } from "zod";
import { body, failure, identity, json, mutation, rate } from "@/lib/server";
import { config } from "@/lib/config";
import { hash, issuePass, passHash } from "@/lib/tokens";
export async function POST(request: Request) {
  try {
    await mutation(request);
    const { db, user } = await identity();
    await rate(`pass:${user.id}`, 20);
    const input = await body(request);
    const action = z.enum(["pass", "pass_check", "redeem"]).parse(input.action);
    let token: string | undefined;
    const document: Record<string, unknown> = {};
    if (action === "pass") {
      token = issuePass(config().passKey);
      document.token_hash = hash(token);
    } else {
      document.token_hash = passHash(
        z.string().max(100).parse(input.token),
        config().passKey,
      );
      document.venue = z.enum(["restaurant", "lounge"]).parse(input.venue);
      document.identity_confirmed = input.identity_confirmed === true;
    }
    const { data, error } = await db.rpc("v25_platform_action", {
      action,
      document,
      request_key: z.uuid().parse(input.key),
    });
    if (error) throw error;
    return json({
      ...data,
      ...(token
        ? {
            token,
            qr: await QRCode.toDataURL(token, {
              errorCorrectionLevel: "M",
              margin: 4,
              width: 320,
            }),
          }
        : {}),
    });
  } catch (e) {
    return failure(e);
  }
}
