# Template Versioning v1

`src/domain/template-authoring/versioning.ts`.

A safe history, **not** git-style diffing or merging.

## Rules

- `templateId` is the lineage root and never changes.
- `createTemplateVersion(previous, { family?, name?, description?, changelog })`
  produces `id = ${templateId}@v${n}`, `versionNumber = previous + 1`,
  `parentVersionId = previous.id`, and the supplied changelog.
- Every new version starts with `approval.approved = false` and cleared
  `approvedAt`/`approvedBy`. Per-layout approval states are preserved so
  unchanged layouts are not needlessly re-reviewed.
- `listTemplateVersions(records, templateId)` returns oldest-first summaries.
- `latestTemplateVersion(records, templateId)` returns the newest record.

## Why old versions are kept

A generated project can be traced to the exact template version that produced
it via `finalSpec.metadata.templateFamilyRecordId` / `templateFamilyVersion`.
Keeping old versions means that link stays resolvable.
