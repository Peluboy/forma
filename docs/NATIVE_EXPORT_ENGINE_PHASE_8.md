# Native Export Engine v1 — Phase 8

Status: **Phase 8 implementation**. This document starts with the required export audit, then records the DesignSpec-native PDF engine. It is not a PPTX, DOCX, or import milestone.

---

## Part A — Current export audit

Inspected: `src/features/editor/lib/exports.tsx`, `EditorExportDialog.tsx`, `editorIoActions.ts`, `src/domain/design/presentation.ts`, `src/domain/design-spec/adapters/exportConsistency.ts`, `src/features/editor/lib/fontAssets.ts`, `src/domain/design-spec/adapters/fromFlowDocument.ts`, `fromLegacyGraphicProject.ts`, `toFlowDocument.ts`, workspace permissions, and `package.json` (jsPDF already present).

### 1. Current export paths

| Path | Entry | What it actually writes |
| --- | --- | --- |
| Graphics SVG | `svgBlob` → `Poster` React → SVG markup | Vector/text SVG of the editor canvas; selected Fontsource files embedded as data URIs |
| Graphics PNG | `pngBlob` rasterizes that SVG at 3× | Flattened bitmap |
| Graphics PDF | `exportProject("pdf")` embeds the PNG in jsPDF | One raster page |
| Campaign ZIP | PNG variants + manuscript TXT + `.forma.json` | Flattened images plus editable backup |
| Editable JSON | `serializeDesignFile` | Forma backup, not a client PDF |
| Document PDF | `documentPdf` renders `DocumentPageView` SVG → canvas PNG @ 2× → jsPDF | Multi-page raster PDF |
| Presentation PDF | `presentationPdf` renders `SlideView` SVG → canvas PNG → jsPDF | Multi-page raster PDF |
| Presentation PPTX | `buildPptxBlob` OOXML | Native-ish text/tables; charts become tables; out of Phase 8 scope |
| DesignSpec consistency | `checkEditorExportConsistency` | Structural check of FlowDocument vs DesignSpec, **not** a PDF |

There is no DesignSpec → PDF path today. Generated reports are projected to `FlowDocument`, then the editor rasterizes that view.

### 2. Which paths are rasterized

- Graphics PDF
- Document PDF
- Presentation PDF
- All PNG / campaign ZIP images
- Any SVG that is then drawn to canvas

### 3. Which paths preserve selectable text

- Graphics SVG: text nodes may be selectable in a viewer that keeps SVG text
- Editable JSON / PPTX text boxes: not PDF
- **No current PDF path preserves selectable text.** jsPDF only receives a PNG.

### 4. Which paths preserve vector shapes

- Graphics SVG, until it is rasterized for PNG/PDF
- Document/slide SVGs exist only as an intermediate; PDF does not keep them
- PPTX keeps some native shapes for slides only

### 5. Which paths lose fidelity

- Document renderer can clip lines/cells; that clipping is baked into the raster PDF
- Focal crop, shadows, grouping, and unknown fonts are already approximated in the editor projection
- Presentation PDF drops speaker notes
- PPTX charts become tables
- Template artwork in graphics remains baked SVG/art, not element-level PDF vectors
- Inline images are compressed WebP in the project, then re-encoded as PNG in PDF

### 6. Which paths depend on editor rendering

All visual PDFs and PNG/SVG exports depend on React canvas views (`Poster`, `DocumentPageView`, `SlideView`), `document.fonts`, DOMParser, and `html-to-canvas`. They cannot run as a pure DesignSpec job in Node without a DOM.

### 7. Which parts can be reused

- **jsPDF** is already a dependency and accepts custom page sizes, images, text, paths, and document properties
- DesignSpec element model (text, shape, image, table, chart, group, page background)
- Exact Copy + `validateDesignSpec` + fit measurements
- `computeLineWraps` / `measureTextElement` for overflow and wrapping
- Workspace membership/role helpers
- `fromFlowDocument` / `fromLegacyGraphicProject` when a stored DesignSpec is absent
- `checkEditorExportConsistency` remains the editor-projection check; it is not replaced
- `downloadFile` for the resulting blob
- Existing raster export functions, left in place as the legacy path

### 8. Which parts must be replaced (for native PDF)

- Screenshot / SVG-to-canvas-to-PNG as the **primary** PDF writer
- Filename sanitizer that only strips to `[a-z0-9 -]` and ignores client/workspace
- Export gating that only looks at editor overflow, not DesignSpec copy/fit/permissions
- Implicit claim that a raster PDF is a production deliverable

### 9. What is deferred

- Editable PPTX export from DesignSpec
- DOCX export
- PDF / PPTX import
- Full CMYK / PDF/X / print-shop prepress
- Advanced bleed and crop-mark systems (flags exist, not production)
- Font-file embedding / licensing workflow
- Cloud export queue, paid limits, collaborative export approval
- Marketplace export rules
- Major export UI redesign

### 10. Risks for client-ready export

- Standard PDF fonts only (Helvetica / Times / Courier). Requested families are mapped and reported; we do **not** copy or ship system font files
- Unicode beyond WinAnsi may not render in standard fonts
- Drop shadows and arbitrary polygons are unsupported or approximated
- Image DPI depends on the stored asset, often a compressed WebP
- Legacy projects without a stored DesignSpec are adapted and may carry adapter warnings
- Raster fallback, if ever used, must be explicit in the fidelity report
- Viewers cannot export workspace/client projects
- Existing editor PDFs remain flattened; users must choose **PDF, native beta** for selectable text

---

## Implementation (Parts B–S)

Native export lives in `src/domain/export/`. It consumes DesignSpec directly, runs preflight, draws pages with jsPDF (text, vectors, embedded images, structured tables/charts), writes an `ExportJob` with fidelity + metadata, and keeps the legacy raster path available.

See also:

- [PDF export v1](PDF_EXPORT_V1.md)
- [Export preflight v1](EXPORT_PREFLIGHT_V1.md)
- [Export fidelity report](EXPORT_FIDELITY_REPORT.md)

### What native PDF supports

Selectable text, vector rectangles/rounded rects/ellipses/lines/triangles, embedded images with fit/focal crop, structured tables, vector bar/line/pie charts, page backgrounds, font fallback warnings, workspace/client permission checks, safe filenames, and export metadata.

### What remains experimental

Bleed and crop marks (opt-in flags; not drawn as a print-shop system). Rotation of non-text elements. Opacity when the jsPDF GState path is unavailable.

### Why PPTX is deferred

Slide PPTX already exists as a limited OOXML adapter on the presentation model. A DesignSpec-native editable PPTX is a separate fidelity project and is explicitly out of Phase 8.
