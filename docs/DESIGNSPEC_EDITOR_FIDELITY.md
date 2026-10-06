# DesignSpec-to-Editor Projection Fidelity

Status: **Phase 2B Implementation Complete**.
This document details the fidelity architecture, adapter support matrix, projection pipeline, export consistency validation, and quality score trust gating between the scored **DesignSpec v1** model and the editable **FlowDocument** editor project.

---

## 1. Overview & Trust Problem

Forma's AI Designer Pipeline produces an idealized, scored layout artifact called `DesignSpec`. However, users edit and export documents using the `FlowDocument` model within `DocumentCanvas`. 

Prior to Phase 2B, `toFlowDocumentProject` silently dropped non-text elements (shapes, images, charts, page backgrounds) and approximated fonts without recording transformations. This created a **critical trust gap**: a document scoring 95/100 in the Design Quality Engine could lose key visual elements upon opening in the editor, while still displaying an unearned "high quality" score.

Phase 2B closes this trust gap by:
1. **Extending FlowDocument capabilities** to preserve shapes, rules, cards, images, charts, and page backgrounds.
2. **Formalizing a structured projection pipeline** (`toFlowDocument.ts`) that tracks every preserved, transformed, unsupported, and lost design property.
3. **Running export consistency checks** (`checkEditorExportConsistency`) before export preview.
4. **Enforcing a Quality Score Trust Gate** (`assessDeliverableQuality`) that downgrades deliverable status to `quality_unverified_after_projection` or `editor_projection_loss_detected` if projection loses design data.

---

## 2. Adapter Support Matrix

| Element / Property | DesignSpec Model | FlowDocument Editor Support | Status | Transformation / Fallback | Severity & Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TEXT** | | | | | |
| Exact Text Content | `element.text` | `FlowTextFrame.text` / Content Blocks | **Preserved** | Exact string preserved | Critical (Copy Loss = Blocker) |
| SourceSpan Provenance | `element.sourceSpanIds` | `FlowTextFrame.sourceSpanIds` | **Preserved** | Mapped to manuscript spans | Critical (Loss = Blocker) |
| Font Family (Curated) | `element.fontFamily` | `FlowTextFrame.fontFamily` | **Preserved** | Exact if in curated font set | Low |
| Font Family (Unknown) | `element.fontFamily` | `FlowTextFrame.fontFamily` | **Transformed** | Approximated to Arial fallback | Low (`acceptable_approximation`) |
| Font Size & Weight | `fontSize`, `fontWeight` | `fontSize`, `fontWeight` | **Preserved** | Mapped to frame properties | Low |
| Line Height & Spacing | `lineHeight`, `letterSpacing`| `lineHeight`, metadata | **Preserved** | Supported on canvas render | Low |
| Alignment | `align` (left/center/right/justify) | `FlowTextFrame.align` | **Preserved** | Direct mapping | Low |
| Text Color | `element.color` | `FlowTextFrame.color` | **Preserved** | Hex / CSS color string | Low |
| Overflow Constraints | `element.maxLines`, `overflow` | Frame height & fit metadata | **Preserved** | Checked by Fit Engine | Medium |
| **SHAPES & CARDS** | | | | | |
| Rectangles / Cards | `ShapeElement` (rect) | `FlowShapeElement` (decoration) | **Preserved** | Geometry, fill, stroke, radius | Low |
| Rounded Corners | `element.cornerRadius` | `FlowShapeElement.cornerRadius` | **Preserved** | Rendered via SVG / canvas | Low |
| Lines / Dividers / Rules | `ShapeElement` (line) | `FlowShapeElement` (line) | **Preserved** | Stroke width and color | Low |
| Ellipses | `ShapeElement` (ellipse) | `FlowShapeElement` (ellipse) | **Preserved** | Rendered in decorations | Low |
| Arbitrary Polygons | `ShapeElement` (polygon) | `FlowShapeElement` (rectangle) | **Transformed** | Approximated to bounding rect | Low (`acceptable_approximation`) |
| Fill & Stroke | `element.fill`, `stroke` | `fill`, `stroke`, `strokeWidth` | **Preserved** | Solid colors mapped | Low |
| Opacity & Z-Index | `element.opacity`, layer order| `FlowShapeElement.opacity`, list order | **Preserved** | Stored and rendered | Low |
| Drop Shadows | `element.effects` (shadow) | Not currently editable | **Unsupported** | Emits fidelity warning | Low (`quality_affecting`) |
| **IMAGES** | | | | | |
| Asset Reference | `element.assetRef` | `FlowImageElement.assetRef` / `src` | **Preserved** | Resolves from asset registry | Medium |
| Fit Mode | `element.fit` (cover/contain/fill) | `FlowImageElement.fit` | **Preserved** | Direct CSS object-fit mapping | Low |
| Focal Point | `element.focalPoint` {x,y} | `FlowImageElement.focalPoint` | **Transformed** | Center fit rendered; focal stored | Low (`acceptable_approximation`) |
| Alt Text | `element.altText` | `FlowImageElement.altText` | **Preserved** | Accessibility attribute | Low |
| Crop / Mask / Frame | `element.frameId`, `crop` | Flattened unmasked display | **Transformed** | Stores crop in metadata; warns | Medium (`quality_affecting`) |
| Inline Legacy Data | `asset.legacyInline` | Data URI | **Preserved** | Legacy compatibility warning | Low |
| **TABLES** | | | | | |
| Grid Structure | `rows`, `columns` | `FlowTableElement` grid | **Preserved** | Exact cell count and structure | Critical |
| Cell Text & Spans | `cell.text`, `sourceSpanIds` | `cell.text`, `cell.sourceSpanIds` | **Preserved** | 100% exact copy retained | Critical |
| Header Rows | `element.headerRows` | `FlowTableElement.headerRows` | **Preserved** | Repeated on continuation pages | Medium |
| Cell Styling | `cell.style` | `FlowTableElement` cell style | **Preserved** | Font, background, borders | Low |
| Table Overflow | Overflowing rows | Multi-page table continuation | **Preserved** | Splitting across continuation pages| High |
| **CHARTS** | | | | | |
| Structured Data | `labels`, `data`, `chartType` | `FlowChartElement` / structured table| **Preserved** | Retained in flow decorations | Medium |
| Title & Commentary | `title`, metadata | `FlowChartElement.title` | **Preserved** | Rendered above visual chart | Low |
| Full Vector Editability | Freeform node editing | Structured visual block | **Transformed** | Warning emitted; re-projection safe | Low (`editability_affecting`) |
| **GROUPS** | | | | | |
| Group Hierarchy | `GroupElement.childIds` | Flattened elements | **Transformed** | Children individually editable | Low (`unsupported` grouping) |
| **PAGES** | | | | | |
| Dimensions | `width`, `height` | `FlowDocument.pageSize` | **Preserved** | Standard Letter (612x792 pt) | High |
| Background Color | `page.background.color` | `FlowPage.background` | **Preserved** | Rendered as canvas page back | Low |
| Design Role & Name | `page.role`, `page.name` | `FlowPage.role`, `designMetadata` | **Preserved** | Retained in project metadata | Low |
| Continuation Metadata | `continuationIndex`, etc. | `FlowContinuation` metadata | **Preserved** | Multi-page pagination provenance | Medium |

