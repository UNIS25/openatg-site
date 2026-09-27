# Visual reset — first visual approval gate

Base checkpoint: `8862006895050f0d82c8522c77c769a315824075`, unchanged.
Branch: `work/varathans25-visual-reset`.
Local proof: `http://127.0.0.1:4191/visual-reset/`.

This change adds a separate English visual-proof route, new scoped styles, licensed stock derivatives and capture/check scripts. Existing platform routes, backend/auth/payment/admin/database files and the older Pages storefront are untouched. This is not a new functional-platform implementation or a deployment.

The approval set is deliberately limited to the homepage at desktop and mobile sizes and the desktop account-invitation composition. A language entrance and separate club page have not been built; they wait for the user's visual approval.

## Composition

- A single genuine Sri Lankan aerial shot fills the opening. Original Varathans25 logo, minimal floating navigation, confident serif typography and two actions. The logo pixels are unchanged; an ivory ground preserves its original maroon/gold legibility.
- Quiet white space between chapters; genuine tea pouring and mortar-and-pestle footage.
- Five original tea tins appear after the opening and tea story, with no shop controls.
- The unchanged curry image appears in the pantry presentation.
- Candlelit stock footage changes the tonal register before an actual restaurant photograph.
- The split invitation uses that restaurant still and a navy account-information panel. No false age-verification assertion, tobacco sales or benefits promotion.
- Navigation and films work on mobile, including a separately framed portrait film. No photo motion, page-entry animation, scroll lock, scroll-jacking or autoplay audio.

## View and capture

From `platform/`:

```sh
npm run build
npx next start --hostname 127.0.0.1 --port 4191
```

In a second terminal:

```sh
node scripts/visual-reset-proof.mjs
node scripts/visual-reset-record.mjs
```

The first script captures desktop 1440 × 900, tablet 1024 × 768 and mobile 390 × 844 views, and checks 320px overflow. It checks actual advancing video frames, correct mobile source, accessible pause, only one active film, static reduced-motion / Save-Data fallbacks, no backend requests, intact imagery, popup keyboard focus/close/restore, direct reloads, axe WCAG A/AA and console errors.

Screenshots, the verification JSON and the genuine 1440 × 900 browser recording are ignored artifacts under `platform/artifacts/visual-reset/`. Recording smooth scrolling is only in the capture script; normal user scrolling is native. The recording contains actual video playback and browser interaction, not a simulated or composited render.

## Media and performance

See [VISUAL_RESET_MEDIA_RIGHTS.md](VISUAL_RESET_MEDIA_RIGHTS.md). H.264 / MP4, 24 fps, no audio tracks; excerpts of 16, 14, 8 and 10 seconds. Separate mobile portrait encodes. Actual-frame WebP posters. WebM is not needed for this short H.264 review set.

Videos start loading only when at least 56% of their chapter is visible. Offscreen playback pauses, as does playback behind either dialog or in a hidden tab. Data-saving, slow-connection and reduced-motion users get a still edition without video requests. Fixed full-viewport sections prevent poster/video dimension shifts. No outside media hosts, tracking or new CSP exceptions.

Local measurements are in `artifacts/visual-reset/verification.json`; they are not public-network or field performance scores. Initial navigation loads only the aerial film. Below-fold films load as their chapters become visible.

## Safety and rollback

No merge, production deployment, DNS edit, secret changes or backend work. The functional checkpoint and production branch remain untouched. To leave the proof and return to the exact original cinematic checkpoint without rewriting history:

```sh
git switch work/varathans25-cinematic-platform
```

That original branch must still resolve to `8862006895050f0d82c8522c77c769a315824075`. No reset or forced push is required. The proof server is bound to loopback only.

## Results from this proof

- Production build, TypeScript and ESLint passed.
- Existing unit suite: 34 passed. No database migration or backend mutation suite was run during this visual-only pass.
- Dedicated browser script: 29 checks passed, including six axe WCAG A/AA scans (desktop, tablet and mobile home + invitation).
- Zero page errors, console errors or backend API requests in the proof journeys.
- Decoding-failure fixture preserves the poster; reduced-motion and Save-Data make no video requests.
- Actual source-video time advances on desktop, tablet and mobile. Off-screen films pause and dialog focus cycles correctly.
- Original logo, product images, static Pages tree and all existing platform source files are unchanged.

| Film | Duration | Desktop H.264 bytes | Portrait mobile H.264 bytes | WebP poster bytes |
| --- | ---: | ---: | ---: | ---: |
| Highlands | 16 s | 4,458,860 | 1,626,888 | 253,782 |
| Tea | 14 s | 1,692,832 | 1,402,241 | 36,760 |
| Kitchen | 8 s | 1,128,060 | 633,360 | 89,500 |
| Evening | 10 s | 1,209,478 | 195,778 | 35,538 |

Fresh-context, unthrottled loopback Chromium observation: desktop LCP 92 ms / CLS 0.000144; mobile viewport LCP 68 ms / CLS 0.000011. These are local observations, **not** a field benchmark or a claim about real mobile networks. The tiny measured layout shifts include initial font/layout settling. Public release requires realistic network and device testing after the visual direction is approved.
