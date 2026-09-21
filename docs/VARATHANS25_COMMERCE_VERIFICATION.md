# Varathans25 commerce verification

## 22 September 2026 — multilingual administration

Starting point: `work/varathans25-admin-backend` at `f3e1735f4f324d8a6a13bcc00c5906aad5074ca4`. Safety branch `safety/varathans25-admin-i18n-f3e1735` was created before edits. The recovered product commits and approved storefront are preserved.

### What existed and what was missing

The admin interface was English only. DE/FR/EN product-content tabs existed for name, description, ingredients, allergens and storage instructions, but there was no interface-language selector or persisted preference. Separate short descriptions, preparation/use instructions, SEO titles and SEO descriptions were absent. Delivery and box discounts were grouped in Settings; there were no separate Customers, Delivery, Discounts or Cigar-box views.

The admin now defaults to German, with a shared visible DE/FR/EN selector on login, password setup, TOTP and every authenticated screen. It persists only the language code in browser storage and preserves unsaved form values during switching. All interface copy, accessible labels, validation, notifications and confirmation buttons use the locale catalogue. Unknown backend errors are localized without exposing raw database details.

Product editing separates all requested content fields by language, retains the existing storage-instruction fields, and visibly marks incomplete content. New fields default to blank. No ingredient, allergen, legal or product content was translated automatically. Shared facts and product-status codes remain unchanged across languages. A shared private supplier field was added. Customers and the separate configuration views use the existing role-protected backend, with no new public write access or browser service key.

### Verification results

| Check | Result |
| --- | --- |
| TypeScript and ESLint | Passed |
| Admin production build and commerce harness build | Passed |
| Unit tests | 38 passed, including locale completeness, source-label coverage, backend-error mappings and blank-content preservation |
| Catalogue and inline-script validation | 7 packet products, 21 product routes, 3 languages; 1,508 inline scripts in 161 HTML files passed |
| Fresh local database migrations and pgTAP | All seven migrations applied; 7 policy checks passed |
| Backend integration and security | 27 subtests passed (29 including the two Node parent suites) |
| SQL lint | No errors; five pre-existing warnings from JSONB initializer casts and STABLE functions calling the existing role-check helper in `v25_quote`, `v25_dashboard` and `v25_owner_authorized` |
| Complete Playwright suite | 24 passed: original 15 journeys plus DE, FR and EN admin journeys at desktop, tablet and mobile sizes |
| Browser console and uncaught exceptions | Zero in all 24 journeys; the strict shared fixture suppresses no errors |
| Accessibility | All axe assertions passed, including all required admin sections and translated confirmation dialogs |
| Dependency audit | 0 vulnerabilities; dependency versions unchanged |
| Static artifact staging | Prepared locally only; existing 1,159 tracked site files preserved by the staging check |
| Storefront and branch preservation | No change under `varathans25/` or other OpenATG public routes; `main` remains `e58fce588b61e89d2a56783f0e4b603937c15bef` |

Each added language journey creates and saves a draft through the real authenticated backend, fills separate content languages, leaves unverified ingredients/allergens blank, reloads and edits the product, and verifies saved shared values. It exercises localized native and application validation, previews, real order transitions, translated cancellation confirmation, customer contact reveal, delivery settings saves, every requested navigation area, language switching without losing edits, and persistence after logout, refresh and login. Existing owner journeys also switch the TOTP and access-management screens through all three languages.

A loaded-content check also exposed an existing order-search race: a late initial request could overwrite the filtered results. The order list now ignores responses from superseded requests; the journeys assert that searching settles to the expected order before management actions.

An intermediate mobile axe run found that empty horizontally scrolling tables lacked keyboard access. Labelled, focusable table regions fixed that issue; the final suite passes. The file picker and confirmation buttons use explicit translated controls rather than browser-language labels. Desktop/tablet/mobile screenshots are local, ignored artifacts in `commerce/.local/screenshots/`. Visual review covered the language selector, login, editor/incomplete fields, dashboard, orders and delivery settings. No storefront redesign was made.

### Changed files

- Admin language infrastructure: `commerce/src/i18n.tsx`, `commerce/src/admin-messages.json`, `commerce/src/main.tsx`, `commerce/index.html`.
- Admin screens and styles: `commerce/src/ui.tsx`, `commerce/src/products.tsx`, `commerce/src/orders.tsx`, `commerce/src/settings.tsx`, `commerce/src/customers.tsx`, `commerce/src/style.css`.
- Product types and migration: `commerce/src/domain.ts`, `supabase/migrations/202609220007_admin_languages.sql`.
- Tests: `commerce/tests/i18n.test.ts`, `commerce/tests/admin-languages.spec.ts`, `commerce/tests/backend.integration.ts`, `commerce/tests/journeys.spec.ts`, `commerce/tests/invitation.spec.ts`.
- Documentation: `docs/VARATHANS25_ADMIN_BACKEND.md`, this verification record.

