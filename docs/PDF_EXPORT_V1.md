# PDF Export v1

## Library

**jsPDF 4.x** (`jspdf`), already in `package.json`. No new PDF dependency is added.

## Why this was chosen

- Already used by every current PDF path, so the build, Vite, and Node test runner already accept it
- Draws **selectable text** with `text()`, not only images
- Draws **vector** rectangles, rounded rectangles, ellipses, lines, and polygons
- Embeds **real images** from data URIs (`addImage`)
- Custom page sizes in points
- Document properties for lightweight metadata
- Works in the browser (editor download) and in Node (tests + `benchmark:exports`)
- Does not require shipping or exposing private font files

Alternatives considered and rejected for v1:

- **pdf-lib**: another dependency; similar font limits unless we embed files
- **Puppeteer / print-to-PDF**: editor-dependent, not DesignSpec-native, heavy
- **Keep rasterizing SVG**: fails the selectable-text and vector requirements

## Browser / server constraints

- Primary path is **synchronous in-process** (browser editor or Node script). There is no cloud export queue
- Node export does not need a DOM or `document.fonts`
- Images must be resolvable as data URIs or already-loaded bytes. Remote URLs that the current architecture cannot fetch are reported, not silently skipped
- Standard PDF fonts only. Fontsource files stay in the UI/SVG raster path and are **not** copied into native PDFs

## Limitations

- WinAnsi / standard fonts. Unknown families fall back to Helvetica, Times, or Courier
- No CMYK, PDF/X, ICC profiles, or bleed boxes
- No tagged/accessible PDF structure tree
- Drop shadows and arbitrary freeform paths are unsupported
- Pie/bar/line charts are vector drawings from structured data, not a charting library
- Bleed and crop marks are experimental flags and are not a print-shop system

## Unsupported features

- Editable PPTX / DOCX from DesignSpec
- PDF import
- Font-file embedding and licensing
- Full print prepress
- Collaborative export approval

## Fallback behavior

- Missing **required** images block export
- Missing **decorative** images warn; a labelled placeholder is drawn so the slot is not omitted
- Unsupported effects warn. They rasterize only when `rasterizeUnsupportedEffects` is true; that rasterization is recorded and the fidelity status cannot be `export_trusted`
- Legacy editor PDF remains available as an explicit flattened path. Native export does **not** silently fall back to it
- After editor edits, native PDF requires DesignSpec sync (`in_sync` or `sync_with_approximations`). Stale or unsupported edits block selectable PDF.
