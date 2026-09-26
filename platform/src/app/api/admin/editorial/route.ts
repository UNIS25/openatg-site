import { body, failure, identity, json, mutation, rate } from "@/lib/server";
import { editorialSchema } from "@/lib/cinematic";
export async function GET() {
  try {
    const s = await identity();
    if (!s.identity.admin) throw new Error("Not authorized");
    const settings = await s.db.rpc("v25_editorial_public");
    if (settings.error) throw settings.error;
    const assets = await s.db
      .from("v25_media_assets")
      .select(
        "id,original_filename,mime_type,bytes,status,rights_owner,source_reference,licence_type,attribution,commercial_approved,approval_reference",
      )
      .limit(100);
    if (assets.error) throw assets.error;
    return json({ config: settings.data, assets: assets.data });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    await mutation(request);
    const s = await identity();
    if (!s.identity.admin) throw new Error("Not authorized");
    await rate(`editorial:${s.user.id}`, 20);
    const input = editorialSchema.parse(await body(request));
    const { data, error } = await s.db.rpc("v25_editorial_save", { input });
    if (error) throw error;
    return json(data);
  } catch (e) {
    return failure(e);
  }
}
