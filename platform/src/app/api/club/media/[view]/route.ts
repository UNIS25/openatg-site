import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { failure } from "@/lib/server";
import { verifiedClubSession } from "@/lib/club-access";
import { clubMediaFilename } from "@/lib/restricted-references";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ view: string }> },
) {
  try {
    await verifiedClubSession();
    const { view } = await params;
    const filename = clubMediaFilename(view);
    if (!filename) return new Response(null, { status: 404 });
    const bytes = await readFile(
      resolve(
        process.cwd(),
        "private-media/club",
        filename,
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
