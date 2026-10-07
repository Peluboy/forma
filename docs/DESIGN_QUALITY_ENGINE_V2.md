# Forma Design Quality Engine v2

Status: **experimental, partially implemented** (2026-10-04). This document describes code that runs today and distinguishes checks from visual judgment. Phase 2 is **not complete**.

## Purpose and architecture

The report pipeline now runs `ContentGraph → DesignPlan → TemplateFamily resolver → fit repair → Design Quality Engine v2 → Exact Copy/fit validation → editable FlowDocument`. Quality code lives in `src/domain/design-quality/`. The engine scores each `DesignPage`, then the document sequence. It proposes bounded actions and keeps the best valid candidate. The former `visual-critic` implementation remains for compatibility, but the new loop is authoritative in `runAiDesignerPipeline`.

The engine never rewrites manuscript text. Candidate changes are restricted to geometry, font size, image fit, or focal point. Every candidate must pass `validateDesignSpec`, `validateDesignSpecCopyCoverage`, and `evaluateDocumentFit`. The current editor adapter still loses some DesignSpec fidelity; see limitations below.

## Rubric

All twelve dimensions use 0–100: hierarchy, typography, spacing, alignment, composition, balance, density, rhythm, brand consistency, imagery, readability, and consistency. Weighted page score uses readability 15%, hierarchy 15%, composition 12%, consistency 10%, typography 10%, brand 10%, spacing 8%, alignment 7%, balance 7%, density 3%, rhythm 2%, imagery 1%. The weights prioritize communication and copy legibility in business documents. Severity penalties and caps prevent a high score when a known high-severity issue remains. Document score blends page average (80%) with rhythm (20%).

These numbers are **heuristic scores**, not a verified professional design rating. Empty issue lists can overstate visual quality, especially before a human review. Do not market benchmark scores as objective design quality.

## Deterministic metrics

- `typography.ts`: heading/body ratio, body size floor, leading, distinct sizes and weights, measured line wraps and line length, short last lines, long all-caps blocks.
- `metrics.ts`: margin and gap warnings, shared alignment edges, sampled union occupancy, text/image area estimates, quadrant density, and left/right visual mass. Union occupancy avoids double-counting text over cards.
- `composition.ts`: focal candidate, quadrants, whitespace, and isolated elements. This is approximate; semantic grouping remains weak.
- `image.ts`: actual page clipping, distortion when source dimensions are known, print-resolution warning when dimensions are known, and unusually small images. Subject cutoff cannot be proven from geometry alone.
- `documentRhythm.ts`: repeated layouts, dense and data-heavy sequences, visual-type monotony, density jumps, and template-family adjacency rules.
- `documentQuality.ts`: combines the above with template-token checks for colors and fonts.

The issue taxonomy and action types are in `qualityTypes.ts`. Issues have controlled type, severity, page/element IDs, evidence, and suggested actions. `ArtDirectionProfile` and quality presets provide editorial, corporate, and data-forward targets. The built-in report family has explicit `varietyRules`; they currently inform rhythm analysis, not automatic content reassignment.

## Visual critic

The development lab has an **on-demand** server-side Gemini visual review. It rasterizes up to four representative SVG pages to PNG in the browser and posts them to `/api/design-quality/critique`. The server checks authenticated user and rate limits, validates images and request size, asks Gemini for a strict JSON response, rejects unknown page IDs and issue types, caps issue counts/text, caches by design hash for ten minutes, and returns token count when the provider supplies it. It never accepts AI-proposed copy edits or coordinates. If Gemini is absent or fails, the deterministic quality pass still runs. The AI result is displayed separately; it **does not yet drive the correction loop**. The four-page sample also cannot fully judge a long document's rhythm.

## Correction planner and loop

`correctionPlanner.ts` ranks issues by severity, selects at most three safe actions per pass, avoids duplicate targets and previously attempted targets, and skips unsupported structural commands. `correctionExecutor.ts` implements bounded text scaling, horizontal alignment, vertical spacing, text-region narrowing, image fit, and image focal point. It rejects locked/missing targets, excessive parameter changes, page exits, new foreground collisions, invalid DesignSpec, copy drift, and unresolved fit. `qualityLoop.ts` runs up to three passes, rescoring after each; it retains the highest-scoring valid version and stops when no supported action can improve it. The loop returns rejected reasons and before/after SVG snapshots in memory; snapshots are not stored in project JSON.

The action vocabulary also lists future commands such as compatible layout swaps, gap equalization, and column balance. Those are **not executors today** and the planner will not attempt them. Structural changes require semantic slot remapping and another copy/fit pass.

## UI and benchmark

`/dev/pipeline` shows current score, rhythm, per-page issues, iteration history, and an on-demand AI review button. Set `VITE_FORMA_QUALITY_PANEL=true` to show the experimental document quality popover in the editor. It recomputes heuristic scores from the current FlowDocument and offers one safe fix for small text when measured fit allows it. The editor adapter cannot recreate the original DesignSpec's full brand or imagery, so its score is advisory.

