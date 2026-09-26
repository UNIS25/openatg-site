import { failure, identity } from "@/lib/server";
export async function GET(request: Request) {
  try {
    const s = await identity();
    if (
      !["owner", "administrator", "product_editor"].includes(
        s.identity.role || "",
      )
    )
      throw new Error("Not authorized");
    const path = new URL(request.url).searchParams.get("path") || "";
    if (!/^[a-f0-9-]{36}\/[a-f0-9-]+\.(png|jpeg|webp)$/.test(path))
      throw new Error("Invalid image");
    const { data, error } = await s.db.storage
      .from("v25-products")
      .download(path);
    if (error) throw error;
    return new Response(data, {
      headers: {
        "Content-Type": data.type,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
