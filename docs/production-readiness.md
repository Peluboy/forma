# Forma: remaining work for a public production app

**Current status: October 2, 2026.** See [STATUS.md](STATUS.md). Graphics, document and presentation scope has expanded and the editor redesign has progressed since the historical checklist below. October 2 repair: production build, 49 unit tests, 3 backend tests and 3 database tests pass. Hosted teams, full UI acceptance, admin, email/billing/release operations remain open. Supabase base migrations and limited hosted account checks were completed September 26; do not repeat them based on older unchecked setup wording below.

Status: September 25, 2026. The working editor and account-backed beta are implemented. This is not yet a publicly operated, production-verified SaaS. The scope now includes optional Paystack Free + Pro subscriptions; prices remain unpublished.

## What exists and what remains

| Area | Implemented | Work remaining before a paid public launch |
|---|---|---|
| Login and identity | Email/password signup, login/logout, Supabase confirmation/reset integration, local recovery, deletion | Resend-confirmation UI is implemented. Configure Supabase, custom SMTP, branded confirmation/reset emails, redirects, abuse protection, and verify delivery on real accounts. Add Google sign-in if selected; it is optional for launch. |
| Public experience | Landing page, pricing, template gallery, help/FAQ, dedicated auth routes, optional support contact, page titles/descriptions | User has rejected the current visual quality. Redesign the visual hierarchy and layouts; complete social metadata and deployment review. |
| Onboarding | Two-step starter, template/reference/example/browser-draft choices, saved preferences, editor checklist, template empty states | Final regression verification of draft loading and accessible template selection; improve the visual and interaction design. |
| Account settings | Profile editing, password changes, other-session sign-out, onboarding preferences, workspace export, deletion and billing; Supabase email-change integration | Verify hosted email changes and session behavior. Improve visual quality; optional MFA remains unimplemented. |
| Subscriptions | Paystack checkout initialization, signed notifications, server verification, payment history, management link, paid-through access, atomic analysis allowance | Configure a test plan, verify real sandbox redirects/renewals/cancellation and webhook retries, agree price/currency/limits, resolve failed-checkout support process, then activate live credentials. See [billing.md](billing.md). |
| Pricing/packaging | Free and Pro, configurable monthly analysis allowance | Validate customer willingness to pay and AI cost. Decide whether Pro adds other capabilities. Current editor/export/review functionality remains available on Free; no export paywall is claimed. |
| Files and scaling | Images embedded in project snapshots, persistent projects and revisions | Move large image assets to private object storage with authorized access, define storage limits, paginate projects/history, implement revision/asset retention and cleanup. Current repeated image snapshots are unsuitable for unrestricted growth. |
| Core design quality | Manual and assisted text regions, copy preservation, overflow checks | Evaluate real customer references, define supported design types, improve region/font/background handling. Do not market arbitrary reference conversion as pixel-perfect. Multi-page and unlimited layers remain separate product work. |
| Platform admin | Not implemented: no admin routes, role system, operations dashboard, or operator audit log | Build the [platform admin](platform-admin.md): users, billing operations, analysis jobs, templates, support, settings and audited actions. |
| Support and operations | Error states, health endpoint, documented runbook | Support channel, operator tooling/access controls, actionable error and webhook monitoring, payment reconciliation, incident handling, uptime checks, provider cost alerts. |
| Reliability and protection | Ownership/RLS, optimistic saves, protected billing state, local automated tests | Hosted access-control tests, persistent public endpoint rate limiting, upload/abuse controls, load/accessibility/mobile audits, browser coverage, backup restoration exercise. |
| Business and policies | Technical security/privacy documentation | Publish operator-specific Terms, Privacy, cancellation/refund terms and contact details; decide accounting retention and tax/invoice requirements with the appropriate advisers. Technical docs are not final business policies. |
| Deployment | Vercel config, Supabase migrations, environment example, CI | Connect repository, provision staging/production, domain/HTTPS, configure secrets, apply migrations, verify emails/OpenAI/Paystack, establish rollback and backup process. |

## Recommended delivery order

1. Redesign and implement a consistent visual system across public pages, a new signed-in project dashboard, the editor, onboarding and account settings. Finish the pending regression checks.
2. Build the first platform-admin release with server-enforced operator roles and an audit trail, following [platform-admin.md](platform-admin.md).
3. Activate separate staging Supabase/email services and validate Paystack in test mode; choose final pricing after measuring analysis cost.
4. Address file storage, retention, abuse limits, monitoring, support and billing reconciliation.
5. Run real-reference user acceptance and hosted release checks; publish approved policies and deploy the paid production release.

Payments should remain disabled until those billing release checks pass. A working checkout button alone is not production readiness.

Supabase's built-in mail service is intended for development; configure [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) and follow its [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).

## September 25 delivery update

The new project dashboard and onboarding regressions are verified locally: production build, 19 browser tests and three database tests pass. See [feature progress](PROGRESS.md). The customer-wide visual redesign is not complete, the platform admin remains unimplemented, and hosted configuration/release gates remain open.

The editor layout update is now locally verified as well: revised manuscript actions, safe dashboard navigation and save-state fixes pass the 20-test built-app browser suite. Public/account visual unification, deeper text/layer interaction work, admin implementation and hosted release gates remain pending.
