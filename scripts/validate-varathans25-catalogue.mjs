import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { Script } from "node:vm";

const root = path.resolve(import.meta.dirname, "..", "varathans25");
const locales = ["de", "fr", "en"];
const activeSlugs = [
  "gelber-curry-kokos",
  "masala-tea-powder",
  "green-tea-powder",
  "coffee-powder",
  "premium-black-tea-powder",
  "cinnamon-tea",
  "cardamom-tea",
];
const hiddenSlugs = [
  "premium-spice-gift-box",
  "ready-to-cook-chicken",
  "ready-to-cook-fish",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// JSON embedded in a Flight script needs another layer of string escaping.
// Checking external chunks alone does not catch malformed generated HTML.
let htmlCount = 0;
let inlineScriptCount = 0;
for (const relative of fs.readdirSync(root, { recursive: true })) {
  if (!relative.endsWith(".html")) continue;
  const html = fs.readFileSync(path.join(root, relative), "utf8");
  htmlCount += 1;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc\s*=/.test(match[1])) continue;
    if (/type=["']application\/ld\+json["']/.test(match[1])) {
      JSON.parse(match[2]);
      continue;
    }
    const line = html.slice(0, match.index).split("\n").length;
    // Compile only; never execute the embedded application scripts.
    new Script(match[2], { filename: `${relative}:${line}` });
    inlineScriptCount += 1;
  }
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

for (const slug of activeSlugs.filter((item) => item !== "gelber-curry-kokos")) {
  const imagePath = path.join(root, "images", `${slug}.svg`);
  assert(fs.existsSync(imagePath), `Missing packet image: ${slug}`);
  const image = fs.readFileSync(imagePath, "utf8");
  assert(image.includes('<rect width="600" height="660" fill="#ffffff"/>'), `Packet background is not white: ${slug}`);
  assert(image.includes("data:image/png;base64,"), `Official logo is not embedded: ${slug}`);
  assert(image.includes("<title"), `Packet image is missing a title: ${slug}`);
}

const curryImagePath = path.join(root, "images", "gelber-curry-kokos.webp");
assert(fs.existsSync(curryImagePath), "Missing Gelber Curry Kokos studio packshot");
assert(fs.statSync(curryImagePath).size > 100_000, "Curry packshot is unexpectedly small");

for (const locale of locales) {
  const data = fs.readFileSync(path.join(root, locale, "__next._full.txt"), "utf8");
  for (const slug of activeSlugs) {
    const product = extractProduct(data, slug);
    assert(product.active === true, `${locale}: ${slug} is not active`);
    if (slug === "gelber-curry-kokos") {
      assert(product.weight === "80 g", `${locale}: curry weight does not match the supplied label`);
      assert(product.priceCents === 0 && product.stock === 0, `${locale}: curry price or stock was invented`);
      assert(product.origin === "CH", `${locale}: curry is not identified as Swiss-made`);
      assert(product.verification === "VERIFIED", `${locale}: supplied curry label data is not exposed`);
      assert(product.gallery.length === 1 && product.gallery[0].endsWith(`${slug}.webp`), `${locale}: curry gallery is not product-specific`);
      assert(product.nutrition.energyKj === "2549 kJ / 609 kcal", `${locale}: curry nutrition does not match the label`);
      assert(product.translations.every((entry) => entry.ingredients && entry.allergens && entry.preparation), `${locale}: curry label details are incomplete`);
    } else {
      assert(product.weight === "—", `${locale}: ${slug} has an invented pack size`);
      assert(product.gallery.length === 1 && product.gallery[0].endsWith(`${slug}.svg`), `${locale}: ${slug} gallery is not product-specific`);
    }
    assert(fs.existsSync(path.join(root, locale, "product", slug, "index.html")), `${locale}: missing product route ${slug}`);
  }
  for (const slug of hiddenSlugs) assert(extractProduct(data, slug).active === false, `${locale}: old placeholder remains active: ${slug}`);
  assert(data.includes(JSON.stringify(activeSlugs)), `${locale}: launch collection is not the six-product range`);
  assert(data.includes('"categories":[{"id":"spices"'), `${locale}: spices category is missing`);
  assert(!data.includes('"id":"ready-to-cook","slug":"ready-to-cook"'), `${locale}: empty legacy category remains visible`);
}

const enhancementScript = fs.readFileSync(path.join(root, "cigar-mix-builder.js"), "utf8");
const enhancementStyles = fs.readFileSync(path.join(root, "cigar-mix-builder.css"), "utf8");
assert(enhancementScript.includes('data-size="4"') && enhancementScript.includes('data-size="6"'), "Cigar builder is missing a box size");
assert(enhancementScript.includes("state.items.push(product)"), "Cigar builder does not support mix-and-match selection");
assert(enhancementScript.includes("sessionStorage"), "Cigar builder does not preserve the review selection");
assert(enhancementStyles.includes(".cigar-mix-builder__slots"), "Cigar builder styling is missing");
execFileSync(process.execPath, ["--check", path.join(root, "cigar-mix-builder.js")]);

for (const locale of locales) {
  for (const relative of ["index.html", "shop/index.html", "cigars/index.html", "product/gelber-curry-kokos/index.html"]) {
    const html = fs.readFileSync(path.join(root, locale, relative), "utf8");
    assert(html.includes("/varathans25/cigar-mix-builder.js"), `${locale}/${relative}: storefront enhancement script missing`);
    assert(html.includes("/varathans25/cigar-mix-builder.css"), `${locale}/${relative}: storefront enhancement stylesheet missing`);
  }
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

console.log("Varathans25 catalogue validation passed: 7 products, 3 languages, 21 product routes, and 4/6-cigar box builder.");
console.log(`Inline JavaScript syntax passed: ${inlineScriptCount} scripts in ${htmlCount} HTML files.`);
