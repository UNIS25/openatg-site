# Verified full-film and mobile release

Published frontend: `2f7c031c517ce9b4d04b68d7cbb584c2811c32a6` on OpenATG `main`. [Pages deployment](https://github.com/UNIS25/openatg-site/actions/runs/37124411077) succeeded; the Pages build API reports this exact commit as built.

Source branch: `work/varathans25-downloaded-film-public-20261003`. Built source: `364eadd512b9b1185cefc2a6109706480c635575`, continuing the approved `54b0203` implementation and the latest public checkpoint `72b7c7b`. Publication branch: `publish/varathans25-mobile-full-film-20261003`.

## Public URLs

German remains the default at https://openatg.com/varathans25/premium-preview/.

| Language | Gateway | Discover / General Store | Lounge | Account |
| --- | --- | --- | --- | --- |
| DE | [Opening](https://openatg.com/varathans25/premium-preview/de/) | [Discover](https://openatg.com/varathans25/premium-preview/de/store/) | [Lounge](https://openatg.com/varathans25/premium-preview/de/club/) | [Account](https://openatg.com/varathans25/premium-preview/de/account/) |
| FR | [Opening](https://openatg.com/varathans25/premium-preview/fr/) | [Discover](https://openatg.com/varathans25/premium-preview/fr/store/) | [Lounge](https://openatg.com/varathans25/premium-preview/fr/club/) | [Account](https://openatg.com/varathans25/premium-preview/fr/account/) |
| EN | [Opening](https://openatg.com/varathans25/premium-preview/en/) | [Discover](https://openatg.com/varathans25/premium-preview/en/store/) | [Lounge](https://openatg.com/varathans25/premium-preview/en/club/) | [Account](https://openatg.com/varathans25/premium-preview/en/account/) |

All internal public navigation stays within the updated preview. The verified restaurant destination remains https://www.varathans25.ch/.

## Film and presentation

The deployed opening film is the **full downloaded MOV**, including the Earth opening, descent, terrace, entrance and restaurant ending. Both MP4 derivatives retain all 707 original video frames in order, at 30fps, for **23.566667 seconds**. No older image, animated photograph, previous gateway clip or shortened segment is used.

The original remains untouched at `/Users/adrianvasu/Downloads/video-output-48C27F37-1E7C-4B68-B325-61164FEFEE0F-1.MOV`. Its verified SHA-256 remains `674ddcf1e1069b45408b9c3cb2daade6fff7d63b55b6b782f16c0c436221f8ad`.

| Delivered asset | Resolution | Bytes |
| --- | --- | --- |
| Desktop opening MP4 | 1920 × 1080 | 11,813,471 |
| Mobile opening MP4 | 1280 × 720 | 5,555,970 |
| Original-opening WebP poster | 1920 × 1080 | 39,424 |

MP4s use browser-compatible H.264/yuv420p, fast-start metadata and no audio. The original AAC audio remains in the preserved download. Muted inline autoplay is requested immediately; a pause control appears on actual playback. Reduced motion, Save-Data, slow connections and unsupported media retain poster navigation. Lower films load on demand and pause off-screen. Published assets have content-hashed URLs; live responses report `Cache-Control: max-age=14400`.

The mobile opening is one video hero with the official transparent logo, brand/languages, headline and destinations over a dark gradient. Small-viewport height and safe-area spacing keep normal portrait screens contained and let short screens expand. Desktop typography and composition retain the approved direction. Shared film controls are monochrome SVG icons with 48px circular touch targets, translated accessible names and visible keyboard focus. Navigation arrows use SVG.

Discover uses the requested order in every language: estate film → approved Black/Green products → pouring film → approved Masala/Cinnamon/Cardamom products → spice film → curry → restaurant. Each product appears once. Names, label information, images and local basket behavior come from the existing approved records. Section anchors work on click, direct reload and language changes.

## Favicon files

The compact “25” mark follows the official logo's distinctive proportions, with strengthened small-size strokes, established muted gold and a flat navy square. The full official logo remains throughout the website.

- [SVG favicon](https://openatg.com/varathans25/premium-preview/media/favicon.dd4a0f5bcae2.svg)
- [16/32/48px ICO fallback](https://openatg.com/varathans25/premium-preview/media/favicon.fc9f55d05c11.ico)
- [180px Apple touch icon](https://openatg.com/varathans25/premium-preview/media/apple-touch-icon.09e393a0a9e0.png)

Metadata and asset loading were tested on gateway, store and club in all three languages at their deployed subpaths. All icon images are square. Versioned URLs replace the former wide-logo favicon. Unrelated OpenATG branding is preserved.

## Verification and browser coverage

- TypeScript, lint and production static build pass; 7 unit/integrity tests pass.
- 50 local browser checks pass. Live browser result: **50 unique checks verified** (48 initially passed; a page-load timeout and an unbuffered seek passed both targeted rechecks after condition-based waiting/remote timeout correction). Original results are preserved. No public frontend change was needed for those rechecks..
- DE/FR/EN at 350, 390, 430, 1024 and 1440px; additional 568px-high mobile screens.
- Overlay bounds, no horizontal overflow or control/button overlap, keyboard focus, translated controls, touch pause/resume, actual playback states and looping.
- Correct sequence and product anchors; local quantity/add/remove/clear/reload; language switching; all connected public routes; no fake account/order/payment forms.
- Reduced motion, Save-Data/slow connections, forced autoplay rejection, unsupported playback and navigation without JavaScript.
- WCAG A/AA/2.1 AA automated checks pass on tested routes; no application JavaScript/console errors or broken media in passing journeys.
- Live audit: **52 HTTP routes, 28 byte-verified assets, 81 public files**; no secrets/private fixtures. Live documents match the verified export. Gateway MP4 and favicon bytes match their source-build hashes.
- Git verifies every change in the publication is under `varathans25/premium-preview/`; unrelated OpenATG routes/files/assets are unchanged.

Actual engines: bundled Chromium **153.0.8010.12** and macOS WebKit **26.6** through Playwright, including touch/mobile contexts. Chromium autoplay succeeds without a click. This WebKit MiniBrowser blocks even an isolated visible, muted, audio-free autoplay test on both localhost and a trusted public origin; its real play fallback, full playback, loop, pause/resume and touch behavior are tested. Forced autoplay denial is also tested in both engines. The Safari application and physical iPhones were not tested; [Playwright documents the distinction between its WebKit build and Safari](https://playwright.dev/docs/browsers#webkit). Autoplay remains subject to the browser's policy; no simulated playback success is displayed.

Two known external/tooling warnings are recorded separately: OpenATG's existing Cloudflare analytics injection is blocked by the strict CSP; WebKit's screenshot helper attempts to insert an animation-sync `body {}` stylesheet, also blocked by CSP. Ordinary application journeys are checked separately from screenshot tooling. The site CSP was not weakened.

Fresh **live** screenshots, captured from the published URLs, are under `artifacts/screenshots/`:

- `live-chromium-gateway-de-390.png` and `live-chromium-store-de-390.png` — corrected mobile hero and the complete alternating Discover page.
- Corresponding DE captures at 350/430/1024/1440px, plus FR/EN at 390px.
- Corresponding WebKit captures and neutral lounge captures.

`artifacts/live-audit.json`, `artifacts/live-browser-results.json` and `artifacts/live-screenshots.json` record the checks. Screenshots select a representative frame from the full opening film; WebKit captures use its verified explicit fallback to display footage.

## Services and generation costs

The static release does not run Next.js/Supabase authentication. No approved reachable production account/order/payment backend was configured, so those services remain explicitly unavailable. Restricted catalogue access and private backend/security work are unchanged. The basket remains a local browser selection; it does not create orders or process payments. No prices, stock or benefits were invented.

Higgsfield's supported authenticated connection was checked during this release: 102 credits on Pro; a cost-only 5s/1080p Cinema Studio 3.0 estimate was 50 credits. The supplied download and approved existing media fulfilled this release. **Actual credits used: 0.** No generation, purchase or upgrade occurred. [Asset inspection and provenance](PROVENANCE.md) records the originals, exports and favicon source.

## Exact rollback

Preserved public checkpoint: `72b7c7bdd1de5946c9c4b757be82a3bb651bc684`, pushed as `rollback/varathans25-before-mobile-public-20261003`. Pre-correction source checkpoint: `18396f5605206f12d0e1deac4288db38be077ae7`, pushed as `rollback/varathans25-before-mobile-source-20261003`. Original worktrees/uncommitted work are preserved; the earlier full Git bundle remains in `.local/film-release-20261003/openatg-before.bundle`.

To revert this complete public release without resetting other work, use a fresh isolated checkout and revert its one publication commit:

```sh
git -C /Users/adrianvasu/Desktop/V25-Suisse/.local/varathans25-film-release-20261003 fetch origin
git -C /Users/adrianvasu/Desktop/V25-Suisse/.local/varathans25-film-release-20261003 worktree add -b rollback/varathans25-mobile-2f7c031 /Users/adrianvasu/Desktop/V25-Suisse/.local/varathans25-rollback-2f7c031 origin/main
git -C /Users/adrianvasu/Desktop/V25-Suisse/.local/varathans25-rollback-2f7c031 revert --no-edit 2f7c031c517ce9b4d04b68d7cbb584c2811c32a6
git -C /Users/adrianvasu/Desktop/V25-Suisse/.local/varathans25-rollback-2f7c031 push origin HEAD:main
gh run list --repo UNIS25/openatg-site --limit 3 --json databaseId,status,conclusion,headSha
```

Wait for the resulting Pages deployment to succeed, confirm the Pages build API reports the new revert commit as built, and verify the public preview. This restores the preceding public design and its older shortened opening-film derivative. It does not remove the original download, full-film source or later unrelated OpenATG changes. Do not force-push or reset the shared repository.
