# Reference Design Intelligence v1 (Phase 4)

Date: 2026-10-07
Status: Implemented (v1)

---

## 0. Purpose and product distinction

Phase 4 lets Forma understand the **visual language** of a reference design and use
it to generate a **new editable document** from a new manuscript.

It is explicitly **not** design reconstruction.

```
Reference design
  → visual analysis
  → design tokens
  → observed layout patterns
  → candidate TemplateFamily
  → editable generated design from new manuscript
```

The question Forma answers is:

> "How does this design communicate visually, and how can Forma use that design
> language to create a new editable document?"

It is **not**: "Upload a design and recreate it perfectly."

A `ReferenceDesignProfile` describes *how a design communicates* (typography
hierarchy, palette, spacing rhythm, layout structure, page roles, visual density,
image treatment, table/chart style, recurring motifs, brand feel, page
sequencing). It does not store pixel-accurate objects, editable layers, or a
pixel-perfect reproduction of the source.

---

## Part A — Current reference support audit

This audit was produced by inspecting the actual code, not the documentation.

### A.1 What currently exists

| Area | Location | What it actually does |
| --- | --- | --- |
| Reference image upload | `src/features/editor/panels/EditorReferencePanel.tsx`, `src/features/editor/lib/fileImports.ts` (`readReferenceFile`) | Accepts PNG/JPG/WebP up to 2 MB, stores a data URI on `Project.reference`. |
| Reference analyzer endpoint | `server/app.ts` `POST /api/reference/analyze` | Rate-limited, auth-gated. Validates data URI + provider, calls `analyzeReference`. |
| Server analysis | `server/analysis/index.mjs`, `server/analysis/index.d.mts` | Local OCR (tesseract.js), OpenAI vision, and Gemini vision. Returns `regions` (id, text, confidence, box in 720×900 space, fontSize, fontFamily, textColor, coverColor, suggested field), `warnings`, `provider`. Has strict input validation (`validateImage`) and region normalization (`normalizeRegions`). |
| Reference region detection | `server/analysis/index.mjs` (`normalizeRegions`, `suggestField`) | Bounds regions to 720×900, clamps font size, whitelists font families and field roles. |
| Old raster overlay workflow | `src/features/editor/dialogs/AnalysisReview.tsx`, `Project.designMode = "reference"`, `layouts`, `covers`, `mappedFields` | Detected regions are mapped to the six fixed manuscript fields. Applying replaces approved regions with solid-color covers and editable text. Unselected pixels remain the original raster. |
| Image upload normalization | `readReferenceFile`, server `validateImage` | EXIF-rotated, resized, flattened, re-encoded to PNG before any third-party transfer. |
| Create-page reference flow | `src/features/create/CreatePage.tsx` | Optional image reference for the **graphics** creative flow. `freedom` ("close"/"style"/"explore") influences prompts. Report workflow (`docMode === "report"`) ignores the reference entirely. |
| Editor reference panel | `EditorReferencePanel.tsx` | Provider select, "Detect text areas", compare toggle, manual region drawing. |
| DesignSpec image support | `src/domain/design-spec/types.ts` (`ImageElement`, `FrameElement`) | Images, `fit`, `focalPoint`, `crop`, alt text. |
| TemplateFamily support | `src/domain/template-family/*` | `DesignTokenSet`, layouts, slots, `baseElements`, validation, resolver, slot remapping. |
| Design Quality Engine v2 | `src/domain/design-quality/*` | 12-dimension rubric, rhythm, corrections, trust gate. |
| Visual Critic | `src/domain/visual-critic/*`, `server/qualityCritic.ts` | Heuristic page critique + opt-in AI image critique with bounded taxonomy. |
| Pipeline dev panel | `src/features/dev/PipelineDevPanel.tsx`, `ProjectionFidelityPanel.tsx` | Dev lab for the report pipeline. No reference inspection. |
| OCR/vision utilities | `server/analysis/index.mjs`, `server/qualityCritic.ts` | Reusable image validation + provider routing. |

### A.2 What is raster overlay only

The editor's `designMode: "reference"` path is a **raster overlay**, not reference
intelligence. It paints solid-color covers over detected regions and reuses the
original bitmap underneath. It does not extract tokens, layout patterns, page
roles, or visual language, and it only maps to the six fixed graphic fields. It
cannot influence multi-page document generation.

### A.3 What is prompt-level influence only

In `/create` graphics mode, the uploaded `reference` is passed to the concept
prompt with a `freedom` hint. There is no structured extraction: the model sees
the image and may imitate it loosely. No `ReferenceDesignProfile` exists, no
tokens are produced, and nothing is verifiable or editable-as-a-system.

### A.4 What is reusable

- `validateImage` / `normalizeRegions` input hardening and region schema.
- The provider routing + sanitized-error pattern in `server/analysis/index.mjs`.
- `DesignTokenSet`, `TemplateFamily`, `TemplateLayout`, slot grammar — the
  natural target type for reference-derived families.
