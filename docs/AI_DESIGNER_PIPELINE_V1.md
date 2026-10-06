# AI Designer Pipeline v1 (Phase 1B)

## 1. Overview and Core Philosophy

Forma is an AI design production platform for structured, brand-consistent business documents.
Phase 1B delivers the **first complete multi-page document generation pipeline**, demonstrated with **Multi-Page Branded Reports**.

We reject the "unconstrained text-to-pixel image generator" paradigm. In business publishing, copy cannot be hallucinated, numbers cannot drift, brand rules must hold, and the final deliverable must remain **fully editable**.

### The Division of Responsibilities
* **What the AI Art Director decides:** Content hierarchy, narrative sequence, page rhythm, layout variant selection, and mapping of approved manuscript nodes to semantic layout slots.
* **What deterministic code decides:** Geometry, typography coordinates, bounding boxes, styling tokens, line wrapping, fit calculations, exact-copy provenance verification, and canvas element instantiation.
* **Why AI does not emit unconstrained pixel coordinates:** Unconstrained LLM geometry outputs suffer from spatial hallucinations, unaligned grids, inconsistent padding, colliding text boxes, and zero reflow capability. Deterministic layout templates prepared by professional designers guarantee visual hierarchy, restrained tokens, and mathematical alignment.

```
Approved Manuscript
        │
        ▼
  ContentGraph v1 (SourceSpan Provenance & Exact Copy Policy)
        │
        ▼
   DesignPlan v1 (Constrained Art Director: Page Sequencing & Slot Assignments)
        │
        ▼
 TemplateFamily v1 (Forma Editorial Report — Approved Layouts & Slot Grammar)
        │
        ▼
 Template Resolver (Deterministic DesignSpec v1 Instantiation)
        │
        ▼
    Fit Engine v1 (Measured Text Wrapping, Bounded Font Scaling & Region Expansion)
        │
        ▼
 Render Snapshot (High-Fidelity SVG Visual Projections)
        │
        ▼
 Visual Critic v1 (Heuristic & Multimodal Critique: Hierarchy, Balance, Spacing)
        │
        ▼
Bounded Corrections (Max 2 Iterations: Strictly Validated Against Fit & Copy)
        │
        ▼
Editable Output (DesignSpec v1 -> FlowDocument Project for Live Editor)
```

---

## 2. Pipeline Stages

### Stage 1: ContentGraph v1
* **Input:** Raw manuscript text (Markdown, TXT, DOCX, or text PDF).
* **Operation:** Partitions source text into immutable `SourceSpan` records (both `content` and `syntax` spans) with stable hashes. Classifies semantic `ContentNode` structures (headings, subheadings, paragraphs, statistics, quotes, tables, callouts, metadata).
* **Guarantees:** Every character in the manuscript is accounted for. Zero text is lost.

### Stage 2: AI Art Director & DesignPlan v1
* **Input:** `ContentGraph` summary and `TemplateFamily` schema.
* **Operation:** Plans the document sequence. Chooses layout variants appropriate for each section (e.g. Cover, Three-Stat, Four-Stat, Quote Feature, Table Page, Heading+Body, Closing). Binds semantic slots without modifying or duplicating text.
* **Validation (`validateDesignPlan`):**
  * Layout and slot existence in template family.
  * Slot constraints: accepted content types, min/max item counts.
  * Source span coverage: all required content spans must be accounted for.
  * No duplicate assignments of content nodes.
  * Ascending sequential page orders.

### Stage 3: Template Family & Deterministic Resolver
* **Input:** `TemplateFamily` + `DesignPlan` + `ContentGraph`.
* **Built-in Family:** `Forma Editorial Report` (`forma-editorial-report`):
  1. `cover`: Report title, subtitle, category kicker, author metadata.
  2. `section-opener`: Large numerical chapter label, section title, brief narrative.
  3. `heading-body`: Text-dominant editorial article with Playfair Display title and Inter body.
  4. `heading-image-body`: Feature image, caption, and article copy.
  5. `two-column-body`: Editorial dual-column layout for dense analysis.
  6. `three-stat`: Three key performance indicator cards with numbers and descriptions.
  7. `four-stat`: 2x2 metric quadrant for multi-dimensional data presentation.
  8. `quote-feature`: Prominent executive pull quote with attribution bar and commentary.
  9. `table-page`: Structured data table with header styling and source notes.
  10. `chart-commentary`: Bar chart visualization with key analytical takeaways.
  11. `closing`: Summary recommendations, call to action card, and sign-off.
* **Resolver (`instantiateDesignSpec`):** Instantiates concrete `TextElement`, `TableElement`, `ShapeElement`, `ImageElement`, and `ChartElement` instances using pre-engineered template geometry, binding exact text from approved source spans.

