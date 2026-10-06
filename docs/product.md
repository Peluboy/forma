# Product specification

## Purpose and audience

**Current direction (October 2, 2026):** Forma has implementations for branded graphics, documents and presentations, with brand/workflow foundations. See [current project status](STATUS.md) for verification limits and [expansion specification](product-expansion.md) for intended acceptance gates. Implementation does not mean production readiness.

Help designers and business owners repeatedly update approved single-page graphics from a manuscript. The core outcome is a reviewable design with supplied copy, with layout changes visible and user controlled. Canva-quality interaction is a usability target; Forma is not a Canva clone or a full general-purpose publishing suite.

The initial audience is small agencies, event organizers, and marketing teams adapting recurring designs. The beta remains free by default. Optional Paystack billing now implements Free + configurable Pro analysis allowances; commercial prices remain unpublished. See [billing](billing.md) and [production readiness](production-readiness.md). A template marketplace remains outside this release.

## Core contract

1. Manuscript text becomes actual editable text objects, not generated lettering in a raster image.
2. Recognized section labels control mapping. Unknown labels remain content. Repeated recognized sections concatenate.
3. Leading/trailing whitespace is normalized and line wrapping is visual. “Exact copy” refers to wording after documented parsing, not a byte-identical document representation.
4. No AI call may rewrite the manuscript. Reference analysis returns candidate region geometry and style suggestions for review.
5. Overflow and unmapped nonempty reference fields block visual exports. Project JSON remains available for backup even when a design needs corrections.
6. Unmapped source artwork is retained as a background image. Selected text areas receive solid-color covers. This does not reconstruct texture behind old text.
7. Longer copy can require smaller text or larger regions. No universal pixel-perfect fit is promised.

## Scope

Images and shapes (October 1): the Elements panel supports uploaded PNG/JPEG/WebP artwork, rectangles and ellipses, plus selection, movement, size, color, locks and removal. Added text/image/shape layers can move forward or backward relative to one another; original artwork and original manuscript fields remain underneath. Images preserve their aspect ratio inside the selected box. Uploaded images are optimized for the canvas rather than retained at original resolution.

Page sizes (October 1): template designs support portrait, square, story, banner and bounded custom width×height. Layout coordinates remain in a 720×900 design space and scale to the selected page. Exports and editable backups record the resolved page size. Custom-size campaign ZIP exports the actual page rather than three aspect-ratio variants.

Manuscript blocks (October 1): imported copy is parsed into ordered content blocks. Recognized labels map to the six primary fields; additional labeled sections (after a blank line) become editable text layers on apply. Revision comparison includes those extra sections. Guest browser storage now defaults to versioned `forma-design` documents with a lossless Project projection for editing and cloud APIs.

Design systems (October 1): versioned brand tokens, declarative components, versioned templates and a published Event Campaign skill are available. Skills preserve exact copy, account for every manuscript section on apply, and require explicit review before upgrading a pinned skill version.

Documents (October 1): multi-page document projects support flowing text, pipe tables with header repeat, citations, page masters/numbers, and multi-page PDF export. One-pager / 10-page / 20-page fixtures retain all source blocks.

Presentations (October 1): 16:9 decks with title/section/content/two-column/chart layouts, speaker notes, categorical charts from numeric tables, PDF and editable PPTX export with documented fidelity limits.

Team operations (October 1, local accounts): workspaces with owner/editor/reviewer/viewer roles, cross-workspace denial, pinned publications, authenticated review decisions and an append-only audit log with membership recovery. Supabase-hosted team RLS is not yet shipped.

Users can add up to 50 independent text layers through **Text → Add text**. Each supports wording, position, size, font, color, alignment and locking. They render in previews, saved designs, review snapshots and exports, and participate in undo/redo and overflow checks. Manuscript application preserves separately entered layers while updating its managed content. Additional block mapping and multi-page implementation are described above; their acceptance limits are tracked in STATUS.md.

The workspace supports six built-in template styles, six semantic copy fields, portrait/square/story template layouts, manual reference mapping, text geometry/style controls, undo/redo, revision comparison, and portable project files. Account storage, saved revisions, expiring review links with comments and approval, brand settings, reusable templates, and automatic region proposals are implemented. Manuscripts can be imported as TXT, Markdown, DOCX, or text-based PDF (up to 25 pages and 3 MB). Exports include PNG, SVG, flattened PDF, editable project JSON, and a campaign ZIP containing three actual rendered aspect ratios. Consult the release record for what has actually been tested.

## Acceptance criteria

- A user can start a design, apply a manuscript, resolve fit issues, export, and reopen an editable backup.
- A changed manuscript shows changed and removed fields before application.
- A reference can be mapped manually even when analysis is unavailable.
- Signed-in projects belong to one user; another user cannot enumerate, read, edit, or review-manage them.
- Stale saves return a conflict rather than overwrite a newer version.
- Shared reviews use an immutable snapshot and expire or can be revoked.
- Server failures are visible; a failed cloud save is not reported as successful.

## Deferred capabilities

Arbitrary layer recovery, background inpainting, exact font detection/licensing, scanned-PDF OCR, rich DOCX formatting, collaborative live cursors, AI copy expansion, and semantically redesigned campaign variants remain future work. The implemented campaign pack adapts the same template to portrait, square, and story proportions, validates fit in every variant, and bundles their rendered PNGs with approved copy and editable source. It does not generate new campaign copy.

## Beta evaluation

Measure time from manuscript import to acceptable export, manual region corrections, overflow incidence, save failures, and repeat usage. Suggested pilot goals: ten real reference/manuscript pairs, no silently missing copy in accepted output, and meaningfully faster completion than the user's existing workflow. These are targets, not measured results. Obtain participant agreement before collecting content or identifiable analytics; the application does not need manuscript telemetry to measure completion time.
