# Template Sharing — Security & Privacy Review (Phase 6)

Focused privacy review of the sharing/forking surface. Each item states the
check, how it is enforced, and where it is verified.

## 1. No private template notes in the public payload

`sanitizeTemplateForPublicView` builds a new object from an explicit allow-list.
It never spreads the record, so `approval` (including `reviewedLayouts` and
`reviewerNotes`), `usage`, `reference`, `ownerId`, `id`, and internal `changelog`
cannot leak. Verified by the test **"sanitized public payload removes private
fields"**, which serializes the payload and asserts none of `ownerId`, `usage`,
`reference`, `approval`, `reviewedLayouts`, `reviewerNotes`, `approvedBy`,
`timesUsed` appear.

## 2. No internal owner IDs exposed unnecessarily

- The payload's `id` is the **public id / share token**, not the record id.
- The payload's `templateId` is the lineage root id (contains no owner data).
- `forkedFromOwnerId` on the record is never projected into the public payload;
  the public preview only shows `forkedFromTemplateId` / `originalTemplateId` /
  `lineageRootId`. Verified by the payload test and the fork lineage test.

## 3. No raw source manuscript leaked

Sharing operates on `TemplateFamilyRecord`, which holds layout geometry and
slots — not manuscripts. Generation provenance is stored on generated
`DesignSpec`s, never on the shared record. The public payload has no field that
can carry manuscript text.

## 4. No private reference images leaked

`reference` lineage (profile id, source type, confidence, usage mode) is
**excluded** from the public payload. Reference images live in the reference
design module and are never part of a shared record's public projection.

## 5. No human review notes leaked

Human review verdicts live under `usage.humanVerdicts`, and reviewer notes live
under `approval.reviewedLayouts[*].reviewerNotes`. Both are excluded by the
allow-list payload. Warnings in the payload are limited to quality warnings of
severity other than `info`, capped at `maxWarnings` (default 5).

## 6. Share tokens are not predictable

`generateShareToken` uses `crypto.getRandomValues` (a `Math.random` fallback
exists only for non-crypto environments) and produces **48 hex characters**.
Tokens are never derived from ids, names, or timestamps, and
`generateUniqueShareToken` retries against a supplied set to avoid collisions.
`isShareTokenShaped` rejects anything not exactly 48 lowercase hex chars.

## 7. Revoked links stop working

- `resolveSharedTemplate` returns `undefined` for a revoked record.
- `canViewSharedTemplate` returns `false` when `revokedAt` is set.
- The server's `GET /api/template-families/shared/:token` returns **404** when
  revoked, unknown, or not viewable (it does not distinguish these cases, so an
  attacker learns nothing).
- Revoking also clears `shareToken` and sets `galleryListed: false`.
- The SQL functions filter `revokedAt IS NULL`. Verified by the benchmark check
  **"Revoked share token fails"** and the test **"revoked share token fails to
  resolve and is delisted"**.

## 8. Fork does not mutate the original

The family is deep-copied (`structuredClone`, JSON fallback) and the fork is a
new record. Tests assert mutating the fork's family does not change the source.

## 9. Public preview cannot update templates

- `GET /api/template-families/public` and `GET .../shared/:token` are anonymous
  **reads only**.
- Sharing mutations (`share`, `revoke-share`) require owner `auth` and re-check
  `canShareTemplate` / `isTemplateOwner` server-side.
- Forking requires `auth` and re-checks `canForkTemplate`; it writes a **new**
  record. A viewer can never write to the original.

## 10. Unapproved templates are never exposed

- The domain forbids sharing anything not `approved` (`canShareTemplate`), and
  `sanitizeTemplateForPublicView` throws for non-approved records.
- The server queries and SQL functions filter `status = 'approved'`.
- Verified by tests **"draft and candidate templates cannot be shared"**,
  **"sanitizing a non-approved template throws"**, and the benchmark checks
  **"Draft template cannot be shared"** / **"Candidate template cannot be
  public"**.

## Residual risks / notes

- Local-mode share links point at `location.origin` and are **not**
  internet-accessible; the lab labels them local-only. They must not be
  presented as public URLs.
- `prerender`/social scraping of `/template/:token` is not implemented, so no
  template metadata is exposed to link previews.
- The public gallery card exposes `creatorName` by design; owners choose what to
  enter, and it is optional.
