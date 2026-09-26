# Membership and calculation rules

| Plan | Fee | Default eligible product discount | Eligible standard Swiss delivery |
|---|---:|---:|---|
| Silver | CHF 0 | None | CHF 10 below CHF 100; free at CHF 100 or above |
| Gold monthly | CHF 69 | 10% | Free during active verified paid period |
| Gold yearly | CHF 500 | 10% | Free during active verified paid period |

These are the values supplied by the owner, stored as integer rappen/basis points in configurable database records. They are not newly invented prices. Product prices/stock remain unapproved local fixtures. Discounts apply only to eligible tea/pantry merchandise; membership fees are billed separately at the configured full fee. Tobacco transactions are outside this implementation.

For each line, calculate the configured Gold discount on `unit_rappen * quantity`, round half-up to an integer rappen, compare with any approved product promotion and choose the larger discount. Never add the discounts together. Sum the discounted merchandise lines before calculating delivery. No international delivery is offered by this adapter.

- CHF 99.99 eligible merchandise: Silver standard delivery CHF 10.
- CHF 100.00: free standard delivery.
- CHF 100.01: free standard delivery.
- CHF 110.00 reduced to CHF 99.00 by an eligible promotion: Silver delivery CHF 10.
- Gold free delivery requires active membership, enabled plan, current paid period and unexpired adult verification.

Cancellation requests set `cancel_at_period_end`; a paid active membership keeps its benefits through that date. A membership actually marked cancelled, expired, suspended or past_due has no Gold benefit. Verification expiry or account suspension overrides a paid period immediately. The effective privilege is calculated at request time, so a delayed retention job cannot prolong Gold benefits.

A free Silver registration remains an account after Gold expires. Membership activation requires confirmed email and age verification. Gold selection creates a local test invoice; only an authorized test reconciliation activates its paid period. Real recurring billing is disabled, not simulated as a subscription contract.

The complimentary drink has an enabled benefit definition, a one-per-visit uniqueness rule, venue/staff/time record, named-member confirmation and a configurable visit interval. Default 120 minutes is a staging assumption needing owner approval. It prevents immediately recording a second visit at the other venue to redeem again. The pass is opaque, signed, short-lived and does not contain personal information. Camera access is disabled; staff may use a keyboard QR scanner or paste the scanned token.
