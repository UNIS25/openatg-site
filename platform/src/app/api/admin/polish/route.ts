import { body, failure, identity, json, mutation, rate } from "@/lib/server";
import { polishSchema } from "@/lib/polish";
export async function GET() {
  try {
    const s = await identity();
    if (!s.identity.admin) throw new Error("Not authorized");
    const { data, error } = await s.db.rpc("v25_polish_public");
    if (error) throw error;
    return json(data);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    await mutation(request);
    const s = await identity();
    if (!s.identity.admin) throw new Error("Not authorized");
    await rate(`polish:${s.user.id}`, 20);
    const input = polishSchema.parse(await body(request));
    const { data, error } = await s.db.rpc("v25_polish_save", { input });
    if (error) throw error;
    return json(data);
  } catch (e) {
    return failure(e);
  }
}
