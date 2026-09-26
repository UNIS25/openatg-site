# Varathans25 premium platform — isolated local review

This branch adds `platform/`, a separate Next.js application with a genuine local Supabase Auth/PostgreSQL/Storage stack. It does not replace the generated GitHub Pages site, modify DNS, deploy services or change production `main`.

Production base: `ad680205287c323005c2e92f0f1ffa514939ec52` (five premium tea tins, coffee removed, cigar packaging editorial preserved). Seven schema migrations and the product editor/translation work are selectively reused from backend checkpoint `87c81681931a3a90c6034164e1f98c8471acd150`. No branch merge was performed. The older migration comments describe their historical context; they are preserved verbatim.

The implementation covers tea and pantry review shopping, server-calculated CHF totals, real accounts, Silver/Gold hospitality memberships, local verification outcomes, signed member passes, staff redemption, test QR documents, reconciliation, administration and audit history. The cigar club is an adults-only **editorial** presentation. Tobacco orders, discounts, transactional box builders and tobacco payments are excluded; retained supplier records stay private. Existing public cigar files are unchanged.

## Application routes

- `/` — language entrance with original logo, approved restaurant photos, manual controls and remembered language.
- `/{de,fr,en}/` — bright store with three destinations.
- `/{locale}/tea`, `/pantry`, `/product/{slug}`, `/bag`.
- `/{locale}/club` — dark editorial presentation, approved closed/open box images, 18+ and responsible information; no prices or ordering.
- `/{locale}/membership`, `/register`, `/login`, `/reset`, `/account`, `/privacy`.
- `/{locale}/admin` — named-account administration, German default via `/admin` and `/adminpage`.
- `/club` defaults to `/de/club`. Every route is noindex/nofollow in this staging application.

## Data and business assumptions

The five existing tea names, tins, curry name/image, original logo and restaurant/packaging imagery are copied without changing their source files. Unverified product facts remain blank. The six presentation records are explicitly separated from draft product records. The fallback includes marketing names and images only; it never supplies an orderable price when the database cannot be reached.

Local prices use the already-existing **provisional** catalogue amounts as labelled test fixtures. They are not approved prices. The local quantity of 200 per product is a synthetic testing fixture, not asserted stock. No new origin, weight, nutrition, ingredient or tobacco claim is published. Coffee has no enabled public presentation; historical records are retained.

Owner-specified configurable values: Silver CHF 0; standard CH delivery CHF 10; free standard CH delivery at discounted merchandise subtotal >= CHF 100; Gold CHF 69 monthly or CHF 500 yearly; default eligible product discount 10%; eligible Swiss standard delivery free for Gold. Membership fees are excluded from product discounts.

Unverified staging assumptions: a 120-minute minimum visit interval (across both venues), one drink per recorded visit, 365-day synthetic verification, five-minute member pass, seven-day test invoice, 30-day provider-reference retention after expiry/rejection. All need owner/provider/legal review. Test Gold activation records a local test payment, never a real successful payment or real subscription.

## Implementation boundaries

`src/lib/server.ts` owns server-only credentials, cookie sessions, CSRF and rate limits. `v25_platform_action` authenticates and validates writes in PostgreSQL. Integer quote snapshots are retained on orders. Payments and membership events are append-only. Accounts read only their own data through RLS. The admin product editor retains independent DE/FR/EN factual fields; missing translations remain marked, not generated.

Local email confirmation and recovery use GoTrue and Mailpit. Hosted email delivery, provider production age verification, real subscriptions and live checkout remain deliberately unavailable. No raw identity document or card field exists. See the security and deployment documents before any later release.