### Stage 4: Measured Fit Engine
* **Measurement:** Font metrics line-wrapping algorithm (`measureTextElement`). Evaluates text width, line count, measured height vs. available height, and overflow pt.
* **Bounded Repair Hierarchy:**
  1. Use intended typography if it fits without overflow.
  2. Scale font size down proportionally towards `minFontSize` (step size 0.5pt).
  3. Expand flexible text region vertically if artboard margins permit and `allowResize` is true.
  4. Switch layout to compatible fallback variant (e.g. `heading-image-body` -> `heading-body`).
  5. Flag unresolved overflow if constraints cannot be satisfied without truncating.

### Stage 5: Copy Integrity QA (`validateDesignSpecCopyCoverage`)
* Traverses visible elements on non-hidden pages in stacking order.
* Compares visible text against required manuscript source spans.
* Fails if any text is altered, missing, duplicated, untracked, or out of manuscript order.

### Stage 6: Visual Critic & Bounded Design Corrections
* **Visual Critic (`evaluatePageVisuals`):**
  * Evaluates typographic hierarchy (heading-to-body scale ratio >= 1.35).
  * Evaluates margins and whitespace alignment.
  * Evaluates brand color consistency and typography legibility floors (>= 9pt).
  * Computes structured scores (Overall, Hierarchy, Balance, Spacing, Typography, Brand).
  * Emits bounded `recommendedAction` for any detected issues.
* **Bounded Corrections:**
  * Supported actions: `increase_text_scale`, `decrease_text_scale`, `increase_spacing`, `decrease_spacing`, `move_within_region`, `resize_element`, `change_alignment`.
  * Every candidate correction is checked against template constraints, geometric bounds, fit engine, and copy coverage. Any action causing collision or copy drift is rejected.
* **Iteration Loop (`runDesignIterationLoop`):** Max 2 iterations. Stops early if quality score >= 80/100 or no actionable issues remain.

### Stage 7: Editable Document Output
* Uses `toFlowDocumentProject` adapter to convert canonical `DesignSpec` into a native Forma `Project` with `family: "document"` and linked `FlowDocument` pages.
* Opens directly in the existing Forma editor via session `START_KEY`.

---

## 3. Provenance and Metadata

Every generated report stores complete generation provenance:
* `modelProvider`: e.g. `google-gemini` / `deterministic-art-director`
* `modelId`: e.g. `gemini-2.0-flash`
* `promptVersion`: `1.0`
* `generatorVersion`: `forma-pipeline-v1b`
* `templateFamilyId`: `forma-editorial-report`
* `templateFamilyVersion`: `1.0`
* `designPlanVersion`: `1.0`
* `contentHash`: Stable 32-bit FNV-1a hash of manuscript source
* `generatedAt`: ISO timestamp
* `initialCriticScore`: Pre-correction quality score
* `finalCriticScore`: Post-iteration quality score
* `correctionsAppliedCount`: Number of verified bounded actions applied

---

## 4. UI Integrations & Developer Tooling

### Create Page Integration (`/create`)
* Feature-flagged multi-page report generator under **Documents -> Document Workflow: Multi-page Branded Report**.
* Real-time 6-step progress indicator:
  1. *Understanding content*
  2. *Planning pages*
  3. *Building layouts*
  4. *Checking copy*
  5. *Checking fit*
  6. *Reviewing design*
* Interactive grid of rendered page cards with SVG snapshots.
* Direct **Open in Editor** action.

### Development Inspection Lab (`/dev/pipeline` or `/dev`)
* Developer playground for inspecting pipeline artifacts:
  * **Rendered Previews**: Full SVG renders of each page.
  * **DesignPlan v1**: Structured page sequence and slot assignments JSON.
  * **DesignSpec v1**: Canonical spec tree.
  * **Fit Report**: Line count, overflow amounts, font scale repairs.
  * **Copy Report**: Exact copy verification details.
  * **Visual Critic**: Multidimensional score breakdown and issue logs.
  * **Provenance**: Metadata audit trail.

---

## 5. Current Limitations & What to Build Next

### Current Limitations
1. **Single Built-in Family:** Phase 1B provides `Forma Editorial Report` (US Letter document). Graphics and presentation multi-layout families are deferred.
2. **Deterministic Fallback Art Director:** Primary test execution uses the deterministic section planner; live server multimodal LLM calls are supported when API keys are supplied.
3. **Table Continuation Splitting:** Extremely large tables exceeding one page must be paginated across continuation pages.

### Next Recommended Milestones (Phase 2 & Beyond)
1. **Additional Template Families:** Clean tech report, financial quarterly report, executive whitepaper, and slide deck families.
2. **Interactive Critic Feedback in Editor:** Expose visual critic warnings and bounded one-click fixes in the live editor sidebar.
3. **Multi-Column Auto-Balancing:** Dynamic two-column height equalization for uneven text blocks.
4. **Export Engine Hardening:** Native vector PDF export from `DesignSpec` rather than rasterized canvas exports.
