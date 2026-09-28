# Restricted reference collection

Source: `work/varathans25-verified-club-access` at `fc8d400e17130cecead08888ff73cf2dd56c4753`.

Correction branch: `work/varathans25-restricted-reference-collection`.

## Content and provenance

The verified-member collection now contains the complete existing set of 23 factual reference records: 9 Davidoff and 14 Patoro. Names, brands, series and recorded formats are preserved from `varathans25/en/cigars/index.txt` at the source commit, cross-checked against `platform/supabase/migrations/202609200006_preserved_references.sql`. All records have the existing `PREVIEW` status. Length and ring gauge are null throughout; no dimensions are inferred. Availability is explicitly unconfirmed, with no stock or price displayed.

`RESTRICTED_REFERENCE_SOURCES.json` records the source artifact, source hash and hashes for every existing image. The 23 images are copied byte-for-byte to `private-media/club/`. No products, images, specifications or external data were downloaded, scraped or invented. Unit tests compare the entire reference projection and every media hash with the repository originals.

The existing open Varathans25 image appears once, in the Signature Box packaging study. Closed-box imagery is retained privately but is not repeated in the presentation. Box of 4 and Box of 6 are read-only concept descriptions, using the existing four/six-position concepts from `varathans25/cigar-mix-builder.js`. The six-position concept has no confirmed packaging image or dimensions; no substitute image is fabricated.

The presentation is a neutral reference archive. It introduces no promotional descriptions, tasting/origin claims, recommendations, prices, discounts, quantities, saved selections, carts, customizers, ordering, payments or delivery activation. Existing tobacco-transaction prohibitions remain intact.

## Routes and access

- `/{de,fr,en}/club/collection`: cinematic entrance, single Signature Box study, brand-filtered reference index, individual detail panel and two read-only box concepts.
- `/{de,fr,en}/club/collection?brand=Patoro&reference=patoro-series-p-balthasar`: a directly reloadable selected reference. Language switching retains the selection and filter.
- `GET /api/club/references`: authorized factual reference projection, optionally filtered by `brand=Davidoff` or `brand=Patoro`.
- `GET /api/club/media/<reference-slug>`: authorized, allowlisted private image delivery. Existing `open` and `closed` media routes retain the same verified-only protection.

Every page, API and media request revalidates the authenticated database identity. Only `verified_18_plus` with an effective verified status is accepted. No membership tier substitutes for verification. Guests receive authentication redirects/401; authenticated non-verified users receive their verification-state page or 403 from the data/media endpoint. Unknown media identifiers and traversal attempts cannot select a filesystem path. Responses are private and `no-store`.

The reference data is server-only and absent from public JavaScript bundles. Media stays outside this Next application's public directory. Production file tracing includes all private image files. Existing historical OpenATG public assets remain unchanged; this correction protects the new authenticated application and does not rewrite the current public website.

There are no database migrations, new service-role operations or changes to RLS, verification decisions, membership status or authentication. Existing session expiry, CSRF, role/MFA checks, revocation and audit behavior remain in force.

## Design and languages

The existing film, logo, typography and colour system are retained. The collection uses an editorial index/detail layout rather than a purchase grid. Native links perform server-rendered filtering and reference selection, support keyboard activation, and remain usable without custom drag/drop or client-side access decisions. DE/FR/EN labels and qualifications are independent translations; proper product names and recorded formats remain unchanged.

The gateway, store, five teas, curry, spice film, restaurant closing, authentication/verification UI and Silver/Gold UI are unchanged. `scripts/check-restricted-release.mjs` compares 13 protected source files byte-for-byte with `fc8d400`, checks client bundles for reference-data leakage and verifies protected media is in the production output.

## Local review

- German: `http://127.0.0.1:4190/de/club/collection`
- French: `http://127.0.0.1:4190/fr/club/collection`
- English: `http://127.0.0.1:4190/en/club/collection`
- Register: `http://127.0.0.1:4190/de/register`
- Verification administration: `http://127.0.0.1:4190/de/admin/verification`

