# Payment boundaries and test QR documents

All payment adapters are server-side. Hosted ordinary-merchandise adapters are explicitly typed for an approved Swiss PSP, TWINT and hosted card checkout; a separate membership-billing adapter requires written business approval. Their production methods fail closed until implemented and approved. No Stripe integration, raw card form or tobacco-payment adapter exists.

The local QR service creates an actual PDF and Swiss QR payload with structured addresses, exact integer CHF amount, unique ISO 11649 RF reference, order/membership ID and expiry. It uses a published SIX **sample regular IBAN** with SCOR (not a QR-IBAN with SCOR). The PDF and payload say **TEST — NOT PAYABLE**. This review document is deliberately not represented as a bank-approved production payment slip.

Production creditor/bank information is absent from browser code and repository configuration. The test adapter never reads live creditor variables. A production implementation must validate creditor identity, IBAN/reference pairing, mandatory QR layout/cross/quiet-zone dimensions, structured addresses, reference checksums, permitted characters, rounding and bank acceptance. The test PDF is a service-boundary demonstration, not a claim of SIX certification. Reference: [SIX QR-bill standards and current implementation guidance](https://www.six-group.com/en/products-services/banking-services/payment-standardization/standards/qr-bill.html).

## Lifecycle

Payments are separate from order fulfilment and membership records. States: awaiting_payment, processing, paid, matched, failed, expired, cancelled, refunded, partially_refunded. The gateway rejects invalid transitions, mismatched amounts and late payment acceptance after expiry. Paid/matched orders alone can enter preparing, then dispatched and completed. An unpaid order may be cancelled and releases inventory once. Membership payment activation requires current verification and an enabled plan.

Manual reconciliation is administrator-only and requires a reason. Import accepts a bounded CSV:

```csv
transaction_id,reference,amount_rappen,currency,booked_at
local-example,RF85123456789,9999,CHF,2026-09-27
```

Use an actual reference from a local invoice when testing. The sample line is illustrative, not a payable instruction. Imports validate integer amounts, CH currency, dates and duplicate external IDs; the database matches references and amounts atomically. Failed batches roll back. Provider event uniqueness and input fingerprints prevent repeat settlement.

Future PSP callbacks must sign `timestamp.rawBody` using HMAC-SHA256 with the server-only signing key. The local webhook uses `x-v25-timestamp` (Unix seconds) and `x-v25-signature` (`sha256=...`), a five-minute window, constant-time comparison and immutable unique provider event history. A replay with changed content is rejected. Production adapters must implement the provider's actual approved signature scheme rather than assume this local protocol matches it.

Gold membership fees are never discounted. Test payment confirmation activates a local paid-period fixture; no live bank transfer, subscription charge or successful live payment is claimed. Recurring renewal, dunning, chargebacks, production partial-refund execution and provider cancellation callbacks require the selected provider contract and sandbox acceptance suite before release.
