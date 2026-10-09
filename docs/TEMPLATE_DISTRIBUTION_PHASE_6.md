# Template Distribution, Sharing & Forking v1 — Phase 6

This document is both the **pre-implementation audit** (Part A) and the
**overview** of Phase 6. It records what existed before Phase 6, what Phase 6
adds, and what is deliberately deferred. It is not a marketplace document.

---

## Part A — Current template distribution audit (before Phase 6)

### What already supported sharing/forking

- **Nothing at the record level.** Phase 5 `TemplateFamilyRecord` was entirely
  owner-private. There was no visibility field, no share token, no public id,
  no permission model, and no cross-owner read path.
- **`duplicateTemplateFamilyRecord`** existed as a same-owner copy helper (fresh
  lineage root, `draft`), but it is not a fork: it has no lineage back to the
  source and no authorization check — it is a local convenience.

### What only supported owner-private templates

- `GET/PUT/DELETE /api/template-families` — owner-scoped, RLS-protected
  `forma_records` rows with `kind: "template_family"` and optimistic versions.
- `LocalStorageTemplateRecordStore` (guests) — single browser, key
  `forma.templateFamilies.v1`.
- `/dev/templates` authoring lab — creates, validates, reviews, approves,
  versions, and smoke-tests records, all locally/hosted for one owner.
- `/create` template picker — filters `LocalStorageTemplateRecordStore` to
  `status === "approved"` records and records provenance
  (`templateFamilyRecordId`, `templateFamilyVersion`, `templateFamilySource`,
  `templateFamilyStatus`) on the generated `DesignSpec`.

### What lineage fields existed

- Within a lineage: `templateId` (root), `versionNumber`, `parentVersionId`.
- Cross-template lineage: **none**. There was no "forked from" concept.

### What permissions existed

- `ownerId` on the record, and server-side owner scoping on every endpoint.
- No `canShare` / `canFork` / `canView` utilities.

### What persistence endpoints existed

- `GET /api/template-families` (list owner's records)
- `PUT /api/template-families/:id` (owner save)
- `DELETE /api/template-families/:id` (owner delete)

### What was missing

- Visibility model, share tokens, public ids, permission utilities, public
  payload sanitizer, share/fork endpoints, fork model, gallery, public preview
  page, share/revoke/archive semantics, lineage UI, sharing benchmark, privacy
  review.

### What must be deferred (not a marketplace)

Paid marketplace, creator monetization, payments, reviews/ratings, comments,
agency/team roles, complex ACL editor, real-time collaboration, public search
ranking, SEO marketplace pages, external PDF/PPTX import, and any exposure of
unapproved templates in a public surface.

---

## Part B — Visibility model

`TemplateSharingState` is added to `TemplateFamilyRecord`:

```ts
type TemplateVisibility = "private" | "unlisted" | "public";
type TemplateLicense =
  "private_use" | "internal_use" | "free_to_fork" | "custom";

interface TemplateSharingState {
  visibility: TemplateVisibility;
  shareToken?: string; // unlisted/public locator (revocable)
  publicId?: string; // stable public slug (no owner ids)
  sharedAt?: string;
  sharedBy?: string;
  revokedAt?: string; // when set, the link stops resolving
  allowForking: boolean;
  galleryListed?: boolean;
  license?: TemplateLicense;
  attribution?: TemplateAttribution;
}
```

Rules enforced by the domain:

- An absent `sharing` field means **private and not forkable** (safe default).
- Only `approved` records can become `unlisted` or `public`.
- `draft` / `candidate` / `rejected` records can never be shared.
- `archived` records cannot newly become public.
- A revoked share stops resolving and is de-listed.
- Forks default to `private` (and may inherit `approved` — see Forking).

---

## Part F — Hosted endpoints

| Endpoint                                       | Auth  | Behaviour                                                                  |
| ---------------------------------------------- | ----- | -------------------------------------------------------------------------- |
| `GET /api/template-families/public`            | none  | Approved, public, gallery-listed, non-revoked gallery cards.               |
| `GET /api/template-families/shared/:token`     | none  | Resolves by share token **or** public id; 404 when revoked/unknown/unsafe. |
| `POST /api/template-families/:id/share`        | owner | Shares an approved template; returns `shareToken`/`publicId`.              |
| `POST /api/template-families/:id/revoke-share` | owner | Revokes the share (forks survive).                                         |
| `POST /api/template-families/:id/fork`         | user  | Forks a forkable shared template into the caller's library.                |

Cross-owner reads use `SECURITY DEFINER` functions (`forma_template_shared`,
`forma_template_public_list`, `forma_template_fork_source`) in migration
`202610080002_template_sharing.sql`, following the existing `forma_review`
pattern. They only ever expose approved + shared + non-revoked rows.

## Part G — Local mode

Local mode has no internet-accessible links. The domain APIs all work locally;
`/template/:token` and `/dev/template-gallery` resolve from the local record
store, and the share URL shown in the lab is clearly a **local-only** link
(`location.origin`). Forking works locally and produces an independent copy.

---

## What this phase still is not

- Not a marketplace: no payments, pricing, ratings, comments, or ranking.
- Not multi-user collaboration: no team roles or ACL editor.
- Not a public SEO surface: the gallery is a dev route, and the preview page is
  token/public-id addressed.

See also: [permissions](TEMPLATE_SHARING_PERMISSIONS.md),
[forking](TEMPLATE_FORKING_V1.md), [gallery](TEMPLATE_GALLERY_V1.md),
[security review](TEMPLATE_SHARING_SECURITY_REVIEW.md).
