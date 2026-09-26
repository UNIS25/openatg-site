# Cinematic platform — private visual review

Source checkpoint: `cfcd90a6b60a1751856f7ed275c32f22b66dfab0`, preserved on `work/varathans25-premium-club-platform`. Work branch: `work/varathans25-cinematic-platform`. Production remains `ad680205287c323005c2e92f0f1ffa514939ec52`. No merge, DNS operation or deployment is authorized or performed.

## Design and boundaries

The language gateway is reduced to the original logo, three immediate language choices, a remembered-language link and one static restaurant poster. Motion is reserved for the homepage so no product montage interrupts language selection. The homepage keeps the established navigation and bright product cards. A single silent opening study leads to the five existing tea tins, existing curry product, a navy evening editorial and genuine project restaurant photographs. The original logo, catalogue, prices, delivery calculations and old static storefront are unchanged.

The club popup is a neutral 18+ editorial/account invitation. It does not advertise cigar collections, discounts or purchasing. Registration and genuine age verification are expressly separate; the current local verification flow is labelled test-only. The popup allows editorial access without registration. Legal wording remains owner-reviewed staging copy, not a claim that membership terms have received legal approval.

## Popup behaviour

- Homepage and club editorial only; no automatic popup on the language gateway, product shopping, account, membership, login, registration, reset, bag or administration pages.
- Opens after 12 seconds on a visible eligible page, unless a form control has focus; deliberately selecting the club entry can open it sooner.
- Named signed-in accounts do not receive the invitation.
- A functional `sessionStorage` dismissal flag contains no identity, marketing identifier or age claim. Dismissal applies across reloads and language changes for that tab session. Blocked storage suppresses the invitation.
- Native modal dialog, accessible title/description, visible close button, Escape/backdrop dismissal, keyboard focus containment, return focus, background scroll lock and movie pause while open.
- Register/login links use the existing same-origin secure journeys. No auth, age, membership or payment state is changed by opening, dismissing or following the popup.

## Media and performance

See [MEDIA_RIGHTS_MANIFEST.md](MEDIA_RIGHTS_MANIFEST.md) and [CINEMATIC_PERFORMANCE.md](CINEMATIC_PERFORMANCE.md). This is an original animated photographic study using existing assets, not approved documentary footage. The existing project media selection is visually approved; written commercial rights documentation remains outstanding. All new motion is explicitly labelled private staging.

Only one cinematic film is present per page. Video elements/sources are withheld for reduced motion, <=760px/coarse-pointer devices, Save-Data, 2G/3G and low battery when the browser exposes that API. Below-fold chapters use lazy still photography. IntersectionObserver pauses off-screen film; hidden pages and open dialogs also pause it. Manual pause survives scrolling. Rejected autoplay leaves the poster and a play control; decoding failure leaves an accessible poster notice. No sound track, tracking player, iframe or third-party media request is included. MP4 H.264 is the fallback, VP9 WebM is used on capable desktop browsers; smaller desktop/tablet selects the 960px MP4.

## Administration and security

Migration `202609270013_editorial_media.sql` adds two RLS tables, audited optimistic-lock settings, protected rights metadata and private quarantine storage. All 12 existing migrations are unchanged. The media admin screen keeps the German-default DE/FR/EN experience and requires the existing owner/administrator permission (including owner AAL2).

Authorised admins can select the supplied study/poster mode, reorder chapters, edit independent DE/FR/EN copy and schedule/disable the invitation. Rights records remain private. Upload/publish processing is a future secured worker boundary, not an unrestricted file upload or a simulated approval control. The production-write and payment guards remain unchanged. A save/reopen race surfaced in the retained product-editor journey: a refreshed list could arrive after the editor reopened a stale product revision. Clearing the stale rows while that list refreshes prevents this, with a delayed-response regression check. The saved image was confirmed in PostgreSQL; no product storage, schema or permissions changed.

CSP adds only explicit `media-src 'self'`; no unsafe directive or external origin is introduced.

## Local review and rollback

Run the existing [local review instructions](LOCAL_REVIEW.md). The same local accounts and database are retained. FFmpeg/ffprobe are needed only to regenerate/verify cinematic files; the committed MP4/WebM/posters are ready to serve.

- Entrance: http://127.0.0.1:4190/
- Homes: http://127.0.0.1:4190/de/ · http://127.0.0.1:4190/fr/ · http://127.0.0.1:4190/en/
- Editorial: http://127.0.0.1:4190/en/club
- Admin: http://127.0.0.1:4190/admin (Media & editorial)

