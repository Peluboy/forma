# Template Records v1

`src/domain/template-authoring/types.ts` + `records.ts`.

A `TemplateFamilyRecord` is a persisted wrapper around the runtime
`TemplateFamily`. The runtime model is untouched.

```
id                 record id (root id, or `${templateId}@v${n}`)
templateId         lineage root id
versionNumber      starts at 1
parentVersionId?   previous record id
ownerId?           owner scope (hosted)
version            record schema version ("1.0")
name/description   display
status             draft | candidate | approved | archived | rejected
source             builtin | reference_derived | designspec_derived | project_derived | manual
family             the runtime TemplateFamily
approval           TemplateApprovalState
quality            TemplateQualitySummary
usage?             TemplateUsageMetadata
reference?         TemplateReferenceLineage
sharing?           TemplateSharingState    (Phase 6)
forkedFrom?        TemplateForkLineage     (Phase 6)
changelog?         human-readable
createdAt/updatedAt
```

## Phase 6 fields

- `sharing` — visibility (`private | unlisted | public`), revocable `shareToken`,
  stable `publicId`, `allowForking`, `galleryListed`, `license`, `attribution`.
  **Absent means private and not forkable** (the safe default).
- `forkedFrom` — lineage back to the template this record was forked from
  (`forkedFromTemplateId`, `forkedFromVersionId`, `forkedFromOwnerId?`,
  `forkedAt`, `originalTemplateId`, `lineageRootId`, `forkOwnerName?`).
- `source` gains `"forked"`.

See [permissions](TEMPLATE_SHARING_PERMISSIONS.md),
[forking](TEMPLATE_FORKING_V1.md), and
[Phase 6 overview](TEMPLATE_DISTRIBUTION_PHASE_6.md).

## Creation

```ts
createTemplateFamilyRecord({ family, source, name?, description?, ownerId?, status?, reference? })
```

- Built-in source → `approved`, every layout pre-approved by `"forma"`.
- Manual → `draft`.
- Otherwise → `candidate`.

`isTemplateFamilyRecord(value)` is the safe validator used by stores and the
hosted API.

## Stores

`TemplateFamilyRecordStore`: `list`, `get`, `save`, `remove`, `listVersions`.

- `MemoryTemplateRecordStore` — tests and dev.
- `LocalStorageTemplateRecordStore` — guests, key `forma.templateFamilies.v1`.
- Hosted: `GET/PUT/DELETE /api/template-families` storing
  `kind:"template_family"`, owner-scoped, optimistic version.

## Lifecycle helpers

`finalizeTemplateRecord` (recompute quality from validation/smoke/capacity),
`updateTemplateFamilyRecord`, `archiveTemplateFamilyRecord`,
`rejectTemplateFamilyRecord`, `duplicateTemplateFamilyRecord` (fresh lineage
root, draft).

## Not in v1

No marketplace, no diff/merge, no automatic capacity mutation, no paid
monetization. Sharing is limited to read-only previews, unlisted/public links,
and forking (see the Phase 6 docs).
