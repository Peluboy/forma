# ContentGraph v1 and DesignSpec v1

## Purpose and current status

Forma needs a source-aware design model before AI can produce trustworthy editable pages. This milestone adds two **opt-in, versioned domain models**. It does not change the persisted project root, current canvas renderer, AI concept response, or export formats. Legacy `Project`, `FlowDocument`, and `PresentationDeck` remain the production models. See `src/domain/content/` and `src/domain/design-spec/`.

## Three distinct responsibilities

| Model | Answers | Current role |
| --- | --- | --- |
| `ContentGraph` v1 | What source content exists and which characters are approved? | Deterministic manuscript structure and provenance. No geometry or design styles. |
| `DesignSpec` v1 | What editable pages and elements make up a design? | Future canonical design contract. Generated from selected legacy projects on demand for tests and development. |
| Legacy `Project` | How does today's editor save/render a graphic, flow document, or presentation? | Continues to be the persisted production root. No automatic migration. |

## ContentGraph v1

`ContentGraph` has `version: "1.0"`, stable `id`/`sourceId`, the unmodified `sourceText`, `copyPolicy`, a partitioning `SourceSpan[]`, and semantic `ContentNode[]` (`src/domain/content/types.ts`). Supported node kinds include headings, paragraphs, list items, quotes, tables/rows/cells, CTAs, captions, and unknown content. Nodes have no coordinates or styling. `contentGraphFromManuscript` uses the current deterministic manuscript parser for known field semantics and line/table classification for source coverage. It does not claim reliable DOCX/PDF table reconstruction; table extraction confidence is marked low where the source format is unknown.

Source offsets are UTF-16 string offsets into the original manuscript. The span set partitions the raw string, including syntax and whitespace. Content spans represent approved displayed copy. Syntax spans represent labels, table delimiters, line breaks, and similar source formatting; they are still attached to nodes and explicitly marked as manuscript formatting, but are not required to appear on the design. IDs use source ID, text hash, role, and occurrence count rather than array position. Keeping a `sourceId` stable lets IDs survive many unrelated insertions; changed text or a preceding identical duplicate can still change an ID. This is provenance, not a collaborative text CRDT.

`validateContentGraphCoverage` checks raw-offset partition, original-text equality, unique spans, and semantic-node coverage. It never silently drops unknown text. `ContentBlock` and `DocContentBlock` now optionally carry `sourceSpanIds`; old persisted blocks without them remain valid. Parser matching is best effort: if it cannot locate a block exactly in the raw source, the IDs are absent rather than guessed.

## Copy policy and Exact Copy

The shared policy is `exact | light_edit | rewrite_allowed`. New projects and graphs default to `exact`; old project records without the optional property continue to load, and adapters treat them as exact by default. This milestone implements deterministic validation for exact mode only. It does not introduce a UI for choosing other policies or lock the existing manual editor against deliberate edits.

`compareSourceCoverage` / `validateExactCopy` compare required source spans against visible text fragments with page/element IDs. They return structured issues for missing, duplicated, altered, untracked, conflicting, and reordered copy. `normalizeForStructuralComparison` only folds layout whitespace (`CRLF`, line wraps, spaces, tabs, nonbreaking spaces). It preserves words, punctuation, symbols, numbers, case, and their order. `validateDesignSpecCopyCoverage` collects visible text elements and table cells in page order, skips hidden pages/elements, and applies this check. It does not treat raster images as proof of visible approved text.

The validator requires source-span provenance for a trustworthy pass. Legacy adapters may return warnings and mark provenance unavailable when old manual edits cannot be aligned. A missing provenance result is **not** an Exact Copy certificate. Displayed headers/footers from the legacy document master are metadata in the adapter, not manuscript copy elements.

## DesignSpec v1 root and pages

`DesignSpec` has `version: "1.0"`, ID/name, `family` (`graphic`, `document`, or `presentation`), `copyPolicy`, `documentSize` with an explicit unit (`px`, `pt`, `in`, `mm`), pages, optional styles/assets, and metadata. Each `DesignPage` has ID, optional name/role, dimensions, background, ordered `elementIds`, typed `elements`, and optional metadata. The supported page roles are cover, intro, section, content, stats, quote, table, chart, closing, and custom. They are descriptive hints; no automatic layout selection uses them yet.

