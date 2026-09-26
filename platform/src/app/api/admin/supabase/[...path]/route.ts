import sharp from "sharp";
import { failure, identity, mutation, boundedBytes } from "@/lib/server";
import { config } from "@/lib/config";
const reads = new Set([
  "v25_products",
  "v25_product_translations",
  "v25_product_images",
  "v25_inventory",
  "v25_inventory_movements",
]);
const rpcs = new Set([
  "v25_save_product",
  "v25_duplicate_product",
  "v25_adjust_inventory",
]);
async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const s = await identity();
    if (
      !["owner", "administrator", "product_editor"].includes(
        s.identity.role || "",
      )
    )
      throw new Error("Not authorized");
    const { path } = await context.params;
    const method = request.method;
    const rest = path[0] === "rest" && path[1] === "v1";
    const storage = path[0] === "storage" && path[1] === "v1";
    let body: BodyInit | undefined;
    if (method === "GET") {
      if (!rest || path.length !== 3 || !reads.has(path[2]))
        throw new Error("Not authorized");
    } else {
      await mutation(request);
      if (rest && path[2] === "rpc" && path.length === 4 && rpcs.has(path[3])) {
        const raw = (await boundedBytes(request, 65536)).toString("utf8");
        if (raw.length > 65536) throw new Error("Request too large");
        const data = JSON.parse(raw);
        if (path[3] === "v25_save_product" && data.document?.adult_only)
          throw new Error("Product unavailable");
        if (data.product) {
          const { data: p } = await s.db
            .from("v25_products")
            .select("adult_only")
            .eq("id", data.product)
            .single();
          if (!p || p.adult_only) throw new Error("Product unavailable");
        }
        body = raw;
      } else if (
        storage &&
        path[2] === "object" &&
        path[3] === "v25-products" &&
        path.length === 6 &&
        /^[a-f0-9-]{36}$/.test(path[4]) &&
        /^[a-f0-9-]+\.(png|jpeg|webp)$/.test(path[5])
      ) {
        const bytes = await boundedBytes(request, 5242880);
        if (
          bytes.byteLength > 5242880 ||
          !["image/png", "image/jpeg", "image/webp"].includes(
            request.headers.get("content-type") || "",
          )
        )
          throw new Error("Invalid image");
        const { data: p } = await s.db
          .from("v25_products")
          .select("adult_only")
          .eq("id", path[4])
          .single();
        if (!p || p.adult_only) throw new Error("Product unavailable");
        const format = (
          await sharp(bytes, { limitInputPixels: 24000000 }).metadata()
        ).format;
        if (
          !format ||
          !["jpeg", "png", "webp"].includes(format) ||
          request.headers.get("content-type") !== `image/${format}`
        )
          throw new Error("Invalid image");
        body = new Uint8Array(
          await sharp(bytes, { limitInputPixels: 24000000 })
            .rotate()
            .resize({
              width: 2400,
              height: 2400,
              fit: "inside",
              withoutEnlargement: true,
            })
            .toFormat(format)
            .toBuffer(),
        );
      } else throw new Error("Not authorized");
    }
    const url = new URL(request.url);
    const headers: Record<string, string> = {
      apikey: config().key,
      Authorization: `Bearer ${s.token}`,
    };
    for (const h of ["content-type", "prefer", "range", "x-upsert"]) {
      const v = request.headers.get(h);
      if (v) headers[h] = v;
    }
    const response = await fetch(
      `${config().url}/${path.map(encodeURIComponent).join("/")}${url.search}`,
      { method, headers, body, cache: "no-store", redirect: "error" },
    );
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/json",
        "Cache-Control": "private, no-store",
        ...(response.headers.get("content-range")
          ? { "Content-Range": response.headers.get("content-range")! }
          : {}),
      },
    });
  } catch (e) {
    return failure(e);
  }
}
export const GET = proxy;
export const POST = proxy;
