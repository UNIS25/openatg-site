# Age-verification adapter and approval gates

The verified-access workflow is visibly labelled as a local test. Submission creates only a pending provider reference; an independent authorized administrator must review it before test access can be granted. The former self-approval HTTP/RPC actions are disabled. The deterministic adapter remains an isolated unit-test utility, with no customer approval endpoint. Both server environment and private database runtime must explicitly be local; test mode on a hosted origin is rejected. No local outcome is genuine identity verification.

Registration and email confirmation alone do not activate hospitality membership or restricted editorial access. Activation, Gold benefits and the personal pass require current verification. Suspension and expiry revoke effective privileges without requiring a scheduled job. Independent administrators can approve submitted local test records, reject, request resubmission, revoke, expire or suspend access; they cannot approve themselves or invent a verified production identity through the UI. Owner MFA is mandatory, and an owner can require MFA for all administrators. No identity-document upload or storage bucket is provided. See [the implementation and verification report](../platform/docs/VERIFIED_CLUB_ACCESS.md).

Store only provider reference, status, verification timestamp, expiry and minimum audit metadata. The production provider-neutral adapter must normalize `pending`, `verified`, `rejected`, `expired`, `manual_review`; authenticate callbacks; reject replay; validate audience, subject, purpose and expiry; and map to the authenticated account without exposing documents. Adult carrier verification remains a separate future state and is not implied by an online age result.

Required before production:

- Written owner/legal approval of the provider, age threshold, jurisdictions and re-verification policy.
- Provider sandbox/project reference, signed-callback specification and encrypted server credentials.
- Processor agreement, subprocessor/hosting details, retention/deletion policy and customer privacy text.
- Accessible appeal/manual review process; no unapproved raw-document collection.
- Failure, timeout, provider outage, suspended-account and expired-token acceptance tests.
- Approved adult-delivery arrangement where independently applicable. This branch does not implement tobacco checkout.

Never send production identity material to the local test adapter or commit provider credentials. No real customer verification is asserted by local fixtures.
