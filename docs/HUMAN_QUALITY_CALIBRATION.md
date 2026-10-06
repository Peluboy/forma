# Human Quality Calibration Workflow

Status: **Phase 2B Implementation Complete**.
Modules: `src/domain/design-quality/humanReview.ts`, `scripts/summarize-human-reviews.ts`

---

## 1. Motivation

Automated quality metrics (geometry, whitespace, line length, typography floors) produce deterministic 0–100 scores. However, automated heuristic rubrics risk **false positives** (scoring high on bad-looking designs) or **false negatives** (penalizing intentional design choices).

To anchor automated scoring to reality, Forma introduces a structured **Human Quality Calibration** workflow.

---

## 2. Review Package Architecture

Generated via `npm run benchmark:quality -- --write-review-package` or `--artifacts`.

For each generated fixture, a structured review package is emitted to:
`test-results/quality-benchmark/reviews/{caseId}-review-package.json`

### Review Package Contents
- `caseId`: Identifier of the benchmark case.
- `category`: Manuscript category (short, dense, tables, multi-section, etc.).
- `beforeSnapshot`: Heuristic score and initial detected issues.
- `afterSnapshot`: Final heuristic score and resolved/remaining issues.
- `pageThumbnails`: File paths to rendered PNG/SVG previews.
- `qualityScores`: Per-page scores, rhythm score, and overall composite score.
- `topIssues`: Initial top detected quality issues.
- `correctionsApplied`: List of bounded actions applied by the quality loop.
- `fidelityReport`: Projection fidelity score, preserved/transformed counts, and blockers.
- `copyStatus` & `fitStatus`: Exact Copy and Layout Fit verification results.
- `deliverableStatus`: Deliverable trust status (`quality_trusted`, `quality_approximated`, etc.).
- `humanReviewTemplate`: Blank review template ready for reviewer input.

---

## 3. Human Review Schema

Reviewers evaluate cases using a standardized JSON schema:

```typescript
export interface HumanReviewRecord {
  caseId: string;
  reviewer: string;
  acceptable: boolean;
  rating: number; // 1–5 integer
  verdict: "acceptable" | "needs_refinement" | "needs_redesign";
  notes?: string;
  pageNotes?: Array<{
    pageId?: string;
    note: string;
  }>;
}
```

---

## 4. Calibration Analysis & Summary Tool

Run the summarization command:

```bash
npm run review:summary <reviews.json> [scores.json]
```

### Computed Metrics
1. **Sample Size & Acceptance**: Total reviews, average rating (1–5), percentage judged acceptable.
2. **Verdict Breakdown**: Counts for `acceptable`, `needs_refinement`, and `needs_redesign`.
3. **Complaint Classification**: Automatic classification of human notes into categories:
   - `spacing`, `typography`, `hierarchy`, `imagery`, `color_brand`, `tables_data`, `density`, `continuation`, `other`.
4. **Pearson Correlation**: Statistical correlation between heuristic quality scores and human 1–5 ratings.
5. **False Positives**: Cases where automated score ≥ 85 but human rating ≤ 2 or verdict was `needs_redesign`.
6. **False Negatives**: Cases where automated score < 70 but human rating ≥ 4 and judged acceptable.

---

## 5. Integrating with Quality Benchmarks

When human review files exist in `test-results/quality-benchmark/reviews/{caseId}-review.json`, the quality benchmark (`scripts/quality-benchmark.ts`):
1. Detects and parses the human review verdict and notes.
2. Populates `record.humanReview`, `record.humanRating`, and `record.humanNotes`.
3. Reports `humanReviewCompleted` count in the benchmark summary.