Guests are redirected to sign-in. Review accounts remain in ignored local files; local verification approvals are tests, not genuine identity verification. No credentials or customer identity information are included in source or this report.

Screenshots are retained in ignored `artifacts/screenshots/reference-collection-<locale>-<viewport>.png` and `reference-detail-*` files. Viewports: 1440, 1024, 390 and 350 pixels. Screenshots and local browser artifacts are not pushed.

## Verification results

Verified against the production build and existing local Supabase services:

| Check | Result |
| --- | --- |
| TypeScript and ESLint | Passed |
| Unit tests | 40 passed |
| Database tests | 43 passed |
| Backend/security integration tests | 48 passed |
| Complete Playwright suite | 116 passed; 6 intentionally skipped repetitions of desktop HTTP security tests |
| Production build | Passed |
| Dependency audit | 0 reported vulnerabilities |
| Secret and frontend-bundle scans | Passed |
| Private-media tracing and approved-source preservation | Passed |

The browser matrix covers DE/FR/EN at 1440, 1024, 390 and 350 pixels. It checks all 23 reference names, both brand filters, details, language-preserved selections, direct reloads, image decoding, a single Varathans25 box image, read-only concepts, keyboard activation, reduced motion and logout. Every reference image was also fetched through the protected endpoint. No horizontal overflow, unexpected console errors or axe accessibility violations were detected in the tested collection screens.

HTTP security checks deny guests and registered-unverified, pending, rejected, expired, revoked and suspended accounts on collection data/media routes, including all 23 private images. Restricted server-component responses do not expose reference content to blocked accounts. Invalid brands, unknown images, traversal attempts and unsupported writes are rejected. The full suite also exercises existing email confirmation, administrator verification decisions, RLS and privilege escalation protections, owner MFA, profile/address changes, tea/curry baskets and ordinary-product orders, delivery calculations, admin edits, privacy export and deletion requests. Automated checks do not constitute production provider approval or a complete manual accessibility audit.

The final browser JSON report is kept locally at `artifacts/restricted-full-playwright.json`; the dependency report is `artifacts/restricted-dependency-audit.json`. Neither contains a production deployment claim.

The existing public OpenATG routes `/`, `/store/`, `/store/base-32m/`, `/store/base-64m/`, `/signal/` and `/varathans25/de/` returned HTTP 200 during the final read-only smoke check. No public files or production branch commits were changed.

## Deployment prerequisites

Not deployed or merged. Remote `main` remains `ad680205287c323005c2e92f0f1ffa514939ec52`; GitHub Pages serves it at `https://openatg.com/`.

The configured application origin and Supabase are loopback-only. An approved Next.js hosting project/domain mapping, hosted Supabase, HTTPS routing to that host, encrypted production configuration, approved email provider and genuine age-verification provider integration are absent. Live membership/non-tobacco payments also need their approved provider/merchant integration and acceptance tests. Existing production prerequisites for finalized operating terms, media permissions, backups, monitoring and retention still apply. Production writes, live payments and tobacco checkout remain false. Local test approval is never represented as production identity verification.

## Preservation and rollback

Rollback reference: `rollback/varathans25-collection-fc8d400` at the exact source commit. All worktrees and reflogs were inspected. Existing dirty files and diffs were preserved under ignored, private `.local/safety-restricted-collection-fc8d400/complete/`; the mode-0600 `database.dump` preserves the pre-change local database. The stale worktree registration and unrelated work were left untouched.

To inspect the rollback without changing current work, run from `platform/`:

```sh
git worktree add --detach ../../varathans25-collection-rollback fc8d400e17130cecead08888ff73cf2dd56c4753
```

No schema rollback is needed. Do not reset, clean or restore over current review data. If required, restore the backup only into a separate isolated local database first. The public website needs no rollback because this branch has not been deployed.