A private local database backup was taken before the additive migration at `platform/.local/cinematic/before-editorial.dump`. Account credentials were not changed. No production rollback is required. Restore the prior application into a separate worktree without deleting review work:

```sh
git worktree add --detach ../varathans25-functional-checkpoint cfcd90a6b60a1751856f7ed275c32f22b66dfab0
```

The additive editorial tables do not need to be dropped to run the prior application. Retain audit history and the private backup. Never restore the local dump into a hosted production database.

## Review gallery and commands

Use a fresh private browser window to review the invitation; dismissal is intentionally remembered for the current tab session. The existing local review accounts and credentials file remain in `platform/.local/review-accounts.json` (ignored, mode 0600). No passwords or member-pass tokens are included in this gallery.

| View | 1440px desktop | 1024px tablet | 390px mobile |
|---|---|---|---|
| Gateway | [Desktop](review/cinematic-platform/entrance-desktop.png) | [Tablet](review/cinematic-platform/entrance-tablet.png) | [Mobile](review/cinematic-platform/entrance-mobile.png) |
| DE homepage | [Desktop](review/cinematic-platform/cinematic-de-desktop.jpg) | [Tablet](review/cinematic-platform/cinematic-de-tablet.jpg) | [Mobile](review/cinematic-platform/cinematic-de-mobile.jpg) |
| FR homepage | [Desktop](review/cinematic-platform/cinematic-fr-desktop.jpg) | [Tablet](review/cinematic-platform/cinematic-fr-tablet.jpg) | [Mobile](review/cinematic-platform/cinematic-fr-mobile.jpg) |
| EN homepage | [Desktop](review/cinematic-platform/cinematic-en-desktop.jpg) | [Tablet](review/cinematic-platform/cinematic-en-tablet.jpg) | [Mobile](review/cinematic-platform/cinematic-en-mobile.jpg) |
| DE invitation | [Desktop](review/cinematic-platform/invitation-de-desktop.jpg) | [Tablet](review/cinematic-platform/invitation-de-tablet.jpg) | [Mobile](review/cinematic-platform/invitation-de-mobile.jpg) |
| FR invitation | [Desktop](review/cinematic-platform/invitation-fr-desktop.jpg) | [Tablet](review/cinematic-platform/invitation-fr-tablet.jpg) | [Mobile](review/cinematic-platform/invitation-fr-mobile.jpg) |
| EN invitation | [Desktop](review/cinematic-platform/invitation-en-desktop.jpg) | [Tablet](review/cinematic-platform/invitation-en-tablet.jpg) | [Mobile](review/cinematic-platform/invitation-en-mobile.jpg) |
| Reduced motion | [Desktop](review/cinematic-platform/cinematic-reduced-desktop.jpg) | [Tablet](review/cinematic-platform/cinematic-reduced-tablet.jpg) | [Mobile](review/cinematic-platform/cinematic-reduced-mobile.jpg) |

Chapter details: [tea](review/cinematic-platform/tea-en-desktop.png), [spice](review/cinematic-platform/spice-en-desktop.png), [evening](review/cinematic-platform/evening-en-desktop.png), [restaurant](review/cinematic-platform/restaurant-en-desktop.png). [Silent 11-second photographic study](../platform/public/varathans25/media/daylight-study-1280.mp4).

From `platform/`, with the existing local stack running:

```sh
npm run typecheck
npm run lint
npm run build
npm test
npm run test:db
npm run test:integration
npm run test:e2e
npm audit
npm run check:production
node scripts/check-cinematic.mjs
node scripts/cinematic-performance.mjs
```

Run performance measurement separately from the browser suite. The browser tests contain real local account/CSRF/RLS/administration journeys, not production-provider simulations presented as live service. Public provider activation is still disabled.

## Verification results

Final production build, TypeScript and lint pass. All **155 tests pass**: 34 unit, 30 PostgreSQL/pgTAP, 31 backend integration and 60 Playwright journeys. No skipped tests or browser retries. The original 35 browser journeys remain, alongside 24 cinematic device/language journeys and one multilingual editorial-admin journey. DE/FR/EN are covered at 1440px, 1024px and 390px, plus the existing smaller-mobile route check. Axe WCAG A/AA checks and browser error collectors report no violations or console/page errors on the tested journeys.

The additive migration was applied to the existing local Supabase stack without resetting accounts. Tests verify member/anonymous/staff denial, owner MFA, revision-conflict protection, audited settings changes, private storage and the requirement for non-null commercial approval evidence. Source checks confirm the original catalogue, logo, static Pages tree, commerce calculations and all previous migrations are unchanged.

