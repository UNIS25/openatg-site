import fs from "node:fs";
import path from "node:path";

const siteRoot = path.resolve(import.meta.dirname, "..", "varathans25");
const locales = ["de", "fr", "en"];
const oldSlug = "fish-curry-blend";
const slug = "gelber-curry-kokos";

const translations = {
  de: {
    oldName: "Fisch-Currymischung",
    oldDescription: "Lebendige Gewürznoten für Fisch, Kokos und kreative Küchenideen.",
    name: "Gelber Curry Kokos",
    description: "Eine in der Schweiz hergestellte Curry-Kokos-Mischung von Varathans25. Produktangaben gemäss dem gelieferten 80-g-Etikett; Preis und Verfügbarkeit werden noch bestätigt.",
    ingredients: "Kokosnussmilchpulver LK 73 % (Kokosnussmilchpulver, Maltodextrin, Milcheiweiss, Stabilisator: E339), Tempura-Mehl CH 13 % (Weizenmehl, Reismehl, Weizenstärke, Backtriebmittel: E500, E450, Weizenprotein), Curry FR 7 % (Curcuma, Koriandersamen, Senfkörner, Bockshornklee, Ingwer, Dextrose, Kreuzkümmel, Kochsalz, Cayennepfeffer, Selleriesamen, Knoblauch, Basilikum), Paprika DE 7 %.",
    allergens: "Enthält Milch, Weizen (Gluten), Senf und Sellerie.",
    preparation: "Kühl, trocken und vor Licht geschützt aufbewahren. Zu verbrauchen bis: siehe Aufdruck.",
  },
  en: {
    oldName: "Fish curry blend",
    oldDescription: "Bright spice notes for fish, coconut and a little kitchen creativity.",
    name: "Gelber Curry Kokos",
    description: "A curry-and-coconut blend made in Switzerland by Varathans25. Product information follows the supplied 80 g label; price and availability are still being confirmed.",
    ingredients: "Coconut milk powder LK 73% (coconut milk powder, maltodextrin, milk protein, stabiliser: E339), tempura flour CH 13% (wheat flour, rice flour, wheat starch, raising agents: E500, E450, wheat protein), curry FR 7% (turmeric, coriander seeds, mustard seeds, fenugreek, ginger, dextrose, cumin, salt, cayenne pepper, celery seeds, garlic, basil), paprika DE 7%.",
    allergens: "Contains milk, wheat (gluten), mustard and celery.",
    preparation: "Store in a cool, dry place protected from light. Best before: see print on pack.",
  },
  fr: {
    oldName: "Mélange curry pour poisson",
    oldDescription: "Des notes vives pour le poisson, la noix de coco et votre créativité.",
    name: "Gelber Curry Kokos",
    description: "Un mélange curry-coco fabriqué en Suisse par Varathans25. Les informations proviennent de l’étiquette fournie du format 80 g; le prix et la disponibilité restent à confirmer.",
    ingredients: "Poudre de lait de coco LK 73 % (poudre de lait de coco, maltodextrine, protéine de lait, stabilisant : E339), farine tempura CH 13 % (farine de blé, farine de riz, amidon de blé, poudres à lever : E500, E450, protéine de blé), curry FR 7 % (curcuma, graines de coriandre, graines de moutarde, fenugrec, gingembre, dextrose, cumin, sel, poivre de Cayenne, graines de céleri, ail, basilic), paprika DE 7 %.",
    allergens: "Contient du lait, du blé (gluten), de la moutarde et du céleri.",
    preparation: "Conserver au frais, au sec et à l’abri de la lumière. À consommer de préférence avant : voir impression sur l’emballage.",
  },
};

const nutrition = {
  energyKj: "2549 kJ / 609 kcal",
  fat: "49.4 g",
  saturates: "41.7 g",
  carbohydrate: "29.9 g",
  sugars: "9 g",
  protein: "5.2 g",
  fibre: "2.37 g",
  salt: "0.6 g",
};

function textFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return textFiles(absolute);
    return /\.(?:html|txt|js|css|xml|webmanifest)$/.test(entry.name) ? [absolute] : [];
  });
}

function replaceScalar(source, productSlug, field, value) {
  const pattern = new RegExp(`(\\\\?"id\\\\?":\\\\?"${productSlug}\\\\?"[\\s\\S]{0,5200}?\\\\?"${field}\\\\?":)(?:\\\\?"[^"\\\\]*\\\\?"|-?\\d+(?:\\.\\d+)?|true|false|null)`, "g");
  return source.replace(pattern, (match, prefix) => {
    if (typeof value === "string") {
      const serialized = JSON.stringify(value);
      return `${prefix}${prefix.includes('\\"') ? JSON.stringify(serialized).slice(1, -1) : serialized}`;
    }
    return `${prefix}${JSON.stringify(value)}`;
  });
}

function replaceObject(source, productSlug, field, value) {
  const pattern = new RegExp(`(\\\\?"id\\\\?":\\\\?"${productSlug}\\\\?"[\\s\\S]{0,7200}?\\\\?"${field}\\\\?":)\\{[^{}]*\\}`, "g");
  return source.replace(pattern, (match, prefix) => {
    const serialized = JSON.stringify(value);
    return `${prefix}${prefix.includes('\\"') ? JSON.stringify(serialized).slice(1, -1) : serialized}`;
  });
}

function replaceGallery(source, productSlug) {
  const pattern = new RegExp(`(\\\\?"id\\\\?":\\\\?"${productSlug}\\\\?"[\\s\\S]{0,2400}?\\\\?"gallery\\\\?":)\\[[^\\]]*\\]`, "g");
  return source.replace(pattern, (match, prefix) => {
    const gallery = JSON.stringify([`/varathans25/images/${productSlug}.webp`]);
    return `${prefix}${prefix.includes('\\"') ? JSON.stringify(gallery).slice(1, -1) : gallery}`;
  });
}

function replaceExactJson(source, before, after) {
  const plainBefore = JSON.stringify(before);
  const plainAfter = JSON.stringify(after);
  return source
    .replaceAll(plainBefore, plainAfter)
    .replaceAll(plainBefore.replaceAll('"', '\\"'), plainAfter.replaceAll('"', '\\"'));
}

const reviewCopy = {
  de: {
    price: "Preis folgt",
    priceNote: "Preis und Verfügbarkeit werden bestätigt.",
    unavailable: "Demnächst verfügbar",
    origin: "Schweiz",
    spice: "Schärfegrad",
  },
  en: {
    price: "Price coming soon",
    priceNote: "Price and availability are being confirmed.",
    unavailable: "Coming soon",
    origin: "Switzerland",
    spice: "Spice level",
  },
  fr: {
    price: "Prix à venir",
    priceNote: "Le prix et la disponibilité sont en cours de confirmation.",
    unavailable: "Bientôt disponible",
    origin: "Suisse",
    spice: "Intensité",
  },
};

function patchRenderedCard(card, locale) {
  const words = reviewCopy[locale];
  return card
    .replaceAll("120 g", "80 g")
    .replace(/(?:CHF(?:&nbsp;|\u00a0)11\.90|11\.90(?:&nbsp;|\u00a0)CHF)/g, words.price)
    .replace(/(class="stock-status">)(?:Available|Verfügbar|Disponible)/g, `$1${words.unavailable}`);
}

