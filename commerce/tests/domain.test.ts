import { assertPublicKey } from "../src/public-config";
import { describe, it, expect } from "vitest";
import {
  delivery,
  parseMoney,
  calculateCart,
  deliveryMessages,
  csvCell,
  type Purchasable,
} from "../src/domain";
const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const products: Purchasable[] = [
  {
    id: a,
    price_rappen: 2100,
    promotion_rappen: null,
    adult_only: true,
    brand: "Patoro",
    available: true,
    stock: 10,
  },
  {
    id: b,
    price_rappen: 2900,
    promotion_rappen: null,
    adult_only: true,
    brand: "Davidoff",
    available: true,
    stock: 10,
  },
];
describe("CHF 100 delivery boundary", () => {
  it.each([
    [9999, 790, 1],
    [10000, 0, 0],
    [10001, 0, 0],
  ])("%i rappen", (subtotal, charge, remaining) => {
    expect(delivery(subtotal, 0, 790)).toMatchObject({
      standard: charge,
      remaining,
    });
  });
  it("uses merchandise after discounts and before delivery", () => {
    expect(delivery(10000, 1, 790)).toMatchObject({
      standard: 790,
      remaining: 1,
      total: 10789,
    });
  });
  it("never waives adult delivery", () => {
    expect(delivery(10000, 0, 790, 1500)).toMatchObject({
      standard: 0,
      adult: 1500,
      total: 11500,
    });
  });
  it("does not invent an unconfigured rate", () => {
    expect(delivery(9999, 0, null).total).toBeNull();
    expect(delivery(10000, 0, null).total).toBe(10000);
    expect(delivery(10000, 0, null, null).total).toBeNull();
  });
  it("rejects fractional rappen and invalid discounts", () => {
    expect(() => delivery(1.2, 0, 790)).toThrow();
    expect(() => delivery(100, 101, 790)).toThrow();
  });
});
describe("money entry", () => {
  it.each([
    ["99.99", 9999],
    ["100", 10000],
    ["0.01", 1],
    ["100,00", 10000],
    ["", null],
  ])("%s", (text, value) => expect(parseMoney(String(text))).toBe(value));
  it.each(["NaN", "Infinity", "1.999", "-1", "1e3"])("rejects %s", (text) =>
    expect(() => parseMoney(text)).toThrow(),
  );
});
describe("single cigars and custom boxes", () => {
  it("single cigar quantity uses unit prices", () =>
    expect(
      calculateCart(
        [{ kind: "single", product_id: a, quantity: 2 }],
        products,
        true,
      ),
    ).toMatchObject({ subtotal: 4200, allocations: { [a]: 2 } }));
  it.each([4, 6] as const)("%i mixed cigars including repeats", (size) => {
    const ids = Array.from({ length: size }, (_, i) => (i % 2 ? a : b));
    const q = calculateCart(
      [{ kind: "box", size, product_ids: ids, quantity: 1 }],
      products,
      true,
    );
    expect(q.subtotal).toBe(size * 2500);
    expect(q.discount).toBe(0);
    expect(q.allocations).toEqual({ [a]: size / 2, [b]: size / 2 });
  });
  it("aggregates duplicate cigars across singles and multiple boxes", () => {
    expect(() =>
      calculateCart(
        [
          { kind: "box", size: 6, product_ids: Array(6).fill(a), quantity: 1 },
          { kind: "single", product_id: a, quantity: 5 },
        ],
        products,
        true,
      ),
    ).toThrow("Insufficient stock");
  });
  it("rejects incomplete boxes", () =>
    expect(() =>
      calculateCart(
        [{ kind: "box", size: 4, product_ids: [a, b, a], quantity: 1 }],
        products,
        true,
      ),
    ).toThrow("Incomplete"));
  it("rejects invalid sizes, noninteger quantities and missing products", () => {
    for (const line of [
      { kind: "box", size: 5, product_ids: [a, b, a, b, a], quantity: 1 },
      { kind: "single", product_id: a, quantity: 1.5 },
      {
        kind: "single",
        product_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        quantity: 1,
      },
    ])
      expect(() => calculateCart([line], products, true)).toThrow();
  });
  it("all cigar purchasing requires the entry confirmation", () => {
    for (const line of [
      { kind: "single", product_id: a, quantity: 1 },
      { kind: "box", size: 4, product_ids: [a, a, a, a], quantity: 1 },
    ])
      expect(() => calculateCart([line], products, false)).toThrow(
        "Adult confirmation",
      );
  });
  it("applies a box discount only when configured", () => {
    expect(
      calculateCart(
        [{ kind: "box", size: 4, product_ids: [a, b, a, b], quantity: 1 }],
        products,
        true,
        500,
      ),
    ).toMatchObject({ subtotal: 10000, discount: 500 });
  });
  it("rejects non-cigar box products", () =>
    expect(() =>
      calculateCart(
        [{ kind: "box", size: 4, product_ids: [a, a, a, a], quantity: 1 }],
        [{ ...products[0], adult_only: false }],
        true,
      ),
    ).toThrow("Invalid cigar"));
});
describe("DE/FR/EN and exports", () => {
  it.each(["de", "fr", "en"] as const)("%s free-delivery message", (locale) => {
    expect(deliveryMessages[locale].remaining("CHF 0.01")).toContain(
      "CHF 0.01",
    );
    expect(deliveryMessages[locale].free.length).toBeGreaterThan(10);
    expect(deliveryMessages[locale].adult.length).toBeGreaterThan(20);
  });
  it("neutralizes spreadsheet formulas and quotes", () => {
    expect(csvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"');
    expect(csvCell("\t+1")).toContain("'");
  });
});

describe("public configuration", () => {
  it("rejects service and secret keys without echoing their values", () => {
    expect(() => assertPublicKey("sb_secret_test_only")).toThrow("secret key");
    const key = `header.${btoa(JSON.stringify({ role: "service_role" }))}.signature`;
    expect(() => assertPublicKey(key)).toThrow(
      "Expected a Supabase publishable key or anon JWT",
    );
  });
  it("accepts only public key forms", () => {
    expect(() => assertPublicKey("sb_publishable_test_only")).not.toThrow();
    expect(() =>
      assertPublicKey(
        `header.${btoa(JSON.stringify({ role: "anon" }))}.signature`,
      ),
    ).not.toThrow();
    expect(() => assertPublicKey("malformed")).toThrow();
  });
});
