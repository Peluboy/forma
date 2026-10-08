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
changelog?         human-readable
createdAt/updatedAt
```

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

No marketplace, no sharing beyond owner scope, no diff/merge, no automatic
capacity mutation.
