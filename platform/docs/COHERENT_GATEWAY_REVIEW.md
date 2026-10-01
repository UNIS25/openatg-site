# Coherent gateway and General Store review

This is the current local owner-review implementation. It has not been published, merged or represented as a production backend.

## Source and preservation

Selected directory: `/Users/adrianvasu/Desktop/V25-Suisse/.local/varathans25-premium-club-platform/platform`.

Starting branch: `work/varathans25-restricted-reference-collection`, commit `6ea690f87f68c50eba85990108e7d6c158bc23ee`. Independent branch, worktree, commit and reflog review identified this as the newest complete implementation in the supplied implementation line. A Git commit does not establish business, media or regulatory approval; those claims were reviewed separately in the repository evidence.

Working branch: `work/varathans25-coherent-gateway-20260929`. Rollback branch: `rollback/varathans25-before-gateway-20260929`, at the starting commit. A complete-history Git bundle was verified under ignored `.local/safety-gateway-20260929/`. The existing local database and environment were backed up there before edits. Dirty sibling worktrees were left intact. No reset, clean, reseed or deletion of preserved work occurred.

## Implemented experience

- German-default gateway using the existing documented evening footage, with the official transparent logo, restrained dimensional CSS, language controls, film controls, keyboard focus and reduced-motion/mobile poster fallback. The original logo already has transparent alpha; the derivative preserves its bytes.
- Connected General Store: plantation film, tea-pouring film, five tea cards, spice film, curry card, restaurant closing and the existing restaurant destination. Cards use repository data and clearly label test prices or missing facts.
- Quantity controls and persistent basket; guest tea/curry checkout, optional Silver or Gold journeys, localized order instructions and protected test QR downloads.
- Guest checkout uses an anonymous server quote even when a Gold member is signed in, so the displayed delivery and discount match the guest order. A browser regression covers the journey and final amount.
- Public club account entrance with direct collection destination, joining and existing-member links. Language changes preserve route, query and hash. Existing restricted reference collection and its private media remain preserved.
- Ordinary membership is separate from age verification. Silver becomes active after confirmed-account onboarding. Gold requires authorized test-payment settlement before ordinary eligible benefits apply. Restricted passes still revalidate adult status.
- Atomic server-priced guest test orders, inventory locks, idempotency, unique RF references, pending payment, authorized reconciliation and immutable payment history.
- Durable order-received and payment-confirmed notification intents with an explicit `not_configured` state and an administrator view. No email delivery is claimed.

Selected assets and rights limits are recorded in [GATEWAY_MEDIA_RIGHTS.md](GATEWAY_MEDIA_RIGHTS.md). The evening footage is candlelit stock, not actual Varathans25 lounge or cigar footage. Actual venue film is a future replacement slot.

## Restricted and production boundaries

Tobacco purchasing, a purchasable box customizer, cigar order creation and tobacco payment integration are excluded because assistance implementing tobacco commerce is unavailable. Existing factual, restricted read-only references remain intact. The repository also lacks confirmed cigar prices, inventory, an approved production identity provider and adult-delivery configuration. A session checkbox is not identity verification and is not used to open the reference collection.

Age review remains explicitly local test review. No identity-document upload path has been added. No local administrator decision is presented as genuine production verification.

Every QR output is **TEST — NOT PAYABLE**, uses a published sample account and is a preview PDF rather than a certified production QR-bill layout. Production writes, live payments, subscriptions and cigar checkout fail closed. No card provider was activated.

Required production banking inputs: validated regular IBAN plus SCOR reference agreement, or a validated QR-IBAN plus a separately implemented QRR reference scheme; creditor legal name, street, house number, postal code, city and country; bank acceptance and Swiss QR-bill layout validation. No merchant banking fields were invented.

Other external inputs: approved dynamic Next.js hosting and HTTPS domain; a separate hosted Supabase project with encrypted environment configuration; an approved identity-verification provider and retention policy; verified sender domain, email provider credentials and verified customer-support contact; owner-confirmed food facts, sizes, selling prices and inventory; final benefit terms and media rights confirmation. These inputs require production integration and acceptance checks before publication. The existing fail-closed implementation does not become production commerce merely by adding credentials.

## Verification and current environment limit

