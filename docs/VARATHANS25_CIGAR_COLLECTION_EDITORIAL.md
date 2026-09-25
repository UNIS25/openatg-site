# Varathans packaging editorial — review only

This change adds a factual, non-transactional packaging presentation titled **VARATHANS CIGAR COLLECTION · 18+**. It is committed to `work/varathans25-private-cigar-club` for screenshot review. It is **not merged or deployed**.

## Routes prepared

- `/varathans25/de/cigar-collection/`
- `/varathans25/fr/cigar-collection/`
- `/varathans25/en/cigar-collection/`

All three routes have `noindex, nofollow, noarchive`. They document a packaging concept, explicitly label commercial availability as pending, and contain no prices, discounts, purchasing, reservations, payment controls, scarcity claims or commercial calls to action. The only controls in the editorial content are previous/next image buttons and an official tobacco-information link. The existing global storefront navigation is preserved.

The clear 18+ notice identifies the intended audience; it does not claim to verify anyone's age. The page makes no tobacco-origin, blend, strength, tasting, manufacturing or Swiss-origin claim. It distinguishes the visual concept from a verified humidor or production specification.

## Approved images

The supplied images were identified by visual inspection:

- `ChatGPT Image Sep 25, 2026, 11_58_50 PM.png`: closed ivory box and navy band; principal image.
- `ChatGPT Image Sep 25, 2026, 11_58_54 PM.png`: open ivory/navy box with four cigars; reveal image.

Original bytes are preserved in `editorial/assets/originals/`. Both originals are 1536 × 1024. `editorial/assets/export-manifest.json` records their SHA-256 hashes and the hashes of every exported file. The six public WebP files use the complete composition at widths 480, 960 and 1536, without cropping, recolouring or regenerating the supplied artwork.

The gallery never rotates automatically. Native buttons support keyboard activation, translated accessible names and a polite view announcement. The image area reserves a 3:2 aspect ratio; `object-fit: contain` preserves the package. Reduced-motion preferences disable the brief crossfade and shared-shell transitions on these documents.

## Isolation and source preservation

Base: `87c81681931a3a90c6034164e1f98c8471acd150`, with `0a5a509`, `5cde291` and `f3e1735` verified as ancestors.

No previously tracked repository file is modified, renamed or deleted. Existing products, cigar builder, admin, accounts, payment code, database migrations and all existing route exports retain their exact bytes.

`editorial/` is an isolated Next static-export source package. It reuses a snapshot of the established storefront shell and the original immutable storefront CSS/font/logo assets. `assets/source-manifest.json` records the shell source provenance; `src/data/shell.json` contains only the public shell catalogue props extracted from the baseline static export. The original shell implementation in the existing application is not edited. Native document links prevent cross-navigation between independent Next builds from mixing runtimes.

The build exports only the new locale routes, six new images and separately hashed webpack assets. It refuses to overwrite an unrelated file with different bytes. Existing page files and CSS remain untouched. Header spacing fixes are scoped to the new documents. The original CSP is preserved without adding origins or directives. No analytics or backend connection is added.

Static review mode is constant. There are no credentials, environment files or database clients in the build inputs, and the build refuses `.env` files in its source directory. Browser tests reject API/authentication/payment requests and require zero console/page errors. The shared bag remains compatible with its existing browser storage; this editorial page does not introduce commerce functionality.

## Reproduce locally

From the feature-branch repository:

```sh
cd editorial
npm ci
npm run typecheck
npm run lint
npm run build
npm test
npm run test:e2e
npm audit
```

Playwright requires its Chromium installation (`npx playwright install chromium` if absent). It starts and stops a loopback-only static verification server on port 4188 automatically. No Supabase instance, credentials, payment services or deployment environment are needed. Build first before unit/browser tests, which verify the actual exported files.

For manual local review, from the repository root:

```sh
python3 -m http.server 4188 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4188/varathans25/en/cigar-collection/` and the corresponding DE/FR routes. Stop the server with Ctrl-C.

