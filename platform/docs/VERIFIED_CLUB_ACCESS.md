# Verified club access — local implementation

Source directory: `/Users/adrianvasu/Desktop/V25-Suisse/.local/varathans25-premium-club-platform/platform`.

Source: `work/varathans25-final-polish`, `d77707f6173fdb05f4be7d099f8f5ec1530737d0`. Branches, worktrees and reflogs were inspected again. This remains the latest approved authenticated visual implementation. The newer static-release work is preserved separately as `ea1d6d2` on `work/varathans25-public-release`; it was **not deployed**.

Working branch: `work/varathans25-verified-club-access`. Production remains at `ad680205287c323005c2e92f0f1ffa514939ec52`.

Repository evidence reviewed includes the existing age-verification requirements, security model, membership rules, deployment inputs, payment architecture and media-rights records, together with the database schema and current environment guards. These document the operating requirements and existing local implementation; a configured production identity provider and production integration acceptance evidence are not present.

## Implemented journey

Registration → local Mailpit email confirmation → profile consent → verification submission → pending review → independent administrator decision → `/[locale]/club/collection` → separate Silver/Gold selection.

The approval in this build is explicitly a **local test decision, not genuine identity verification**. No date of birth, 18+ checkbox or membership payment approves a user. Production users are never automatically approved. A real approved provider integration remains an external production prerequisite.

The existing authentication provides logout, password recovery with expiring single-use email tokens, refresh-token rotation, persistent HttpOnly cookies, and account/profile/address/privacy controls. Registration now requires consent at the server boundary and confirmation directs to verification. Restricted routes refresh an expired access token through a bounded same-origin server route when a valid refresh session exists.

## Authorization and independent states

| Account state | Restricted route result |
|---|---|
| `guest` | Sign-in; intended club route retained |
| `registered_unverified` | Verification/profile-completion screen |
| `verification_pending` | Pending screen; no content or media access |
| `verified_18_plus` | Restricted area; verification screens redirect to the collection |
| `verification_rejected` | Result and resubmission information |
| `verification_expired` | Fresh verification required |
| `suspended` | Result/support information; no resubmission or restricted access |

Membership state is separately reported as `none`, `silver`, `gold`, `gold_past_due`, `gold_cancelled` or `membership_suspended`. A paid membership does not grant verification. Revocation removes restricted access and eligible Gold benefits immediately while retaining membership/payment history.

Server components gate `/[locale]/club`, `/club/collection`, `/club/member`, `/club/account`, `/club/membership` and the compatibility `/membership` route. Protected media revalidates the database identity on every request. Direct URL entry, reload and direct API calls use the same database checks. No client-only authorization decision grants access.

## Database and administration

Two additive migrations reuse existing profiles, member verification, memberships, payments, benefit redemption and audit entities. No production database was modified, reset or reseeded.

Verification records add submission ID, method, threshold, submitted/decision timestamps, reviewer, non-sensitive reason and revision. Existing explicitly marked local review accounts are preserved. Provider references are preferred over documents. Document ingestion is not implemented: no upload UI, raw identity files, DOB, biometric data or identity-document bucket is created.

The previous local self-approval action is rejected in both the HTTP action route and a database wrapper. Its retained implementation moved into the private schema and its execution grants were revoked. Normal users have no direct DML rights to verification, role or membership tables. RLS isolates their reads. Membership grants remain validated security-definer operations. The mature ordinary-product order, inventory and test-payment implementation is retained.

Authorized reviewers at `/[locale]/admin/verification` can inspect pending records, approve test submissions, reject, request resubmission, revoke, expire or suspend. They cannot approve themselves. Reviews require a current revision and lock the target record; decisions append audit events. Reasons are bounded non-sensitive codes. Review history is private and immutable. Owner MFA remains mandatory; an AAL2 owner can additionally require MFA for all administrators. The administrator's role and MFA assurance are validated server-side and inside SQL, including direct RPC calls.

The service-only retention worker expires verification/membership state and clears provider references for expired, rejected, revoked and resubmission records after the configured retention interval. It preserves immutable audit and financial records. Existing account deletion requests suspend access immediately. No retention worker is scheduled in production by this branch.

## Membership and ordinary commerce

Silver is free. Gold remains CHF 69 monthly / CHF 500 yearly in test mode. Silver eligible Swiss delivery is CHF 10, free at CHF 100 after eligible discounts. Gold benefits remain limited to eligible non-tobacco products/services, including the configured 10% reduction, eligible delivery and the configured hospitality drink policy. Production terms still require final confirmation.

A verified user chooses a plan in a dedicated comparison view. Gold selection creates a test payment and does not grant Gold until the existing trusted reconciliation flow settles the exact amount. Test QR documents remain explicitly non-payable. Tea/curry basket persistence, server totals, inventory locking, order creation/history, administration, refund rules, digital passes and staff drink redemption remain connected to the existing backend.

