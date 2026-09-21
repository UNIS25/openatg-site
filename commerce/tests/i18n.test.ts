import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";
import messages from "../src/admin-messages.json";
import { adminLanguage, errorKey, translate } from "../src/i18n";
import {
  blankProduct,
  locales,
  missingTranslationFields,
  translationFields,
} from "../src/domain";

describe("admin languages", () => {
  it("defaults to German and accepts only DE/FR/EN preferences", () => {
    expect(adminLanguage(null)).toBe("de");
    expect(adminLanguage("invalid")).toBe("de");
    for (const locale of locales) expect(adminLanguage(locale)).toBe(locale);
  });
  it("has nonempty translations with matching interpolation tokens for every message", () => {
    const tokens = (s: string) => s.match(/\{\w+\}/g)?.sort() ?? [];
    for (const [key, entry] of Object.entries(messages)) {
      for (const locale of locales) {
        const value = translate(locale, key);
        expect(value.trim(), `${key}: ${locale}`).not.toBe("");
        expect(tokens(value), `${key}: ${locale}`).toEqual(tokens(key));
      }
      expect(entry.de).toBeTruthy();
      expect(entry.fr).toBeTruthy();
    }
  });
  it("covers literal interface messages and accessible labels in every admin component", () => {
    const missing: string[] = [];
    for (const file of [
      "ui",
      "products",
      "orders",
      "settings",
      "customers",
      "main",
      "i18n",
    ]) {
      const source = ts.createSourceFile(
        file,
        readFileSync(`src/${file}.tsx`, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const check = (key: string) => {
        if (!Object.hasOwn(messages, key)) missing.push(`${file}: ${key}`);
      };
      const visit = (node: ts.Node) => {
        if (
          ts.isCallExpression(node) &&
          node.expression.getText(source) === "t"
        ) {
          const visitArg = (arg: ts.Node) => {
            if (ts.isStringLiteral(arg)) check(arg.text);
            else if (ts.isConditionalExpression(arg)) {
              visitArg(arg.whenTrue);
              visitArg(arg.whenFalse);
            }
          };
          visitArg(node.arguments[0]);
        }
        if (
          ts.isJsxAttribute(node) &&
          ["label", "aria-label", "alt"].includes(node.name.getText(source)) &&
          node.initializer &&
          ts.isStringLiteral(node.initializer) &&
          node.initializer.text !== "Varathans25"
        )
          check(node.initializer.text);
        if (ts.isJsxText(node)) {
          const text = node.text.replace(/\s+/g, " ").trim();
          if (
            /[a-z]/i.test(text) &&
            ![
              "VARATHANS25",
              "VARATHANS25 /",
              "SKU",
              "CHF",
              "DE / FR / EN",
              "draft",
              "active",
              "archived",
            ].includes(text)
          )
            missing.push(`${file}: untranslated JSX ${text}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(missing).toEqual([]);
  });
  it("covers backend admin validation and audit actions without exposing unknown server messages", () => {
    for (const file of [
      "202609200002_admin_operations.sql",
      "202609200005_access.sql",
      "202609220007_admin_languages.sql",
    ]) {
      const sql = readFileSync(`../supabase/migrations/${file}`, "utf8");
      for (const [, key] of sql.matchAll(/raise exception '([^']+)'/g))
        expect(Object.hasOwn(messages, key), key).toBe(true);
    }
    expect(errorKey({ message: "private database details" })).toBe(
      "The operation could not be completed. Please try again.",
    );
    expect(
      errorKey({ message: "Product changed. Reload before saving." }),
    ).toBe("Product changed. Reload before saving.");
  });
  it("keeps all content fields blank until explicitly supplied", () => {
    const product = blankProduct();
    expect(product.translations).toHaveLength(3);
    for (const tr of product.translations)
      expect(missingTranslationFields(tr)).toEqual([...translationFields]);
    product.translations[0].ingredients = "Manually verified DE fixture";
    expect(product.translations[1].ingredients).toBe("");
    expect(product.translations[2].ingredients).toBe("");
    expect(product.price_rappen).toBeNull();
    expect(product.supplier).toBe("");
  });
  it("interpolates counts and names without changing stored values", () => {
    expect(
      translate("fr", "Missing fields in {language}: {count}", {
        language: "DE",
        count: 8,
      }),
    ).toBe("Champs manquants en DE : 8");
  });
});