Dependency audit: **0 vulnerabilities**. Gitleaks 8.30.1 scanned the entire tracked index snapshot. The unfiltered scan identified three unchanged Next.js public route keys (the literal `davidoff-aniversario-no-3-tubes` in three old static route manifests), not credentials. The narrow AND allowlist in `platform/scripts/gitleaks-cinematic.toml` matches only that exact value in those three files. The reviewed scan reports **0 leaks**. No broad path or rule exclusion was added. Ignored local credentials and the database dump are mode 0600; the built browser chunks also pass the server-secret value scan.

The final local performance samples show CLS **0** in every condition. Desktop WebM is 1,103,718 bytes; tablet MP4 is 795,627 bytes; mobile, reduced-motion and Save-Data load no video. These are loopback review results, not production-network guarantees. See the separate performance report for raw asset sizes and sample methodology.

GitHub Pages remains configured for the legacy `main` root. Its latest build remains `ad680205287c323005c2e92f0f1ffa514939ec52`; the functional source remains `cfcd90a6b60a1751856f7ed275c32f22b66dfab0`. Only the isolated cinematic branch is prepared for push. No live payments, production verification, public media publication, main merge or deployment was performed.

## Changed files

```text
docs/CINEMATIC_PERFORMANCE.md
docs/CINEMATIC_PLATFORM_REVIEW.md
docs/MEDIA_RIGHTS_MANIFEST.md
docs/review/cinematic-platform/cinematic-de-desktop.jpg
docs/review/cinematic-platform/cinematic-de-mobile.jpg
docs/review/cinematic-platform/cinematic-de-tablet.jpg
docs/review/cinematic-platform/cinematic-en-desktop.jpg
docs/review/cinematic-platform/cinematic-en-mobile.jpg
docs/review/cinematic-platform/cinematic-en-tablet.jpg
docs/review/cinematic-platform/cinematic-fr-desktop.jpg
docs/review/cinematic-platform/cinematic-fr-mobile.jpg
docs/review/cinematic-platform/cinematic-fr-tablet.jpg
docs/review/cinematic-platform/cinematic-reduced-desktop.jpg
docs/review/cinematic-platform/cinematic-reduced-mobile.jpg
docs/review/cinematic-platform/cinematic-reduced-tablet.jpg
docs/review/cinematic-platform/entrance-desktop.png
docs/review/cinematic-platform/entrance-mobile.png
docs/review/cinematic-platform/entrance-tablet.png
docs/review/cinematic-platform/evening-en-desktop.png
docs/review/cinematic-platform/invitation-de-desktop.jpg
docs/review/cinematic-platform/invitation-de-mobile.jpg
docs/review/cinematic-platform/invitation-de-tablet.jpg
docs/review/cinematic-platform/invitation-en-desktop.jpg
docs/review/cinematic-platform/invitation-en-mobile.jpg
docs/review/cinematic-platform/invitation-en-tablet.jpg
docs/review/cinematic-platform/invitation-fr-desktop.jpg
docs/review/cinematic-platform/invitation-fr-mobile.jpg
docs/review/cinematic-platform/invitation-fr-tablet.jpg
docs/review/cinematic-platform/restaurant-en-desktop.png
docs/review/cinematic-platform/spice-en-desktop.png
docs/review/cinematic-platform/tea-en-desktop.png
platform/playwright.config.ts
platform/public/varathans25/media/daylight-poster-1280.webp
platform/public/varathans25/media/daylight-poster-mobile.webp
platform/public/varathans25/media/daylight-study-1280.mp4
platform/public/varathans25/media/daylight-study-1280.webm
platform/public/varathans25/media/daylight-study-960.mp4
platform/scripts/check-cinematic.mjs
platform/scripts/cinematic-media.mjs
platform/scripts/cinematic-performance.mjs
platform/scripts/gitleaks-cinematic.toml
platform/src/app/api/admin/editorial/route.ts
platform/src/app/api/editorial/route.ts
platform/src/app/cinematic.css
platform/src/app/layout.tsx
platform/src/components/admin.tsx
platform/src/components/cinematic.tsx
platform/src/components/editorial-admin.tsx
platform/src/components/platform.tsx
platform/src/legacy-admin/products.tsx
platform/src/lib/cinematic-copy.ts
platform/src/lib/cinematic.ts
platform/src/lib/messages.ts
platform/src/proxy.ts
platform/supabase/migrations/202609270013_editorial_media.sql
platform/supabase/tests/editorial.test.sql
platform/tests/accounts.spec.ts
platform/tests/backend.integration.ts
platform/tests/cinematic.spec.ts
platform/tests/cinematic.test.ts
platform/tests/editorial-admin.spec.ts
```
