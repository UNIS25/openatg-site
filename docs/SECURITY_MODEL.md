# Security model

## Authentication and authorization

Supabase GoTrue provides registration, confirmed email, password login, password recovery, refresh-token rotation and TOTP enrollment/challenge. Customer registration never creates an admin profile. The retained administration schema supports owner, administrator, product editor and order manager. Additional staff/manager assignments authorize hospitality-pass review/redemption.

Access and refresh tokens use HttpOnly host cookies. CSRF uses a random per-browser token delivered through same-origin JSON and verified against an HttpOnly cookie; every mutation additionally checks exact Origin. Auth refresh is bounded by the configured GoTrue session. Database procedures check the actual `auth.sessions` row and reject signed-out sessions, banned users, disabled roles and suspended members. An owner requires `aal2` in database authorization, not a frontend MFA indicator. Administrators can enroll TOTP; enforcing AAL2 for every staff role is a recommended production gate.

Named owners are bootstrapped through a privileged, out-of-band process: invite a known address in Supabase Auth, confirm the invitation, enroll TOTP, verify AAL2, then insert the owner's UUID in `v25_profiles` using the secured SQL console. Record approver, ticket and audit event. Never expose this bootstrap operation in an anonymous endpoint. The local seed creates an additional owner test account without bypassing its MFA requirement.

## Database and storage

Every exposed `v25_*` table has RLS. Browser roles have no direct DML. Security-definer functions pin an empty search path, qualify object names and explicitly grant only necessary execution. User access is filtered by `auth.uid()`. Internal runtime flags, rate buckets and idempotency responses live in a private, unexposed schema.

All writes from authenticated API requests require the database's explicit local-test runtime setting. Original administration RPCs are additionally guarded by table triggers. Legacy transaction RPC execution is revoked, including service-role access. A database trigger rejects adult-product and bundle order items. No route enables tobacco transactions.

The `v25-products` bucket is private. The admin proxy permits only bounded product queries, approved product RPCs and JPEG/PNG/WebP uploads below 5 MB; it does not forward arbitrary URLs, authentication-admin calls or service credentials. Private previews are served through an authenticated image route. Uploaded identity documents are not supported. Uploads are decoded as actual JPEG/PNG/WebP, bounded to 24 million pixels and re-encoded server-side without metadata. SVG and mismatched content types are rejected.

## Integrity

Orders lock inventory, aggregate duplicate lines, reject negative stock and atomically snapshot integer prices, discount selection and delivery. Reusing an idempotency key returns the original result only for an identical request. Payments check the exact amount, valid transition and unique provider event ID. Webhooks authenticate the exact raw body and a five-minute timestamp window with constant-time HMAC verification. Concurrent duplicate events cannot apply twice.

Audit records contain actor, entity identity, changed field names and status transitions, not full personal records. Audit, membership-event, consent, payment-event and benefit-redemption history rejects UPDATE/DELETE, even with the service role. Drink redemption locks the member's visit and uses a unique visit/benefit constraint. A signed opaque pass is hashed in storage, revocable and expires after five minutes; the staff procedure rechecks current verification and membership on every scan and redemption.

## Application controls

Nonce-based CSP: self-hosted scripts/fonts/styles/images, no unsafe script directives, no wildcard hosts, no third-party analytics. Form actions and API connections stay same-origin; framing and object embedding are denied. Responses containing authentication or account data are private/no-store. Server errors use bounded codes and structured logs without request payloads or credentials. No raw card data is collected.

Sensitive endpoints use a database-backed rate limiter; auth has per-identity and global local-development bounds. Production requires Cloudflare and provider-native rate limits with a documented trusted proxy chain; do not trust a user-supplied `X-Forwarded-For` as an identity. MFA recovery, device/session revocation UX and operational incident alerting require the owner to select support procedures before production.

## Data minimisation and retention

No raw identity documents, biometrics, DOB or bank/card credentials are stored in the app's customer tables. Verification stores provider reference, status, timestamps and a test marker. No profile photograph is collected. Saved addresses are CH-only. Consent changes append history; marketing consent can be withdrawn. Deletion requests immediately suspend customer access while a human resolves statutory retention obligations. The export is scoped by RLS.

The service-only retention worker expires memberships/verifications, removes old pass hashes and removes provider references after the configured retention period. It is local-only, unscheduled in production, and does not erase immutable financial history. The 30-day setting is an unapproved staging assumption, not a legal retention conclusion. Owner/legal review must determine FADP/GDPR notices, controller contact, processor agreements, financial retention, deletion SLA and backup retention.

## Local network

Next.js binds to 127.0.0.1. The startup wrapper creates a dedicated Docker network and verifies every published Supabase port is loopback-only. A Docker Desktop compatibility helper preserves this project's volumes/configuration while making explicit port bindings; it never changes other containers or daemon-wide settings. Startup output containing local test credentials is kept in ignored mode-0600 files. The local stack is not production hosting.

Reference: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database functions](https://supabase.com/docs/guides/database/functions), [local development isolation](https://supabase.com/docs/guides/local-development).
