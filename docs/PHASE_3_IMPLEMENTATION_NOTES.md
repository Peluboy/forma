# Phase 3 Implementation Notes: Interactive Editor Polish & Smart Layout Variants

Date: 2026-10-05
Status: In Progress

---

## 1. Current State Audit

### A. FlowDocument Image Rendering
- **Works**:
  - `FlowImageElement` exists in `flowDocument.ts` with `fit`, `focalPoint`, `src`, `assetRef`, `altText`, and geometry.
  - `DocumentCanvas.tsx` renders base64 data URIs using `<svg viewBox><image preserveAspectRatio="..."/></svg>`.
  - Fit modes (`fill`, `fit`, `crop`) map to SVG `preserveAspectRatio`.
- **Missing**:
  - Interactive visual controls to drag/adjust the focal point `{ x, y }` on selected images.
  - Image fit mode selector (cover, contain, fill) in the editor UI.
  - Reset crop / focal point action.
  - True focal alignment calculation (e.g. centering or translating around `focalPoint` in canvas/export).
  - Support for URL-based images (currently only checks `/^data:image\//`).
- **Risks**:
  - Export rasterizer (`html2canvas` / `jspdf`) must align with SVG canvas focal rendering.

### B. FlowDocument Chart Fallback Rendering
- **Works**:
  - `FlowChartElement` exists with `chartType` (`bar`, `line`, `pie`), `labels`, `data`, `title`, and geometry.
  - DesignSpec chart projection retains chart data in FlowDocument decorations.
- **Missing**:
  - `DocumentCanvas` only renders bar charts (`<rect>` bars) regardless of `chartType`. Line and pie charts are unrendered.
  - No structured chart data editor UI in the document editor (user cannot edit title, labels, or numeric values).
  - No provenance awareness: editing values derived from manuscript source spans should issue appropriate copy warnings.
- **Risks**:
  - Chart data edits must not silently corrupt or diverge from manuscript provenance unless user explicitly edits generated data.

### C. EditorQualityPanel
- **Works**:
  - Re-evaluates quality, copy validity, fit validity, and projection fidelity dynamically on project change.
  - Displays trust-gate verdict (`quality_trusted`, `quality_approximated`, `quality_unverified_after_projection`, `editor_projection_loss_detected`).
  - Lists top issues and provides a single 1-click fix (`raiseSmallText`).
- **Missing**:
  - Rich one-click fixes for: excessive line length, weak heading scale, inconsistent alignment, too-tight/loose spacing, image fit issues, weak focal point, repeated layout patterns, and table overflow continuations.
  - Undo/revert history for applied one-click fixes.
  - Layout alternative recommendations and preview UI.
- **Risks**:
  - Fixes must strictly preserve Exact Copy, Layout Fit, and Projection Fidelity without mutating locked or source-anchored elements.

### D. ProjectionFidelityPanel & PipelineDevPanel
- **Works**:
  - Side-by-side DesignSpec vs. FlowDocument page preview.
  - Fidelity metrics breakdown, continuation pages count, copy coverage status, and AI critic signal status.
- **Missing**:
  - Interactive image focal crop preview.
  - Chart block structured data view.
  - Slot remapping preview and before/after layout switch comparator.
  - Human review insights display.

### E. DesignSpec Chart & Image Models
- **Works**:
  - `ChartElement`: `type: "chart"`, `chartType: "bar" | "line" | "pie"`, `labels: string[]`, `data: number[]`, `title?: string`.
  - `ImageElement`: `type: "image"`, `assetRef: string`, `fit: "contain" | "cover" | "crop" | "fill"`, `focalPoint?: { x: number; y: number }`, `altText?: string`.
- **Missing**:
  - Structured updates when user edits in FlowDocument editor are not synced back to a candidate DesignSpec if re-projection occurs.

