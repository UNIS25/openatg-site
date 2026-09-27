**Varathans25 final polish — local review**

Refinement branch: `work/varathans25-final-polish`, created directly from the approved `677f72d3a2cb64bdfb6ee132bfc54c90512bf3dc` checkpoint. No merge or deployment was performed.

The approved gateway component is byte-for-byte unchanged. Its original plantation film, poster, logo, typography, language links and destination composition are preserved. Existing tea and spice films and the restaurant photograph match the approved checkpoint. [Preservation evidence](../artifacts/final-polish/preservation.json).

A private PostgreSQL rollback dump was saved at ignored `.local/polish-checkpoint/database.dump` before editing. No reset, seed, existing-account deletion or worktree cleanup was run. Existing review accounts, RLS, CSRF, secure production cookie settings, MFA requirements and audit events remain intact.

**Implemented refinements**

- Catalogue cards share image, title, price, stock and control rows. Mobile titles reserve two lines; quantity and basket controls have consistent dimensions. Duplicate fallback product-name text was removed. Added, disabled, hover and keyboard-focus states are visible. All five teas and curry use the existing backend catalogue and persistent basket.
- The store sequence is tea-pouring film, tea introduction, five tins, restored spice film, curry and one restaurant closing photograph. A compact catalogue/delivery line remains before the closing photograph. The external link is `https://www.varathans25.ch/`, with `target="_blank"` and `rel="noopener noreferrer"`.
- The spice film is the existing `kitchen-1600.mp4` preparation study, documented in [the existing media-rights record](VISUAL_RESET_MEDIA_RIGHTS.md). It makes no claim about the curry's ingredients. No media was downloaded or scraped.
- Silver and Gold account-benefit panels share aligned sections and CTAs. Gold uses navy and antique gold without gradients. Current membership is identified from the authenticated account. The membership-selection page uses the same presentation and the existing local membership activation workflow.
- Prices and discounts come from existing membership-plan records. Default Gold terms remain CHF 69 monthly / CHF 500 annually and 10% eligible-product discount. Standard Swiss delivery remains CHF 10, free from CHF 100 after eligible discounts; Gold retains eligible free delivery. A staging notice accompanies the terms.
- A protected benefit/content editor supports independent DE/FR/EN positioning, delivery wording, drink wording, pass wording, benefits and CTA text, plus spice-film/poster mode and restaurant closing copy/HTTPS URL. Gateway/store/club hero media stay in the existing editorial editor.
- The delivery threshold is now configurable in protected admin settings and used by the authoritative quote, remaining-spend calculation, basket progress, store and product delivery copy. Revision conflicts are rejected. The new content table has RLS, restricted writes, local-write guards and audit triggers.

**Scope limits**

The requested public cigar catalogue, promotional open-box composition, Signature Box/Box-of-4/Box-of-6 previews, tobacco purchase prompts and browsing-confirmation journey were not implemented. Tobacco merchandising and purchase/configuration features are outside the work provided. There are therefore no cigar catalogue or box screenshots. The club remains a neutral account entrance, with separate account-based test verification; tobacco checkout and payments remain disabled.

Silver remains CHF 0 with no recurring charge, enforced by the existing backend constraint. Its fee field remains read-only; this refinement does not introduce a paid Silver plan. Gold fees, ordinary-product discount, delivery fee and delivery threshold are editable. New media uploads remain subject to the existing approved-media workflow; this build restores/selects existing bundled media only.

Saved account/profile preferences persist. Saved cigar configurations are not implemented. Product food-label facts and production prices still require owner confirmation; the six ordinary products remain local-preview drafts and publication guards remain enabled. Email, age verification and payment settlement are explicitly local/test workflows, not successful external-provider integrations.

**Local URLs**

