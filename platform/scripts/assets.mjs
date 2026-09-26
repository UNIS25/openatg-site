import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { dirname, resolve } from "node:path";
const root = resolve("..");
const catalogue = JSON.parse(
  await readFile(resolve(root, "editorial/src/data/shell.json"), "utf8"),
);
const products = catalogue.products.filter((p) =>
  [
    "premium-black-tea-powder",
    "green-tea-powder",
    "masala-tea-powder",
    "cinnamon-tea",
    "cardamom-tea",
    "gelber-curry-kokos",
  ].includes(p.slug),
);
if (products.length !== 6) throw new Error("Expected five tea tins and curry");
const assets = [
  ...products.map((p) => p.image),
  "/varathans25/brand/varathans25-original.png",
  "/varathans25/fonts/inter-latin.woff2",
  ...["dining-interior", "rooftop-panorama", "bar-evening"].map(
    (n) => `/varathans25/images/restaurant/${n}.webp`,
  ),
  ...["closed", "open"].flatMap((n) =>
    ["", "-480", "-960"].map(
      (s) => `/varathans25/images/cigars/varathans-cigars-box-${n}${s}.webp`,
    ),
  ),
];
for (const asset of assets) {
  const dest = resolve("public", asset.slice(1));
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(resolve(root, asset.slice(1)), dest);
}
for (const p of products) {
  for (const width of [320, 640]) {
    const dest = resolve(
      "public",
      p.image.slice(1).replace(".webp", `-${width}.webp`),
    );
    await sharp(resolve(root, p.image.slice(1)))
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(dest);
  }
}
await mkdir("src/data", { recursive: true });
// Only already published marketing names and imagery. Product facts remain in the database.
await writeFile(
  "src/data/catalogue.json",
  JSON.stringify(
    products.map((p) => ({
      slug: p.slug,
      category: p.categoryId === "tea" ? "tea" : "pantry",
      image: p.image,
      translations: p.translations.map((t) => ({
        locale: t.locale,
        name: t.name,
        description: "",
      })),
      test_price_rappen: p.priceCents,
    })),
    null,
    2,
  ) + "\n",
);
console.log(
  "Copied approved assets for six products, original logo and editorial photography.",
);