- The deterministic report pipeline (`runAiDesignerPipeline`) and its gates
  (Exact Copy, fit, quality, projection fidelity, trust).
- `validateDesignSpec`, `validateDesignSpecCopyCoverage`, `evaluateDocumentFit`,
  `validateTemplateFamily`.
- `PageRole` vocabulary and the editorial-report layout grammar.

### A.5 What must change

1. Add a versioned `ReferenceDesignProfile` domain model (tokens, layout
   patterns, visual language, page/region analysis, confidence, warnings).
2. Add a **deterministic, high-confidence** extractor from `DesignSpec`
   (colors, typography scale, spacing, page roles, layout patterns).
3. Add a **cautious image v1** path that reuses the existing vision provider and
   converts validated regions into an approximate profile (lower confidence).
4. Add a `ReferenceDesignProfile → TemplateFamily` converter with a confidence
   gate and a low-confidence fallback (reference-guided styling).
5. Wire reference usage into `runAiDesignerPipeline` behind a feature flag,
   recording usage mode, confidence, and a similarity report.
6. Surface the reference intelligence in `/dev/reference`.
7. Document clearly what is supported, inferred, correctable, and unsupported.

### A.6 What is deliberately deferred

- Arbitrary PDF/PPTX editable reconstruction.
- Full Figma-style object extraction.
- Marketplace, agency workspace, real-time collaboration.
- Generic image generation, logo/brand legal detection.
- Full OCR correction workflow, perfect image-to-vector conversion.
- Automatic import of every reference object as an editable layer.

PDF/PPTX references are **not** parsed in this phase. The UI reports
`unsupported_reference_format` rather than promising reconstruction.

---

## 1. Reference sources supported (v1)

| Source | Confidence | Path |
| --- | --- | --- |
| `design_spec` (existing Forma generated project / DesignSpec) | High (deterministic) | `buildReferenceProfileFromDesignSpec` |
| `image` (uploaded PNG/JPG/WebP) | Low–medium (inferred) | region mapping via `POST /api/reference/analyze` |
| `forma_project` | High (resolves to its DesignSpec) | same extractor as `design_spec` |
| `unknown` | Unusable | rejected |

## 2. What is inferred vs. observed

- **Observed (image):** approximate region bounds, dominant pixel/text colors as
  reported by the vision provider, per-region font size/weight/alignment guesses.
- **Observed (DesignSpec):** every element, token, page role, and geometry is
  read directly — these are facts of the artifact.
- **Inferred (both):** visual tone, density, composition style, image/data usage,
  role guesses, and which layouts the reference supports. These are labelled
  `inferred` and carry confidence.
- Tokens are **inferred candidates**, never official brand rules.

## 3. Confidence

Every profile carries `ReferenceConfidence` (`overall`, `colors`, `typography`,
`layout`, `imagery`, `data`) in `0..1`. Extraction emits `ReferenceWarning`s such
as `low_resolution_reference`, `insufficient_text_detected`,
`typography_uncertain`, `layout_regions_uncertain`, `no_reusable_patterns_detected`,
`image_only_reference`, `multi_page_reference_not_available`,
`extraction_provider_unavailable`, `unsupported_reference_format`. Uncertainty is
never hidden.

## 4. How reference style influences generation

`referenceUsageMode` is recorded on every generated document:

- `none` — no reference.
- `reference_derived_template` — a reference-derived `TemplateFamily` passed the
  gate and was used.
- `reference_guided_tokens` — the standard family was re-skinned with
  reference-derived tokens (fallback when a full family is not confidently
  supported).
- `reference_low_confidence_fallback` — the reference was too weak; the standard
  family was used and no tokens were applied.

Exact Copy, fit, quality, projection fidelity, and the trust gate always run.
A reference never rewrites approved copy.

## 5. Reference similarity

`computeReferenceSimilarity(profile, spec)` returns a heuristic report
(palette, typography, layout, density, imagery). It is a heuristic similarity
signal, **not** proof of legal or brand compliance, and **not** an objective
quality score.

## 6. What remains unsupported

- Editable reconstruction from PDF/PPTX/Figma.
- Exact font identification (only a family guess when confident).
- Recovery of hidden artwork, or vectorization of raster images.
- Multi-page image references (a multi-page PDF is converted to first page or
  rejected; the profile warns `multi_page_reference_not_available`).
- Any claim of perfect reproduction.

See also: [REFERENCE_PROFILE_SCHEMA.md](REFERENCE_PROFILE_SCHEMA.md),
[REFERENCE_TO_TEMPLATE_FAMILY.md](REFERENCE_TO_TEMPLATE_FAMILY.md),
[REFERENCE_SIMILARITY_V1.md](REFERENCE_SIMILARITY_V1.md).

## Phase 5 update

Reference-derived candidates now flow into the Template Authoring + Approval
System as `candidate` records (`/dev/reference` → Send candidate). Derived
families are pruned of dangling alternative/fallback references so they pass
Template Family validation v2. See
[TEMPLATE_AUTHORING_PHASE_5.md](TEMPLATE_AUTHORING_PHASE_5.md).
