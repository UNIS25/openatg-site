import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..", "varathans25");
const locales = ["de", "fr", "en"];
const activeSlugs = [
  "masala-tea-powder",
  "green-tea-powder",
  "coffee-powder",
  "premium-black-tea-powder",
  "cinnamon-tea",
  "cardamom-tea",
];
const hiddenSlugs = [
  "fish-curry-blend",
  "premium-spice-gift-box",
  "ready-to-cook-chicken",
  "ready-to-cook-fish",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractProduct(source, slug) {
  const start = source.indexOf(`{"id":"${slug}"`);
  assert(start >= 0, `Missing product data: ${slug}`);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
    } else if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return JSON.parse(source.slice(start, index + 1));
  }
  throw new Error(`Unterminated product data: ${slug}`);
}

for (const slug of activeSlugs) {
  const imagePath = path.join(root, "images", `${slug}.svg`);
  assert(fs.existsSync(imagePath), `Missing packet image: ${slug}`);
  const image = fs.readFileSync(imagePath, "utf8");
  assert(image.includes('<rect width="600" height="660" fill="#ffffff"/>'), `Packet background is not white: ${slug}`);
  assert(image.includes("data:image/png;base64,"), `Official logo is not embedded: ${slug}`);
  assert(image.includes("<title"), `Packet image is missing a title: ${slug}`);
}

for (const locale of locales) {
  const data = fs.readFileSync(path.join(root, locale, "__next._full.txt"), "utf8");
  for (const slug of activeSlugs) {
    const product = extractProduct(data, slug);
    assert(product.active === true, `${locale}: ${slug} is not active`);
    assert(product.weight === "—", `${locale}: ${slug} has an invented pack size`);
    assert(product.gallery.length === 1 && product.gallery[0].endsWith(`${slug}.svg`), `${locale}: ${slug} gallery is not product-specific`);
    assert(fs.existsSync(path.join(root, locale, "product", slug, "index.html")), `${locale}: missing product route ${slug}`);
  }
  for (const slug of hiddenSlugs) assert(extractProduct(data, slug).active === false, `${locale}: old placeholder remains active: ${slug}`);
  assert(data.includes(JSON.stringify(activeSlugs)), `${locale}: launch collection is not the six-product range`);
  assert(data.includes('"categories":[{"id":"tea"'), `${locale}: catalogue categories were not reduced to the active range`);
  assert(!data.includes('"id":"ready-to-cook","slug":"ready-to-cook"'), `${locale}: empty legacy category remains visible`);
}

for (const chunk of ["0qtblbqs-ui46.js", "2vrr_5r91ji23.js"]) {
  const clientPath = path.join(root, "_next", "static", "chunks", chunk);
  const client = fs.readFileSync(clientPath, "utf8");
  assert(client.includes(".filter(e=>e.active).filter(e=>{"), `Client catalogue does not filter inactive placeholders: ${chunk}`);
  execFileSync(process.execPath, ["--check", clientPath]);
}

const forbiddenConcepts = ["SWISS MILK TEA", "TEA SHOT", "Alpine Ceylon", "200 ml", "100 ml"];
for (const locale of locales) {
  const shop = fs.readFileSync(path.join(root, locale, "shop", "index.html"), "utf8");
  assert(shop.includes("/varathans25/catalogue-patch.css"), `${locale}: catalogue patch stylesheet missing`);
  for (const phrase of forbiddenConcepts) assert(!shop.includes(phrase), `${locale}: obsolete drink concept remains: ${phrase}`);
}

console.log("Varathans25 catalogue validation passed: 6 packet products, 3 languages, 18 product routes.");
