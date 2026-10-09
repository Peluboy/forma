# Template Forking v1

`src/domain/template-sharing/forking.ts`

A **fork** is a brand-new lineage root owned by the forking user. The original
record is never mutated.

```ts
forkTemplateRecord(source, actor, {
  ownerId?, name?, description?,
  inheritApproval?, forkOwnerName?,
  lineageRootId?, originalTemplateId?,
}): TemplateFamilyRecord
```

## What a fork does

1. **Authorization** — calls `canForkTemplate`; throws `forkingBlockReason` when
   not allowed.
2. **Deep copy** — the family is `structuredClone`d (JSON fallback), so a fork
   can never share mutable state with the original.
3. **New record** — a fresh `id` and a fresh `templateId`, `source: "forked"`,
   owned by `options.ownerId`.
4. **Lineage** — `record.forkedFrom` records:

```
forkedFromTemplateId   source.templateId
forkedFromVersionId    source.id
forkedFromOwnerId?     source.ownerId        (oid only — no private payload)
forkedAt               timestamp
originalTemplateId     options.originalTemplateId
                       ?? source.forkedFrom?.originalTemplateId
                       ?? source.templateId
lineageRootId          options.lineageRootId
                       ?? source.forkedFrom?.lineageRootId
                       ?? source.templateId
forkOwnerName?         display name for the fork owner
```

## Approval policy

- **Approved source** → the fork may start `approved` but always `private`
  (`inheritApproval` defaults to `source.status === "approved"`). The layouts
  are copied unchanged, so inheriting approval is safe.
- **Any later edit** goes through the normal
  `updateTemplateFamilyRecord` / `createTemplateVersion` path, which resets
  approval (a new version starts unapproved).
- **Non-approved source** → the fork is a `draft`.

## A fork cannot point at the original

Lineage fields are **ids and timestamps only**. The forked family is a deep
copy, so editing the fork can never change the source record. Tests assert that
mutating `fork.family.layouts[0].id` does not affect the source.

## Generation from a fork

A forked approved template generates through the normal pipeline. `runAiDesignerPipeline`
records both the fork's identity and its lineage on the resulting `DesignSpec`:

```
templateFamilyRecordId                fork.id
templateFamilyTemplateId              fork.templateId
templateFamilyVersion                 fork.versionNumber
templateFamilySource                  "forked"
templateFamilyForkedFromTemplateId    source.templateId   (when present)
templateFamilyOriginalTemplateId      originalTemplateId  (when present)
```

## Revocation and archiving

- **Revoking** a source share does **not** touch existing forks. A fork is
  independent the moment it is created.
- **Archiving** a source template does not break existing forks or previously
  generated projects.
