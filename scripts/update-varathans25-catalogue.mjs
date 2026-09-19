import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "varathans25");

const products = [
  {
    oldSlug: "signature-curry-powder",
    slug: "masala-tea-powder",
    category: "tea",
    names: {
      de: ["Signature-Currypulver", "Masala-Tee-Pulver"],
      en: ["Signature curry powder", "Masala tea powder"],
      fr: ["Poudre de curry signature", "Poudre de thé masala"],
    },
    descriptions: {
      de: ["Der Anfang eines guten Currys. Warm, vielschichtig und voller Charakter.", "Ein aromatischer Teemix mit wärmenden Masala-Gewürzen. Rezeptur und Packungsgrösse werden noch bestätigt."],
      en: ["The starting point for a very good curry. Warm, layered and full of character.", "An aromatic tea blend with warming masala spices. Recipe and pack size are being confirmed."],
      fr: ["Le point de départ d’un bon curry. Chaleureux, nuancé et plein de caractère.", "Un mélange de thé aromatique aux épices masala chaleureuses. La recette et le format sont en cours de confirmation."],
    },
  },
  {
    oldSlug: "ceylon-green-tea",
    slug: "green-tea-powder",
    category: "tea",
    names: {
      de: ["Ceylon-Grüntee", "Grüntee-Pulver"],
      en: ["Ceylon green tea", "Green tea powder"],
      fr: ["Thé vert de Ceylan", "Poudre de thé vert"],
    },
    descriptions: {
      de: ["Leicht, zart und wohltuend erfrischend. Zeit für eine Tasse.", "Ein klarer Grüntee im neuen Varathans25 Beutelformat. Herkunft und Packungsgrösse werden noch bestätigt."],
      en: ["Light, delicate and quietly refreshing. Make time for a cup.", "A clean green tea in the new Varathans25 packet format. Origin and pack size are being confirmed."],
      fr: ["Léger, délicat et rafraîchissant. Prenez le temps d’une tasse.", "Un thé vert délicat dans le nouveau sachet Varathans25. L’origine et le format sont en cours de confirmation."],
    },
  },
  {
    oldSlug: "sri-lankan-coffee",
    slug: "coffee-powder",
    category: "coffee",
    names: {
      de: ["Kaffee aus Sri Lanka", "Kaffeepulver"],
      en: ["Sri Lankan coffee", "Coffee powder"],
      fr: ["Café du Sri Lanka", "Café moulu"],
    },
    descriptions: {
      de: ["Ein Inselkaffee-Konzept für einen entspannten Start in den Tag.", "Gemahlener Kaffee für die Varathans25 Auswahl. Röstung, Herkunft und Packungsgrösse werden noch bestätigt."],
      en: ["An island coffee concept for a slower start to your day.", "Ground coffee selected for the Varathans25 pantry. Roast, origin and pack size are being confirmed."],
      fr: ["Un concept de café insulaire pour commencer la journée en douceur.", "Un café moulu sélectionné pour l’épicerie Varathans25. La torréfaction, l’origine et le format sont en cours de confirmation."],
    },
  },
  {
    oldSlug: "ceylon-black-tea",
    slug: "premium-black-tea-powder",
    category: "tea",
    names: {
      de: ["Ceylon-Schwarztee", "Premium-Schwarztee-Pulver"],
      en: ["Ceylon black tea", "Premium black tea powder"],
      fr: ["Thé noir de Ceylan", "Poudre de thé noir premium"],
    },
    descriptions: {
      de: ["Ein Moment der Ruhe. Ein vollmundiger loser Tee für tägliche Rituale.", "Ein vollmundiger Schwarztee für eine klassische Tasse. Qualität, Herkunft und Packungsgrösse werden noch bestätigt."],
      en: ["A moment to pause. A full-bodied loose-leaf tea for everyday rituals.", "A full-bodied black tea for a classic cup. Grade, origin and pack size are being confirmed."],
      fr: ["Un instant de calme. Un thé en vrac généreux pour les rituels quotidiens.", "Un thé noir généreux pour une tasse classique. La qualité, l’origine et le format sont en cours de confirmation."],
    },
  },
  {
    oldSlug: "roasted-curry-powder",
    slug: "cinnamon-tea",
    category: "tea",
    names: {
      de: ["Geröstetes Currypulver", "Zimttee"],
      en: ["Roasted curry powder", "Cinnamon tea"],
      fr: ["Curry torréfié", "Thé à la cannelle"],
    },
    descriptions: {
      de: ["Eine tiefere Note. Eine geröstete Mischung für langsam gegarte Gerichte.", "Eine duftende Teemischung rund um Zimt. Rezeptur und Packungsgrösse werden noch bestätigt."],
      en: ["A deeper expression. A roasted blend for slow-cooked favourites.", "A fragrant tea blend built around cinnamon. Recipe and pack size are being confirmed."],
      fr: ["Une expression plus profonde. Un mélange torréfié pour les plats mijotés.", "Un mélange de thé parfumé autour de la cannelle. La recette et le format sont en cours de confirmation."],
    },
  },
  {
    oldSlug: "chicken-curry-blend",
    slug: "cardamom-tea",
    category: "tea",
    names: {
      de: ["Poulet-Currymischung", "Kardamomtee"],
      en: ["Chicken curry blend", "Cardamom tea"],
      fr: ["Mélange curry pour poulet", "Thé à la cardamome"],
    },
    descriptions: {
      de: ["Eine duftende Mischung für Ihr nächstes Poulet-Curry.", "Eine aromatische Teemischung rund um Kardamom. Rezeptur und Packungsgrösse werden noch bestätigt."],
      en: ["A fragrant blend designed for your next chicken curry.", "An aromatic tea blend built around cardamom. Recipe and pack size are being confirmed."],
      fr: ["Un mélange parfumé pour votre prochain curry de poulet.", "Un mélange de thé aromatique autour de la cardamome. La recette et le format sont en cours de confirmation."],
    },
  },
];

