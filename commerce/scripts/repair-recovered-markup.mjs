// Reconcile the recovered static export with its existing client renderer.
// Run from commerce/ with the local verification server on port 4175.
import { chromium, expect } from "@playwright/test";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve("../varathans25");
const origin = "http://127.0.0.1:4175";
const checkOnly = process.argv.includes("--check");
const browser = await chromium.launch({ headless: true });
let repaired = 0;
let checked = 0;

function streamRange(html) {
  const marker = '<div hidden id="S:0">';
  const start = html.indexOf(marker);
  if (start < 0)
    throw Error("Expected the recovered Next.js streamed boundary");
  const contentStart = start + marker.length;
  const tags = /<\/?div\b[^>]*>/g;
  tags.lastIndex = contentStart;
  let depth = 1;
  for (let match; (match = tags.exec(html));) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (!depth) return [contentStart, match.index];
  }
  throw Error("Unclosed streamed boundary");
}

try {
  const files = (await readdir(root, { recursive: true })).filter(
    (file) => /^(de|fr|en)\//.test(file) && file.endsWith("/index.html"),
  );
  for (const file of files) {
    const original = await readFile(resolve(root, file), "utf8");
    const page = await browser.newPage({ reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    // Repair uses React's initial markup; --check exercises the full storefront.
    if (!checkOnly)
      await page.route("**/cigar-mix-builder.js", (route) =>
        route.fulfill({
          contentType: "text/javascript",
          body: "",
        }),
      );
    const response = await page.goto(
      `${origin}/varathans25/${file.replace(/index\.html$/, "")}`,
    );
    if (!response?.ok() || (await response.text()) !== original)
      throw Error(
        `Verification server does not match the working tree: ${file}`,
      );
    await page.waitForLoadState("networkidle");
    if (file.includes("/product/")) {
      // A real interaction hydrates deferred product details. Keep image index 0.
      await page.locator(".gallery-thumbs button").first().click();
      const locale = file.split("/")[0];
      const slug = file.split("/")[2];
      const payload = await readFile(
        resolve(root, locale, "__next._full.txt"),
        "utf8",
      );
      const record = payload
        .split("\n")
        .find((line) => line.includes('"products":['));
      const products = JSON.parse(record.slice(record.indexOf(":") + 1))[3]
        .products;
      const product = products.find((entry) => entry.slug === slug);
      await expect(page.locator(".product-facts dd").first()).toHaveText(
        product.weight,
      );
    }
    await page.evaluate(
      () =>
        new Promise((done) =>
          requestAnimationFrame(() => requestAnimationFrame(done)),
        ),
    );
    if (errors.length) {
      if (checkOnly) throw Error(`${file}: ${errors.join("\n")}`);
      if (errors.some((error) => !error.includes("Minified React error #418")))
        throw Error(`${file}: ${errors.join("\n")}`);
      let rendered = await page.locator("main").evaluate((main) => {
        const clone = main.cloneNode(true);
        function delimitText(node) {
          for (const child of [...node.childNodes]) {
            if (
              child.nodeType === Node.TEXT_NODE &&
              child.previousSibling?.nodeType === Node.TEXT_NODE
            )
              node.insertBefore(document.createComment(""), child);
            delimitText(child);
          }
        }
        delimitText(clone);
        return clone.innerHTML;
      });
      const [start, end] = streamRange(original);
      const previous = original.slice(start, end);
      // Preserve Next's server-only metadata boundary and SSR useId values.
      const metadata = previous.match(/(?:<!--[^>]*-->)+$/)?.[0] ?? "";
      if (metadata && !rendered.endsWith(metadata)) rendered += metadata;
      const forms = [
        ...previous.matchAll(
          /<form\b[^>]*class="postcode-form[^"\n]*"[\s\S]*?<\/form>/g,
        ),
      ];
      let formIndex = 0;
      rendered = rendered.replace(
        /<form\b[^>]*class="postcode-form[^"\n]*"[\s\S]*?<\/form>/g,
        (form) => forms[formIndex++]?.[0] ?? form,
      );
      await writeFile(
        resolve(root, file),
        original.slice(0, start) + rendered + original.slice(end),
      );
      repaired += 1;
      console.log(`Reconciled existing rendered content: ${file}`);
    }
    await page.close();
    checked += 1;
    if (checked % 25 === 0) console.log(`Checked ${checked} routes.`);
  }
} finally {
  await browser.close();
}
console.log(
  `Checked ${checked} routes; reconciled ${repaired}. Product data and scripts were not changed.`,
);
