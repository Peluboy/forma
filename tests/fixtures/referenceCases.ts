import { CORPORATE_REPORT_MANUSCRIPT } from "./corporateReportManuscript.js";

export type ReferenceCaseSource =
  | "designspec"
  | "image_simple"
  | "image_palette"
  | "image_sparse"
  | "image_dense"
  | "image_low_confidence"
  | "fallback";

export interface ReferenceBenchmarkCase {
  id: string;
  category: string;
  /** Manuscript used to generate the NEW document. */
  manuscript: string;
  /** How the reference profile is produced. */
  reference: ReferenceCaseSource;
  /** Source manuscript for a design-spec reference. */
  referenceManuscript?: string;
}

const SHORT_NEW_DOCUMENT = `# Operations Update

Author: Forma Operations

# Performance

Revenue: 18%

Retention: 92%

The measured outcomes held steady through the quarter.

# Closing

The team recommended the next steps.`;

export const REFERENCE_CASES: ReferenceBenchmarkCase[] = [
  {
    id: "ref-forma-report",
    category: "designspec",
    manuscript: SHORT_NEW_DOCUMENT,
    reference: "designspec",
    referenceManuscript: CORPORATE_REPORT_MANUSCRIPT,
  },
  {
    id: "ref-image-simple",
    category: "image",
    manuscript: SHORT_NEW_DOCUMENT,
    reference: "image_simple",
  },
  {
    id: "ref-image-palette",
    category: "image",
    manuscript: SHORT_NEW_DOCUMENT,
    reference: "image_palette",
  },
  {
    id: "ref-image-sparse",
    category: "image",
    manuscript: SHORT_NEW_DOCUMENT,
    reference: "image_sparse",
  },
  {
    id: "ref-image-dense",
    category: "image",
    manuscript: SHORT_NEW_DOCUMENT,
    reference: "image_dense",
  },
  {
    id: "ref-image-low-confidence",
    category: "image",
    manuscript: SHORT_NEW_DOCUMENT,
    reference: "image_low_confidence",
  },
  {
    id: "ref-guided-fallback",
    category: "fallback",
    manuscript: SHORT_NEW_DOCUMENT,
    reference: "fallback",
  },
];
