# Varathans25 layout and standard-delivery review

## Status and scope

Local review branch: `work/varathans25-layout-delivery-review`.
Base: `b60203dec179d3b18753f55884b45a697b01f3c4`.
Safety branch: `safety/pre-layout-delivery-b60203d`.

This change is **not deployed**. It covers the general storefront header,
centred section layout, and standard Swiss delivery messaging for non-tobacco
merchandise. It does not implement cigar purchasing, discounted cigar boxes,
mixed tobacco orders, or tobacco cart operations. The earlier unfinished work
on `release/varathans25-box-discounts-20260922` is preserved separately.

Main and the live website remain unchanged. The backend branch remains at
`87c81681931a3a90c6034164e1f98c8471acd150`.

## Changes

- Preserve the original logo image. Give the header stable vertical padding,
  including after scrolling, and align its gutters to the existing 1600px
  maximum content width.
- Add a restrained announcement under navigation and a message on standard
  product pages, in German, French and English. Tobacco pages do not advertise
  this standard-delivery offer.
- Add a translated bag estimate, progress indicator and destination selector.
  The estimate uses the existing cart's merchandise subtotal after its product
  discounts, exposed as an integer-rappen DOM attribute by the React cart.
- Use an inclusive 10,000-rappen Swiss threshold. The English copy says
  “from CHF 100” to match the rule at exactly CHF 100.00.
- Below the threshold, indicate that the standard rate applies. Its amount
  remains unconfigured, represented by `null`; no delivery rate was invented.
- International delivery never qualifies. Restricted or unknown cart contents
  do not enter this non-tobacco estimate. No delivery surcharge is modified.
- Checkout remains disabled. No backend, authentication, API, payment or
  database service is connected, and no product price or description changes.
- A readiness event prevents enhancement before React initialisation. The
  shared chunk is renamed for cache invalidation; other generated-file changes
  are exact asset-reference substitutions and the new CSS/module includes.

## Verification

- 11 Node unit tests pass: CHF 99.99 / 100.00 / 100.01; an unconfigured versus
  configured standard rate; a discounted subtotal dropping below CHF 100;
  food plus tea; item removal; international exclusion; invalid money; and
  complete DE/FR/EN text keys.
- 27 Playwright journeys pass in Chromium: DE/FR/EN at 1440×1000, 1024×1000
  and 390×844. They cover the complete logo before/after scrolling, gutters,
  product messaging, mobile navigation, language switching, keyboard input,
  destination persistence and the existing tea review bag's quantity changes.
- The tea journey uses existing provisional catalogue amounts, solely to test
  the already-existing frontend review cart. It does not verify or approve
  those prices. Its checkout remains disabled.
- Boundary rendering fixtures change only a local test DOM subtotal contract;
  no fixture price or cart is inserted into the public catalogue.
- All 27 local journeys record zero page/console errors and zero API, backend,
  payment or write requests. Full-page axe scans report zero violations at
  checked states. No horizontal overflow at the three tested widths.
- ESLint and JavaScript syntax checks pass. All 1,508 inline scripts/JSON
  payloads in 161 exported HTML pages parse successfully. All local asset links
  in those HTML files resolve. Existing generated page content is byte-identical
  after reversing only the declared includes and asset-reference substitutions.
- No TypeScript, database, dependency or Next source configuration changed.
  Backend tests and database migrations were not run for this static change.

### Reproduce

From the repository root:

```sh
node --test tests/varathans25/standard-delivery.test.mjs
python3 -m http.server 4187 --bind 127.0.0.1 --directory .
```

In a separate terminal, copy the browser test and config into a disposable
local test workspace with `@playwright/test` and `@axe-core/playwright` installed.
The files must be beside that workspace's `node_modules` so Node can resolve
the test dependencies. Run:

```sh
./node_modules/.bin/playwright test --config playwright.config.mjs
```

The config uses port 4187 and saves a JSON report, failure screenshots, diagnostics
and screenshots alongside the test files. Keep these generated artifacts out
of the published export. Review captures are available in the current machine's
`.local/varathans25-admin-backend/commerce/.local/layout-delivery/screenshots/`.

## Deployment blocker and rollback

The existing live English storefront returns HTTP 200 but records a console
error: Cloudflare injects `https://static.cloudflareinsights.com/beacon.min.js`,
which is blocked by the existing `script-src 'self' 'unsafe-inline'` policy.
This predates the change. The CSP has not been weakened and no hosting settings
have been changed. The requested zero-console-error deployment gate is unmet.

No push or deployment has occurred. To discard this review from consideration,
continue using the existing main branch; no live rollback is necessary. If the
review commit is later deployed after resolving its gate, revert that specific
commit with `git revert` and push normally. Do not reset or force-push main.
