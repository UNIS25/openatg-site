# Varathans25 public experience

An isolated static release of the approved `54b0203b11460f425d985040f8e66b5343b00b65` frontend direction, with the specifically requested downloaded film. It extends the existing OpenATG `/varathans25/premium-preview/` release into 52 directly reloadable public pages. The parent Next.js/Supabase application and every existing worktree are preserved.

The release contains the German-default gateway, DE/FR/EN store, catalogue, six product pages, basket, neutral club entrance, sign-in/account/membership/recovery service states, privacy and information pages. Every internal link remains inside the updated experience. The basket saves only local product selections, with quantities from 1 to 20. No sample price, stock, membership benefit, successful authentication, order or payment is displayed. The account service is unavailable: the existing backend is local-only, with hosted writes and production provider adapters disabled. The static build imports no backend modules.

The official logo is copied byte for byte. Existing tea-estate, tea-pouring and spice films, the five approved tea tins, verified curry label information and restaurant imagery are retained. The restaurant/contact destination is the existing verified `https://www.varathans25.ch/`. Davidoff supplied broad cinematic/navigation inspiration only; no artwork, footage, code or text was copied.

## Build and verify

Use Node 22 or later and the sibling platform's locked dependencies. From this directory:

```sh
npm --prefix ../platform ci
ln -s ../platform/node_modules node_modules
npm run typecheck
npm run lint
npm run build
npm test
python3 -m http.server 4188 --bind 127.0.0.1 --directory out
```

In another terminal, from this directory:

```sh
node scripts/audit.mjs
npm run test:e2e
```

`out/` contains only static HTML, CSS, JavaScript, font, logo, approved images/films and a public integrity manifest. It contains no server routes, source maps, credentials, database, private media, account fixture or environment file. The build uses an explicit public asset and product-field allowlist. The audit checks secret patterns and known local secret values without printing them.

## Media and performance

See `PROVENANCE.md` for the source, inspection and actual export sizes. Gateway video uses H.264/yuv420p MP4 with fast-start, a WebP poster and no audio track. Desktop is 1920×1080; mobile is 1280×720. Mobile shows the complete landscape composition above the interface. Logo and all interface text are separate crisp overlays.

Film sources attach only when at least 12% of their chapter is visible. Off-screen and hidden-page playback pauses. Reduced motion, Save-Data, 2G/3G and decode failure keep the poster with no automatic video download. Autoplay rejection retains an explicit play control. User pause persists while scrolling. Films never carry overlapping audio. Poster/navigation layout reserves its dimensions. Assets have content-hashed filenames; GitHub Pages controls HTTP cache headers, without a service worker.

The completed local checks passed TypeScript, lint, build, five output integrity tests, all 40 existing platform unit regressions and 18 browser journeys. The browser suite covers DE/FR/EN at 1440, 1024, 390 and 350 px, reloads, basket persistence/quantity/removal, filters, alignment, language switching, keyboard navigation, axe WCAG checks, actual desktop/mobile playback, loop cycling, off-screen pause, constrained connections, autoplay rejection, unsupported media and navigation without JavaScript. No application console/page errors or backend/write requests occurred. The HTTP/hash audit verified 52 routes and 25 assets; 78 output files passed the secret/private-fixture scan.

Local unthrottled Chromium observations: gateway LCP 92 ms desktop, 80 ms mobile/poster; CLS below 0.000003, poster-only CLS zero. These are local observations, not public-network performance guarantees. Browser results and screenshots remain in ignored `artifacts/`.

## Publication and rollback

OpenATG uses GitHub Pages legacy publishing from `UNIS25/openatg-site`, `main`, repository root, custom hostname `openatg.com`. The inspected live baseline is `13960040f294e552e0bf2d90fa4145c7bab3c519`. Publish only `out/varathans25/premium-preview/` onto a clean checkout of that baseline; never merge the parent platform branch into public `main`.

`scripts/publish.mjs` enforces the baseline and target prefix and verifies that no file outside it changes. Re-fetch immediately before publication; stop and rebase the isolated deployment if the live baseline changed. The user authorized committing, pushing and deploying this public frontend.

Rollback checkpoints:

- Source: `rollback/varathans25-source-before-downloaded-film-20261003`, pointing to `54b0203`.
- Public: `rollback/varathans25-public-before-downloaded-film-20261003`, pointing to `1396004`.
- Full local Git bundle, original checksum, uncommitted patch and worktree-state snapshot: `/Users/adrianvasu/Desktop/V25-Suisse/.local/film-release-20261003/`.

For the exact deployment SHA recorded in the final delivery, revert that single deployment commit in a fresh checkout of the then-current `origin/main`, push without force, wait for Pages and verify its resulting SHA. This preserves later unrelated releases. Do not reset or overwrite any pre-existing dirty worktree.

```sh
git fetch origin
git worktree add -b rollback/varathans25-downloaded-film ../varathans25-film-rollback origin/main
git -C ../varathans25-film-rollback revert DEPLOYMENT_SHA
git -C ../varathans25-film-rollback push origin HEAD:main
gh api repos/UNIS25/openatg-site/pages/builds/latest --jq '{status,commit}'
```

After Pages succeeds, run the live browser and HTTP/hash checks against the deployed export:

```sh
PUBLIC_RELEASE_URL=https://openatg.com npm run test:e2e
node scripts/audit.mjs https://openatg.com
```

OpenATG previously injected a Cloudflare analytics beacon that its strict CSP rejects. The live suite permits only that exact known third-party rejection, while failing on all application errors. This release does not relax CSP or change Cloudflare settings.
