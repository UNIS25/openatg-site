import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculate,
  goldActive,
  paymentTransition,
  safeInteger,
} from "../src/lib/domain";
import {
  issuePass,
  passHash,
  verifyWebhook,
  LocalAgeAdapter,
} from "../src/lib/tokens";
import {
  rfReference,
  rfValid,
  qrPayload,
  createTestBill,
  DisabledHostedAdapter,
} from "../src/lib/qr-bill";
import { messages } from "../src/lib/messages";
import { createHmac } from "node:crypto";
const line = (price: number) => [{ quantity: 1, price, goldEligible: true }];
for (const [amount, shipping] of [
  [9999, 1000],
  [10000, 0],
  [10001, 0],
])
  test(`Silver boundary CHF ${(amount / 100).toFixed(2)}`, () =>
    assert.equal(calculate(line(amount)).delivery_rappen, shipping));
test("discount is applied before the delivery threshold", () => {
  const q = calculate([
    { quantity: 1, price: 11000, promotion: 9900, goldEligible: true },
  ]);
  assert.equal(q.delivery_rappen, 1000);
  assert.equal(q.remaining_rappen, 100);
});
test("Gold tea order receives single ten percent discount and Swiss delivery", () => {
  const q = calculate(line(1690), true);
  assert.equal(q.discount_rappen, 169);
  assert.equal(q.delivery_rappen, 0);
  assert.equal(q.total_rappen, 1521);
});
test("rounding occurs on integer line totals, half up", () =>
  assert.equal(
    calculate([{ quantity: 3, price: 999, goldEligible: true }], true)
      .discount_rappen,
    300,
  ));
test("best eligible discount never stacks", () => {
  const q = calculate(
    [{ quantity: 2, price: 1000, promotion: 800, goldEligible: true }],
    true,
  );
  assert.equal(q.discount_rappen, 400);
});
test("Gold exclusions preserve original prices", () =>
  assert.equal(
    calculate([{ quantity: 1, price: 1000, goldEligible: false }], true)
      .discount_rappen,
    0,
  ));
test("removing an item relocks free Silver delivery", () => {
  assert.equal(
    calculate([{ quantity: 2, price: 6000, goldEligible: true }])
      .delivery_rappen,
    0,
  );
  assert.equal(calculate(line(6000)).delivery_rappen, 1000);
});
test("tobacco-only and mixed carts are rejected", () => {
  assert.throws(() =>
    calculate([{ quantity: 1, price: 1000, goldEligible: true, adult: true }]),
  );
  assert.throws(() =>
    calculate(
      [
        ...line(1000),
        { quantity: 1, price: 1000, goldEligible: true, adult: true },
      ],
      true,
    ),
  );
});
test("fractional money and negative stock quantities are rejected", () => {
  assert.throws(() => safeInteger(1.5));
  assert.throws(() =>
    calculate([{ quantity: -1, price: 1000, goldEligible: true }]),
  );
});
const m = {
  status: "active",
  period_start: "2026-01-01",
  period_end: "2027-01-01",
  cancel_at_period_end: true,
};
const v = { status: "verified", expires_at: "2027-01-01" };
const now = Date.parse("2026-09-27");
test("scheduled cancellation retains already paid period", () =>
  assert.equal(goldActive(m, v, now), true));
test("cancelled, past due and expired memberships lose Gold", () => {
  for (const status of ["cancelled", "past_due", "expired", "suspended"])
    assert.equal(goldActive({ ...m, status }, v, now), false);
  assert.equal(goldActive({ ...m, period_end: "2026-09-26" }, v, now), false);
});
test("expired verification loses Gold even in paid period", () =>
  assert.equal(goldActive(m, { ...v, expires_at: "2026-09-26" }, now), false));
test("payment transitions protect terminal and unpaid states", () => {
  assert.equal(paymentTransition("awaiting_payment", "matched"), true);
  assert.equal(paymentTransition("paid", "refunded"), true);
  assert.equal(paymentTransition("failed", "paid"), false);
  assert.equal(paymentTransition("refunded", "paid"), false);
});
test("opaque signed passes contain no member data", () => {
  const token = issuePass("local-unit-key");
  assert.equal(token.length, 87);
  assert.match(passHash(token, "local-unit-key"), /^[a-f0-9]{64}$/);
  assert.throws(() => passHash(token, "wrong-key"));
});
test("webhook timestamp and body signature reject tampering", () => {
  const raw = '{"event":"test"}',
    stamp = "1790467200",
    key = "unit-test-key";
  const sig =
    "sha256=" +
    createHmac("sha256", key).update(`${stamp}.${raw}`).digest("hex");
  verifyWebhook(raw, stamp, sig, key, Number(stamp) * 1000);
  assert.throws(() =>
    verifyWebhook(raw + " ", stamp, sig, key, Number(stamp) * 1000),
  );
  assert.throws(() =>
    verifyWebhook(raw, stamp, sig, key, Number(stamp) * 1000 + 301000),
  );
});
test("deterministic test age adapter supports all review outcomes", async () => {
  const a = new LocalAgeAdapter();
  for (const [input, result] of [
    ["adult", "verified"],
    ["underage", "rejected"],
    ["expired", "expired"],
    ["review", "manual_review"],
    ["pending", "pending"],
  ])
    assert.equal((await a.verify(input)).status, result);
});
test("RF references have ISO 11649 checksum", () => {
  for (const value of ["1", "999999999999999999999", "1234567890123"])
    assert.equal(rfValid(rfReference(value)), true);
  assert.equal(rfValid("RF0001234"), false);
});
const invoice = {
  reference: rfReference("123456789"),
  amount_rappen: 9999,
  order_id: "local-test",
  name: "LOCAL TEST",
  street: "Teststrasse",
  house_number: "1",
  postal_code: "8000",
  city: "Zürich",
  expires_at: "2026-10-01",
};
test("QR payload uses structured Swiss address, exact CHF and TEST marker", () => {
  const payload = qrPayload(invoice);
  assert.match(payload, /99\.99\r\nCHF/);
  assert.match(payload, /SCOR/);
  assert.match(payload, /TEST - NOT PAYABLE/);
  assert.throws(() => qrPayload({ ...invoice, name: "bad\nfield" }));
});
test("QR test generation produces actual PDF", async () => {
  const pdf = await createTestBill(invoice);
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.ok(pdf.length > 1000);
});
test("all live provider adapters fail closed", async () => {
  for (const kind of ["payrexx", "twint", "hosted-card", "membership"] as const)
    await assert.rejects(new DisabledHostedAdapter(kind).createSession());
});
test("DE FR EN dictionaries have complete nonempty translations", () => {
  for (const [key, values] of Object.entries(messages)) {
    assert.equal(values.length, 3, key);
    for (const v of values) assert.ok(v.trim(), key);
  }
});

test("bank import validates schema, integer CHF amounts and duplicate external IDs", async () => {
  const { parseReconciliation } = await import("../src/lib/reconciliation");
  const header = "transaction_id,reference,amount_rappen,currency,booked_at";
  const row = `test1,${rfReference("12")},9999,CHF,2026-09-27`;
  assert.equal(parseReconciliation(`${header}\n${row}`)[0].amount_rappen, 9999);
  assert.throws(() => parseReconciliation(`${header}\n${row}\n${row}`));
  assert.throws(() =>
    parseReconciliation(`${header}\n${row.replace("9999", "99.99")}`),
  );
  assert.throws(() =>
    parseReconciliation(`${header}\n${row.replace("CHF", "EUR")}`),
  );
});