### F. TemplateFamily Layout Metadata & Slot Remapping
- **Works**:
  - `TemplateLayout` defines `slots`, `baseElements`, and `fallbackLayouts`.
  - `editorialReport.ts` defines layouts for cover, content, stats, tables, quotes, and continuations.
- **Missing**:
  - `compatibleAlternatives` not explicitly defined on layouts.
  - No deterministic slot remapping utility (`remapLayoutSlots`) that transfers assigned content nodes from an old layout's slots to a new layout's compatible slots while strictly preserving order and exact copy.

### G. Correction Planner & Executor
- **Works**:
  - `correctionPlanner.ts` ranks issues and selects bounded actions.
  - `correctionExecutor.ts` applies bounded font scale, grid alignment, spacing, and region width changes.
- **Missing**:
  - `swap_compatible_layout` / `change_layout_variant` is not in `SUPPORTED_ACTIONS`.
  - `applyQualityCorrection` rejects any action without an `elementId`, preventing page-level layout swaps.

### H. Trust Gate, Benchmarks & Human Reviews
- **Works**:
  - `trustGate.ts` gates deliverable score against fidelity.
  - `quality-benchmark.ts` supports `--case`, `--with-ai-critic`, and `--write-review-package`.
  - `humanReview.ts` and `summarize-human-reviews.ts` parse review records and compute calibration metrics.
- **Missing**:
  - Review insights generator (`npm run review:insights`) that maps human complaints back to deterministic issue types, recommends rubric adjustments, and identifies false positives/negatives.
  - 5 stress benchmark cases (image-heavy, chart-heavy, stat-heavy, text-heavy requiring layout switch, table-heavy requiring continuation).

---

## 2. What Will Be Changed in Phase 3

1. **Interactive Image Crop & Focal Controls**:
   - Add focal point coordinate dragging / clicking and fit mode toggle in the editor sidebar for selected image blocks.
   - Update `DocumentCanvas.tsx` to center/position images based on `focalPoint`.
   - Add reset focal crop action.
2. **Editable Chart Blocks v1**:
   - Add structured chart data editor in editor sidebar (title, labels, values, add/remove/reorder rows, chartType selector).
   - Render bar, line, and pie charts in `DocumentCanvas.tsx`.
   - Enforce numeric validation and manuscript provenance warnings.
3. **Smart Layout Variant Switching**:
   - Add `compatibleAlternatives` and slot compatibility rules to `TemplateLayout`.
   - Implement deterministic `remapLayoutSlots` preserving Exact Copy, SourceSpan order, and reading hierarchy.
   - Implement `swap_compatible_layout` in `correctionExecutor.ts` and `correctionPlanner.ts`.
   - Expose "Try alternate layout" in `EditorQualityPanel` with before/after score, validation checks, and apply/cancel.
4. **One-Click Quality Fixes**:
   - Expand `EditorQualityPanel` to offer validated 1-click fixes for typography scale, heading ratio, spacing, alignment, image fit, and layout swaps.
   - Ensure local snapshot/restore undo capability.
5. **Human Review Feedback Loop & Insights**:
   - Create `src/domain/design-quality/reviewInsights.ts` and `scripts/generate-review-insights.ts` (`npm run review:insights`).
   - Map human complaints to deterministic rubric rules and suggest rubric tuning.
6. **Benchmark & Dev Lab Enhancements**:
   - Add 5 stress test fixtures to `qualityCases.ts`.
   - Update `quality-benchmark.ts` to report layout swaps, chart/image usability fields.
   - Update `PipelineDevPanel.tsx` with layout alternative previews and human insights.

---

## 3. What Will Be Deliberately Deferred

- Arbitrary vector pen/node editing for charts or shapes.
- Full multi-axis / secondary-axis financial charting engine.
- Photoshop-style polygonal or Bézier image masking.
- AI-driven non-deterministic slot reassignment.
- PDF / PPTX arbitrary layout reconstruction.
- Direct persistence format migration away from FlowDocument.
