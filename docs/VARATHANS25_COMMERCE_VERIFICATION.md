# Varathans25 commerce verification

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
