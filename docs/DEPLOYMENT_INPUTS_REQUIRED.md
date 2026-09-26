# External inputs and deployment gates

No credentials should be sent through chat or committed. Put secrets only in the chosen hosting platform's encrypted environment. `.env.example` lists names without values.

## Non-secret decisions still required

- Approved Next.js hosting provider/project and staging hostnames; region, backup objectives and operating owner.
- Supabase organization/project reference, approved region, production Auth settings and administrator invitation identities.
- Cloudflare zone/account identifiers and intended shop/admin DNS targets (no DNS changes made).
- Approved email provider/sender domain and templates/legal sender details.
- Written ordinary-merchandise PSP/TWINT/card and recurring-membership approval; merchant/project identifiers and callback specification.
- Approved age-verification provider, sandbox/project reference and review/expiry policy.
- Creditor legal name, address and bank arrangement to be entered through encrypted configuration, with QR-bill bank acceptance.
- Verified product prices, stock, ingredients, allergens, weights, VAT/legal data and translation approval. Existing fixture prices are not approvals.
- Final membership terms, eligible product exclusions, drink/visit policy, venues, cancellation/refund policy and operational staff procedures.
- FADP/GDPR controller/support contact, processor agreements, retention periods and deletion handling.

## Encrypted environment matrix

| Variables | Purpose | Browser exposure |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Server Auth/API connection | Not needed by browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Rate limiter, signed callback, local setup/retention only | Never |
| `PASS_SIGNING_KEY`, `RATE_LIMIT_KEY`, `WEBHOOK_SIGNING_KEY` | Separate >=32-byte random keys, rotation plans required | Never |
| `APP_ORIGIN`, `PLATFORM_ENV` | Exact approved host and environment | Host only |
| `QR_CREDITOR_*` | Future approved creditor/account configuration | Never in public bundles |
| `EMAIL_PROVIDER_KEY`, `PSP_API_KEY`, `AGE_PROVIDER_KEY` | Future provider adapters | Never |
| `PRODUCTION_WRITES_ENABLED`, `CIGAR_CHECKOUT_ENABLED`, `LIVE_PAYMENTS_ENABLED`, `SUBSCRIPTIONS_ENABLED` | All **false** in this release | No enable controls |
| `AGE_VERIFICATION_MODE` | `test` only on isolated localhost; approved production mode later | No provider credential |

## Staging checklist

1. Review branch diff and screenshots; verify current public main unchanged.
2. Select hosting and a distinct Supabase project. No deployment is authorized by this development task.
3. Supply encrypted configuration, apply all migrations to an empty sandbox, verify RLS and bootstrap owner with TOTP.
4. Replace local-only adapters through a separately reviewed change; never loosen guards to make a deployment appear functional.
5. Run migration replay, unit/integration/browser/security tests and secret scans against the selected sandbox.
6. Verify noindex, strict CSP, TLS, exact-origin CSRF, host-only cookies, storage isolation, provider outage behavior and backups.

## Production checklist

All staging checks, provider contracts, real end-to-end sandbox acceptance, finalized legal/product data, independent security review, restore drill, observability/on-call ownership, and explicit owner release authorization are required. Existing Pages remains live until a separate approved migration. This branch is not production-enabled simply because it builds.

## Rollback and backups

Pre-work rollback branch: `rollback/varathans25-before-premium-platform-20260926T193712Z` at `ad680205287c323005c2e92f0f1ffa514939ec52`.

Verified repository bundle (outside Git): `/Users/adrianvasu/Desktop/V25-Suisse/.local/repository-checkpoints/varathans25-before-premium-platform-20260926T193712Z.bundle`.
SHA-256: `3c464aeb979343eac69215cee326a4e5ea6bfc94ce8cef3887f74796448e2e89`.

No public rollback is necessary because production is unchanged. To inspect the rollback without altering any worktree:

```sh
git worktree add --detach ../varathans25-production-rollback ad680205287c323005c2e92f0f1ffa514939ec52
```

Stop local review with the terminal's Ctrl-C and `cd platform && npm run local:stop`. Do not use `--no-backup`. Do not run resets against a hosted project. Preserve `.env.local` and `.local/review-accounts.json` separately and securely; neither belongs in Git. A fresh local database replay is destructive only to this explicitly named test project and must be treated accordingly.

For future hosting: take encrypted database and storage backups, record migration list/application SHA/config version; restore into a separate project and run smoke/RLS tests. Roll the application back to the last compatible artifact before contemplating a database restore. Prefer forward fixes for additive schema; do not drop financial or membership history to undo a deployment. Establish and test RPO/RTO before accepting real orders.

## Incident response

Disable writes at server and database boundary; pause provider callbacks through approved provider controls; revoke affected sessions and rotate only compromised keys; preserve redacted audit evidence; assess affected records; notify the operational owner and follow the approved legal response plan. Restore and verify in an isolated environment. Do not paste personal data, credentials or raw webhook payloads into public issues.
