**Varathans25 local experience review**

The local gateway, tea/curry store and private account entrance are implemented on `work/varathans25-final-experience`, based on the newer filmed implementation `50136866001ac6d98f4cff77dd3989ae4f3f85b8`. The older `8862006` photographic study was not used as the starting point. This is a local, non-payable review build. Nothing has been merged or deployed.

The tobacco product presentation, tobacco craft film and Box-of-4 / Box-of-6 cigar configurators were not implemented. Accordingly there are no customizer screenshots or saved cigar configurations in the new member dashboard. The club uses the existing documented candlelight film for a neutral account entrance. Tobacco purchases and payments remain disabled.

**Source and data preservation**

- Inspected all local branches, all 11 registered worktrees and the reflogs. `5013686` was the newest filmed local implementation matching the requested direction.
- Preserved the dirty static-review worktree and the stale worktree registration without modification or pruning.
- Created rollback branch `rollback/varathans25-before-final-20260927T185605Z` at `5013686` before editing.
- Saved branch/worktree/reflog records and a PostgreSQL custom-format dump under ignored `.local/final-checkpoint-20260927T185605Z/`. The dump is private and must remain outside Git.
- The original logo, plantation film, tea-pouring film and `/visual-reset` source are byte-for-byte unchanged.
- No database reset or seed command was run. Existing review credentials and accounts were retained. Browser write journeys use new test identities; new test orders and audit events remain available locally.
- Local `main` remains `e58fce5`; the recorded `origin/main` reference remains `ad68020`. Neither was modified, merged or deployed.

**Local URLs**

The loopback-only app runs at `http://127.0.0.1:4190`.

