# Changed files and verification

## Scope

This isolated feature branch is based on production `ad680205287c323005c2e92f0f1ffa514939ec52`. All changes are additions under `platform/` or documentation under `docs/`. No previously tracked file, original logo/image, existing Pages route, workflow, production database, DNS record or secret was modified. No public deployment was performed.

Backend reuse is selective: seven historical migrations plus the multilingual product editor from `87c81681931a3a90c6034164e1f98c8471acd150`. The original branch and product checkpoints remain available. The new application is a local review implementation for tea/pantry commerce and hospitality memberships, with a non-transactional cigar editorial. It does not implement cigar purchases, box transactions, tobacco discounts or tobacco payments.

## Verification — 27 September 2026

| Check | Result |
|---|---|
| Fresh migration replay | 12/12 applied to the named isolated local database |
| TypeScript / lint / Next.js production build | Passed; no lint warnings |
| Unit tests | 28 passed |
| PostgreSQL/RLS/permission tests | 22 passed |
| Auth/database/integration tests | 27 passed |
| Platform browser journeys | 35 passed (34 complete-suite journeys plus the added password-recovery journey) |
| Existing Pages storefront unit tests | 12 passed |
| Existing Pages browser journeys | 33 passed |
| Dependency audit | 0 vulnerabilities |
| Gitleaks staged-source scan | No leaks |
| Client bundle/private-file checks | Passed |
| Accessibility | axe WCAG 2 A/AA and 2.1 A/AA: no violations on scanned journeys |
| Browser console / page errors | Zero in passing browser journeys |
| Layouts | 1440, 1024, 390 px; additional 350 px navigation/overflow check |
| Local exposure | Next and all published Supabase ports verified on 127.0.0.1 |
| Public production branch | Still `ad680205287c323005c2e92f0f1ffa514939ec52` |

Total: **157 passing automated tests/checks** across unit, database, integration and browser suites. Tests are local, synthetic and do not establish production provider acceptance or replace an independent security review. The production build uses the locked platform dependencies. Console silence refers to the tested local pages, not a claim about unrelated live analytics.

Security journeys cover cross-account reads/writes, missing-session and role denial, owner AAL2, signed-out JWT rejection, suspended accounts, exact-origin CSRF, payment/visit/order idempotency, immutable history, forged/ineligible pass denial and disabled live adapters. Commerce tests cover 9,999/10,000/10,001 rappen, post-discount delivery, exclusions and non-stacking. Auth journeys use real local confirmation and recovery email links. Admin journeys create and edit multilingual drafts and upload/reload a private image.

The initial admin language-tab hover contrast issue was corrected and the complete 34-journey suite passed afterward. Existing static source tests confirm the five-tin catalogue, coffee removal and protected curry/cigar files remain unchanged.

## Review screenshots

All screenshots use local test data only. Full-size PNGs are committed for review:

- [entrance-desktop](review/premium-platform/entrance-desktop.png)
- [tea-en-desktop](review/premium-platform/tea-en-desktop.png)
- [tea-en-tablet](review/premium-platform/tea-en-tablet.png)
- [tea-en-mobile](review/premium-platform/tea-en-mobile.png)
- [club-en-desktop](review/premium-platform/club-en-desktop.png)
- [club-en-tablet](review/premium-platform/club-en-tablet.png)
- [club-en-mobile](review/premium-platform/club-en-mobile.png)
- [admin-dashboard-desktop](review/premium-platform/admin-dashboard-desktop.png)
- [admin-dashboard-mobile](review/premium-platform/admin-dashboard-mobile.png)
- [admin-product-desktop](review/premium-platform/admin-product-desktop.png)
- [membership-desktop](review/premium-platform/membership-desktop.png)

## File manifest