Before workspace permissions changed, 40 unit tests, 43 database assertions and 49 integration tests passed. Browser verification exercised DE/FR/EN and 1440, 1024, 390 and 350 px; gateway/store/club screenshots were reviewed visually. The initial full browser run found outdated route assertions and an intermittent administrator-tab contrast finding. Corrected registration, club and narrow layouts passed targeted reruns. A final full sweep did not leave a complete final result.

On 30 September 2026, the continuation reran the production build, TypeScript, lint, all 40 unit tests, whitespace checks, media/reference preservation and secret/release checks successfully. The final secret scan checks six configured secret values against source candidates and browser bundles without printing them. Next.js and its ESLint configuration were upgraded from 16.3.5 to 16.3.8 after the [ImageResponse security advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) appeared in the fresh audit; the full dependency audit still reports zero vulnerabilities.

The continuation made actual local service attempts. Docker socket access and local Supabase connections are denied by the current managed runtime. Supabase CLI migration listing and database tests fail before connecting because the CLI cannot write its telemetry file. All 49 integration tests fail at local connection/setup. The standard browser command cannot probe its existing web server; a second complete run against the already-running application attempts all 127 tests, and every Chromium launch is denied at the macOS Mach-port handshake. No page opens in that run, so console, accessibility, image, navigation and authenticated journey checks are not marked passed. Saved gateway/store/club captures were visually reviewed at 1440, 1024, 390 and 350 px; these are historical captures, not fresh browser results.

Migration `202609300026_guest_server_boundary.sql`, which restricts guest order creation to the server service role, is prepared but remains unapplied. The live migration ledger could not be revalidated. Neither the existing-database migration test nor isolated clean-database test has passed. Three database privilege assertions cover the boundary once it can run. No reset, seed, migration repair, database deletion or successful database write occurred in this continuation.

Before continuation edits, an additional source patch and a checksum-verified archive of all 40 then-modified/new source files were saved under ignored `.local/continuation-checkpoint-20260930T180053Z/`. The original bundle verifies with complete history. The saved environment remains byte-identical to its preserved backup, the private test-account file remains present with mode 0600, and the database backup checksum is unchanged. Live account/database integrity remains unverified because service access is denied.

No commit or push is claimed: the user requires all checks to pass before committing, and the current environment prevents completion of the remaining gates. Git metadata also lives outside the writable workspace. Shell GitHub lookup fails at DNS resolution; the read-only GitHub connector returns no matching remote branch. No production deployment was attempted.

## Local review and safe rollback

The rebuilt loopback app is running from `npm start` on `127.0.0.1:4190` (Node PID 46735 at verification). Existing Docker Desktop listeners remain on local Supabase ports 58531 and 58532; their service/database health could not be queried. Keep the app process and Docker Desktop/Supabase services running. Automatic opening of the five review URLs was attempted; Launch Services returned error -10661.

In a runtime with Docker, local network and CLI configuration access, first use the [Supabase migration-list command](https://supabase.com/docs/reference/cli/supabase-migration-list) to verify that only version `202609300026` is pending. Then use the [additive migration-up command](https://supabase.com/docs/reference/cli/supabase-migration-up). These commands apply pending migrations without invoking the project's reset/seed scripts:

```sh
node_modules/.bin/supabase migration list --local --network-id varathans25-premium-loopback
```

After inspecting the ledger and confirming the single expected pending version:

```sh
node_modules/.bin/supabase migration up --local --network-id varathans25-premium-loopback
npm run test:db
npm run test:integration
npm run test:e2e
```

The clean-database gate must use a separate Supabase project identifier, separate ports and fresh volumes. Never point a clean-database/reset command at this preserved project. All browser, security, source and build gates must pass before commit and push.

Routes: `/` and `/de/` gateway; `/de/store` General Store; `/de/club` club entrance; `/de/register` registration; `/de/login` login; `/de/admin` protected administration. Replace `de` with `fr` or `en` for the other languages.

To inspect the rollback without changing this working directory, run from this directory in an environment with Git metadata write access:

```sh
git bundle verify .local/safety-gateway-20260929/varathans25-6ea690f.bundle
git worktree add /tmp/varathans25-rollback-6ea690f rollback/varathans25-before-gateway-20260929
```

Keep the saved environment, database dump, accounts and screenshots private. Database recovery should use a separate database rather than overwrite the preserved local database.