No push, production migration or deployment was performed. Later authorized deployment must apply migration 007 before the matching admin build. The setup guide explains preserving the additional content when rolling back. Production backend configuration and the previously outstanding live-store integration remain separate work.

## 22 September 2026 — recovered storefront correction

Starting point: `work/varathans25-admin-backend` at `85a7eb5fa51d54eb7b6df6bf9edc7b0751909e5a`, after importing the original `0a5a509` and `5cde291` commits and rebasing only the backend work. The safety branch `safety/varathans25-admin-backend-b9a658a` remains at the original backend checkpoint.

### Root cause and correction

The source defect was in `scripts/add-varathans25-curry-and-cigar-box.mjs:63`, with the same defect at lines 73 and 81. `replaceScalar`, `replaceObject` and `replaceGallery` looked for two backslashes before a quote; the inline Flight payload uses one. The resulting raw JSON quotes terminated the enclosing JavaScript string. For example, line 2 of each DE/FR/EN home export contained `\"categoryId\":"spices"` inside that string. The first visible error was `Unexpected identifier 'spices'`.

This was nested inline-script serialization, not an error in a translation or the supplied curry label. The helpers now detect the actual escape level and use JSON serialization for the second layer. All 156 affected language-route HTML files were corrected. The validator now compiles all 1,508 inline scripts across 161 exported HTML files and runs as part of `npm test`.

Once JavaScript loaded, strict browser checks exposed related stale prerendered markup from the recovered product patches: old packet weights, product lists, gallery/details and pending-price controls did not match their existing client data. Only the streamed content of 39 affected pages was reconciled with the existing renderer. Next's metadata boundaries and postcode-form IDs were preserved. No catalogue payload, product translation, verified label, price, stock value, logo, image or font was changed.

The curry enhancer also replaced React-owned price nodes before hydration. Its curry DOM edits were removed; the same DE/FR/EN pending-price labels now render directly in the existing card/detail chunks, and CSS retains the existing hidden purchase controls and spice row. The four/six-cigar builder and age gate are unchanged. The local verification server now serves `.mjs` as JavaScript so the unchanged Signal modules load correctly.

### Final results

| Check | Result |
| --- | --- |
| TypeScript / ESLint | Passed |
| Admin production build / commerce harness build | Passed |
| Unit tests | 32 passed |
| Catalogue and inline-script validation | 7 products, 21 product routes, 3 languages; 1,508 scripts in 161 HTML files passed |
| Fresh database migrations / pgTAP | All six migrations applied; 7 policy checks passed |
| Backend integration / security | 26 subtests passed (28 including Node parent suites) |
| Complete Playwright suite | 15 passed in 32.3 seconds; desktop, tablet and mobile |
| Browser console / uncaught exceptions | Zero across every Playwright journey |
| Read-only language-route sweep | 156 routes passed; zero repairs required; product detail hydration exercised by thumbnail interaction |
| Accessibility | All existing axe assertions passed |
| Dependency audit | 0 vulnerabilities |
| Static artifact preparation / whitespace / staged-secret checks | Passed |

The expanded storefront journey also checks interactive curry and packet details in DE/FR/EN. Intermediate runs exposed the hydration mismatches described above; those were corrected before the final clean runs. A test locator was scoped to `main` because Next can temporarily retain another copy in its hidden streaming container. No browser error is filtered or suppressed by the Playwright fixture.

Existing non-failing build notices remain for the runtime-resolved shared font, vendor chunk size and third-party pure annotations. No dependency versions changed.

Changed sources: `scripts/add-varathans25-curry-and-cigar-box.mjs`, `scripts/validate-varathans25-catalogue.mjs`, `commerce/scripts/repair-recovered-markup.mjs`, `commerce/scripts/serve.mjs`, `commerce/package.json`, `commerce/tests/browser-fixture.ts`, and the three existing Playwright spec files. Storefront changes are limited to the 156 generated DE/FR/EN HTML files, price-label rendering in `2to0v8xkzjqr9.js` and `2gwu-0b7eoq24.js`, `catalogue-patch.css`, and removal of the curry DOM patch in `cigar-mix-builder.js`. This document records the verification.

Local `main` stayed at `e58fce588b61e89d2a56783f0e4b603937c15bef`; remote `main` stayed at `6c80ae4e0b7beb1708d1389a8c6d7c7dafb1b379`. No push or deployment was performed.

### Verification commands and scope

From `commerce/`, with local Supabase, Edge Functions and the verification server running:

```sh
npm run test:backend
npm run typecheck
npm run lint
npm test
npm run build
npm run build:harness
npm audit
npm run test:e2e
node scripts/repair-recovered-markup.mjs --check
npm run stage:pages
```

`repair-recovered-markup.mjs --check` is read-only, checks all 156 language routes with the complete storefront script, and interacts with product thumbnails to exercise deferred hydration. Without `--check`, it is a local recovery utility for reconciling stale streamed markup after rerunning the recovered catalogue patcher. It refuses any verification response that differs from the working-tree file, leaves product payloads untouched, and does not contact production. Use reduced motion during recovery to retain the carousel's initial server state.

The 15 desktop/tablet/mobile Playwright journeys now all assert zero `console.error` messages and zero uncaught browser exceptions. Accessibility assertions cover admin login, dashboard, editor, order details, settings and the three-language commerce harness. Additional browser checks cover the preserved 18+ gate, all 23 cigar cards, duplicate four/six-box selections, refresh persistence, the curry label and hidden purchase controls, and all three language homepages. Screenshots remain local under `commerce/.local/screenshots/`.

These checks verify the existing backend and its integration harness alongside the recovered static storefront. They do not add the remaining live-catalogue integration or production configuration. No production service, `main` branch, remote branch or deployment was changed.

## Historical verification — 20 September 2026

Date: 20 September 2026 (Asia/Colombo).

## Result and scope

The new backend and admin were verified against a real, isolated local Supabase stack. The customer commerce components were verified in a local harness against that same backend. The existing OpenATG and approved Varathans25 files are unchanged.

**Production publication and integration with the latest requested storefront remain blocked.** The requested repository path is absent here, and required commits `0a5a509` and `5cde291` are unavailable locally and from GitHub. Production Supabase configuration is also absent. No push, force-push, production migration, paid service creation or hosting-setting change was performed.

The local checkout is `/Users/adrianvasu/Desktop/V25-Suisse/.local/varathans25-admin-backend`, branch `work/varathans25-admin-backend`. The backend checkpoint is `6011e6a`; the administration/integration checkpoint is `be5749b`. The subsequent documentation commit records this evidence.

## Checks performed

| Check | Result | Evidence / scope |
| --- | --- | --- |
| Fresh local migrations | Pass | All six migrations applied from an empty local PostgreSQL 17 database |
| Unit tests | 32 passed | `commerce/tests/domain.test.ts` |
| Database policy tests | 7 passed | `supabase/tests/security.test.sql`, real pgTAP |
| Backend integration | 26 subtests passed | 21 authentication/commerce subtests + 5 storage/Edge/cancellation subtests; Node reports 28 including the parent suites |
| Playwright | 15 passed | Five journeys at each of 1440×1000, 834×1112 and 390×844 |
| Accessibility | Pass for tested screens | axe reports no violations on admin login, dashboard, product editor, order details, settings and DE/FR/EN commerce harness |
| TypeScript | Pass | Admin, shared commerce, test harness and tests |
| ESLint | Pass | Application, tests, configuration and scripts |
| Production admin build | Pass | Vite `/adminpage/` static output, no source maps |
| Integration harness build | Pass | Separate, ignored, local-only output |
| Dependency audit | Pass | 0 vulnerabilities in all severity classes |
| Secret checks | Pass | No local service-role key in the compiled admin; no credential patterns, fixture accounts or local environment files staged |
| Static payload preparation | Pass | Original 1,143 tracked site files preserved; only the compiled admin added; new commerce/backend source excluded |
| Existing files | Preserved | No existing file was modified or deleted relative to `6c80ae4` |
| Remote `main` | Unchanged | `6c80ae4e0b7beb1708d1389a8c6d7c7dafb1b379` |
| Public storefront | Available | `https://openatg.com/varathans25/` returns HTTP 200 |
| Public admin | Not deployed | `https://openatg.com/adminpage/` returns HTTP 404 |

Build output includes benign Vite notices about the existing same-origin font being resolved at runtime and the vendor bundle size. The font was loaded successfully in browser verification. The admin's largest minified bundle is approximately 572 KB (164 KB gzip); it can be split later if real usage warrants it. No warning was treated as a test success or hidden as a failure.

## Financial and cigar cases