- `docs/AGE_VERIFICATION_REQUIREMENTS.md`
- `docs/CHANGED_FILES.md`
- `docs/DEPLOYMENT_INPUTS_REQUIRED.md`
- `docs/LOCAL_REVIEW.md`
- `docs/MEMBERSHIP_RULES.md`
- `docs/PAYMENT_AND_QR_BILL_ARCHITECTURE.md`
- `docs/PREMIUM_CLUB_PLATFORM.md`
- `docs/PRODUCTION_ARCHITECTURE.md`
- `docs/SECURITY_MODEL.md`
- `docs/review/premium-platform/admin-dashboard-desktop.png`
- `docs/review/premium-platform/admin-dashboard-mobile.png`
- `docs/review/premium-platform/admin-product-desktop.png`
- `docs/review/premium-platform/club-en-desktop.png`
- `docs/review/premium-platform/club-en-mobile.png`
- `docs/review/premium-platform/club-en-tablet.png`
- `docs/review/premium-platform/entrance-desktop.png`
- `docs/review/premium-platform/membership-desktop.png`
- `docs/review/premium-platform/tea-en-desktop.png`
- `docs/review/premium-platform/tea-en-mobile.png`
- `docs/review/premium-platform/tea-en-tablet.png`
- `platform/.env.example`
- `platform/.gitignore`
- `platform/eslint.config.mjs`
- `platform/next-env.d.ts`
- `platform/next.config.ts`
- `platform/package-lock.json`
- `platform/package.json`
- `platform/playwright.config.ts`
- `platform/public/varathans25/brand/varathans25-original.png`
- `platform/public/varathans25/fonts/inter-latin.woff2`
- `platform/public/varathans25/images/cigars/varathans-cigars-box-closed-480.webp`
- `platform/public/varathans25/images/cigars/varathans-cigars-box-closed-960.webp`
- `platform/public/varathans25/images/cigars/varathans-cigars-box-closed.webp`
- `platform/public/varathans25/images/cigars/varathans-cigars-box-open-480.webp`
- `platform/public/varathans25/images/cigars/varathans-cigars-box-open-960.webp`
- `platform/public/varathans25/images/cigars/varathans-cigars-box-open.webp`
- `platform/public/varathans25/images/gelber-curry-kokos-320.webp`
- `platform/public/varathans25/images/gelber-curry-kokos-640.webp`
- `platform/public/varathans25/images/gelber-curry-kokos.webp`
- `platform/public/varathans25/images/restaurant/bar-evening.webp`
- `platform/public/varathans25/images/restaurant/dining-interior.webp`
- `platform/public/varathans25/images/restaurant/rooftop-panorama.webp`
- `platform/public/varathans25/images/varathans25-cardamom-tea-320.webp`
- `platform/public/varathans25/images/varathans25-cardamom-tea-640.webp`
- `platform/public/varathans25/images/varathans25-cardamom-tea.webp`
- `platform/public/varathans25/images/varathans25-cinnamon-tea-320.webp`
- `platform/public/varathans25/images/varathans25-cinnamon-tea-640.webp`
- `platform/public/varathans25/images/varathans25-cinnamon-tea.webp`
- `platform/public/varathans25/images/varathans25-green-tea-powder-320.webp`
- `platform/public/varathans25/images/varathans25-green-tea-powder-640.webp`
- `platform/public/varathans25/images/varathans25-green-tea-powder.webp`
- `platform/public/varathans25/images/varathans25-masala-tea-powder-320.webp`
- `platform/public/varathans25/images/varathans25-masala-tea-powder-640.webp`
- `platform/public/varathans25/images/varathans25-masala-tea-powder.webp`
- `platform/public/varathans25/images/varathans25-premium-black-tea-powder-320.webp`
- `platform/public/varathans25/images/varathans25-premium-black-tea-powder-640.webp`
- `platform/public/varathans25/images/varathans25-premium-black-tea-powder.webp`
- `platform/scripts/assets.mjs`
- `platform/scripts/bind-loopback.mjs`
- `platform/scripts/check-production.mjs`
- `platform/scripts/reset-local.mjs`
- `platform/scripts/retention.ts`
- `platform/scripts/seed-local.ts`
- `platform/scripts/setup-local.mjs`
- `platform/scripts/start-local.mjs`
- `platform/src/app/[locale]/[[...segments]]/page.tsx`
- `platform/src/app/admin/page.tsx`
- `platform/src/app/adminpage/page.tsx`
- `platform/src/app/api/action/route.ts`
- `platform/src/app/api/admin/image/route.ts`
- `platform/src/app/api/admin/reconciliation/route.ts`
- `platform/src/app/api/admin/supabase/[...path]/route.ts`
- `platform/src/app/api/auth/route.ts`
- `platform/src/app/api/catalogue/route.ts`
- `platform/src/app/api/image/route.ts`
- `platform/src/app/api/pass/route.ts`
- `platform/src/app/api/payment/route.ts`
- `platform/src/app/api/state/route.ts`
- `platform/src/app/api/webhook/route.ts`
- `platform/src/app/auth/callback/route.ts`
- `platform/src/app/club/page.tsx`
- `platform/src/app/layout.tsx`
- `platform/src/app/not-found.tsx`
- `platform/src/app/page.tsx`
- `platform/src/app/style.css`
- `platform/src/components/admin.tsx`
- `platform/src/components/platform.tsx`
- `platform/src/data/catalogue.json`
- `platform/src/legacy-admin/admin-messages.json`
- `platform/src/legacy-admin/api.ts`
- `platform/src/legacy-admin/domain.ts`
- `platform/src/legacy-admin/i18n.tsx`
- `platform/src/legacy-admin/products.tsx`
- `platform/src/legacy-admin/ui.tsx`
- `platform/src/lib/client.ts`
- `platform/src/lib/config.ts`
- `platform/src/lib/domain.ts`
- `platform/src/lib/messages.ts`
- `platform/src/lib/qr-bill.ts`
- `platform/src/lib/reconciliation.ts`
- `platform/src/lib/server.ts`
- `platform/src/lib/tokens.ts`
- `platform/src/proxy.ts`
- `platform/supabase/config.toml`
- `platform/supabase/migrations/202609200001_schema.sql`
- `platform/supabase/migrations/202609200002_admin_operations.sql`
- `platform/supabase/migrations/202609200003_commerce.sql`
- `platform/supabase/migrations/202609200004_dashboard.sql`
- `platform/supabase/migrations/202609200005_access.sql`
- `platform/supabase/migrations/202609200006_preserved_references.sql`
- `platform/supabase/migrations/202609220007_admin_languages.sql`
- `platform/supabase/migrations/202609270008_platform_schema.sql`
- `platform/supabase/migrations/202609270009_platform_operations.sql`
- `platform/supabase/migrations/202609270010_platform_hardening.sql`
- `platform/supabase/migrations/202609270011_retention.sql`
- `platform/supabase/migrations/202609270012_account_suspension.sql`
- `platform/supabase/templates/confirmation.html`
- `platform/supabase/templates/recovery.html`
- `platform/supabase/tests/platform.test.sql`
- `platform/tests/accounts.spec.ts`
- `platform/tests/backend.integration.ts`
- `platform/tests/browser-helpers.ts`
- `platform/tests/config.test.ts`
- `platform/tests/domain.test.ts`
- `platform/tests/storefront.spec.ts`
- `platform/tsconfig.json`
