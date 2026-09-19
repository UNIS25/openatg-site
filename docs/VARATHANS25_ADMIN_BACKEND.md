# Varathans25 administration and backend

## Implementation status and repository boundary

This work is in the isolated branch `work/varathans25-admin-backend`, based on OpenATG `6c80ae4e0b7beb1708d1389a8c6d7c7dafb1b379`. The supplied `/workspace/scratch/91cd31d174c3/openatg-site` does not exist on this machine. Neither available OpenATG checkout nor GitHub contains the requested local commits `0a5a509` and `5cde291`. **Retrieve those commits before integrating or publishing the storefront.** They have not been reset, recreated, replaced or omitted from an attempted push.

The PostgreSQL backend, static administration source, local stack, tests and reusable storefront integration components are implemented here. The approved storefront files remain byte-for-byte unchanged. The new commerce provider is tested in a separate local harness; it has **not** been inserted into the unavailable updated storefront source. The public admin route has not been deployed. This is not a claim of a completed live store.

Checkpoints were taken before edits: `checkpoint/pre-admin-backend-20260920` in both available repositories, plus independent Git bundles under the local V25-Suisse `.local/deployment-checkpoints/` directory. Do not publish those local files.

## Architecture

- GitHub Pages serves `/adminpage/index.html` and its assets. It does not run a database, authenticate passwords, or process orders.
- Supabase Auth provides invited accounts, password authentication, refresh-token rotation and TOTP. No browser password or credential is hardcoded.
- PostgreSQL stores all commerce records. All `v25_*` tables have RLS. Browsers have no table mutation grants. Explicit RPCs validate roles, input, state transitions and revision numbers.
- Private product storage uses bucket `v25-products`. Draft images require product permissions. Published images can obtain 60-second signed URLs. An already-issued URL may remain valid for its short TTL after a product is archived.
- `v25_catalogue()` exposes an explicit projection of active, confirmed, published products. Exact inventory, administrator profiles, private settings and customer records are excluded. `v25_public_settings()` exposes only the customer-facing operational projection needed for delivery and availability.
- Audit triggers record actors, changed field names and status transitions. They do not copy customer records or authentication tokens. No browser can insert, update or delete audit events directly.
- Edge Function `invite-admin` verifies the access token with Auth and calls an owner/MFA-protected RPC before using its server-only service key. `checkout` deliberately returns `503 PAYMENT_PROVIDER_NOT_CONFIGURED` until a reviewed payment and age-provider adapter is supplied.

