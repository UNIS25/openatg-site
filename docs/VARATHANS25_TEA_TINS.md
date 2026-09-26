# Varathans25 premium tea tins

Production baseline: `2d2bc01a5ee2061e8fcc8ec8ad2ccecf81904b76`.
Feature branch: `work/varathans25-premium-tea-tins`.
Rollback checkpoint: `rollback/varathans25-before-tea-tins-20260926T184646Z`.
A verified full-history Git bundle is retained locally in `.local/repository-checkpoints/varathans25-before-tea-tins-20260926T184646Z.bundle` in the parent workspace.

## Scope and assets

The public Tea / Tee / Thé collection contains exactly five products: Premium Black Tea Powder, Green Tea Powder, Masala Tea Powder, Cinnamon Tea and Cardamom Tea. All five original 1254 × 1254 PNGs were visually identified from the supplied Downloads archive by name and colour (navy, forest green, burgundy, cinnamon brown and mineral teal).

Originals are retained byte-for-byte in `varathans25/images/masters/`. Their SHA-256 values and translated product names are in `editorial/assets/tea-tins.json`. WebP versions are 1254 × 1254, approximately 106–114 KiB each. Conversion does not crop, recolour, composite, enlarge or invent a background. Tea-only CSS uses white image containers and `object-fit: contain`, and reserves equal title space on narrow cards.

The artwork is a supplied packaging visual. Its printed weight is **not** an approval of product facts. Existing prices, weights, ingredients, allergens, origin, stock, verification flags and other facts remain unchanged. Green tea's obsolete packet-format sentence was removed; its existing statement that origin and pack size await confirmation remains. Other descriptions are retained.

Coffee Powder is excluded from every public catalogue snapshot, collection, recommendation, search result and new cart. An existing frontend bag drops only the retired Coffee ID. No database, historical order or audit record is edited. Old Coffee product URLs in DE/FR/EN are noindex static redirects to their localized Tea collection; GitHub Pages returns HTTP 200 with a meta refresh and an accessible fallback link, not a server-side 301. The obsolete product Flight payloads are removed. The legacy `selection=tea-coffee` query still resolves to the five teas, while current navigation uses `selection=tea`.

Curry and cigar product data, original images, logo, existing CSS, cigar builder, and the cigar editorial main content are protected by baseline comparisons. Their shared navigation/catalogue snapshots necessarily reflect the Tea label and Coffee retirement. Original immutable JS assets remain available for already-open tabs; current pages reference versioned Tea chunks. No backend branch is merged and no admin, database, authentication, payment or tobacco functionality is enabled.

Delivery announcement text matches the supplied EN/DE/FR wording. Coffee is removed from its merchandise list. The calculation is unchanged: **9,999 rappen does not qualify; 10,000 and 10,001 do** for standard Swiss delivery. Existing international/tobacco exclusions and disabled checkout remain unchanged. An unconfirmed standard rate remains unconfirmed.

## Reproduce the production build and checks

From `editorial/`, install the pinned dependencies with `npm ci`, then run:

```sh
npm run build
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm audit --omit=optional
```

The production build prepares the five images and shared public shell, builds the existing static editorial, and applies the narrow catalogue migration to the existing storefront export. It does not rebuild unrelated sites or import backend code. The migration parses serialized Flight JSON and JavaScript string literals, validates script syntax, and is idempotent.

From the repository root:

```sh
node --test tests/varathans25/standard-delivery.test.mjs
node tests/stage1-static.mjs
python3 -m http.server 4187 --bind 127.0.0.1
```

With that local server running, in another terminal:

```sh
mkdir -p editorial/artifacts/layout-suite
cp tests/varathans25/layout.spec.mjs tests/varathans25/playwright.config.mjs editorial/artifacts/layout-suite/
editorial/node_modules/.bin/playwright test --config=editorial/artifacts/layout-suite/playwright.config.mjs
node editorial/scripts/route-audit.mjs http://127.0.0.1:4187 local-tea
```

Pre-publication results: TypeScript, lint and production build passed; 12 editorial/tea unit and integrity tests, 11 delivery unit tests, 33 editorial/tea Playwright journeys and 27 existing layout/delivery journeys passed. Accessibility checks passed at 1440, 1024 and 390 pixels in DE/FR/EN. No local browser console/page errors or backend/write requests were observed. Dependency audit reported zero vulnerabilities. The route audit checked 169 routes and 107 referenced assets successfully, including all five new WebPs. Gitleaks scanned the staged release (16.76 MB) with zero leaks. The committed release is scanned again before publication.

Screenshots and machine-readable results remain in ignored `editorial/artifacts/`, including `tea-tins/`, `layout-suite/` and `local-tea-routes.json`. See `VARATHANS25_TEA_TINS_CHANGED_FILES.txt` for the exact release file list. Most changed files are the existing static HTML/Flight copies of one shared catalogue, not separate page redesigns.

## Deployment and live verification

Use the existing GitHub Pages legacy workflow, `main` / repository root. Re-fetch origin immediately before publishing and require `origin/main` still to equal the baseline. Commit the isolated feature with `feat: add Varathans25 premium tea tins`, push the feature and rollback checkpoint, create a separate publication branch from `origin/main`, merge only this feature with `--no-ff`, and push that branch's HEAD to `main` without force. Do not reset an unrelated local `main` checkout.

Wait for the matching GitHub Pages workflow to succeed. Verify the deployed SHA against `gh api repos/UNIS25/openatg-site/pages/builds/latest`, then run:

```sh
node editorial/scripts/route-audit.mjs https://openatg.com live-tea
cd editorial
TEA_LIVE_URL=https://openatg.com npm run test:e2e
```

Live collection URLs:

- https://openatg.com/varathans25/de/shop/?selection=tea
- https://openatg.com/varathans25/fr/shop/?selection=tea
- https://openatg.com/varathans25/en/shop/?selection=tea

The live suite verifies all fifteen localized tea product routes, direct reloads, five image dimensions, mobile navigation, Coffee retirement, bag persistence and accessibility. The route audit also tests the existing OpenATG, Signal, Store and cigar editorial routes, and compares downloaded asset hashes to the checked release.

The existing Cloudflare-injected analytics beacon may produce a CSP refusal for `https://static.cloudflareinsights.com/beacon.min.js/...`. This release does not weaken CSP. Live tests record that exact existing analytics refusal separately and fail on any other console/page error. Disable that injected analytics feature in Cloudflare if its warning is to be removed; no Cloudflare configuration or credentials are changed here.

## Rollback

`DEPLOYMENT_MERGE_SHA` below is the two-parent publication merge reported with this release. To restore the exact previous storefront without rewriting history, use a clean worktree based on current production:

```sh
git fetch origin
git switch -c rollback/tea-tins-release origin/main
git revert -m 1 DEPLOYMENT_MERGE_SHA
git push origin HEAD:main
```

Wait for the rollback Pages workflow, then verify the prior storefront and cigar editorial. Do not force-push or reset main. If subsequent releases exist, review the revert for conflicts before publishing.