function patchRenderedHtml(source, file) {
  const locale = file.match(/[\\/](de|fr|en)[\\/]/)?.[1];
  if (!locale) return source;
  const words = reviewCopy[locale];

  source = source.replace(/<article class="product-card">[\s\S]*?<\/article>/g, (card) =>
    card.includes(`/product/${slug}/`) ? patchRenderedCard(card, locale) : card,
  );

  if (!file.includes(`${path.sep}product${path.sep}${slug}${path.sep}index.html`)) return source;
  const start = source.indexOf('<section class="product-page section">');
  const end = source.indexOf('<section class="section related-section">', start);
  if (start < 0 || end < 0) return source;
  let detail = source.slice(start, end);
  detail = detail
    .replace('<section class="product-page section">', '<section class="product-page section product-page--pending">')
    .replace(/(?:CHF(?:&nbsp;|\u00a0)11\.90|11\.90(?:&nbsp;|\u00a0)CHF)/g, words.price)
    .replace(/(<p class="micro">)(?:Provisional price · incl\. VAT|Provisorischer Preis · inkl\. MWST|Prix provisoire · TVA incluse)(<\/p>)/g, `$1${words.priceNote}$2`)
    .replace(/(<dt>Origin<\/dt><dd>)Sri Lanka(<\/dd>)/g, `$1${words.origin}$2`)
    .replace(/(<dt>Herkunft<\/dt><dd>)Sri Lanka(<\/dd>)/g, `$1${words.origin}$2`)
    .replace(/(<dt>Origine<\/dt><dd>)Sri Lanka(<\/dd>)/g, `$1${words.origin}$2`)
    .replace(/(<p class="stock-line">[\s\S]*?<\/svg>)(?:Available|Verfügbar|Disponible)(<\/p>)/g, `$1${words.unavailable}$2`)
    .replace(new RegExp(`<div><dt>${words.spice}<\\/dt><dd class="spice-level">[\\s\\S]*?<\\/dd><\\/div>`), "");
  return source.slice(0, start) + detail + source.slice(end);
}

for (const file of textFiles(siteRoot)) {
  let source = fs.readFileSync(file, "utf8");
  const original = source;

  for (const locale of locales) {
    const entry = translations[locale];
    source = replaceExactJson(
      source,
      {
        locale,
        name: entry.oldName,
        description: entry.oldDescription,
        ingredients: "",
        allergens: "",
        preparation: "",
      },
      {
        locale,
        name: entry.name,
        description: entry.description,
        ingredients: entry.ingredients,
        allergens: entry.allergens,
        preparation: entry.preparation,
      },
    );
    source = source.replaceAll(entry.oldName, entry.name);
    source = source.replaceAll(entry.oldDescription, entry.description);
  }

  source = source.replaceAll(oldSlug, slug);
  source = source.replaceAll(`/varathans25/images/${slug}.svg`, `/varathans25/images/${slug}.webp`);
  source = replaceScalar(source, slug, "categoryId", "spices");
  source = replaceScalar(source, slug, "priceCents", 0);
  source = replaceScalar(source, slug, "launchPriceCents", null);
  source = replaceScalar(source, slug, "stock", 0);
  source = replaceScalar(source, slug, "weight", "80 g");
  source = replaceScalar(source, slug, "spice", 0);
  source = replaceScalar(source, slug, "dietary", "");
  source = replaceScalar(source, slug, "origin", "CH");
  source = replaceScalar(source, slug, "image", `/varathans25/images/${slug}.webp`);
  source = replaceScalar(source, slug, "verification", "VERIFIED");
  source = replaceScalar(source, slug, "featured", true);
  source = replaceScalar(source, slug, "houseSelection", true);
  source = replaceScalar(source, slug, "active", true);
  source = replaceGallery(source, slug);
  source = replaceObject(source, slug, "nutrition", nutrition);

  const sixProducts = [
    "masala-tea-powder",
    "green-tea-powder",
    "coffee-powder",
    "premium-black-tea-powder",
    "cinnamon-tea",
    "cardamom-tea",
  ];
  const sevenProducts = [slug, ...sixProducts];
  source = replaceExactJson(source, sixProducts, sevenProducts);

  const twoCategories = [
    { id: "tea", slug: "tea", names: { en: "Tea & infusions", de: "Tee & Aufgüsse", fr: "Thés & infusions" } },
    { id: "coffee", slug: "coffee", names: { en: "Coffee", de: "Kaffee", fr: "Café" } },
  ];
  const threeCategories = [
    { id: "spices", slug: "spices", names: { en: "Spices & blends", de: "Gewürze & Mischungen", fr: "Épices & mélanges" } },
    ...twoCategories,
  ];
  source = replaceExactJson(source, twoCategories, threeCategories);
  source = source.replaceAll(
    "Tea and coffee concepts from Varathans25 in Sursee.",
    "Curry, tea and coffee from Varathans25 in Sursee.",
  );

  if (file.endsWith(".html")) {
    if (!source.includes("/varathans25/cigar-mix-builder.css")) {
      source = source.replace(
        "</head>",
        '<link rel="stylesheet" href="/varathans25/cigar-mix-builder.css"/><script defer src="/varathans25/cigar-mix-builder.js"></script></head>',
      );
    }
    source = patchRenderedHtml(source, file);
  }

  if (source !== original) fs.writeFileSync(file, source);
}

