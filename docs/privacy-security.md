# Privacy and security operations

## Data inventory

Forma processes account email/name, reference images, manuscript text, design documents, brand preferences, revision snapshots, review tokens, comments, and reviewer-supplied display names. Exported JSON and ZIP files can contain private source content. Treat them as user documents, not harmless metadata.

Browser-only work stays in browser storage until an account save, review creation, or analysis request sends it to a server. Local mode stores account/project data on the development machine. Supabase mode stores accounts and design records in the configured project. OpenAI analysis submits the reference image when that provider is explicitly selected; it is not required for manual editing.

Do not publish a claim of zero retention, regulatory compliance, encryption beyond verified provider capabilities, or that uploads never leave the browser. This document describes architecture, not a legal privacy policy. Before public launch, supply an operator identity, contact address, retention schedule, and user-facing privacy terms.

## Access controls

Project reads and writes require owner authentication. Production uses Supabase bearer tokens and database RLS; local mode uses HttpOnly cookie sessions and CSRF protection. Never expose service-role or OpenAI secrets in frontend bundles, project JSON, logs, or public config endpoints. The Supabase public/anon key is intentionally public; row-level security provides data protection.

Review URLs are bearer capabilities: possession grants access to a snapshot and permitted feedback actions. They are not suitable for secrets requiring verified reviewer identity. Revocation and expiry stop future access, but cannot retract already downloaded copies. Avoid putting review URLs in analytics events, screenshots, or support logs.

Private beta is an operational restriction: disable unrestricted Supabase signups and provision/invite participants, or apply deployment access protection appropriate to your beta. Verify that reviewers can still access links according to your chosen protection scheme.

## Retention and deletion

Do not assume an automatic retention job exists. Operators must inspect actual stored revisions/reviews and configure a documented retention policy before collecting real data at scale. A deleted project and a revoked review have different meanings; test cascading deletion and expiry handling in production. Backup copies have separate retention. Local account deletion removes local records. Cloud self-service deletion requires the optional server-only service-role key; otherwise it is operator-managed. Revisions remain until their design/account is deleted; expired reviews remain stored until deletion even though public access expires.

A deletion request should identify the authenticated account, delete its project/review/brand records under an authorized administrative procedure, delete the Supabase Auth identity where appropriate, and record completion without copying manuscripts into the audit record. Inform the requester of applicable backup retention. Test this with a disposable account first.

## Abuse and incident handling

Application input limits and per-process throttles are useful safeguards but are not distributed quotas across Vercel instances. Configure provider budget controls, Vercel protections, and monitoring before widening access. Do not promise unlimited free AI analysis. Disable OpenAI configuration to suspend paid analysis while manual editing remains usable.

On a suspected key leak, rotate the affected secret at its provider, update Vercel environment values, redeploy, and verify old credentials no longer work. On an authorization incident, restrict deployment access, preserve minimal relevant logs, investigate affected IDs and timestamps, and follow the operator's notification obligations. Never dump request bodies into incident logs by default.

## Billing data

Optional Paystack integration stores server-private customer/subscription identifiers, checkout references, verified payment summaries, reversal holds and analysis counts. It does not store card numbers or reusable payment authorizations. Paystack receives the account email and checkout metadata when checkout starts. Account deletion requires renewal cancellation and removes local billing state; provider records may remain under the provider/operator retention policy. Final commercial retention and refund policies must be set before live launch. See [billing](billing.md).
