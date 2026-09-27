import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { identity, failure } from "@/lib/server";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ view: string }> },
) {
  try {
    const s = await identity();
    if (s.identity.account_state !== "verified_18_plus")
      throw Error("Verified access required");
    const { view } = await params;
    if (!["open", "closed"].includes(view))
      return new Response(null, { status: 404 });
    const bytes = await readFile(
      resolve(
        process.cwd(),
        "private-media/club",
        `varathans-cigars-box-${view}.webp`,
      ),
    );
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
