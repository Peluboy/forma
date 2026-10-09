# Template Gallery v1

Route: **`/dev/template-gallery`** (`src/features/templates/TemplateGalleryPage.tsx`)

A simple internal listing of approved, public, gallery-listed templates. It is
deliberately a **dev route** — there is no public SEO surface, no ranking, no
ratings, and no payments in this version.

## What it lists

A card appears iff the record satisfies **all** of:

- `status === "approved"` and `approval.approved`
- `sharing.visibility === "public"`
- `sharing.galleryListed !== false`
- not revoked (`sharing.revokedAt` unset)

This is exactly `listPublicGallery(records)` in the domain, so the gallery and
the domain can never disagree.

## Card contents

`templateGalleryCard(sanitizeTemplateForPublicView(record))`:

- `id` (public slug — never the internal record id or owner id)
- `name`, `description`
- `source`
- `layoutCount`, `pageRoles`
- `creatorName` (attribution only)
- `license`
- `allowForking`
- `averageQualityScore`
- `primaryPreview` (cover preview descriptor, or placeholder)
- `sharedAt`

## Data sources

The page merges **two** sources so it works offline and hosted:

1. The local `LocalStorageTemplateRecordStore` (guests, local mode).
2. `GET /api/template-families/public` (hosted `SECURITY DEFINER` list).

## Interactions

- Filter by text (name / page roles / creator) and by source.
- **Preview** → `/template/:token`.
- **Use in create** → `/create?template=:id`.
- **Fork** → `POST /api/template-families/:id/fork` (requires sign-in).

## Not in v1

Search ranking, ratings, reviews, comments, payments, categories beyond a plain
source filter, and any public web marketplace pages.
