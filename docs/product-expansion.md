# Forma expanded product direction

Proposed implementation plan · October 1, 2026. Stages 1–3 (graphics foundation, design systems, multi-page documents) are implemented in the product (see [architecture](architecture.md) and [progress](PROGRESS.md)). Stages 4–6 below remain future work.

## Product promise

Turn approved content into consistent, editable designs using a reference, a reusable template or a brand design system. Support both individual graphics and longer documents. Preserve supplied wording by default and make every content or design change reviewable.

The initial expansion serves designers, agencies and teams producing recurring branded materials. “All forms of design” is a direction, not a launch guarantee: motion, video, websites, complex illustration and full desktop-publishing parity are outside this roadmap.

## Three design families

| Family | Examples | Layout requirements | Intended outputs |
|---|---|---|---|
| Graphics | Flyers, banners, posters, social graphics | Freely positioned layers, custom dimensions, reusable variants | PNG, SVG, PDF |
| Documents | One-pagers, whitepapers, reports, brochures, editorial publications | Flowing text, columns, page masters, tables, captions, references and pagination | PDF and editable Forma source |
| Presentations | Sales, strategy and reporting decks | Slides, reusable layouts, tables/charts, speaker notes | PDF, editable PPTX and Forma source |

Build in that order. Editable PPTX is a separate export adapter with its own fidelity tests; it is not a prerequisite for documents. DOCX export and professional print requirements such as CMYK, bleed and PDF/X need separate feasibility and acceptance work. Do not label an ordinary PDF print-ready.

## Shared foundations

- **Content:** imported manuscript represented as ordered blocks with stable IDs, original source text and a mapping to rendered elements. Paragraphs, headings, lists, table cells, captions and citations retain provenance.
- **Brand systems:** named colors, font roles, spacing, logos, approved assets, table/chart styles and layout rules. Missing fonts or assets are visible errors or explicit substitutions.
- **Components:** reusable headings, footers, callouts, image/caption groups, KPI cards and tables with constraints. Templates assemble these into pages and document structures.
- **Skills:** named, versioned instructions describing how to apply a design system to a task, with permitted actions, examples and validation rules.
- **Review:** copy comparison, unmapped-content detection, overflow and brand checks, immutable approvals and explicit template/skill version upgrades.

The distinction matters: a brand defines the visual language; a component is a reusable object; a template defines a starting structure; a skill defines how to use them for a recurring task.

## Skills section

Examples: “Monthly performance report”, “Event campaign”, “Research whitepaper” and “Editorial feature”. Each skill declares:

1. Name, purpose, owner, version and supported design families.
2. Required inputs and optional assets/data, including which input is authoritative.
3. Brand and component/template versions to use.
4. Layout rules, such as heading hierarchy, table header repetition and minimum type size.
5. Content permissions: preserve exact copy by default; proposed edits require explicit review and acceptance before entering approved content.
6. Validation criteria, sample inputs, expected results and known limitations.

The interface includes a library, skill editor, preview against sample content, validation results and publish/version history. Draft skills are private until published to an authorized workspace. Updating a skill never silently changes existing projects or approvals.

Store a structured manifest alongside readable instructions. Export a portable package containing the manifest, instructions, referenced styles and example metadata; include assets only where the user has redistribution rights. Import validates schema, size, references and permissions. Imported instructions cannot override copy restrictions, access private data, run code or call external tools. Skills are declarative in the first release.

Provider adapters may translate this package into supported external formats later. An exported Markdown file alone does not establish Claude, ChatGPT or Gemini integration. Verify each target's actual import and execution behavior before claiming compatibility.

## Customer workflow and navigation

Main navigation: Home, Projects, Templates, Brand systems, Skills and Workspace settings. Platform administration remains a separate operator-only area.

Create → choose design family and dimensions → select reference/template/brand → import manuscript and optional structured data → optionally apply a skill → review the proposed structure → edit → run checks → approve → export.

The editor retains manuscript and canvas views. Add page thumbnails for documents and presentations, contextual layer controls, a style/component library and a checks panel. Advanced settings stay contextual. Copy permissions are per project and operation, never a single blanket consent hidden in account settings.

Provide three explicit layout policies:

- **Reference fidelity:** preserve approved geometry/artwork; flag content that cannot fit rather than silently changing wording or structure.
- **Layout adaptation:** allow reflow, region resizing and additional pages while preserving wording and brand constraints; show the resulting differences.
- **Creative proposals:** offer optional visual additions or copy suggestions. Keep proposed copy separate until the user accepts a diff. Never invent report data, sources or citations.