- CHF 99.99 charges configured standard delivery; CHF 100.00 and CHF 100.01 do not.
- Discounts are applied before the free-delivery threshold; delivery is not counted toward the merchandise subtotal.
- Unknown standard delivery stays NULL. A zero fee must be explicitly confirmed. Adult-delivery fees remain separate even above the threshold.
- Decimal input is converted to integer rappen; fractional rappen, invalid discounts and invalid amounts are rejected.
- Single cigars support cart quantity changes. Four- and six-cigar boxes require every slot to be filled.
- Duplicate cigars across the box, singles and other cart lines are aggregated for stock validation. Mixed Patoro/Davidoff boxes were also exercised against PostgreSQL.
- Box discounts default to zero and are applied only when configured.
- Removing/replacing a slot changes completeness; incomplete boxes cannot be added.
- Selections and the cart survive reload. Adding cigars without entry confirmation is blocked. Identity verification is separately required for server-side tobacco order creation.
- Two competing reservations cannot oversell the same inventory. Repeated order creation with the same idempotency key cannot reserve stock twice. Changing the request under the same key is rejected.
- Order items preserve exact per-slot composition and prices. Payment/refund confirmation is restricted to the service role and validates amount, reference and CHF currency.

## Authentication, roles and protected data

Tests use generated local users and real GoTrue sessions, not mocked login state.

- Public signup is disabled; invited-account callback, password setup and subsequent password login pass in browsers.
- A password-only owner cannot open the dashboard. TOTP grants the required assurance level.
- Product editors cannot publish, manage orders or escalate their own role. Order managers cannot edit products or stock. Only an MFA-verified owner can change protected access/activation controls.
- Anonymous callers cannot read private base tables or call privileged mutations. Uninvited authenticated users see no private rows.
- Draft products do not appear in the public catalogue. Draft images cannot obtain public signed URLs. Published image access and disallowed SVG upload were tested.
- Owner/admin audit records are read-only to browsers. Product changes, order status and inventory actions create audit records without copying customer contact data.
- Signing out invalidates access through a still-unexpired JWT; disabling a profile also removes role access immediately.
- The invitation Edge Function rejects missing authentication and non-owner tokens. A valid owner invitation is delivered only to local Mailpit test infrastructure.
- The checkout Edge Function returns 503 because no approved payment provider was supplied. Tests do not simulate a successful external charge.
- Service/secret keys are rejected as browser configuration at build/client initialization.

## Browser and visual review

Screenshots are stored locally under `commerce/.local/screenshots/`, not committed or published. Reviewed:

- Desktop and mobile login, dashboard, product editor and preview.
- Order list and actual synthetic order details, totals, composition and fulfilment controls.
- Delivery/VAT settings, including owner-only disabled controls for an administrator.
- Single-cigar cart; complete four- and six-cigar builders; empty slots and grouped summaries.
- Free-delivery progress at CHF 99.99 and CHF 100.00 in DE, FR and EN.
- Existing storefront mobile navigation.

The commerce screenshots explicitly identify the integration harness and synthetic data. They are **not** evidence that the approved live storefront has been connected. The existing restaurant imagery, logo, navigation, route files and storefront presentation were not rebuilt or redesigned.

All admin journeys run from the production static build at `http://127.0.0.1:4175/adminpage/`. Refresh returns to the invitation-only sign-in screen because sessions are deliberately held in memory. Browser tests also load `/`, `/signal/`, `/store/`, `/store/base-32m/`, `/varathans25/` and all three existing language routes.

## Reproduction

From `commerce/`, after the local backend is started and Edge Functions are being served as described in the setup document:

```sh
npm ci
npm run backend:env
npm run test:backend
npm run typecheck
npm run lint
npm test
npm audit
npm run build
npm run build:harness
```

Keep `npm run serve:verification` running in another terminal, then:

```sh
npm run test:e2e
npm run stage:pages
```

`test:backend` resets **only the configured local project** and recreates synthetic fixtures. Never point integration tests at production. The test helpers explicitly reject any backend other than `http://127.0.0.1:57431`. Logs and local test credentials stay in ignored files. Browser traces are disabled to avoid retaining authentication requests.

## Work still required before the user's full objective is complete

1. Retrieve and preserve both specified commits and their updated storefront source; import the supplied verified curry label without guessing.
2. Connect the live catalogue/cart/builder components to that approved source and support new product identifiers within GitHub Pages' static routing. Recheck its CSP with the exact production origin and regenerate only project routes.
3. Provision/configure an authorized production Supabase project, SMTP and owner invitation; apply migrations and deploy Edge Functions. Supply only public backend values to the static build.
4. Confirm missing product/stock/delivery/tax information. Replace the initially empty fallback only with a reviewed published catalogue snapshot.
5. Finish the approved provider-specific payment, identity-verification and adult-delivery integrations before activating tobacco checkout. Those integrations cannot be invented from missing provider requirements.
6. Verify the complete recovered storefront locally, switch Pages to the prepared artifact workflow, recheck remote `main`, push all preserved and new commits normally, and verify the deployed commit and public routes.

See [secure setup, invitation, deployment, backup and rollback instructions](VARATHANS25_ADMIN_BACKEND.md).