The app is loopback-only at [http://127.0.0.1:4190/](http://127.0.0.1:4190/). German remains the root default.

| Page | DE | FR | EN |
| --- | --- | --- | --- |
| Store | [/de/store](http://127.0.0.1:4190/de/store) | [/fr/store](http://127.0.0.1:4190/fr/store) | [/en/store](http://127.0.0.1:4190/en/store) |
| Tea catalogue | [/de/shop?category=tea](http://127.0.0.1:4190/de/shop?category=tea) | [/fr/shop?category=tea](http://127.0.0.1:4190/fr/shop?category=tea) | [/en/shop?category=tea](http://127.0.0.1:4190/en/shop?category=tea) |
| All six products | [/de/shop](http://127.0.0.1:4190/de/shop) | [/fr/shop](http://127.0.0.1:4190/fr/shop) | [/en/shop](http://127.0.0.1:4190/en/shop) |
| Club account entrance | [/de/club](http://127.0.0.1:4190/de/club) | [/fr/club](http://127.0.0.1:4190/fr/club) | [/en/club](http://127.0.0.1:4190/en/club) |
| Member area | [/de/club/member](http://127.0.0.1:4190/de/club/member) | [/fr/club/member](http://127.0.0.1:4190/fr/club/member) | [/en/club/member](http://127.0.0.1:4190/en/club/member) |

[Protected administration](http://127.0.0.1:4190/admin): **Settings → Benefits & store closing**; numeric fee/discount/delivery controls are above that editor. Existing hero controls are under **Media**. [Mailpit](http://127.0.0.1:58534) retains local confirmation/recovery emails.

**Screenshots**

All screenshots remain ignored local artifacts. The capture script is committed for repeatable review.

| View | 1440 desktop | 1024 tablet | 390 mobile | 350 narrow |
| --- | --- | --- | --- | --- |
| Approved gateway | [PNG](../artifacts/final-polish/gateway-desktop.png) | [PNG](../artifacts/final-polish/gateway-tablet.png) | [PNG](../artifacts/final-polish/gateway-mobile.png) | [PNG](../artifacts/final-polish/gateway-narrow.png) |
| Store | [PNG](../artifacts/final-polish/store-desktop.png) | [PNG](../artifacts/final-polish/store-tablet.png) | [PNG](../artifacts/final-polish/store-mobile.png) | [PNG](../artifacts/final-polish/store-narrow.png) |
| Tea alignment | [PNG](../artifacts/final-polish/tea-desktop.png) | [PNG](../artifacts/final-polish/tea-tablet.png) | [PNG](../artifacts/final-polish/tea-mobile.png) | [PNG](../artifacts/final-polish/tea-narrow.png) |
| Six-product catalogue | [PNG](../artifacts/final-polish/catalogue-desktop.png) | [PNG](../artifacts/final-polish/catalogue-tablet.png) | [PNG](../artifacts/final-polish/catalogue-mobile.png) | [PNG](../artifacts/final-polish/catalogue-narrow.png) |
| Spice film | [PNG](../artifacts/final-polish/spice-desktop.png) | [PNG](../artifacts/final-polish/spice-tablet.png) | [PNG](../artifacts/final-polish/spice-mobile.png) | [PNG](../artifacts/final-polish/spice-narrow.png) |
| Curry | [PNG](../artifacts/final-polish/curry-desktop.png) | [PNG](../artifacts/final-polish/curry-tablet.png) | [PNG](../artifacts/final-polish/curry-mobile.png) | [PNG](../artifacts/final-polish/curry-narrow.png) |
| Restaurant closing | [PNG](../artifacts/final-polish/restaurant-desktop.png) | [PNG](../artifacts/final-polish/restaurant-tablet.png) | [PNG](../artifacts/final-polish/restaurant-mobile.png) | [PNG](../artifacts/final-polish/restaurant-narrow.png) |
| Silver/Gold comparison | [PNG](../artifacts/final-polish/comparison-desktop.png) | [PNG](../artifacts/final-polish/comparison-tablet.png) | [PNG](../artifacts/final-polish/comparison-mobile.png) | [PNG](../artifacts/final-polish/comparison-narrow.png) |
| Member sign-in requirement | [PNG](../artifacts/final-polish/member-sign-in-desktop.png) | [PNG](../artifacts/final-polish/member-sign-in-tablet.png) | [PNG](../artifacts/final-polish/member-sign-in-mobile.png) | [PNG](../artifacts/final-polish/member-sign-in-narrow.png) |
| Signed-in member | [PNG](../artifacts/final-polish/member-desktop.png) | [PNG](../artifacts/final-polish/member-tablet.png) | [PNG](../artifacts/final-polish/member-mobile.png) | [PNG](../artifacts/final-polish/member-narrow.png) |
| Admin benefit editor | [PNG](../artifacts/final-polish/admin-benefits-desktop.png) | [PNG](../artifacts/final-polish/admin-benefits-tablet.png) | [PNG](../artifacts/final-polish/admin-benefits-mobile.png) | [PNG](../artifacts/final-polish/admin-benefits-narrow.png) |

**Verification**

| Check | Result |
| --- | --- |
| Production build, TypeScript, ESLint | Pass |
| Unit tests | 34 passed |
| Backend integration | 35 passed |
| Database security checks | 30 passed |
| Browser matrix + targeted rechecks | 89 distinct cases passed |
| Product geometry | Equal card heights and same-row image/title/price/quantity/button positions in DE/FR/EN at 1440, 1024, 390 and 350 px |
| Ordinary-product basket | All six products incremented/decremented and added; basket persisted across reload |
| Delivery | CHF 99.99 / CHF 100.00 boundary and discount-before-threshold checks; configurable threshold/remaining amount verified |
| Motion and access | Keyboard journeys, reduced motion, Save-Data with no film requests and autoplay rejection passed |
| Accessibility | No axe WCAG A/AA violations in tested pages |
| Accounts | Registration, Mailpit confirmation, recovery, session persistence, all three profile languages, address persistence, test verification states and Gold test activation passed |
| Commerce and administration | Ordinary-product order, history, price/product/translation administration, reconciliation and fulfillment passed |
| Membership and privacy | Current tier, digital pass, staff drink redemption, export, deletion request, owner MFA and audit checks passed |
| Preservation and safety | Approved gateway and assets unchanged; production flags disabled; staged secrets scan and browser-bundle scan passed |

The first full browser matrix passed 87/89 cases. Two selectors required updates for the restored second store video and separate profile/password forms. The profile recheck then exposed a real membership-readiness race, which could redirect a signed-in member to registration. Selection buttons now wait for account initialization. The complete profile/address/Gold activation journey and membership layouts at all four widths passed afterward. Original logs are retained.

Evidence: [consolidated results](../artifacts/final-polish/test-results.json), [full browser log](../artifacts/final-polish/browser.log), [motion recheck](../artifacts/final-polish/browser-recheck.log), [membership recheck](../artifacts/final-polish/membership-recheck.log), [backend](../artifacts/final-polish/integration.log), [unit](../artifacts/final-polish/unit.log), [database](../artifacts/final-polish/database.log), [build](../artifacts/final-polish/build.log), [typecheck](../artifacts/final-polish/typecheck.log), [lint](../artifacts/final-polish/lint.log), [safety](../artifacts/final-polish/safety.log), [staged secret scan](../artifacts/final-polish/secret-check.json).

**Changed files**

| File relative to `platform/` | Purpose |
| --- | --- |
| `docs/FINAL_POLISH_REVIEW.md` | Review scope, URLs, evidence and limits. |
| `scripts/polish-review-capture.mjs` | Repeatable clean screenshots at all four widths. |
| `playwright.config.ts` | Include refinement and protected-admin tests. |
| `src/app/api/admin/polish/route.ts` | CSRF-, role- and schema-checked editor endpoint. |
| `src/app/api/catalogue/route.ts` | Return safe refinement settings alongside existing catalogue/plans. |
| `src/app/experience.css` | Scoped aligned product rows, restored chapters and tier panels. |
| `src/components/admin.tsx` | Add benefit/content editor and delivery-threshold field. |
| `src/components/final-experience.tsx` | Restored store chapters, tier composition and configured member benefits; gateway unchanged. |
| `src/components/membership-comparison.tsx` | Reusable Silver/Gold panels with current-tier and local selection states. |
| `src/components/platform.tsx` | Configuration context, product controls/added state and dynamic delivery wording. |
| `src/components/polish-admin.tsx` | Independent DE/FR/EN benefit and closing-section editor. |
| `src/lib/client.ts` | Typed delivery-threshold field. |
| `src/lib/polish.ts` | Validated refinement configuration and independent translations. |
| `supabase/migrations/202609280017_final_polish.sql` | Add guarded/audited content settings and configurable delivery threshold without resetting data. |
| `tests/backend.integration.ts` | Authorization, content validation, audit, revision and configurable-threshold checks. |
| `tests/browser-helpers.ts` | Scope header geometry checks to the page header. |
| `tests/final-experience.spec.ts` | Assert the newly requested single restaurant chapter and spice film; capture current branch. |
| `tests/polish-admin.spec.ts` | Benefit editing, current tier, profile languages, addresses and test membership activation. |
| `tests/resilience.spec.ts` | Check that neither store film loads under Save-Data or reduced motion. |
| `tests/polish.spec.ts` | Card geometry, all-product basket changes, restored chapters, membership alignment and media preferences. |

The final commit and remote verification are stored in ignored `artifacts/final-polish/commit.json` and included in the delivery message. Credentials, screenshots, logs and database backups are excluded from Git.
