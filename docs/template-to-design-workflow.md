# Template and reference to finished design

Product specification · October 4, 2026. The first saved-graphic-template repeat-job slice is implemented; the broader agency/PDF/reference workflow below remains a proposal. Read [status](STATUS.md) for what exists now.

The [AI-first design direction](ai-first-design-direction.md) supersedes template reuse as the primary creation journey. This document remains the detail for preparing and reusing approved templates and reference constraints.

## Ownership and permissions

Agency members can upload and own templates within their workspace. Designers or workspace owners prepare and publish them; ordinary members use the published versions to create jobs. Client brands, source files, manuscripts and outputs stay scoped to that workspace and client. Platform admins manage Forma's public starter library, support, policy and operations; they are not a bottleneck for agencies importing private templates. A public/community marketplace is a separate later decision.

The current app supports account-owned **Save current design as a template** and a dashboard repeat-job dialog for saved graphics templates. Hosted agency workspaces, role-enforced template publishing and design-PDF template ingestion are not complete.

## Two start paths

**Reusable template:** Pick an existing structured Forma template, or upload a PDF/image and prepare it once. Mark content slots, image frames, locked artwork and brand roles. Publish a version. For a new job, choose template and client brand, upload manuscript/assets, preview proposed layouts, review warnings and export. The prepared template should make repeat jobs fast.

**Reference design:** Upload a flyer, one-pager or other picture reference, then upload a manuscript. Choose how closely to follow the reference and what may change. The system detects regions and proposes an editable layout or bounded overlays. Review the result before export. A single flattened reference cannot always reveal fonts, layers or obscured artwork; show a fidelity estimate and preserve the original file.

For both paths, default to exact source copy. The user can separately allow *suggested* wording, but no suggestion enters the approved copy without a visible diff and acceptance. Never invent data, citations, prices or testimonials.

## PDF ingestion

Classify each page as vector/text-rich, partially flattened or image-only. Render a faithful preview, extract available text/vector/image objects and page dimensions, then propose slot boundaries and styles. Preserve the original PDF as an immutable source. Let the designer correct extraction and choose which parts are fixed background versus editable elements. A scanned/flattened PDF starts as a visual reference and needs manual or AI-assisted rebuilding for true editability. Font substitution and table reconstruction need explicit review.

Import and edit are different promises. [Adobe Express PDF import](https://helpx.adobe.com/express/web/bring-in-assets-from-other-apps/import-acrobat-files/import-pdf.html) warns that complex layouts or uncommon fonts can change on conversion; [Canva's PDF help](https://www.canva.com/help/import-and-edit-pdfs-canva/) likewise notes that flattened text may remain uneditable. Forma should report editable coverage rather than imply every PDF becomes a perfect native template.

## Fit without losing the design

Treat the source as a hierarchy of constraints, not a single fixed image. Preserve locked artwork, page identity, content order, brand roles and minimum legible type. For text that does not fit, try permitted changes in order: use the intended alternate text slot; adjust spacing within bounds; expand a flexible region; rebalance columns or neighboring flexible blocks; choose a longer-form layout from the same template family; add a page/slide where allowed. Only reduce type down to the template's minimum. Do not crop or paraphrase approved copy. Keep a before/after comparison of geometry and styles.

Offer three plain-language options before generation:

1. **Match closely:** Keep page size, composition and artwork; flag content that cannot fit.
2. **Fit the content:** Keep visual language and structure, but allow bounded reflow, alternate layouts or pages.
3. **Use as inspiration:** Keep selected typography, colors and imagery direction while allowing a new composition. Label the result as an interpretation, not a recreation.

If constraints conflict, show choices such as “Add a page”, “Use the longer layout” or “Edit the manuscript”. Never silently squeeze text below the legibility floor or let it overlap another object.

## Simple choices, structured design brief

The UI should show short choices, not a prompt editor: **Layout** (three options above), **Copy** (exact, default; or review suggestions), **Images** (use supplied; suggest placeholders; generate only with consent), **Colors** (reference; selected client brand; custom), and **Output** (flyer, social size, one-pager, report or slides as supported). Advanced settings can live in a disclosure. Show an estimated result only after the user supplies inputs, then let them review the proposed changes.

Represent the choices as a versioned, validated brief. Example schema values, not a literal model prompt:

```json
{
  "briefVersion": 1,
  "source": { "kind": "referenceImage", "assetId": "uploaded-reference" },
  "output": { "family": "graphic", "preset": "flyer" },
  "layout": { "mode": "fitContent", "allowNewPages": false, "minimumTextSizePt": 12 },
  "copy": { "policy": "exact", "suggestionsRequireApproval": true },
  "imagery": { "mode": "suppliedOnly", "replaceOriginalImages": false },
  "color": { "mode": "clientBrand", "brandId": "selected-brand" },
  "preserve": ["contentOrder", "logo", "lockedArtwork", "visualHierarchy"],
  "review": { "showLayoutDiff": true, "blockOnOmissionOrOverflow": true }
}
```

The model receives this bounded brief plus permitted visual/source inputs and returns candidate layout changes. Application code validates IDs, editable regions, exact text and data, assets, limits and output fit; it renders a preview and explains each change. JSON alone is not a quality guarantee. Use template-specific constraints and measured output checks, not only a long natural-language instruction.

## First delivery slice

1. Complete a structured single-page flyer template with named text/image slots, brand color/font roles, fixed/flexible regions and a minimum font size. Allow workspace owners to save and reuse versions.
2. Add the new-job wizard: choose template, client brand, upload manuscript and images, choose **Match closely** or **Fit the content**, preview, review warnings, export. Reuse current copy mapping and export checks.
3. Test short, normal and long manuscripts against that template. Preserve every character, prevent overlap, keep type legible and compare brand/layout differences. A second agency user must complete a repeat job without touching individual layers.
4. Then add design-PDF preparation, first as a faithful background plus mapped slots; add richer object extraction only when fidelity can be measured. Expand to multi-page PDFs, one-pagers and reports after the single-page path works.

Track initial template preparation time separately from repeat-job time. The goal is minutes for prepared, compatible templates, not a blanket promise for arbitrary PDFs or reference photos.
