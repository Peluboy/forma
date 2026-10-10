# DesignSpec Live-Edit Sync v1 — Phase 9

Status: **Phase 9 implementation**. This document starts with the required editor-model audit, then records the DesignSpec sync engine. It is not a PPTX, import, or editor-rewrite milestone.

---

## Part A — Current editor model audit

Inspected: `src/domain/pipeline/designerPipeline.ts`, `src/domain/design-spec/adapters/toFlowDocument.ts`, `fromFlowDocument.ts`, `src/domain/export/resolveSpec.ts`, `pdfExport.ts`, `preflight.ts`, `src/features/editor/hooks/usePersistence.ts`, `useEditorHistory.ts`, `EditorPage.tsx`, `DocumentPanel.tsx`, `DocumentCanvas.tsx`, `projectActions.ts`, `canvasActions.ts`, `EditorQualityPanel.tsx`, `EditorExportDialog.tsx`, `trustGate.ts`, `flowDocument.ts`.

### 1. Where DesignSpec is created

- AI Designer Pipeline (`runAiDesignerPipeline`) instantiates a DesignSpec from TemplateFamily + DesignPlan, then runs fit, critic, and continuation.
- Tests and `/dev/export` can construct specs directly.
- `fromFlowDocument` / `fromLegacyGraphicProject` can derive a spec on demand. Those adapters mint **new IDs** (`${project.id}:${page.id}:${element.id}`) and do not write back to the project.

### 2. Where DesignSpec is stored

- Pipeline writes `project.metadata.designSpec` after projection, plus `copyCheckStatus`, `fitStatus`, `qualityStatus`, `generatorVersion`.
- Persistence saves the whole `Project` JSON (guest localStorage or account PUT). There is no separate DesignSpec table.
- Old FlowDocument projects have no `metadata.designSpec`.

### 3. Where FlowDocument is edited

- Document family projects store the editable canvas in `project.flow`.
- `DocumentCanvas` renders pages, decorations, focal crop, and text frames.
- `DocumentPanel` changes active page, add/remove page, header/footer, page numbers, and full repagination.
- `patchDocumentDecoration` updates shape/image/chart decorations.
- Quality panel mutates frame typography or swaps a layout by reprojecting a corrected spec onto `flow` only.

### 4. Which editor actions currently mutate FlowDocument

| Action | Entry | DesignSpec update today |
| --- | --- | --- |
| Text content (manuscript apply / content blocks) | `applyContentBlocks`, content panel | No |
| Frame typography | Quality fixes, some inspectors | No |
| Decoration move/resize/style/focal | `patchDocumentDecoration` | No |
| Page background | page `background` field | No |
| Hide / add / remove / duplicate page | `canvasActions`, `DocumentPanel` | No |
| Header / footer / page numbers | `DocumentPanel` master | No (not DesignSpec elements) |
| Repaginate from manuscript | `paginateDocument` | No |
| Layout variant swap | Quality panel reprojection | Writes new `flow`, leaves stored spec stale |
| Undo/redo | `useEditorHistory` | Restores previous project snapshot, including whatever metadata was stored |

All of these go through `useEditorHistory.update(patch)` except persistence loads.

### 5. Which actions have no DesignSpec equivalent yet

- Master header, footer, and page numbers (adapter metadata only)
- Full manuscript repagination (new page/element IDs)
- Arbitrary page duplicate (new unlinked IDs)
- Group hierarchy (flattened on projection)
- Drop shadows / freeform paths
- Presentation deck edits (out of this sync v1 scope)
- Graphic Poster layers (legacy graphic model)

### 6. Where save/autosave happens

- `usePersistence`: debounce 450ms guest / 850ms signed-in; PUT full project; guest writes `forma.projects.v1`.
- Save is a snapshot of `current.current`. If metadata is stale at save time, the stale spec is what is stored.

### 7. Where native export reads DesignSpec

- `resolveDesignSpecFromProject` currently **prefers a live `fromFlowDocument` rebuild** over `metadata.designSpec` for documents. That was a Phase 8 workaround for stale stored specs. It remints IDs and can lose stored provenance.
- `runNativePdfExport` / `previewNativeExport` consume that resolved spec.
- Flattened PDF still rasterizes `DocumentPageView`.

### 8. How stale DesignSpec can happen

1. User edits `flow` after generation; stored spec is unchanged.
2. Quality layout swap writes a new flow from a corrected spec but does not persist that spec.
3. Export adapter rebuilds a different spec than the one that was generated.
4. Undo can restore flow without a matching spec if metadata was overwritten later.
5. Old projects never had a linked spec.

### 9. What can be safely synced

- Text content and typography on linked frames
- Geometry (x, y, width, height, opacity, hidden)
- Shape fill/stroke/radius
- Image fit, focal point, alt text
- Table cell text / header flag
- Chart title, labels, values, type
- Page background and hide
- Add/remove a linked page when IDs are stable

### 10. What must be marked unsupported/stale

- Editor element with no DesignSpec link
- Linked DesignSpec element missing
- Unlinked element added
- Repagination / page structure rewrite
- Master header/footer as if they were native elements
- Raw flow edit that cannot be mapped
- Validation failure after a patch

### 11. What is deferred

- DesignSpec-native editor rewrite
- Collaborative CRDT
- Automatic migration of all old projects
- Presentation/graphic live sync
- PPTX/DOCX/PDF import-export beyond existing flattened/slide PPTX
- Visual diff UI

---

## Implementation (Parts B–S)

Live-edit sync lives in `src/domain/design-spec/sync/`. Projection stamps `designLink` on FlowDocument nodes. Editor `update()` patches the linked DesignSpec. Native PDF reads the stored spec only when sync status allows it. Flattened PDF remains the explicit fallback.

See also:

- [DesignSpec sync state v1](DESIGNSPEC_SYNC_STATE_V1.md)
- [FlowDocument to DesignSpec sync](FLOWDOCUMENT_TO_DESIGNSPEC_SYNC.md)
- [Native export sync requirements](NATIVE_EXPORT_SYNC_REQUIREMENTS.md)