Changing copy length can make unchanged geometry and readable type incompatible. Surface this conflict and let the user choose; do not promise arbitrary pixel-perfect reconstruction.

## Architecture proposal

Introduce a versioned document schema rather than adding more fixed field names to `src/model.ts`:

```text
DesignDocument
  schemaVersion, id, family, metadata
  content: ordered source blocks with stable IDs
  pages: dimensions, master reference, ordered element tree
  elements: text frames, images, shapes, groups, tables, charts
  assets: authorized storage references
  brand/template/skill: pinned IDs and versions
  policy: content permissions, layout adaptation limits
```

Use separate fixed-canvas and flowing-document layout engines over shared elements and typography. Flowing text links frames across pages. Tables preserve cell values, repeat headers, handle row splitting and validate totals only where explicit formulas exist. Charts bind to supplied data and never ask a model to invent values.

AI returns bounded proposals against this schema. Server validation, copy mapping and deterministic renderers decide what is applied. Provider selection does not alter the content contract. Durable jobs, cancellation, bounded retries, usage accounting and clear failure states are prerequisites for heavier document generation.

Migrate legacy projects through a tested reader that maps their six fields to source blocks and text elements while retaining geometry and reference covers. Keep old projects readable and unchanged until an explicit conversion/save. Compare original and converted renders and copy before rollout. Review snapshots remain immutable in their original schema.

Separate uploaded assets into private Supabase Storage. Team membership, brand/template/skill access and operator access require server checks and RLS; hiding UI controls is insufficient. Team approvals should use authenticated identities rather than the current public review's self-reported names.

## Ordered delivery and acceptance gates

| Stage | Deliverable | Evidence required to mark complete |
|---|---|---|
| 0 — Stabilize existing beta | Reliable analysis/manual fallback, honest job status, hosted identity checks and coherent UI | Existing save/export/copy tests pass; representative references tested; provider failures recover visibly |
| 1 — Document foundation and graphics | Versioned schema, safe migration, arbitrary text/image/shape elements, custom page sizes and layer controls | Existing designs retain text and appearance; flyer and banner can be created, saved, reopened and exported without six-field restrictions |
| 2 — Reusable design systems | Brand tokens, components, versioned templates, declarative skills library/editor and preview | One skill produces two consistent graphics from different manuscripts; all source copy is accounted for; upgrades require review |
| 3 — Documents | Multi-page editor, text flow, masters, page numbering, tables, captions and document PDF export | One-pager, 10-page report and 20-page whitepaper fixtures; long tables, citations, overflow and font failures handled without content loss |
| 4 — Team operations | Workspaces, roles, shared publishing, authenticated approval and operator tooling | Cross-workspace denial, scoped publishing, pinned versions, audit and recovery tests pass — **local mode complete October 1**; Supabase RLS and platform-admin operator tooling remain open |
| 5 — Presentations and adapters | Slide layouts, data charts, editable PPTX and verified external skill adapters | Exported decks tested in target viewers; editable elements and known fidelity limits documented; each claimed integration exercised — **model/export/adapters complete October 1**; manual open in PowerPoint/LibreOffice/Slides remains a release check |
| 6 — Public production release | Hosted operations, storage/backup recovery, Paystack lifecycle, quotas, support and release checks | Production checklist passes; representative customer pilots establish usefulness and quality |

Security, identity, storage and admin work from the existing production backlog continue alongside these stages. A bounded graphics beta can ship before the expanded suite; do not defer basic operator access controls or incident handling until stage 6.

## First implementation slice

Start with the schema and legacy migration behind a feature flag, then deliver a custom-size flyer/banner with more than six editable text elements. Its complete journey must include manuscript mapping, save/reopen, undo/redo, review, fit checks and export. Only then build brand/components and the first event-campaign skill on that stable model. This gives each new abstraction a working user outcome before introducing long-document layout.

## Validation and differentiation

Evaluate the same approved content across a flyer, banner, one-pager and report. Measure omitted/changed text, manual corrections, layout defects, time to approved export and consistency across template versions. The proposed advantage is trustworthy reuse of a team's design system across formats, with traceable content and enforceable rules. This is a product hypothesis to test, not a verified market or quality claim.
