# Local review

This is an isolated, non-public staging application. It is not the live Pages store. Production `main` remains `ad680205287c323005c2e92f0f1ffa514939ec52`.

## Start

Requirements: Node >=22, Docker Desktop, Git. Commands run from the `platform/` directory in `work/varathans25-premium-club-platform`:

```sh
npm ci
npm run local:start
npm run local:setup
npm run local:seed
npm run build
npm start
```

`local:start` writes generated local service credentials only to an ignored private log, verifies loopback bindings and does not start or reset any other Supabase project. `.env.local` is generated locally with mode 0600. Do not run the CLI's plain start command to bypass the loopback verification wrapper. Do not expose ports 4190 or 58530–58534 externally.

## Review URLs

- Language entrance: http://127.0.0.1:4190/
- German store: http://127.0.0.1:4190/de/
- French store: http://127.0.0.1:4190/fr/
- English store: http://127.0.0.1:4190/en/
- Club editorial: http://127.0.0.1:4190/en/club (also `/de/club`, `/fr/club`)
- Membership: http://127.0.0.1:4190/en/membership
- German-default administration: http://127.0.0.1:4190/admin
- Local confirmation/recovery inbox: http://127.0.0.1:58534/
- Local database Studio: http://127.0.0.1:58533/ — development-only service

## Accounts and real local workflows

Random credentials for Silver, Gold, Staff, Administrator and MFA-required Owner are stored **only** in `platform/.local/review-accounts.json`, permissions 0600. Open this local file to sign in; do not copy it into Git, screenshots or reports. All records are synthetic test identities. The owner fixture requires TOTP enrollment and verification before owner permissions work.

1. Explore the entrance, five tea tins, curry and club editorial in each language. Add tea/pantry test quantities to the bag. No tobacco product is orderable.
2. Register using a disposable local test address, open Mailpit, follow the confirmation link and complete the profile/consent form.
3. Run the clearly labelled adult verification test. Verify persistence after logout/login. Try expired/rejected outcomes; they remove effective membership benefits.
4. As Silver, save a structured CH address, review the server-calculated cart and create a test order. Download the PDF marked TEST — NOT PAYABLE.
5. Select monthly or annual Gold. An administrator reconciles the **test** membership invoice to activate its paid period; no real subscription is created.
6. As Gold, review eligible tea/pantry discounts and free Swiss delivery. Generate a five-minute pass.
7. Use a physical QR scanner in keyboard mode or paste the scanned opaque token in Staff > Drink redemption. Check the named person, choose venue and confirm. A second redemption during the same visit is blocked.
8. As Administrator, edit product drafts/translations/images/inventory, review members, reconcile invoices, update paid-order fulfilment, inspect immutable audit events and configure fees, exclusions, delivery and visit policy.
9. Review privacy export, message-consent withdrawal and deletion request using an expendable test account.

The local dataset includes explicit test prices and synthetic inventory. Product publishing still requires verified facts and translations. Do not mistake test data for a live catalogue approval.

## Checks

```sh
npm run typecheck
npm run lint
npm run build
npm test
npm run test:db
npm run test:integration
npm run test:e2e
npm run check:production
npm audit --audit-level=low
```

Run database/integration tests only against the exact local project. Browser tests read the private credentials file; traces are disabled so auth payloads are not captured. Screenshots and reports are ignored under `platform/artifacts/`. The browser journeys include independent axe WCAG AA scans, direct reloads and assertions for zero browser console/page errors at 1440, 1024, 390 and an additional 350-pixel check.

Review-specific screenshots are linked in `CHANGED_FILES.md` after final verification. They contain local test identities only. No public deployment occurred.

Stop the Next.js terminal with Ctrl-C, then run `npm run local:stop`; this preserves the local volume backup. Do not use `--no-backup` unless deliberately discarding this named test database.

For a deliberate migration replay, stop the application first and run `npm run local:reset -- --confirm-local-fixtures`. This backs up the named local test database into an ignored private dump, preserves the network selection and re-seeds synthetic fixtures. Never use this command for a hosted database.
