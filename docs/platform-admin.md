# Forma platform admin — proposed implementation scope

September 25, 2026. This is a specification, not a shipped capability. The current app has no platform-admin interface or operator role system. Supabase and Paystack dashboards remain external service consoles; they do not constitute a Forma admin product.

## Operator experience

Use `/admin` as a separate operations workspace with its own navigation and access checks. Share typography, spacing, controls, and accessibility conventions with the redesigned customer product. Use tables, filters, clear status labels, and drill-down views for operational work. Never display invented revenue, user counts, jobs, or activity as live data; show an honest empty state until the underlying events exist.

| Section | Initial capabilities | Dependencies |
|---|---|---|
| Overview | Active accounts, new signups, paid accounts, analysis usage/failures, billing issues, unresolved support work | Defined metrics and real event/usage records; actual revenue requires payment/refund reconciliation |
| Users | Search, inspect account and plan metadata, invite beta users, suspend/reactivate access with reason | Server-enforced suspension, verified operator permissions, audit events |
| Billing | Inspect Paystack-linked transactions/subscriptions, failed confirmations, webhook errors, reconciliation results; controlled allowance adjustments | Durable payment/webhook event records, reconciliation service, separate billing permissions |
| Analysis jobs | Inspect queued/running/failed/completed jobs, timing, provider usage and failure reasons | Durable job records and provider usage instrumentation; current transient requests are insufficient |
| Templates | Draft, preview, categorize, publish/unpublish platform templates | Template persistence/versioning; current built-in templates are code-defined |
| Support | Customer reports linked to relevant account/project metadata, status, notes and resolution | Report submission, case records, operator ownership and notifications |
| Settings | Beta signup mode, published plan configuration, quotas, support address and feature availability | Validated server settings and revision history; provider secrets stay in deployment secret storage |
| Audit trail | Who changed what, when, why and whether it succeeded | Append-only server-written audit records; never trust a client-supplied operator identity |

## Permission boundaries

- Bootstrap the first owner through a controlled server/operator procedure. Signup and editable user metadata must never grant an admin role.
- Define owner, support, and billing roles with explicit action permissions. Enforce them on the server and database, including every detail endpoint and export.
- Prefer metadata for support views. Private manuscripts and images must not become visible to every operator by default. Any necessary content-access workflow needs narrowly scoped permission and a logged reason.
- Record access changes, quota adjustments, template publication and billing interventions in an immutable audit trail. Require explicit confirmation for destructive or financial actions.
- Require stronger authentication for privileged operators before public launch. UI route hiding is not authorization.
- Do not build a field that lets an operator arbitrarily overwrite a user's paid status. Entitlements should continue to derive from verified payments or a distinct, expiring, audited complimentary grant.

## Delivery sequence

1. Role model, owner bootstrap, protected shell, authorization tests, audit storage.
2. User search/detail, actual operational overview, beta access controls and suspension enforcement.
3. Billing event inspection and reconciliation, job observability and usage allowances.
4. Template publishing and support cases.

Launch validation must prove ordinary users cannot load admin data, lower-privilege operators cannot invoke restricted actions, and concurrent/retried mutations do not produce duplicate financial or entitlement changes.