---

## 3. Structured Fidelity Report Model

Defined in `src/domain/design-spec/fidelity/types.ts`:

```typescript
export interface EditorProjectionFidelityReport {
  sourceSpecId: string;
  projectedProjectId: string;
  overall: "high" | "medium" | "low" | "unsafe";
  score: number; // 0–100
  counts: {
    total: number;
    preserved: number;
    transformed: number;
    unsupported: number;
    lost: number;
    blockers: number;
  };
  preserved: FidelityItem[];
  transformed: FidelityItem[];
  unsupported: FidelityItem[];
  lost: FidelityItem[];
  warnings: FidelityWarning[];
  blockers: FidelityBlocker[];
}
```

### Impact Categorization
- `harmless_transformation`: Aesthetic equivalence (e.g. normalizing whitespace, color casing).
- `acceptable_approximation`: Safe visual approximation (e.g. font substitution to Arial, polygon to bounding rect).
- `quality_affecting`: Visible polish lost (e.g. drop shadow dropped, image unmasked).
- `editability_affecting`: Visual present but not freeform editable (e.g. chart block).
- `copy_affecting`: Text or source span lost (**Critical Blocker**; automatically marks output `unsafe`).
- `export_affecting`: Export geometry or structure broken (**Critical Blocker**).

---

## 4. Projection Pipeline Architecture

Located in `src/domain/design-spec/adapters/toFlowDocument.ts`:

```
DesignSpec
    │
    ├── projectPage(...)
    │       ├── projectTextElement(...)       ──> FlowTextFrame
    │       ├── projectTableElement(...)      ──> FlowTableElement
    │       ├── projectShapeElement(...)      ──> FlowShapeElement (decorations)
    │       ├── projectImageElement(...)      ──> FlowImageElement (decorations)
    │       └── projectChartElement(...)      ──> FlowChartElement (decorations)
    │
    ├── aggregate FidelityItems & Warnings
    │
    ├── checkEditorExportConsistency(...)
    │
    └── assessDeliverableQuality(specScore, fidelityReport)
```

The pipeline never mutates the original `DesignSpec`. Every projector returns `{ element, outcome: { projected, fidelityItems, warnings, blockers } }`.

---

## 5. Export Consistency Check

Located in `src/domain/design-spec/adapters/exportConsistency.ts`:
Validates that:
1. Every visible text string in `DesignSpec` exists in projected `FlowDocument`.
2. Every table cell survives into the editable document.
3. Every decorative shape and image is accounted for.
4. Returns `{ valid: boolean, missingText: string[], missingTableCells: string[], missingDecorations: string[], blockers: FidelityBlocker[] }`.

---

## 6. Quality Score Trust Gate

Located in `src/domain/design-quality/trustGate.ts`:

A high DesignSpec heuristic score cannot be presented to the user as valid deliverable quality if the editor projection lost visual fidelity:

```typescript
export function assessDeliverableQuality(
  designSpecScore: number,
  fidelity: EditorProjectionFidelityReport
): DeliverableQualityAssessment {
  // If fidelity is unsafe or copy was lost:
  //   status = "editor_projection_loss_detected"
  //   trusted = false
  // If fidelity is low (<75):
  //   status = "quality_unverified_after_projection"
  //   trusted = false
  // If fidelity is medium (75–89):
  //   status = "quality_approximated"
  //   trusted = true (with disclaimer)
  // If fidelity is high (>=90) and score >= 60:
  //   status = "quality_trusted"
  //   trusted = true
}
```

The Editor Quality Panel and Dev Lab display these verdicts prominently.