Relevant Supabase references: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database functions](https://supabase.com/docs/guides/database/functions), [MFA](https://supabase.com/docs/guides/auth/auth-mfa), [Auth users and invitations](https://supabase.com/docs/guides/auth/users), [local configuration](https://supabase.com/docs/guides/local-development/cli/config).

## Roles and sessions

| Capability | Owner, after TOTP | Administrator | Product editor | Order manager |
| --- | --- | --- | --- | --- |
| Product drafts, images, inventory | Yes | Yes | Yes | No |
| Publish products | Yes | Yes | No | No |
| Orders and necessary customer details | Yes | Yes | No | Yes |
| Delivery, contact and VAT settings | Yes | Yes | No | No |
| Payment/tobacco controls and approval references | Yes | No | No | No |
| Audit events | Yes | Yes | No | No |
| Invitations and role changes | Yes | No | No | No |

Every privileged check reads the enabled profile, the Auth session and user ban status. Owner operations additionally require `aal2`. A revoked session or disabled profile loses backend access even if its JWT has not expired. A password-only owner can read their own profile to enroll/verify TOTP, but cannot use the dashboard or privileged operations. Owners cannot change or disable their own profile through the UI.

Admin tokens stay in memory, with automatic refresh, rather than browser localStorage. Reloading `/adminpage/` works and deliberately returns to sign-in. The console signs out after 15 minutes without pointer/keyboard activity. Local Auth has a 15-minute access-token lifetime, refresh-token rotation, eight-hour session timebox and one-hour inactivity limit. Apply equivalent supported settings to the hosted project.

The frontend has no public registration link. Global Auth signup must remain disabled; the email provider must stay enabled so invited users can sign in. Do not set both switches to disabled: tested GoTrue treats the email-specific switch as disabling email login as well.

## Local setup

Prerequisites: Node 22+, npm, Docker. The local project is named `varathans25-commerce`; it uses ports 57431–57434 and 57438 to avoid the other projects found on this machine. Do not stop or reset an unrelated local Supabase project.

```sh
cd commerce
npm ci
npm run backend:start
npm run backend:env
npm run build
npm run build:harness
npm run serve:verification
```

The last command serves `http://127.0.0.1:4175/adminpage/`. The original OpenATG and Varathans25 assets are served from the repository alongside it. `/commerce-test/` is a local-only integration harness with an explicit synthetic-data label; it is never published.

`backend:env` writes local credentials to ignored, mode-0600 `.env.local` without printing them. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are compiled into browser assets. A publishable/anon key is a public identifier, not an authorization bypass. Never prefix a service-role or secret key with `VITE_`.

For Edge Function tests, create ignored `supabase/.env.local` with:

```dotenv
STORE_ORIGIN=http://127.0.0.1:4175
ADMIN_REDIRECT_URL=http://127.0.0.1:4175/adminpage/
```

From the repository root, in another terminal:

```sh
commerce/node_modules/.bin/supabase functions serve --workdir . --env-file supabase/.env.local
```

Local SMTP mail stays in Mailpit at `http://127.0.0.1:57434`. Test accounts use random passwords and `example.invalid` addresses. They and all synthetic orders belong only to the isolated local database. Their ignored fixture file must never be committed or deployed.

## Products and catalogue preservation

Migration `202609200006_preserved_references.sql` preserves 23 Patoro/Davidoff names and the requested seven packet products. They start as drafts, with unconfirmed prices and zero unconfirmed stock. Gelber Curry Kokos keeps its supplied 80 g weight. The verified label information in missing commit `5cde291` is **not available here** and has not been invented.

The original reference catalogue's prices are not treated as confirmed selling prices. No supplier costs, private source documents or legal claims were imported. Publishing requires complete DE/FR/EN names and descriptions, confirmed inventory, SKU, origin, verified price and product information. Food additionally requires weight, nutrition and translated ingredient/allergen/storage fields. Image alt text must be complete in each language.

Products support duplication as drafts, archive/restore, integer-rappen prices, optional promotions, featured/most-picked controls and private preview. Inventory changes require a reason and create a movement; zero can confirm an opening balance without pretending stock arrived. Negative quantities are rejected. Stale edits are rejected using revision numbers.

## Delivery, cigars and orders

`free_delivery_threshold_rappen` is exactly `10000`, enforced by a database check. Standard delivery is calculated from merchandise after discounts and before delivery. At 9,999 rappen the configured charge applies; at 10,000 and above it is zero. An adult-delivery surcharge is calculated separately and is never waived by this threshold. Unknown charges are NULL, never invented as zero.

All money uses integer rappen. CHF input is parsed as decimal text, rather than multiplying floating-point input. Box discounts use integer basis points and default to zero. A box contains exactly four or six selected Patoro/Davidoff cigars. Composition is stored per slot, including repeated cigars. Combined requirements across singles, duplicate selections and multiple boxes are aggregated before stock checks.

`v25_create_order()` is executable only by the service role. It ignores client totals, re-prices from the database, locks stock in consistent order, rejects insufficient stock and stores immutable order-item snapshots. Idempotency keys cannot be reused with changed input. Tobacco orders additionally require a server-written, unexpired age-verification record bound to the customer identity; the entry display confirmation cannot replace it.

Orders move through pending, paid, preparing, dispatched, completed, cancelled and refunded. Paid/refunded confirmation is server-only and checks amount and CHF currency. Fulfilment updates require expected revisions; dispatch requires tracking. Cancellation releases reserved stock once. Refund status can be requested in admin, but a request does not pretend a refund happened. Refunds after dispatch do not automatically restock returned goods; use a reasoned inventory adjustment when goods are actually received.

CSV exports contain order number, date, state, total and refund state, not customer contact details. Formula-like cells are escaped. Each exported page is logged.

## Storefront integration after the missing commits are recovered

Use `commerce/src/catalogue.ts` and `commerce/src/storefront.tsx` inside the existing storefront source; retain the approved layout, logo, compact age gate and DE/FR/EN routes. The provider requests the live public catalogue/settings on mount, every minute and on window focus. It keeps cart and box selections under dedicated `varathans25_commerce_*` keys. These are customer convenience data; all purchase validation happens in PostgreSQL.

Pass the existing age-gate state into `CommerceProvider`. Wire the existing cards/detail pages to published data and `SingleCigarPurchase`; place `CigarBoxBuilder` within the existing cigar page. Wire the existing shopping bag to the shared cart/quote and `FreeDeliveryProgress`. Do not ship the test harness or substitute it for the approved storefront. Preserve existing static product URLs; newly created products need a generated generic product route with a query identifier because GitHub Pages cannot resolve arbitrary new Next.js dynamic paths. That connection work is still pending the correct storefront source.

The bundled fallback contains zero products because no verified published backend catalogue is available yet. `npm run export:fallback` exports only the public projection from an HTTPS production backend; review that generated snapshot before committing. Offline products are unavailable for purchase, and all orders still require server validation. Drafts must never be included. A successful empty live catalogue remains empty rather than reviving a stale fallback.

## Production project and invitations

No hosted project or paid service was created. Use an authorized Supabase project and confirm the chosen region/retention settings with the owner.

1. Set up the hosted database and Auth project. Disable public signup and anonymous sign-in. Enable email login, email confirmation and TOTP enrollment/verification. Configure SMTP and rate limits. Set Site URL and the exact permitted redirect to `https://openatg.com/adminpage/`.
2. Apply the checked-in migrations with the Supabase CLI against the explicitly linked target. Inspect `supabase db push --dry-run` before applying. Never run local synthetic test setup against production.
3. Invite the first owner from the Supabase Auth dashboard. Obtain that invited user's UUID. In the SQL editor, run the following with the real UUID entered there, not committed to source:

   ```sql
   insert into public.v25_profiles(id, role)
   values ('<invited-auth-user-uuid>', 'owner');
   ```

4. The owner follows the invitation, sets a password and enrolls TOTP. Keep recovery arrangements outside the repository. Additional accounts are invited through the MFA-protected Access screen. Bootstrap and emergency recovery require the project's authorized database operator; do not implement a browser bypass.
5. Deploy `invite-admin` and `checkout`. Their service key is supplied by the Supabase runtime, never the static site. Configure `STORE_ORIGIN=https://openatg.com` and `ADMIN_REDIRECT_URL=https://openatg.com/adminpage/` as function environment values. The invitation function validates JWTs itself because `verify_jwt=false` supports modern public keys; do not remove its `getUser` and owner-RPC checks.
6. Set only the project HTTPS URL and public key in the build environment. Keep payment and tobacco flags disabled. Import the recovered verified product information, confirm stock/charges and explicitly verify tax configuration and publish products intentionally.

Never send service keys, database passwords or SMTP credentials to the browser. They are configured through the provider's secret management or a local ignored environment, not in Git or a chat report.

## Static deployment

Publication is blocked until both required local commits are available, the approved storefront integration is complete and all checks pass.

`npm run build` builds the admin into `commerce/dist/adminpage/` with the exact `/adminpage/` base path. Navigation uses the single entry route, so direct loading and refresh do not need server rewrites. Copy only that output into root `adminpage/`. Never copy the project working directory, `.env.local`, `.local`, node_modules or the local harness. Run `npm run stage:pages` to prepare `commerce/.local/pages/`: it preserves the existing tracked site and adds only the compiled admin, excluding commerce source, tests, local data and backend source. The manual `.github/workflows/varathans25-pages.yml` workflow publishes that artifact from `main` after checking the preserved commits and remote SHA. Set repository variables `V25_SUPABASE_URL` and `V25_SUPABASE_PUBLISHABLE_KEY` to public configuration, then manually dispatch only after the complete local verification succeeds. It does not deploy database migrations or run destructive local backend tests against production. The Pages setting must be switched from root-branch publication to an Actions artifact before deploying this source layout; keep the existing Windows-build workflow unchanged. Continuing to publish the entire repository root would also publish the new source and raw harness files. No hosting setting was changed in this session.

The admin HTML includes `noindex,nofollow,noarchive`, no public-navigation link, and a restrictive metadata CSP. The build adds only the configured exact HTTPS Supabase origin to `connect-src` and `img-src`. There are no backend wildcards. Product storage shares that project origin. Merge the same exact origins into the storefront's existing CSP when wiring the recovered source. GitHub Pages controls response headers; server-only header directives cannot be supplied by HTML metadata.

Run `npm run deploy:preflight` with `REVIEWED_REMOTE_SHA` and the public backend configuration; it refuses publication when either required commit is missing. It performs no push.

Before pushing, fetch/inspect `origin/main`, verify it is still the reviewed base, ensure both `0a5a509` and `5cde291` are ancestors of the final branch, and compare every original OpenATG file. If remote changes, integrate normally and rerun affected checks. Push with `git push origin HEAD:main`; never force-push, reset, rewrite or discard the existing work. Verify the Pages deployment SHA, `/adminpage/` refresh, `/varathans25/`, all languages, `/`, `/signal/`, `/store/` and `/store/base-32m/`.

## Backup and rollback

- Before applying a production migration, make an encrypted database backup using the authorized operator connection, including Auth users, profiles and all commerce schemas. Keep it outside the repository with restricted access. Use provider backups/PITR only when already provisioned; do not silently purchase a plan.
- Back up Storage object bytes as well as database metadata. Database dumps alone do not contain the images. Keep a manifest of object paths and hashes and verify a restoration to an isolated project.
- Record the deployed Git SHA, migration versions and backup timestamp. Restrict access to backups because they contain customer and authentication information. Define retention/deletion with the owner before accepting live orders.
- Roll back frontend changes with a normal revert commit and ordinary push. Keep newer unrelated OpenATG changes. Keep payments disabled during recovery.
- Database migrations here are additive. Do not automatically drop orders, customer data, audit records or Auth records when reverting the UI. Prefer a forward corrective migration. A destructive database restore requires an explicit outage/reconciliation plan and the authorized operator.
- Test restored RLS, owner MFA, order totals, stock and storage permissions before reopening checkout. Reconcile payment-provider events received after the backup; never reuse an old snapshot to charge customers again.

## External information still required

- The actual repository/branch/bundle containing `0a5a509` and `5cde291`, including the verified curry label and latest storefront source.
- Authorized production Supabase project reference and URL; its public key for the static build; operator access to apply migrations and deploy functions.
- The owner's invitation email, SMTP configuration and production Auth settings.
- Confirmed product prices, stock, missing labels and translations, standard delivery charge, VAT treatment and contacts.
- Approved payment-provider integration, legal review, age-verification adapter and adult-delivery arrangement before enabling tobacco payment/delivery. A reviewed provider webhook implementation is still required; the current checkout function intentionally refuses payment.
