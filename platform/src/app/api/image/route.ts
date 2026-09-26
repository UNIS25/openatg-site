import { supabase } from "@/lib/server";
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path") || "";
  if (!/^[a-f0-9-]{36}\/[a-f0-9-]+\.(png|jpeg|webp)$/.test(path))
    return new Response(null, { status: 404 });
  const { data, error } = await supabase()
    .storage.from("v25-products")
    .download(path);
  if (error || !data) return new Response(null, { status: 404 });
  return new Response(data, {
    headers: {
      "Content-Type": data.type,
      "Cache-Control": "private, no-store",
    },
  });
}
