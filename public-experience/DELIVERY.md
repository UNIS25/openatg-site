# Historical public delivery · 3 October 2026

The gateway-film correction supersedes this first-release media description. See [the full-film update](FULL_FILM_UPDATE.md) for the current deployment and rollback.

The connected public frontend is deployed on OpenATG. GitHub Pages reports `built`, and its deployment workflow reports `success` for **`72b7c7bdd1de5946c9c4b757be82a3bb651bc684`**. [Deployment evidence](https://github.com/UNIS25/openatg-site/actions/runs/37118598242).

| Page | Verified public URL |
|---|---|
| German-default gateway | https://openatg.com/varathans25/premium-preview/ |
| General Store | https://openatg.com/varathans25/premium-preview/de/store/ |
| Catalogue | https://openatg.com/varathans25/premium-preview/de/shop/ |
| Neutral lounge entrance | https://openatg.com/varathans25/premium-preview/de/club/ |
| Account | https://openatg.com/varathans25/premium-preview/de/account/ |
| Local selection basket | https://openatg.com/varathans25/premium-preview/de/bag/ |

All localized pages use the same structure with `de`, `fr` or `en`. Language switching preserves the page, product and catalogue filter. There are 52 public HTML documents, including direct reloads for all six products and account service states. Navigation never enters the older Varathans25 design.

Selected implementation base: `work/varathans25-final-hd-experience-20261002`, `54b0203b11460f425d985040f8e66b5343b00b65`, confirmed as the newest available frontend candidate after fetching and checking branches/worktrees. Existing uncommitted work was preserved. New public source branch: **`work/varathans25-downloaded-film-public-20261003`**; the deployed build records source **`40a411b537ff8e5370f391038e35ab8da4c3315b`**. The report-only commit after deployment changes no public bytes. Publication branch: `publish/varathans25-downloaded-film-20261003`, based on live baseline `13960040f294e552e0bf2d90fa4145c7bab3c519`. Only the preview prefix changed; all other tracked OpenATG routes/files/assets have identical Git bytes. Existing OpenATG root, Store, Signal and three older store routes were also checked over HTTPS and returned 200.

The deployed opening film is an edit of the exact requested `.MOV` download, not any previous gateway media. The original remains in Downloads with unchanged SHA-256 `674ddcf1e1069b45408b9c3cb2daade6fff7d63b55b6b782f16c0c436221f8ad`. Its 23.566667-second 1920×1080 source was inspected before integration. The silent 14.7-second edit uses a 1.2-second crossfade and a matching source trajectory at the loop join. Actual exports: **1920×1080 / 7,704,682 bytes desktop**, **1280×720 / 3,662,605 bytes mobile**. The full composition is preserved on mobile. The separate official logo and interface remain crisp. [Full provenance and inspection](PROVENANCE.md).

Verification passed TypeScript, lint, build, five static integrity tests, 40 existing platform unit regressions, and 18 local plus 18 live browser journeys. DE/FR/EN were checked at 1440, 1024, 390 and 350 px. Checks cover playback, pause/play, loop cycling, poster fallbacks, reduced motion, Save-Data, slow connections, unsupported media, autoplay rejection, off-screen pause, quantity/selection persistence and removal, product/basket alignment, navigation, direct reloads, language switching, keyboard menu handling and axe WCAG checks. All 52 live routes matched their emitted documents; all 25 assets matched SHA-256. All 78 output files passed secret/private-fixture scans. No application console/page errors, write requests or backend requests occurred.

The live browser run captured 48 screenshots: gateway, store, lounge and account in every language at every required width. Local artifact links:

| View | Desktop | Mobile |
|---|---|---|
| Gateway | [1440 px](artifacts/screenshots/live-gateway-de-1440.png) | [390 px](artifacts/screenshots/live-gateway-de-390.png) |
| General Store | [1440 px](artifacts/screenshots/live-store-de-1440.png) | [390 px](artifacts/screenshots/live-store-de-390.png) |
| Lounge | [1440 px](artifacts/screenshots/live-lounge-de-1440.png) | [390 px](artifacts/screenshots/live-lounge-de-390.png) |
| Account | [1440 px](artifacts/screenshots/live-account-de-1440.png) | [390 px](artifacts/screenshots/live-account-de-390.png) |

Machine-readable evidence: [live browser results](artifacts/browser-results.json), [HTTP/hash/secret audit](artifacts/live-audit.json), [public performance observations](artifacts/live-performance.json), [unrelated route checks](artifacts/unrelated-routes.json). The screenshots and evidence remain local ignored artifacts; no private fixture was published with them.

Single fresh-context public observations in Chromium: LCP 736 ms desktop, 452 ms mobile and 924 ms poster-only; CLS below 0.000003. These are observed runs from this environment, not broad network/device certification. Actual HTML caching is `max-age=600`; content-hashed media assets report `max-age=14400`. The original approved estate, pouring and spice films remain silent and load only when needed.

Service limitations: no approved hosted Next.js/Supabase account service is configured for this release; the existing backend and provider guards remain local-only/disabled. Authentication, account changes, subscriptions, ordering and payments are therefore unavailable. The public basket saves local selections only. No working provider, stock, sample price or successful account/order/payment state is invented. Tobacco promotion, box customization and private reference access were not expanded.

Higgsfield is available through the authenticated supported integration. Available credits were 102 before and after; **actual credits used: 0**. A cost-only 5-second 1080p Cinema Studio 3.0 estimate returned 50 credits. No job, purchase or subscription change was submitted.

## Exact rollback

The inverse publication patch passed a dry-run check. This fresh-worktree procedure reverts only the single deployment, preserves unrelated later work and never force-pushes:

```sh
cd /Users/adrianvasu/Desktop/V25-Suisse/.local/varathans25-film-publication-20261003
git fetch origin
git worktree add -b rollback/varathans25-film-20261003 ../varathans25-film-rollback-20261003 origin/main
git -C ../varathans25-film-rollback-20261003 revert 72b7c7bdd1de5946c9c4b757be82a3bb651bc684
git -C ../varathans25-film-rollback-20261003 push origin HEAD:main
gh api repos/UNIS25/openatg-site/pages/builds/latest --jq '{status,commit,error}'
```

Wait until Pages reports the new rollback commit as `built`, then verify the gateway and unrelated OpenATG routes. If a later release has edited the same preview files, resolve those conflicts deliberately before pushing.

Remote checkpoints remain `rollback/varathans25-public-before-downloaded-film-20261003` (`1396004`) and `rollback/varathans25-source-before-downloaded-film-20261003` (`54b0203`). The full local Git bundle, source patch, worktree snapshot and original checksum remain under `/Users/adrianvasu/Desktop/V25-Suisse/.local/film-release-20261003/`. No existing worktree or original download was overwritten.
