# Editor usability audit: Forma and Canva reference patterns

**Date:** October 2, 2026  
**Scope:** A signed-in local Forma account at 1440 × 1000, every editor rail panel before action, selected text and shape, and the first action in Document, Slides and Team. Canva comparison uses its public Help Center; no signed-in Canva workspace was inspected. This audit is about interaction patterns, not copying Canva's visual identity.

## What the reference shows

Canva's [editor guide](https://www.canva.com/help/glow-up/) describes a side panel for browsing tools and a contextual edit panel that changes with the selected object. Its [text guide](https://www.canva.com/help/add-and-edit-text/) places direct text editing on the canvas and formatting on a selection toolbar. [Formatting guidance](https://www.canva.com/help/format-text/) exposes font, size, color, emphasis and alignment together. [Uploads](https://www.canva.com/help/upload-media/) are browsable assets, not only a one-time file button. These patterns explain why Forma's single-purpose creation buttons felt unfinished even when an operation worked.

Forma's position remains different: a reference plus approved manuscript should keep exact copy and make every mapped region reviewable. Canva also offers [Grab Text](https://www.canva.com/features/edit-text-in-image/), so image text detection alone is not a defensible distinction.

## Signed-in Forma findings

Captured views: [Design](screenshots/editor-design.png), [selected text](screenshots/editor-text-selected.png), [selected shape](screenshots/editor-element-selected.png), and [Slides after creation](screenshots/editor-slides-created.png).

| Area | Observed journey | Current status and gap |
|---|---|---|
| Header and canvas | Project name, save state, File, Share, Export, zoom, selection toolbar | Clean basic hierarchy. Switching from graphics to slides previously left a graphic toolbar visible and the footer said “Page 1 of 1”; fixed in this pass. |
| Design | Six templates, search, category tabs, reference entry | Template selection keeps copy. Category tabs overflow the narrow rail with weak scroll affordance; template library is small. |
| Text | Six manuscript fields, add text, selection inspector | Added heading preset, a five-font selector, bold and italic. Text style saves and exports. It still lacks reusable brand text styles and direct double-click editing on the canvas. |
| Elements | Upload, shapes, selected-object inspector | Added visual choices for rectangle, rounded rectangle, ellipse and triangle, plus shape switching. In-place image replacement retains layer geometry and passed a focused browser check. Crop and an asset library remain open. |
| Reference | Upload, then image analysis or manual mapping | Entry is clear after upload; detection and manual recovery exist. Real-image quality and font matching remain unverified. |
| Document | Initially one create button; then pages, header/footer and repagination | Creation now names Content and no longer invents filler text when Content is empty. Direct page/body editing, polished tables and representative PDF review remain open. |
| Slides | Initially one create button; then thumbnails and exports | A normal labeled manuscript previously overflowed the slide; now its headline and copy lay out separately. Users can add a slide and edit its title, text and notes. Update from Content asks before replacing slide edits. Layout choice, richer slide design and real PowerPoint rendering remain open. |
| Workflows | Built-in event campaign, sample preview, apply, package import/export | A working packaged flow exists. General authoring, publishing and a nontechnical workflow builder are still incomplete. |
| Team | Create workspace, members, publish and audit after creation | The local account flow reaches its next screen. Supabase team operations still return unsupported responses, so this is not a hosted team feature. |
| Projects | New, open file, save template, project list | The panel now lives in its own component. Creating pages or slides creates a separate project and preserves the source; the slide creation, return and reload browser journey passes. Report and slide cards show their own page previews. |

## Changes made during this audit

1. Added contextual font family, bold and italic controls; new heading preset; four visual shape choices and shape switching. These settings persist in editable files and are reflected in SVG output.
2. Fixed guest reload timing: pending browser edits are written on page exit, so an immediate reload retains them.
3. Improved the initial slide from a labeled manuscript: the actual headline becomes the slide title, lines wrap within the page, and overly long content blocks export with a clear “needs more room” issue instead of silently disappearing.
4. Added selected-slide title, text and notes editing. An explicit confirmation protects manual edits when rebuilding from Content. Empty slides no longer introduce placeholder copy into exports.
5. Simplified Document and Slides panel labels, collapsed technical export details, cleared stale graphic selection on project-family changes, and made the canvas footer reflect the active slide or page.
6. Added in-place image replacement and a separate-project path for pages/slides. Saved-project links now follow the open design. Image and slide project browser checks pass.

## Next editor work, in order

1. Verify signed-in save/switch/reload for separate project families and run a nontechnical user session. The local guest slide return/reload browser journey passes.
2. Finish image editing: crop, positioning and a reusable upload library. Verify that exported image geometry matches the editor.
3. Add brand text and color styles across templates, reference overlays, documents and slides. Review SVG font portability before promising exact cross-device typography.
4. Make document pages editable and validate representative one-pagers, whitepapers and reports, including tables, print margins and PDF appearance.
5. Finish slide layout selection, multi-slide authoring and actual PPTX inspection in PowerPoint or another target viewer.
6. Make Workflows and Team understandable to first-time users, then complete hosted team permissions and lifecycle before presenting them as production-ready.
7. Run desktop/mobile, light/dark, keyboard and nontechnical usability sessions on the complete journey. Current screenshots are a visual audit, not usability research.

## Verification boundary

The audit used a local signed-in test account and captured editor screenshots. New typography, shape and slide checks run against the built local app. Canva's authenticated editor was not accessed, and hosted Supabase, live AI providers and PowerPoint rendering were not exercised here.
