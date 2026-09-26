# Non-transactional cigar editorial — production release

## Scope and history

The owner approved publication of the reviewed DE/FR/EN packaging editorial on 26 September 2026. The release branch is `deploy/varathans25-cigar-editorial-20260926T103440Z`, created from fetched `origin/main` at `d7012ead4eb2291847f130c30891d70fd0abb173`.

Only `4fe0b0807b8846de33f5f30e60d0a234e3467b9a` was cherry-picked, with provenance recorded by `git cherry-pick -x`. The resulting cherry-pick is `e72f805`. There were no conflicts. The complete private-club/backend branch is not merged.

The deployment diff contains only editorial source, DE/FR/EN pages, their generated runtime assets, approved packaging photographs and responsive copies, tests, review screenshots and documentation. Every one of the 1,163 files already present at the production baseline is preserved byte for byte. No admin, Supabase, database, authentication, account, payment or purchasing implementation is deployed.

The production build refreshed generated chunk references without changing the reviewed page content. The preservation unit test now compares against the production baseline above, rather than the separate backend catalogue-provenance commit. `export-manifest.json` retains that original provenance and verifies the actual generated files.

The presentation remains adults-only, factual and non-transactional. All three pages remain `noindex, nofollow, noarchive`; the original logo, shared navigation, typography and photographs are preserved. No prices, discounts, reservations, purchasing or checkout were added.

## Production paths

- `https://openatg.com/varathans25/de/cigar-collection/`
- `https://openatg.com/varathans25/fr/cigar-collection/`
- `https://openatg.com/varathans25/en/cigar-collection/`

These are the intended publication paths. Successful deployment must be confirmed through the GitHub Pages build and live route checks; this record alone is not evidence of a completed deployment.

## Pre-publication checks

| Check | Result |
| --- | --- |
| Full Next production static build | Passed |
| TypeScript and ESLint | Passed, no lint warnings |
| Editorial unit/export checks | 5 passed |
| Existing standard-delivery unit tests | 11 passed, including CHF 99.99 / 100.00 / 100.01 |
| Editorial Playwright journeys | 15 passed |
| Existing storefront Playwright journeys | 27 passed |
| Browser widths and languages | 1440 / 1024 / 390 px; DE / FR / EN |
| Automated accessibility and keyboard checks | Passed in both browser suites |
| Local console/page errors | Zero across all 42 journeys |
| Local route and asset crawl | 169 HTML routes and 107 assets passed; asset hashes matched |
| Inline script/JSON syntax | 1,535 payloads in 164 Varathans25 HTML files passed |
| Existing OpenATG static validation | 4 pages and 14 local resources passed |
| Dependency audit | Zero known vulnerabilities |

The local crawl includes all 166 pre-existing HTML paths plus the three editorial routes. Existing storefront journeys cover product pages, delivery estimates, saved bag contents, keyboard controls, mobile navigation and language switching. The pre-existing delivery test fixtures remain local test data; no catalogue prices were changed or approved.

Gitleaks must pass on the complete deployment range before pushing. Environment files, dependency folders, private keys, database files and local verification artifacts must remain excluded from the commit.

Reproduce the editorial checks:

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

Existing storefront tests are in `tests/varathans25/`. Follow their existing [reproduction instructions](VARATHANS25_LAYOUT_DELIVERY_REVIEW.md#reproduce). The publication work used a disposable, ignored test workspace and a loopback-only static server; it did not add dependency folders or test artifacts to public routes.

## Live console baseline

Before publication, `/signal/`, `/store/`, `/store/base-32m/`, `/store/base-64m/` and Varathans25 pages already reported that CSP blocked Cloudflare's injected `https://static.cloudflareinsights.com/beacon.min.js/...` script. The root homepage loaded without a console error. All seven baseline browser checks returned HTTP 200 with no application JavaScript errors.

The injected script is not in the repository. This release does not weaken CSP or authorize a new script origin. The safe owner-side remedy is to disable Cloudflare automatic Web Analytics injection for these CSP-protected pages. No Cloudflare settings are changed by this release. Post-deployment checks must record this known message separately and fail on any other console or page error.

## Publication and live verification

1. Recheck remote `main` against the exact production baseline. Stop on an unexpected change.
2. Merge only the isolated deployment branch into a fresh checkout of that baseline using a normal merge commit. Push the resulting commit to `main` without force.
3. Wait until GitHub Pages reports a successful build for that exact merge commit.
4. Check all 169 HTML paths, all referenced static assets, the three language versions, manual image controls, reduced motion, mobile navigation, language switching, direct reloads and accessibility on the live origin. Capture live screenshots.
5. If a new functional or security regression appears, revert the deployment merge immediately and wait for the rollback build. The known injected analytics warning is recorded separately, as approved in the earlier deployment instructions.

GitHub Pages is configured for `main` at `/`. No backend workflow or production service is introduced. Local `main` may belong to separate work; the publication checkout preserves unrelated local branches and updates the authorized remote `main` through the explicit merge commit.

## Verified rollback checkpoint

- Branch: `rollback/varathans25-editorial-20260926T103440Z`
- Commit: `d7012ead4eb2291847f130c30891d70fd0abb173`
- Verified full-history bundle: `.local/repository-checkpoints/varathans25-editorial-20260926T103440Z.bundle`, outside the repository worktree.

Rollback preserves history. From a clean checkout based on the current remote main:

```sh
git fetch origin
git switch -c rollback/cigar-editorial-publication origin/main
git revert -m 1 <deployment-merge-commit>
git push origin HEAD:main
```

Substitute the exact merge SHA reported after publication. Do not reset or force-push. A revert of that merge removes only this editorial release and restores the previous static tree while preserving any unrelated subsequent commits. Wait for the Pages rollback build and recheck existing routes.