for (const locale of locales) {
  const route = path.join(siteRoot, locale, "product", slug);
  if (!fs.existsSync(route)) continue;
  for (const file of textFiles(route)) {
    let source = fs.readFileSync(file, "utf8");
    source = source.replaceAll("120 g", "80 g");
    fs.writeFileSync(file, source);
  }
}

const catalogueChunk = path.join(siteRoot, "_next", "static", "chunks", "2to0v8xkzjqr9.js");
const pendingPrice = JSON.stringify(Object.fromEntries(locales.map((locale) => [locale, reviewCopy[locale].price])));
let catalogueClient = fs.readFileSync(catalogueChunk, "utf8");
catalogueClient = catalogueClient.replaceAll(
  "children:(0,mS.money)((0,mS.price)(t),i)",
  `children:t.priceCents>0?(0,mS.money)((0,mS.price)(t),i):${pendingPrice}[i]`,
);
catalogueClient = catalogueClient.replaceAll(
  "children:t.priceCents>0?(0,mS.money)((0,mS.price)(t),i):mk[i].comingSoon",
  `children:t.priceCents>0?(0,mS.money)((0,mS.price)(t),i):${pendingPrice}[i]`,
);
fs.writeFileSync(catalogueChunk, catalogueClient);

const detailChunk = path.join(siteRoot, "_next", "static", "chunks", "2gwu-0b7eoq24.js");
let detailClient = fs.readFileSync(detailChunk, "utf8");
detailClient = detailClient.replaceAll(
  "children:(0,h.money)((0,h.price)(x),n)",
  `children:x.priceCents>0?(0,h.money)((0,h.price)(x),n):${pendingPrice}[n]`,
);
detailClient = detailClient.replaceAll(
  "children:x.priceCents>0?(0,h.money)((0,h.price)(x),n):o.storefront[n].comingSoon",
  `children:x.priceCents>0?(0,h.money)((0,h.price)(x),n):${pendingPrice}[n]`,
);
fs.writeFileSync(detailChunk, detailClient);

const patchCss = path.join(siteRoot, "catalogue-patch.css");
let css = fs.readFileSync(patchCss, "utf8");
css = css.replace(`.product-card:has(a[href*="/product/${slug}"]),\n`, "");
if (!css.includes("product-page--pending")) {
  css += `\n.product-page--pending .purchase-row,\n.product-page--pending .mobile-sticky-add {\n  display: none !important;\n}\n\n.product-page--pending .detail-price {\n  color: #1b3f63;\n}\n`;
}
if (!css.includes('product/gelber-curry-kokos"]) .add-control')) {
  css += `\n.product-card:has(a[href*="/product/gelber-curry-kokos"]) .add-control {\n  display: none !important;\n}\n`;
}
fs.writeFileSync(patchCss, css);

for (const locale of locales) {
  const from = path.join(siteRoot, locale, "product", oldSlug);
  const to = path.join(siteRoot, locale, "product", slug);
  if (fs.existsSync(from) && !fs.existsSync(to)) fs.renameSync(from, to);
}

console.log("Added Gelber Curry Kokos and installed the 4/6-cigar mix-and-match experience.");
