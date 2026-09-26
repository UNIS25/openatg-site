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

GitHub Pages successfully published deployment merge `2c5c36f66ba26027607c893fc2701ac1f8d4c838` in [run 36236579616](https://github.com/UNIS25/openatg-site/actions/runs/36236579616). All three paths were subsequently tested on the live origin.

## Live verification results

- All 169 HTML routes returned HTTP 200, including every one of the 166 pre-existing paths.
- All 107 checked static assets returned HTTP 200 and matched local SHA-256 hashes, including the approved packaging photographs and their responsive sizes.
- All 15 live editorial Playwright journeys passed across DE/FR/EN at desktop, tablet and mobile widths. Direct reloads, language switching, mobile navigation, image controls, saved bag preservation and reduced motion passed.
- Nine live full-page axe scans reported zero WCAG A/AA violations. Local browser suites also remained green: 15 editorial plus 27 existing storefront journeys.
- Seven existing core routes matched their pre-deployment browser status, page title and console baseline: `/`, `/signal/`, `/store/`, `/store/base-32m/`, `/store/base-64m/`, `/varathans25/` and `/varathans25/en/`.
- No new application or page errors were observed. The already-recorded injected Cloudflare analytics CSP message remains and was classified separately by exact script origin and message; CSP was not relaxed.
- Gitleaks found zero secrets in the full two-commit deployment range. No environment files, private keys, local databases, dependency folders or verification artifacts were committed.

The first live run exposed a **test-fixture timing race** on tablet: the test wrote a synthetic bag after navigation, competing with React's initial storage restoration. The fixture now seeds storage before application initialization, once per browser session; reloads cannot reseed it and mask a real persistence failure. No storefront code changed. After this correction, all 15 local and all 15 live editorial journeys passed with no retries or skips. The test correction and this results record form a verification-only follow-up commit; the deployed customer assets are byte-identical to the successful deployment merge.

Live full-page screenshots and JSON reports were captured under the ignored local `editorial/artifacts/live-suite/artifacts/` directory and are supplied separately in the delivery report. The checked-in review screenshots remain the original approved captures.

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
git revert <verification-follow-up-commit>
git revert -m 1 2c5c36f66ba26027607c893fc2701ac1f8d4c838
git push origin HEAD:main
```

Substitute the verification-only follow-up SHA reported with the final live commit. Revert it first, then the deployment merge; this avoids a modify/delete conflict in the newly added test and release document. Do not reset or force-push. The two reverts remove only this editorial release while preserving unrelated subsequent commits. Wait for the Pages rollback build and recheck existing routes.
