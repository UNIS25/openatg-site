# Verified automatic-playback release

Published through the existing OpenATG GitHub Pages process from `main` at **`d1f6f4d7942d94a545e293023f1ac46be1b6ad5f`**. The [deployment workflow](https://github.com/UNIS25/openatg-site/actions/runs/37138614839) succeeded, and the Pages build API reports this exact commit as built. The actual public pages and asset bytes were verified after deployment.

Built source: `12a21f5a0fca50b00065d7917346f69af0dd8c28` on `work/varathans25-downloaded-film-public-20261003`. Publication branch: `publish/varathans25-autoplay-20261003`. This continues the latest deployed `2f7c031c517ce9b4d04b68d7cbb584c2811c32a6` checkpoint. Subsequent source documentation/capture-report changes do not change the deployed frontend.

German remains the default at https://openatg.com/varathans25/premium-preview/.

| Language | Gateway | Discover / General Store | Lounge | Account |
| --- | --- | --- | --- | --- |
| DE | [Opening](https://openatg.com/varathans25/premium-preview/de/) | [Discover](https://openatg.com/varathans25/premium-preview/de/store/) | [Lounge](https://openatg.com/varathans25/premium-preview/de/club/) | [Account](https://openatg.com/varathans25/premium-preview/de/account/) |
| FR | [Opening](https://openatg.com/varathans25/premium-preview/fr/) | [Discover](https://openatg.com/varathans25/premium-preview/fr/store/) | [Lounge](https://openatg.com/varathans25/premium-preview/fr/club/) | [Account](https://openatg.com/varathans25/premium-preview/fr/account/) |
| EN | [Opening](https://openatg.com/varathans25/premium-preview/en/) | [Discover](https://openatg.com/varathans25/premium-preview/en/store/) | [Lounge](https://openatg.com/varathans25/premium-preview/en/club/) | [Account](https://openatg.com/varathans25/premium-preview/en/account/) |

The gateway film and first Discover film request muted inline autoplay as the page loads. Tea-pouring and spice films start automatically when scrolled into view; they retain loading on demand and pause off-screen. Every film has native autoplay/inline flags and a native poster. The separate poster image hides when the video becomes eligible and visible, so it does not cover the active video during browser visibility checks. The previous runtime permanently stopped automatic attempts after its first autoplay rejection; this release retries a limited number of times, reacts to media loading and visibility changes, and can recover from an ordinary trusted page interaction when a browser requires a gesture.

Actual playback drives the small translated Pause/Play control. Explicit Pause remains respected after focus, page restoration and ordinary taps. Reduced motion, Save-Data, constrained connections and unavailable media retain poster navigation. Changing motion/data preferences during playback stops the film. Browser-wide autoplay restrictions can still require a gesture; the page never displays simulated playback success. Product-section reloads and language changes also receive a single anchor correction after fonts and native scroll restoration settle, without interrupting a visitor who has begun scrolling.

The full downloaded opening film remains deployed. Its 707 frames and **23.566667-second** duration are preserved in both silent H.264/fast-start MP4 derivatives: **1920 × 1080** desktop and **1280 × 720** mobile. The original `/Users/adrianvasu/Downloads/video-output-48C27F37-1E7C-4B68-B325-61164FEFEE0F-1.MOV` remains untouched, with SHA-256 `674ddcf1e1069b45408b9c3cb2daade6fff7d63b55b6b782f16c0c436221f8ad`. The source retains its original audio. Approved layout, transparent full logo, compact gold/navy favicon, photographs, translations, films, product records and local basket behavior remain intact. Discover still alternates estate → Black/Green → pouring → Masala/Cinnamon/Cardamom → spice → curry → restaurant, with each product appearing once.

Verification completed:

- TypeScript, lint, production build and **7 integrity tests** pass.
- **58 local browser checks** pass with no skipped tests, covering DE/FR/EN at 350, 390, 430, 1024 and 1440px, short mobile screens, touch controls, navigation, direct reloads, product alignment, basket actions, section anchors, favicons and automated WCAG A/AA/2.1 AA checks.
- **22 live browser checks** pass, including automatic playback of every visible film in every language at mobile/desktop widths, recovery after early rejection without a click, explicit browser-policy fallback, full-film duration/loop/pause/resume, loading on demand, motion/data preferences, product anchors, connected mobile navigation, basket persistence, language changes, accessibility and localized favicon subpaths.
- Live audit verifies **52 HTTP routes**, **30 assets byte-for-byte** and **83 public files** with no secrets/private fixtures. The 28 current exported assets are accompanied by the two unchanged preceding hashed JS/CSS assets, retained so cached documents still load. Newly published documents reference the new versioned runtime/CSS. No public film bytes changed.
- No application JavaScript errors, broken assets or unexpected writes were found. The existing Cloudflare analytics injection and WebKit screenshot-helper stylesheet produce separately recorded CSP warnings; the site CSP remains unchanged.
- Publication changes are confined to `varathans25/premium-preview/`. Unrelated OpenATG routes, branding, assets, private backend/security work and original worktrees are preserved.

Actual browser coverage is Chromium **153.0.8010.12** and macOS WebKit **26.6** through Playwright, including mobile touch contexts. Both engines now play the deployed films automatically without clicking Play. The Safari application is **26.5**, but its WebDriver connection is unavailable because “Allow remote automation” is disabled in Safari Settings. That setting was not changed, and physical iPhones were not tested. This release's successful WebKit autoplay verification supersedes the earlier release's MiniBrowser autoplay limitation.

Fresh screenshots were captured from the deployed URLs, after verifying real automatic playback without a tap or explicit `video.play()` call. The opening screenshots select a representative frame from the full film after that verification. The capture report records all 16 automatic playback observations at 390px and 1440px in both engines.

- [Mobile opening hero](artifacts/screenshots/autoplay-live-chromium-gateway-de-390.png)
- [Mobile complete alternating Discover page](artifacts/screenshots/autoplay-live-chromium-store-de-390.png)
- [Desktop opening hero](artifacts/screenshots/autoplay-live-chromium-gateway-de-1440.png)
- [Desktop Discover](artifacts/screenshots/autoplay-live-chromium-store-de-1440.png)
- [WebKit mobile opening](artifacts/screenshots/autoplay-live-webkit-gateway-de-390.png)
- [WebKit mobile Discover](artifacts/screenshots/autoplay-live-webkit-store-de-390.png)

Evidence: `artifacts/local-autoplay-browser-results.json`, `artifacts/live-autoplay-browser-results.json`, `artifacts/live-audit.json` and `artifacts/live-autoplay-screenshots.json`. The full prior media/mobile/favicon release report remains in [FULL_FILM_UPDATE.md](FULL_FILM_UPDATE.md).

Authentication, production orders and payments remain unavailable on this static deployment. No approved reachable production backend was configured. Account pages state the service limitation, and the basket remains a browser-local selection. Restricted catalogue/security boundaries are unchanged. No new Higgsfield generation jobs were submitted: **credits used for this correction: 0**. The downloaded and approved existing media are reused; provenance remains in [PROVENANCE.md](PROVENANCE.md).

The pushed rollback checkpoints are `rollback/varathans25-before-autoplay-public-20261003` → `2f7c031c517ce9b4d04b68d7cbb584c2811c32a6`, and `rollback/varathans25-before-autoplay-source-20261003` → `c08188a62edf0aeafb7f093c26318ea96c58791d`. To restore the preceding public release while preserving later unrelated work, revert this single publication commit in a fresh checkout:

```sh
git -C /Users/adrianvasu/Desktop/V25-Suisse/.local/varathans25-film-release-20261003 fetch origin
git -C /Users/adrianvasu/Desktop/V25-Suisse/.local/varathans25-film-release-20261003 worktree add -b rollback/varathans25-autoplay-d1f6f4d /Users/adrianvasu/Desktop/V25-Suisse/.local/varathans25-rollback-d1f6f4d origin/main
git -C /Users/adrianvasu/Desktop/V25-Suisse/.local/varathans25-rollback-d1f6f4d revert --no-edit d1f6f4d7942d94a545e293023f1ac46be1b6ad5f
git -C /Users/adrianvasu/Desktop/V25-Suisse/.local/varathans25-rollback-d1f6f4d push origin HEAD:main
gh run list --repo UNIS25/openatg-site --branch main --limit 3 --json databaseId,status,conclusion,headSha
gh api repos/UNIS25/openatg-site/pages/builds/latest --jq '{status,commit}'
```

Wait for the resulting Pages deployment to succeed and for the build API to report the revert commit as built, then verify the gateway and connected store/lounge URLs. If subsequent preview changes produce a conflict, resolve only the intended preview changes before pushing. Do not force-push or reset the shared repository. This rollback retains the full downloaded opening film and restores the preceding playback runtime.