## Verification, 26 September 2026

| Check | Result |
| --- | --- |
| TypeScript, including generated route types | Pass |
| ESLint | Pass, zero errors and warnings |
| Next production static build | Pass; three translated routes |
| Editorial unit/export checks | 5 passed |
| Playwright Chromium journeys | 15 passed, no retries or skips |
| Desktop / tablet / mobile | 1440 × 1000 / 1024 × 1000 / 390 × 844 |
| DE / FR / EN | Direct loading, reload, translated content and controls passed |
| Accessibility | 9 full-page axe scans; zero WCAG A/AA violations detected |
| Keyboard and reduced motion | Manual controls passed at all three widths |
| Browser console / page errors | Zero across all 15 journeys |
| API/authentication/payment requests | Zero during editorial page journeys |
| Existing bag storage, mobile menu, logo padding, overflow | Passed |
| Dependency audit | Zero known vulnerabilities |
| Gitleaks staged-change scan | Zero secrets found |
| Existing catalogue validator | 7 products, 3 languages, 21 product routes and preserved 4/6-box builder passed |
| Inline JavaScript syntax | 1,535 scripts across 164 HTML files passed |
| Existing repository files | No modifications, deletions or renames |

The first browser pass exposed reversed shared-stylesheet ordering, which affected footer contrast. Restoring the original order resolved it. The final run uses all accessibility rules without exclusions. Mobile language switching is tested through the existing menu. Automated accessibility checks are supplemented by visual inspection and keyboard testing; they do not establish universal accessibility conformance.

Only the isolated editorial build and journeys are tested in this change. The database/admin suites are not rerun: those systems and their source files are unchanged and are not part of this non-transactional page.

## Screenshots

Screenshots are from the local production export, not a public deployment. Full-page images include both packaging views and the unchanged shared shell.

| Language | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| DE | [1440 px](reviews/varathans25-cigar-collection/de-desktop.png) | [1024 px](reviews/varathans25-cigar-collection/de-tablet.png) | [390 px](reviews/varathans25-cigar-collection/de-mobile.png) |
| FR | [1440 px](reviews/varathans25-cigar-collection/fr-desktop.png) | [1024 px](reviews/varathans25-cigar-collection/fr-tablet.png) | [390 px](reviews/varathans25-cigar-collection/fr-mobile.png) |
| EN | [1440 px](reviews/varathans25-cigar-collection/en-desktop.png) | [1024 px](reviews/varathans25-cigar-collection/en-tablet.png) | [390 px](reviews/varathans25-cigar-collection/en-mobile.png) |

Manual gallery open view: [desktop](reviews/varathans25-cigar-collection/en-desktop-open.png), [tablet](reviews/varathans25-cigar-collection/en-tablet-open.png), [mobile](reviews/varathans25-cigar-collection/en-mobile-open.png).

## Deployment hold and rollback

Only the feature branch is pushed. GitHub Pages remains configured for `main` at `/`; publishing this feature branch does not deploy it. Remote `main` was checked at `d7012ead4eb2291847f130c30891d70fd0abb173`. Screenshot approval is required before any later merge or deployment. In particular, do not merge the entire backend-based branch into the static site without a separately reviewed publication plan.

Preserved local safety references:

- `rollback/varathans25-club-source-20260925T193512Z` → `87c8168`.
- `rollback/varathans25-club-public-20260925T193512Z` → `d7012ea`.
- Verified full repository bundle: `varathans25-private-club-before-work-20260925T193512Z.bundle`, stored outside the checkout in `.local/repository-checkpoints/`.
- Bundle SHA-256: `65065508954a6b33a6859d4ee7b63e0582735612976142ab602fd92b99a76d45`.

No live rollback is needed because nothing is deployed. To undo this feature later while preserving history, use `git revert <editorial-implementation-commit>` on the feature branch and push that branch normally. Do not reset, rewrite history or force-push.
