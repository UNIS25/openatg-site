import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const logoPath = path.join(root, "varathans25", "brand", "varathans25-original.png");
const outputDir = path.join(root, "varathans25", "images");
const logo = fs.readFileSync(logoPath).toString("base64");

const products = [
  {
    slug: "masala-tea-powder",
    number: "01",
    family: "TEA COLLECTION",
    lines: ["MASALA TEA", "POWDER"],
    accent: "#9D3842",
    motif: `<path d="M276 426c12-25 37-25 49-2-9 9-18 14-28 15-9-1-16-5-21-13Z"/><path d="M302 400c-1 15-5 27-14 38"/><path d="M323 411c12-8 25-8 35 0-8 15-20 22-36 20"/>`,
  },
  {
    slug: "green-tea-powder",
    number: "02",
    family: "TEA COLLECTION",
    lines: ["GREEN TEA", "POWDER"],
    accent: "#1B3F63",
    motif: `<path d="M300 444c-5-27 2-48 27-61 7 29-2 49-27 61Z"/><path d="M300 443c-11-22-28-34-50-36 4 25 20 39 50 36Z"/><path d="M300 443c2-21 11-39 27-60"/>`,
  },
  {
    slug: "coffee-powder",
    number: "03",
    family: "COFFEE COLLECTION",
    lines: ["COFFEE", "POWDER"],
    accent: "#8D7450",
    motif: `<ellipse cx="284" cy="418" rx="18" ry="28" transform="rotate(-26 284 418)"/><ellipse cx="324" cy="418" rx="18" ry="28" transform="rotate(26 324 418)"/><path d="M276 394c13 13 17 30 15 50M332 394c-13 13-17 30-15 50"/>`,
  },
  {
    slug: "premium-black-tea-powder",
    number: "04",
    family: "TEA COLLECTION",
    lines: ["PREMIUM BLACK", "TEA POWDER"],
    accent: "#1B3F63",
    motif: `<path d="M298 447c-26-23-35-48-17-73 26 22 34 47 17 73Z"/><path d="M298 446c13-22 32-35 57-39-4 25-22 39-57 39Z"/><path d="M299 445c-2-27-8-50-18-70"/>`,
  },
  {
    slug: "cinnamon-tea",
    number: "05",
    family: "TEA COLLECTION",
    lines: ["CINNAMON", "TEA"],
    accent: "#9D3842",
    motif: `<path d="M261 430 321 384c9-7 22 6 13 15l-60 46c-10 8-23-7-13-15Z"/><path d="m275 434 51-39M290 447l56-43"/><circle cx="333" cy="392" r="9"/>`,
  },
  {
    slug: "cardamom-tea",
    number: "06",
    family: "TEA COLLECTION",
    lines: ["CARDAMOM", "TEA"],
    accent: "#8D7450",
    motif: `<path d="M271 430c8-25 21-39 39-43 5 24-3 42-24 55-8-1-13-5-15-12Z"/><path d="M310 438c5-23 17-37 36-42 7 22 1 40-19 53-9 0-15-4-17-11Z"/><path d="M285 437c7-14 15-28 25-41M326 445c6-13 12-25 20-38"/>`,
  },
];

function packet(product) {
  const title = product.lines
    .map((line, index) => `<text x="300" y="${326 + index * 36}" text-anchor="middle" class="product-name">${line}</text>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 660" role="img" aria-labelledby="title desc">
  <title id="title">Varathans25 ${product.lines.join(" ")}</title>
  <desc id="desc">White studio product image of a premium resealable packet.</desc>
  <defs>
    <linearGradient id="packet" x1="0" x2="1">
      <stop offset="0" stop-color="#d9d7d0"/>
      <stop offset="0.08" stop-color="#f7f6f2"/>
      <stop offset="0.52" stop-color="#ffffff"/>
      <stop offset="0.91" stop-color="#f0eee8"/>
      <stop offset="1" stop-color="#cbc8bf"/>
    </linearGradient>
    <linearGradient id="seal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.48" stop-color="#dad7cf"/>
      <stop offset="0.62" stop-color="#f7f6f2"/>
      <stop offset="1" stop-color="#c9c6bd"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" x2="1">
      <stop offset="0" stop-color="#75613f"/>
      <stop offset="0.5" stop-color="#b79b69"/>
      <stop offset="1" stop-color="#75613f"/>
    </linearGradient>
    <filter id="shadow" x="-40%" y="-80%" width="180%" height="260%">
      <feGaussianBlur stdDeviation="16"/>
    </filter>
    <filter id="packet-shadow" x="-30%" y="-20%" width="160%" height="170%">
      <feDropShadow dx="0" dy="13" stdDeviation="13" flood-color="#1B2530" flood-opacity="0.19"/>
    </filter>
    <style>
      .product-name{font:600 25px Arial,Helvetica,sans-serif;letter-spacing:1.8px;fill:#1B3F63}
      .micro{font:600 9px Arial,Helvetica,sans-serif;letter-spacing:2.1px;fill:#1B3F63}
      .number{font:400 17px Georgia,serif;letter-spacing:1px;fill:#8D7450}
      .motif{fill:none;stroke:url(#gold);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
    </style>
  </defs>
  <rect width="600" height="660" fill="#ffffff"/>
  <ellipse cx="300" cy="579" rx="155" ry="24" fill="#9aa2aa" opacity="0.22" filter="url(#shadow)"/>
  <g filter="url(#packet-shadow)">
    <path d="M178 112Q181 86 207 82h186q26 4 29 30l27 424q2 25-27 34H178q-29-9-27-34Z" fill="url(#packet)" stroke="#d7d3ca"/>
    <path d="M181 112h238" stroke="#b6b1a6" stroke-width="2"/>
    <rect x="183" y="92" width="234" height="22" rx="4" fill="url(#seal)"/>
    <path d="M192 101h216M192 108h216" stroke="#c1bdb4" stroke-width="1"/>
    <path d="M163 528c48 16 226 16 274 0" fill="none" stroke="#cbc7be"/>
    <rect x="182" y="139" width="236" height="371" rx="2" fill="#fffefa" stroke="#8D7450" stroke-width="1.5"/>
    <rect x="189" y="146" width="222" height="357" rx="1" fill="none" stroke="#8D7450" stroke-width="0.6" opacity="0.58"/>
    <image x="205" y="165" width="190" height="103" href="data:image/png;base64,${logo}" preserveAspectRatio="xMidYMid meet"/>
    <line x1="214" y1="284" x2="386" y2="284" stroke="#8D7450" opacity="0.72"/>
    <text x="300" y="300" text-anchor="middle" class="micro">${product.family}</text>
    ${title}
    <g class="motif">${product.motif}</g>
    <rect x="182" y="472" width="236" height="38" fill="${product.accent}"/>
    <text x="205" y="496" class="micro" fill="#ffffff" style="fill:#ffffff">VARATHANS25</text>
    <text x="397" y="496" text-anchor="end" class="number" fill="#ffffff" style="fill:#ffffff">N° ${product.number}</text>
    <path d="M172 131c-10 92-10 270 2 385" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.45"/>
    <path d="M428 131c9 111 10 272-1 385" fill="none" stroke="#8b877f" stroke-width="3" opacity="0.16"/>
  </g>
</svg>`;
}

fs.mkdirSync(outputDir, { recursive: true });
for (const product of products) {
  fs.writeFileSync(path.join(outputDir, `${product.slug}.svg`), packet(product));
}

console.log(`Generated ${products.length} Varathans25 packet images.`);