## Restricted editorial scope and excluded work

The preserved read-only material is the existing multilingual **packaging study**, using one original open-box image and existing factual design/storage/adult-information copy. It adds no tobacco claims, product data, prices, stock, discounts, quantity controls, cart, configuration or purchase action. Existing images were moved byte-for-byte outside this app's public directory and are served only through the verified media endpoint. Existing historical public OpenATG assets remain untouched.

Tobacco product merchandising, individual-cigar purchasing, cigar quantities, Signature Box sales, custom Box of 4/6 ordering/configuration, tobacco discounts, tobacco basket/checkout/payments, and tobacco delivery/order activation were not implemented because they would facilitate tobacco promotion or sale. The disabled integration boundary, database adult-product order rejection and revoked legacy tobacco-transaction grants remain intact. No new tobacco product, image, price or claim was scraped or invented.

## Design preservation and review URLs

The original ExperienceFilm, Gateway and StoreHome function bodies are checked byte-for-byte against `d77707f` by `scripts/check-verified-release.mjs`. Original logo, tea gateway, tea-pouring/spice films, five teas, curry chapter, restaurant closing, typography and store navigation remain intact. New verification/review pages use the established layout, colour and type system, with independent DE/FR/EN copy.

Local origin: `http://127.0.0.1:4190`.

For each locale `de`, `fr`, `en`:

- `/<locale>/register`, `/login`, `/reset`, `/account`
- `/<locale>/verify-age`, `/verification-pending`, `/verification-result`
- `/<locale>/club/collection`, `/club`, `/club/membership`, `/club/account`
- `/<locale>/admin/verification` (authorized administrator required)
- `/<locale>/store`, `/shop`, `/bag`

German gateway: `http://127.0.0.1:4190/`. Mailpit: `http://127.0.0.1:58534`. Review credentials remain only in ignored `.local/review-accounts.json`; no credentials or identity information are included in this report.

Screenshots are under ignored `artifacts/screenshots/`, with `verification-*`, `verification-admin-*`, `restricted-editorial-*` and `verified-dashboard-*` files for the tested viewports. Existing store screenshots remain available. Machine-readable Playwright output is `artifacts/playwright-results.json`.

## Production prerequisites and deployment status

Not merged or deployed. GitHub Pages cannot run this authentication backend, and the existing public website is preserved.

Still required: approved Next.js hosting/project and HTTPS domains; hosted Supabase project/region, secure Auth configuration and bootstrap owner; encrypted environment variables and rotation; approved email sender/provider; a concrete approved age-verification provider with signed callback schema, sandbox credentials, expiry/review policy and acceptance tests; approved non-tobacco/membership payment merchant account/provider/recurring-payment acceptance; finalized product/benefit/privacy/controller/support terms; database and storage backups with a restore drill; monitoring, incident ownership and audit/retention operation.

`AgeProvider` defines a server-only session/decision boundary. Local sessions can only become pending and require independent review. The production adapter deliberately fails closed: setting provider environment values does not invent a successful integration. All production-write, live-payment, subscription and tobacco flags remain false. The production data/runtime guards are not weakened for deployment.

## Preservation and rollback

Original backend rollback reference: `rollback/varathans25-verified-source-d77707f` at `d77707f`.

The static-release checkpoint is preserved at `rollback/varathans25-before-verified-access-20260928` (`ea1d6d2`). An ignored, mode-0700 safety directory `.local/safety-verified-20260928/` contains branch/worktree/ref/reflog inventory, binary patches and copies of pre-existing uncommitted files. Its mode-0600 `database.dump` preserves the local database before the new migrations. Unrelated dirty worktrees and the stale worktree registration were left intact.

For source review without changing current work, create a detached worktree at `d77707f`. Do not run the older self-approval application against a production database. The new migrations are additive: prefer a forward fix. If a database rollback is necessary, restore the pre-change dump into a separate isolated local database first, validate it, and preserve the current database. Never reset or overwrite current review data to switch source branches. Production needs no rollback because it has not changed.

## Verification results