Run `npm run benchmark:quality`. It executes 22 manuscript cases and writes `test-results/quality-benchmark/report.json` plus per-page SVG snapshots and PNG screenshots. Records include category, page count, initial/final score, issue types, corrections, copy and fit status, and empty human-review fields. This is a reproducible engineering benchmark, not a blinded design evaluation.

Latest local result: **22/22 successful**, initial mean **95.7**, final mean **96.8**, median gain **0**, **100% of pages ≥80**, **0% copy failures**, **0% documents with unresolved fit**. The benchmark exposed a planner bug that placed long paragraphs into the cover subtitle. The planner now respects the subtitle capacity and sends that copy to a content page. This does not yet provide arbitrary long-paragraph splitting. The high baseline and small gain show that the current deterministic rubric is not sensitive enough to visual polish. No human review verdicts have been recorded. AI visual review was not invoked in the benchmark, so its quality is unmeasured.

## Failure behavior and privacy

Unconfigured or failing AI review cannot change a design. A failed correction returns the previous DesignSpec and a reason. The loop never accepts a candidate with copy or fit failure. The server sends page images to the configured Gemini provider only when a user explicitly clicks visual review in the lab. It does not log manuscript text; the in-memory cache is keyed by a hash. Provider cost is bounded by four pages per request and five requests per user per hour. Production cost tracking and per-team budgets do not yet exist.

## Phase 2B Status & Implemented Enhancements (2026-10-05)

Phase 2B significantly enhances the trust and delivery layer between DesignSpec and the editable editor:

1. **Projection Fidelity & Adapter Preservation**:
   - Structured projection pipeline (`toFlowDocument.ts`) replaces ad-hoc mapping.
   - FlowDocument and canvas extended to preserve shapes (rectangles, rules, dividers), images with fit modes, structured chart blocks, and page background colors.
   - Comprehensive fidelity report model (`EditorProjectionFidelityReport`) categorizes preserved, transformed, unsupported, and lost properties with clear user impact.
   - Pre-export structural validation (`checkEditorExportConsistency`) ensures no text or visual elements are silently omitted.

2. **Continuation Pagination v1**:
   - Safe splitting of oversized single content nodes (long paragraphs, lists, tables) across continuation pages.
   - 100% conformance with Exact Copy and sequential SourceSpan order. Header rows repeated on continued tables.
   - Full continuation metadata (`continuationIndex`, `totalContinuations`, `continuesFrom`, `continuesTo`) preserved into FlowDocument.

3. **Quality Score Trust Gating**:
   - Deliverable quality is formally decoupled from the raw DesignSpec heuristic score.
   - Deliverable status is gated (`quality_trusted`, `quality_approximated`, `quality_unverified_after_projection`, `editor_projection_loss_detected`).
   - The editor quality panel and Dev Lab never present a high-quality badge if the editor projection lost visual fidelity or copy.

4. **Human Review Calibration Workflow**:
   - Benchmark generates complete review packages (`--write-review-package`).
   - Standardized reviewer JSON schema and analysis tool (`scripts/summarize-human-reviews.ts`) compute Pearson correlation, false positives (high score / low human rating), and complaint category distributions.
   - Benchmark reports `humanReviewCompleted` when reviews are present.

5. **AI Visual Critic Integration**:
   - Opt-in integration (`--with-ai-critic`) validates AI suggestions against the controlled issue taxonomy.
   - Disallowed from directly mutating designs or modifying copy; bounded to valid element IDs and supported actions.

### What is Still Experimental

- **Freeform Chart Vector Editing**: Charts project into structured visual blocks/tables; vector control point editing is not yet supported.
- **Complex Focal Crop & Masking**: Crop/focal metadata is stored, but the canvas defaults to centered object-fit preview.
- **Group Hierarchy**: Nested groups are flattened into individually selectable elements.
- **Cross-Page Rhythm AI**: Visual critique samples key pages but does not yet evaluate multi-page typographic rhythm across 20+ pages.
- **Automated Layout Swaps**: Bounded corrections adjust scale, padding, and alignment; semantic layout re-assignment is not yet automated.

---

## Phase 4 — Reference Design Intelligence interplay

Reference-derived output is scored by the same v2 rubric as any other document.
Two rules matter when a reference is in play:

- A reference-derived `TemplateFamily` is re-skinned from a validated built-in
  family, so its geometry, slot grammar, and constraints are unchanged. Quality
  never grants trust to a family that failed `validateTemplateFamily`.
- The trust gate (`assessDeliverableQuality`) is unaffected by reference usage.
  Projection fidelity remains the authority on whether the editable document
  matches the approved design. Reference similarity is a **separate heuristic
  signal** and is never folded into the quality score or the trust verdict.