| Experience | German | French | English |
| --- | --- | --- | --- |
| Gateway | [Default /](http://127.0.0.1:4190/), [/de/](http://127.0.0.1:4190/de/) | [/fr/](http://127.0.0.1:4190/fr/) | [/en/](http://127.0.0.1:4190/en/) |
| Store | [/de/store](http://127.0.0.1:4190/de/store) | [/fr/store](http://127.0.0.1:4190/fr/store) | [/en/store](http://127.0.0.1:4190/en/store) |
| Catalogue | [/de/shop](http://127.0.0.1:4190/de/shop) | [/fr/shop](http://127.0.0.1:4190/fr/shop) | [/en/shop](http://127.0.0.1:4190/en/shop) |
| Club account entrance | [/de/club](http://127.0.0.1:4190/de/club) | [/fr/club](http://127.0.0.1:4190/fr/club) | [/en/club](http://127.0.0.1:4190/en/club) |
| Protected member area | [/de/club/member](http://127.0.0.1:4190/de/club/member) | [/fr/club/member](http://127.0.0.1:4190/fr/club/member) | [/en/club/member](http://127.0.0.1:4190/en/club/member) |
| Login | [/de/login](http://127.0.0.1:4190/de/login) | [/fr/login](http://127.0.0.1:4190/fr/login) | [/en/login](http://127.0.0.1:4190/en/login) |

Other review destinations: [tea catalogue](http://127.0.0.1:4190/de/shop?category=tea), [product detail](http://127.0.0.1:4190/de/product/premium-black-tea-powder), [basket](http://127.0.0.1:4190/de/bag), [account](http://127.0.0.1:4190/de/account), [protected administration](http://127.0.0.1:4190/admin), [Mailpit](http://127.0.0.1:58534), and [preserved filmed proof](http://127.0.0.1:4190/visual-reset).

**Review images and recording**

These files are local artifacts and are intentionally excluded from the feature branch.

| Page | 1440 desktop | 1024 tablet | 390 mobile | 350 narrow mobile |
| --- | --- | --- | --- | --- |
| Gateway | [PNG](../artifacts/final-experience/gateway-desktop.png) | [PNG](../artifacts/final-experience/gateway-tablet.png) | [PNG](../artifacts/final-experience/gateway-mobile.png) | [PNG](../artifacts/final-experience/gateway-narrow.png) |
| Store | [PNG](../artifacts/final-experience/store-desktop.png) | [PNG](../artifacts/final-experience/store-tablet.png) | [PNG](../artifacts/final-experience/store-mobile.png) | [PNG](../artifacts/final-experience/store-narrow.png) |
| Tea catalogue | [PNG](../artifacts/final-experience/tea-desktop.png) | [PNG](../artifacts/final-experience/tea-tablet.png) | [PNG](../artifacts/final-experience/tea-mobile.png) | [PNG](../artifacts/final-experience/tea-narrow.png) |
| Complete catalogue | [PNG](../artifacts/final-experience/catalogue-desktop.png) | [PNG](../artifacts/final-experience/catalogue-tablet.png) | [PNG](../artifacts/final-experience/catalogue-mobile.png) | [PNG](../artifacts/final-experience/catalogue-narrow.png) |
| Club account entrance | [PNG](../artifacts/final-experience/club-desktop.png) | [PNG](../artifacts/final-experience/club-tablet.png) | [PNG](../artifacts/final-experience/club-mobile.png) | [PNG](../artifacts/final-experience/club-narrow.png) |
| Signed-in member dashboard | [PNG](../artifacts/final-experience/member-desktop.png) | [PNG](../artifacts/final-experience/member-tablet.png) | [PNG](../artifacts/final-experience/member-mobile.png) | [PNG](../artifacts/final-experience/member-narrow.png) |

[24.52-second gateway → store and gateway → club screen recording](../artifacts/final-experience/gateway-store-club.mp4). The capture and recording scripts are committed for repeatable local review.

**Implemented behavior**

The gateway has exactly one viewport, the original identity, localized minimal copy, a DE/FR/EN selector, two destination links and account access. The store has a different tea-pouring film, five tea tins, the curry chapter, a complete-catalogue link and Swiss delivery information. There is no restaurant image on these routes. Language switching retains routes, product slugs, catalogue filters and the club sign-in destination. Logos return to the localized gateway.

Product cards use backend prices and availability, consistent image ratios, quantity controls and functional basket/detail links. Product details expose confirmed food information only. The catalogue contains exactly the approved five tins and curry; coffee remains excluded. Guest baskets transfer at sign-in. Member baskets wait for authentication before accepting additions; pending changes survive navigation, and intentionally empty baskets stay empty.

Basket totals come from the same server calculation as checkout, including discounts, integer-rappen rounding and the CHF 100.00 standard Swiss delivery threshold. Existing Gold benefits remain intact. Tea and curry test checkout, non-payable QR documents, history, account recovery, profile/address editing and order management use the existing backend.

The neutral club entrance links to registration and sign-in, states 18+, and distinguishes this notice from verification. Its dashboard requires an active, verified account and displays the member, tier, verification, digital pass, renewal status, configured ordinary-product benefits, recorded drink redemptions and links to orders/account/privacy. Guests receive an access screen without member data.

The existing product admin now also controls product order. The editorial admin saves independent DE/FR/EN gateway, store chapter and club account copy with revision checks and audit events. Hero media controls select documented bundled film/poster pairs or poster-only mode. Arbitrary new film uploads and independent poster replacement are not part of this build; the existing private media quarantine and approval constraints remain intact.

**Preview values and publication blockers**

The user authorized temporary values. Existing tea fixture prices were retained and curry was assigned CHF 12.90 for this local review:

| Product | Preview CHF |
| --- | ---: |
| Premium Black Tea Powder | 16.90 |
| Green Tea Powder | 17.90 |
| Masala Tea Powder | 12.90 |
| Cinnamon Tea | 13.90 |
| Cardamom Tea | 11.90 |
| Gelber Curry Kokos | 12.90 |

These are not confirmed production prices. Verified label data is still absent: descriptions, ingredients, allergens, nutrition, weight, origin, preparation and storage require confirmation. No food facts were invented. All six products remain drafts. Publication now rejects missing confirmations, price, image, inventory confirmation, mandatory language content and preparation information; JSON null/arrays cannot satisfy nutrition requirements. Database row ownership, privileged-role MFA requirements, audit triggers and all existing production/payment locks are retained.

**Verification**

| Check | Result |
| --- | --- |
| Production build, route type generation, TypeScript and ESLint | Pass |
| Unit tests | 34 passed |
| Backend integration | 33 passed |
| Database security checks | 30 passed |
| Browser matrix and final targeted recheck | 66 distinct cases passed |
| Screens | 1440×1000, 1024×1000, 390×844, 350×780 |
| Accessibility | No axe WCAG A/AA violations in tested pages; keyboard-only navigation/purchase journey passed |
| Video | Pause/play, mobile poster, reduced motion, Save-Data with no film requests, and autoplay rejection passed |
| Delivery | CHF 99.99 charged standard delivery; CHF 100.00 unlocked it; discount-before-threshold checks passed |
| Accounts | DE/FR/EN Mailpit confirmation, sign-in/out, recovery, addresses, TOTP, pass and redemption checks passed |
| Commerce | Persistent/merged/empty baskets, tea + curry order, QR download, admin reconciliation and fulfillment passed |
| Privacy | Own-account export and deletion request passed; exports paginate and explicitly scope order/cart children |
| Safety | No browser errors in successful journeys; live flags disabled; client bundles and changed content scanned for secrets |

The initial full browser matrix had two failures caused by a test locator matching quantity outputs before the order notice appeared. The selector was corrected; checkout and its dependent admin test both passed on recheck. A further guest-to-member/empty-basket regression case also passed. Earlier implementation failures in mobile flex layout, quote rate configuration and basket initialization were fixed before the final successful checks. Original logs are retained rather than overwritten with a misleading all-green first-run claim.

Evidence: [consolidated browser cases](../artifacts/final-experience/test-results.json), [matrix log](../artifacts/final-browser.log), [final account recheck](../artifacts/final-browser-account-recheck.log), [unit log](../artifacts/final-unit.log), [backend log](../artifacts/final-integration.log), [database log](../artifacts/final-database.log), [safety check](../artifacts/final-safety.log), [secret scan](../artifacts/final-experience/secret-check.json).

**Changed-file report**

| File (relative to `platform/`) | Change |
| --- | --- |
| [docs/FINAL_EXPERIENCE_REVIEW.md](../docs/FINAL_EXPERIENCE_REVIEW.md) | Review scope, preservation record, URLs, artifacts, limitations and test evidence. |
| [playwright.config.ts](../playwright.config.ts) | Final route matrix, narrow-mobile project and resilience coverage. |
| [scripts/final-review-capture.mjs](../scripts/final-review-capture.mjs) | Repeatable local screenshots at four widths. |
| [scripts/final-review-recording.mjs](../scripts/final-review-recording.mjs) | Local browser journey recording and MP4 export. |
| [src/app/[locale]/[[...segments]]/page.tsx](../src/app/[locale]/[[...segments]]/page.tsx) | Store, catalogue and protected member routes. |
| [src/app/api/editorial/route.ts](../src/app/api/editorial/route.ts) | Final editorial defaults and safe poster-only fallback. |
| [src/app/api/quote/route.ts](../src/app/api/quote/route.ts) | CSRF-checked, bounded server quote for local guest/member baskets. |
| [src/app/api/state/route.ts](../src/app/api/state/route.ts) | Paginated privacy export, own child-row scoping and recent order sorting. |
| [src/app/experience.css](../src/app/experience.css) | Preserved cinematic visual direction adapted to the separate final routes. |
| [src/app/layout.tsx](../src/app/layout.tsx) | Final styles and server-rendered locale. |
| [src/components/cinematic.tsx](../src/components/cinematic.tsx) | Preserve the old implementation; initialize new media settings safely. |
| [src/components/editorial-admin.tsx](../src/components/editorial-admin.tsx) | Independent DE/FR/EN final copy and documented film/poster settings. |
| [src/components/final-experience.tsx](../src/components/final-experience.tsx) | Gateway, store chapters, accessible films and neutral club/member pages. |
| [src/components/platform.tsx](../src/components/platform.tsx) | Route composition, catalogue/detail presentation, basket persistence and server totals. |
| [src/legacy-admin/admin-messages.json](../src/legacy-admin/admin-messages.json) | Localized product order and publication validation messages. |
| [src/legacy-admin/domain.ts](../src/legacy-admin/domain.ts) | Product display-order field. |
| [src/legacy-admin/products.tsx](../src/legacy-admin/products.tsx) | Editable product display order. |
| [src/lib/cart.ts](../src/lib/cart.ts) | Validate local baskets, merge guests and retain account-specific pending changes. |
| [src/lib/cinematic.ts](../src/lib/cinematic.ts) | Validate the additive final editorial configuration. |
| [src/lib/client.ts](../src/lib/client.ts) | Reuse CSRF responses and retain cart requests across navigation. |
| [src/lib/domain.ts](../src/lib/domain.ts) | Typed verified product facts, gallery, stock and promotion fields. |
| [src/lib/experience.ts](../src/lib/experience.ts) | DE/FR/EN copy, labels and approved-media configuration schema. |
| [src/lib/messages.ts](../src/lib/messages.ts) | Customer-facing basket terminology. |
| [src/proxy.ts](../src/proxy.ts) | Pass the route locale to server-rendered HTML without changing CSP protections. |
| [supabase/migrations/202609280014_final_experience.sql](../supabase/migrations/202609280014_final_experience.sql) | Add product order, safe public projection, preview curry price, publication and editorial validation. |
| [supabase/migrations/202609280015_preview_quote.sql](../supabase/migrations/202609280015_preview_quote.sql) | Local-only quote RPC with existing calculation and tobacco rejection. |
| [supabase/migrations/202609280016_publication_nutrition_guard.sql](../supabase/migrations/202609280016_publication_nutrition_guard.sql) | Reject null/array nutrition payloads during publication. |
| [tests/accounts.spec.ts](../tests/accounts.spec.ts) | Isolated tea/curry checkout, fulfillment, privacy and guest-basket regression journeys. |
| [tests/backend.integration.ts](../tests/backend.integration.ts) | Guest threshold/tobacco denial and mandatory publication facts. |
| [tests/browser-helpers.ts](../tests/browser-helpers.ts) | Fresh Silver test identities alongside existing helpers. |
| [tests/editorial-admin.spec.ts](../tests/editorial-admin.spec.ts) | Final three-language copy, media controls and revision conflicts. |
| [tests/final-experience.spec.ts](../tests/final-experience.spec.ts) | New route journeys, language retention, media fallbacks and dashboard at all widths. |
| [tests/resilience.spec.ts](../tests/resilience.spec.ts) | Keyboard-only journey, strict autoplay/Save-Data checks and club login return route. |
| [tests/storefront.spec.ts](../tests/storefront.spec.ts) | Retain commerce/admin tests; retire assertions for replaced gateway/club layouts. |

The final commit identifier and push status are recorded in the local artifact `artifacts/final-experience/commit.json` and in the delivery message. No screenshots, recordings, credentials, database dumps or build output are committed.
