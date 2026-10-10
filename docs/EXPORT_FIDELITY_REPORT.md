# Export Fidelity Report

Compares DesignSpec to the written PDF representation. This is separate from editor projection fidelity (`EditorProjectionFidelityReport`).

## Statuses

| Status | Meaning |
| --- | --- |
| `export_trusted` | Text, images, tables, charts, and shapes were written natively. No rasterization, omission, or material approximation |
| `export_with_approximations` | Export completed, but fonts were substituted, crop/focal was approximated, chart style was simplified, or an optional asset used a placeholder |
| `export_unverified` | Bytes were produced but verification could not confirm placed text, or an unexpected render gap remains |
| `export_blocked` | Preflight blocked; no production PDF |

Do not describe a PDF as production-ready when key elements were rasterized, omitted, or approximated in a way that matters.

## Tracked items

- Preserved text (exact strings, selectable where the PDF writer supports it)
- Substituted fonts
- Approximated shapes (triangle from bounds, polygon → rectangle)
- Rasterized effects (only if explicitly allowed)
- Image changes (fit/focal crop, low resolution, placeholder)
- Chart vector drawings and preserved numeric values
- Table structure (header rows, cell text, overflow)
- Unsupported properties
- Export warnings and blocked items

## Metadata (job + PDF properties)

Included when `includeMetadata` is true:

- projectId, workspaceId, clientId
- templateFamilyRecordId, templateVersionId
- generatorVersion, exportEngineVersion
- exportedAt
- copyCheckStatus, fitStatus, qualityStatus, exportFidelityStatus

Never embedded:

- Private reviewer notes
- Human review notes
- Full source manuscripts
- Private workspace notes
- Secret/internal identifiers that are not already on the deliverable