const hidden = [
  "fish-curry-blend",
  "premium-spice-gift-box",
  "ready-to-cook-chicken",
  "ready-to-cook-fish",
];

function textFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return textFiles(absolute);
    return /\.(?:html|txt|js|css|xml|webmanifest)$/.test(entry.name) ? [absolute] : [];
  });
}

function replaceProductField(source, slug, field, value) {
  const escaped = new RegExp(`(\\\\?"id\\\\?":\\\\?"${slug}\\\\?"[\\s\\S]{0,1200}?\\\\?"${field}\\\\?":)\\\\?"[^"\\\\]*\\\\?"`, "g");
  return source.replace(escaped, (match, prefix) => {
    const quote = prefix.includes('\\"') ? '\\"' : '"';
    return `${prefix}${quote}${value}${quote}`;
  });
}

function setProductActive(source, slug, active) {
  const escaped = new RegExp(`(\\\\?"id\\\\?":\\\\?"${slug}\\\\?"[\\s\\S]{0,4000}?\\\\?"active\\\\?":)(?:true|false)`, "g");
  return source.replace(escaped, `$1${active}`);
}

function replaceProductGallery(source, slug) {
  const escaped = new RegExp(`(\\\\?"id\\\\?":\\\\?"${slug}\\\\?"[\\s\\S]{0,1200}?\\\\?"gallery\\\\?":)\\[[^\\]]*\\]`, "g");
  return source.replace(escaped, (match, prefix) => {
    const quote = prefix.includes('\\"') ? '\\"' : '"';
    return `${prefix}[${quote}/varathans25/images/${slug}.svg${quote}]`;
  });
}

function replaceCategories(source) {
  const categories = [
    { id: "tea", slug: "tea", names: { en: "Tea & infusions", de: "Tee & Aufgüsse", fr: "Thés & infusions" } },
    { id: "coffee", slug: "coffee", names: { en: "Coffee", de: "Kaffee", fr: "Café" } },
  ];
  const pattern = /(\\?"categories\\?":)\[[\s\S]*?\](,\\?"zones\\?":)/g;
  return source.replace(pattern, (match, prefix, suffix) => {
    const serialized = prefix.includes('\\"') ? JSON.stringify(categories).replaceAll('"', '\\"') : JSON.stringify(categories);
    return `${prefix}${serialized}${suffix}`;
  });
}

for (const file of textFiles(root)) {
  let source = fs.readFileSync(file, "utf8");
  const original = source;

  for (const product of products) {
    source = source.replaceAll(product.oldSlug, product.slug);
    for (const [oldName, newName] of Object.values(product.names)) source = source.replaceAll(oldName, newName);
    for (const [oldDescription, newDescription] of Object.values(product.descriptions)) source = source.replaceAll(oldDescription, newDescription);
    source = replaceProductField(source, product.slug, "categoryId", product.category);
    source = replaceProductField(source, product.slug, "weight", "—");
    source = replaceProductGallery(source, product.slug);
    source = source.replace(
      new RegExp(`(\\\\?"id\\\\?":\\\\?"${product.slug}\\\\?"[\\s\\S]{0,900}?\\\\?"spice\\\\?":)\\d`, "g"),
      "$10",
    );
    source = setProductActive(source, product.slug, true);
  }

  for (const slug of hidden) source = setProductActive(source, slug, false);

  const collectionOld = ["masala-tea-powder", "premium-black-tea-powder", "coffee-powder", "premium-spice-gift-box"];
  const collectionNew = products.map((product) => product.slug);
  source = source.replaceAll(JSON.stringify(collectionOld), JSON.stringify(collectionNew));
  source = source.replaceAll(
    JSON.stringify(collectionOld).replaceAll('"', '\\"'),
    JSON.stringify(collectionNew).replaceAll('"', '\\"'),
  );

  source = source.replaceAll("Ceylon tea", "Tea & infusions");
  source = source.replaceAll("Ceylon-Tee", "Tee & Aufgüsse");
  source = source.replaceAll("Thé de Ceylan", "Thés & infusions");
  source = source.replaceAll("Spices, tea, coffee and gifts from Varathans25 in Sursee.", "Tea and coffee concepts from Varathans25 in Sursee.");
  source = source.replaceAll("Spices, tea, coffee and gifts from Varathans25 in Sursee.", "Tea and coffee concepts from Varathans25 in Sursee.");
  source = replaceCategories(source);

  if (file.endsWith(".js")) {
    source = source.replaceAll("let U=i.filter(e=>{", "let U=i.filter(e=>e.active).filter(e=>{");
    source = source.replaceAll("let F=t.filter(e=>{", "let F=t.filter(e=>e.active).filter(e=>{");
  }

  if (file.endsWith(".html") && !source.includes("/varathans25/catalogue-patch.css")) {
    source = source.replace("</head>", '<link rel="stylesheet" href="/varathans25/catalogue-patch.css"/></head>');
  }

  if (source !== original) fs.writeFileSync(file, source);
}

console.log("Updated Varathans25 product data, translations, routes and catalogue filtering.");
