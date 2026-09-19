import { writeFile } from "node:fs/promises";
const url = new URL(process.env.VITE_SUPABASE_URL),
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (url.protocol !== "https:" || !key)
  throw Error(
    "A configured production backend and public key are required. Never export synthetic local products.",
  );
const response = await fetch(new URL("/rest/v1/rpc/v25_catalogue", url), {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: "{}",
});
if (!response.ok) throw Error("Public catalogue could not be read");
const products = await response.json();
if (!Array.isArray(products)) throw Error("Invalid public catalogue");
await writeFile(
  "src/published-fallback.json",
  JSON.stringify(
    { generated_at: new Date().toISOString(), products },
    null,
    2,
  ) + "\n",
);
console.log(
  `Exported ${products.length} published products through the public read-only projection. Review the diff before committing.`,
);
