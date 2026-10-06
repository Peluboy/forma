# Continuation Pagination v1

Status: **Phase 2B Implementation Complete**.
Module: `src/domain/layout-fit/continuation.ts`

---

## 1. Problem Statement

In business document generation, an approved manuscript may contain content nodes (such as extensive narrative paragraphs, multi-item strategic lists, or dense data tables) that exceed the physical bounds of a single page layout frame, even after bounded typographic scaling (fit repair).

Prior to Phase 2B, overflowing content was either flagged as an unresolved fit failure or truncated. Truncation violates the foundational **Exact Copy** invariant.

---

## 2. Invariants & Non-Negotiables

Continuation pagination in Forma obeys strict production rules:
1. **Never rewrite copy**: No AI summarization, rephrasing, or shortening.
2. **Never drop copy**: 100% of approved words, punctuation, numbers, and symbols must appear in the final design.
3. **Never split inside a word**: Splitting occurs only at clean sentence/paragraph or table row boundaries.
4. **Preserve SourceSpan provenance**: Every split chunk retains its exact `sourceSpanIds` in sequential reading order.
5. **Represent each span exactly once**: No span may be duplicated or omitted across pages.

---

## 3. Splittable Content Model

| Content Type | Splitting Strategy | Atomic / Unsplittable Rules |
| :--- | :--- | :--- |
| **Paragraphs** | Split across sentences / paragraphs into continuation frames | Never split words; never orphan a heading from its initial body paragraph (`keepTogether`). |
| **Lists** | Split by list item boundaries | Never split an item bullet from its text; preserve numbering continuity. |
| **Tables** | Split by table rows across pages | Never split mid-cell; repeat header rows on continuation pages; retain cell spans. |
| **Statistics** | Kept intact | Never separate a metric value from its caption/label. |

---

## 4. Pipeline Execution Flow

Continuation pagination runs in `runAiDesignerPipeline` after initial layout synthesis and bounded fit repair:

```
DesignPlan Layout Resolution
         │
         ▼
Fit Engine (Bounded Font Scale & Spacing Repair)
         │
         ├── Does content fit within frame bounds?
         │       ├── YES: Proceed to Quality Review
         │       └── NO:
         ▼
applyContinuationPagination(...)
         │
         ├── 1. Measure overflow delta per page element
         ├── 2. Slice splittable content at valid span boundaries
         ├── 3. Resolve continuation layout from TemplateFamily:
         │      - "text-continuation"
         │      - "table-continuation"
         ├── 4. Generate new DesignPage with continuation metadata
         ├── 5. Repeat header on continuation table pages
         └── 6. Validate Exact Copy coverage across all pages
```

---

## 5. Continuation Metadata Schema

Each continued element and page carries structured metadata for tracing:

```typescript
export interface FlowContinuation {
  continuationIndex: number;      // e.g. 1 (continuation 1 of 2)
  totalContinuations: number;     // e.g. 2
  continuesFrom?: string;         // Previous pageId or elementId
  continuesTo?: string;           // Next pageId or elementId
}
```

In the editor, continued pages display clear labels (e.g. `Continued page 1`) and maintain bidirectional links so users can navigate the sequence.

---

## 6. Verification & Exact Copy Guarantee

Every continuation operation must pass `validateDesignSpecCopyCoverage(graph, continuationSpec)`:
- Missing span count must be `0`.
- Altered span text must be `0`.
- Duplicate span count must be `0`.
- All text order must match manuscript reading order.