Every element has an ID, type, x/y/width/height, and optional rotation/opacity/hidden/locked/zIndex/parentId/sourceSpanIds/styleRef/constraints/provenance/metadata. Coordinates use the document unit. `elementIds` gives the page's stacking order and must contain each page element once. Parent references are same-page group relationships; no responsive layout engine exists yet.

## Element types

- **Text:** plain text, optional future runs, typography, alignment, vertical alignment, paragraph spacing, and overflow intent. Text can reference source spans.
- **Image:** asset reference, fill/fit/crop, optional crop/focal point/alt text/frame relationship.
- **Shape:** rectangle, rounded rectangle, ellipse, triangle, line, or polygon with fill/stroke fields. Arbitrary vector paths are not part of v1.
- **Frame:** basic image mask shape and fit mode.
- **Table:** explicit rows, columns, cells, header-row count, per-cell source spans and optional styles. Tables are not flattened into strings.
- **Chart:** limited chart type, labels, numeric data, title, and provenance fields. No chart editor is included.
- **Group:** child IDs and parent references to establish hierarchy. No constraint solver is included.

The minimal style registry supports named colors, text styles, and spacing. `styleRef` points to a key in this registry. It is a foundation, not the full brand model. `LayoutConstraints` defines optional min/max sizes and font sizes, resize/move/reflow permissions, and aspect-ratio intent; it has no solver. `ElementProvenance` records a bounded origin (`user`, `legacy_adapter`, `template`, `ai`, or `system`) plus optional source spans/template ID/generator version. Sensitive prompts do not belong in this metadata.

## Validation

`validateDesignSpec` returns structured issues for invalid root/dimensions, duplicate IDs, missing or duplicate page element references, nonfinite/negative geometry, missing or invalid parents, group cycles, unknown asset/style references, malformed table dimensions/cells, and exact-copy provenance inconsistencies. It does not validate visual quality or exact manuscript coverage alone; combine it with `validateContentGraphCoverage`, `validateDesignSpecCopyCoverage`, and, later, measured fit/QA. Legacy adapter warnings are separate from schema validation and must be surfaced to any future generation pipeline.

## Legacy adapter strategy

`fromLegacyGraphicProject` maps managed fields, text layers, shapes, images, frames, background, and added-layer order into one page. It maps source spans where exact text can be found. Reference-overlay projects retain the original reference as a raster image plus covers/text; that is **not** design reconstruction. Static template SVG artwork has no individual editable legacy elements and yields an explicit warning. Inline image data is allowed only as a temporary compatibility asset reference, with a warning about future object storage.

`fromFlowDocument` maps each legacy page, text frame, and structured table. It carries master header/footer/page-number settings as metadata and warns that they are not editable elements in this adapter. It warns about continuation frames, missing blocks, and table cells that cannot be uniquely matched to source spans. Neither adapter mutates the original project. There is no round-trip `DesignSpec -> Project` and no presentation adapter in this milestone.

## Persistence and migration strategy

Projects continue to save through the existing `Project` JSON, guest storage, SQLite, or Supabase. `DesignSpec` is derived on demand, never auto-written to user records. A future migration should be explicit, versioned, loss-aware, and reversible, with old project readers kept until every renderer/exporter supports the canonical model. A schema version in a `.forma.json` compatibility projection is **not** proof that all project families are currently canonical DesignSpec files.

The new Supabase migration `202610040001_records_and_reviews.sql` is independent of DesignSpec storage. It extends allowed hosted `forma_records` kinds to template/skill and fixes review approval at the database boundary. It does not convert records or broaden kinds to arbitrary strings.

## Deliberately deferred

Phase 8 adds a native PDF export path that consumes DesignSpec directly (`src/domain/export/`). Legacy editor PDFs remain rasterized and available. Editable PPTX from DesignSpec, DOCX, PDF/PPTX import, CMYK, and font-file embedding are still deferred. The Phase 0 visibility check still prevents known text/table overflow from silently reaching the flattened editor export.

The intended next pipeline is: deterministic manuscript extraction and ContentGraph → bounded AI content/layout reasoning → deterministic template/layout instantiation into DesignSpec → measured fit and deterministic QA → editable canonical renderer → native export. The model may choose a pattern but should not bypass source coverage, geometry validation, brand constraints, or export preflight. Fit, QA, and export should eventually consume the **same DesignSpec** rather than three divergent legacy models.