- TypeScript, ESLint and the production Next.js build passed.
- Unit tests: 37 passed. Database tests: 43 passed. Backend/security integration tests: 48 passed.
- Full browser suite: 102 passed, with 3 duplicate viewport-independent checks skipped. The final visual recheck passed 13 tests in DE/FR/EN at 1440, 1024, 390 and 350 pixels, with those same 3 duplicate checks skipped.
- Final account/administration rerun: all 18 passed, including the added absolute-session-expiry case and the extended owner/administrator MFA test. The initial MFA-control update race and test-cleanup race were corrected and the original setting was restored through an authenticated AAL2 owner.
- Automated axe WCAG A/AA checks, keyboard navigation, reduced motion, Save-Data, autoplay rejection, image loading and console-error assertions passed on the tested journeys. Desktop and narrow-mobile verification/editorial screenshots were also visually inspected.
- Actual session expiry and logout reject stale access at the database boundary. Refresh now revalidates database authorization before restoring cookies, preventing an expired-session redirect loop. Administrator MFA policy changes enforce AAL2 and restore the control on a failed request.
- Dependency audit: 0 reported vulnerabilities. Candidate-source and client-bundle secret scans passed, including comparison against 6 actual local secret values. No raw identity documents, fixture accounts or local environment files are tracked.
- Existing OpenATG root, `/store/` and `/signal/` remained HTTP 200; production and its assets were not modified.

Machine-readable evidence is retained locally in `artifacts/verified-full-playwright.json`, `artifacts/verified-final-visual-playwright.json`, `artifacts/verified-final-accounts-playwright.json` and `artifacts/verified-dependency-audit.json`. Review screenshots and test data remain ignored and are not pushed.

## Changed files

| Change | Repository path |
|---|---|
| Updated | `docs/AGE_VERIFICATION_REQUIREMENTS.md` |
| Updated | `platform/.env.example` |
| Added | `platform/docs/VERIFIED_CLUB_ACCESS.md` |
| Updated | `platform/playwright.config.ts` |
| Moved unchanged | `platform/public/varathans25/images/cigars/varathans-cigars-box-closed-480.webp` → `platform/private-media/club/varathans-cigars-box-closed-480.webp` |
| Moved unchanged | `platform/public/varathans25/images/cigars/varathans-cigars-box-closed-960.webp` → `platform/private-media/club/varathans-cigars-box-closed-960.webp` |
| Moved unchanged | `platform/public/varathans25/images/cigars/varathans-cigars-box-closed.webp` → `platform/private-media/club/varathans-cigars-box-closed.webp` |
| Moved unchanged | `platform/public/varathans25/images/cigars/varathans-cigars-box-open-480.webp` → `platform/private-media/club/varathans-cigars-box-open-480.webp` |
| Moved unchanged | `platform/public/varathans25/images/cigars/varathans-cigars-box-open-960.webp` → `platform/private-media/club/varathans-cigars-box-open-960.webp` |
| Moved unchanged | `platform/public/varathans25/images/cigars/varathans-cigars-box-open.webp` → `platform/private-media/club/varathans-cigars-box-open.webp` |
| Updated | `platform/scripts/assets.mjs` |
| Added | `platform/scripts/check-verified-release.mjs` |
| Updated | `platform/scripts/seed-local.ts` |
| Updated | `platform/src/app/[locale]/[[...segments]]/page.tsx` |
| Updated | `platform/src/app/api/action/route.ts` |
| Updated | `platform/src/app/api/auth/route.ts` |
| Added | `platform/src/app/api/club/media/[view]/route.ts` |
| Added | `platform/src/app/api/verification/route.ts` |
| Updated | `platform/src/app/auth/callback/route.ts` |
| Added | `platform/src/app/auth/refresh/route.ts` |
| Updated | `platform/src/app/experience.css` |
| Updated | `platform/src/components/admin.tsx` |
| Updated | `platform/src/components/final-experience.tsx` |
| Updated | `platform/src/components/platform.tsx` |
| Added | `platform/src/components/restricted-editorial.tsx` |
| Added | `platform/src/components/verification-admin.tsx` |
| Added | `platform/src/components/verification.tsx` |
| Added | `platform/src/lib/age-provider.ts` |
| Updated | `platform/src/lib/client.ts` |
| Added | `platform/src/lib/club-state.ts` |
| Updated | `platform/src/lib/polish.ts` |
| Added | `platform/src/lib/restricted-editorial-copy.ts` |
| Updated | `platform/src/lib/server.ts` |
| Added | `platform/src/lib/verification-copy.ts` |
| Added | `platform/supabase/migrations/202609280018_verified_club_access.sql` |
| Added | `platform/supabase/migrations/202609280019_verification_retention.sql` |
| Added | `platform/supabase/tests/verified_access.test.sql` |
| Updated | `platform/tests/accounts.spec.ts` |
| Updated | `platform/tests/backend.integration.ts` |
| Updated | `platform/tests/browser-helpers.ts` |
| Added | `platform/tests/club-state.test.ts` |
| Updated | `platform/tests/final-experience.spec.ts` |
| Updated | `platform/tests/polish-admin.spec.ts` |
| Updated | `platform/tests/polish.spec.ts` |
| Updated | `platform/tests/resilience.spec.ts` |
| Added | `platform/tests/verified-access.integration.ts` |
| Added | `platform/tests/verified-club.spec.ts` |
