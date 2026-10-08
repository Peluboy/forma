import { contentGraphFromManuscript } from "../../src/domain/content/contentGraph.js";
import { planDesignDeterministically } from "../../src/domain/design-plan/artDirector.js";
import { buildReferenceProfileFromDesignSpec } from "../../src/domain/reference-design/extractFromDesignSpec.js";
import {
  profileToTemplateFamily,
  type ReferenceFamilyResolution,
} from "../../src/domain/reference-design/profileToTemplateFamily.js";
import type { ReferenceDesignProfile } from "../../src/domain/reference-design/types.js";
import { FORMA_EDITORIAL_REPORT } from "../../src/domain/template-family/builtin/editorialReport.js";
import { instantiateDesignSpec } from "../../src/domain/template-family/resolver.js";
import type { TemplateFamily } from "../../src/domain/template-family/types.js";
import { CORPORATE_REPORT_MANUSCRIPT } from "./corporateReportManuscript.js";

export type TemplateCaseKind =
  | "builtin"
  | "reference_ready"
  | "reference_low_confidence"
  | "invalid_slot"
  | "missing_alternative"
  | "table_smoke"
  | "text_smoke";

export interface TemplateBenchmarkCase {
  id: string;
  category: string;
  kind: TemplateCaseKind;
  /** Manuscript run through the pipeline for smoke-style cases. */
  manuscript: string;
  description: string;
}

const SHORT_MANUSCRIPT = `Title: Operations Update

Heading: Performance

Paragraph: The measured outcomes held steady through the quarter.

# Closing

The team recommended the next steps.`;

export const TEMPLATE_CASES: TemplateBenchmarkCase[] = [
  {
    id: "tpl-builtin-editorial",
    category: "builtin",
    kind: "builtin",
    manuscript: SHORT_MANUSCRIPT,
    description: "The shipped Forma Editorial Report family, pre-approved.",
  },
  {
    id: "tpl-reference-ready",
    category: "reference_derived",
    kind: "reference_ready",
    manuscript: SHORT_MANUSCRIPT,
    description:
      "A confident reference-derived candidate from an analysed DesignSpec.",
  },
  {
    id: "tpl-reference-low-confidence",
    category: "reference_derived",
    kind: "reference_low_confidence",
    manuscript: SHORT_MANUSCRIPT,
    description:
      "A weak reference that must downgrade instead of producing a template.",
  },
  {
    id: "tpl-invalid-slot",
    category: "validation",
    kind: "invalid_slot",
    manuscript: SHORT_MANUSCRIPT,
    description: "A family with a slot that accepts no content types.",
  },
  {
    id: "tpl-missing-alternative",
    category: "validation",
    kind: "missing_alternative",
    manuscript: SHORT_MANUSCRIPT,
    description:
      "A family that references a compatible alternative that is absent.",
  },
  {
    id: "tpl-table-smoke",
    category: "smoke",
    kind: "table_smoke",
    manuscript: `Title: Regional Results

Heading: Regional Results

Paragraph: Comparative results across regions for the reporting period.

| Region | Revenue | Growth |
| --- | --- | --- |
| North | 12.4 | 8% |
| South | 9.8 | 5% |
| East | 7.1 | 3% |

Caption: Source: Regional finance ledger, closed period.`,
    description: "A table-heavy run against the built-in family.",
  },
  {
    id: "tpl-text-smoke",
    category: "smoke",
    kind: "text_smoke",
    manuscript: `Title: Comprehensive Review

Heading: Operating Context

Paragraph: The first paragraph describes the operating plan in enough detail to fill several lines of body copy and to exercise real line wrapping.

Paragraph: The second paragraph covers the next stage of rollout, the teams responsible, and the milestones that precede the following phase.

Paragraph: The third paragraph summarises the principal risks and the mitigations already in place.

Heading: Detailed Analysis

Paragraph: A further paragraph adds body copy so continuation pagination can exercise its split path when everything does not fit on one page.`,
    description: "A text-heavy run against the built-in family.",
  },
];

/** Builds a reference profile from the corporate report manuscript. */
export function referenceProfileFromManuscript(): ReferenceDesignProfile {
  const graph = contentGraphFromManuscript(CORPORATE_REPORT_MANUSCRIPT);
  const plan = planDesignDeterministically(graph, FORMA_EDITORIAL_REPORT);
  const spec = instantiateDesignSpec(FORMA_EDITORIAL_REPORT, plan, graph);
  return buildReferenceProfileFromDesignSpec(spec);
}

/** A deliberately weak variant: one layout pattern and low confidence. */
export function lowConfidenceReferenceProfile(): ReferenceDesignProfile {
  const base = referenceProfileFromManuscript();
  return {
    ...base,
    id: `${base.id}-low`,
    layoutPatterns: base.layoutPatterns.slice(0, 1),
    confidence: {
      ...base.confidence,
      overall: 0.2,
      layout: 0.15,
    },
  };
}

export interface BuiltTemplateCase {
  /** The family produced by the case, or null when the case must not produce one. */
  family: TemplateFamily | null;
  referenceResolution?: ReferenceFamilyResolution;
  note: string;
}

/** Materialises the family a case describes. */
export function buildTemplateCaseFamily(
  testCase: TemplateBenchmarkCase,
): BuiltTemplateCase {
  switch (testCase.kind) {
    case "builtin":
      return { family: FORMA_EDITORIAL_REPORT, note: "built-in family" };
    case "reference_ready": {
      const result = profileToTemplateFamily(
        referenceProfileFromManuscript(),
        FORMA_EDITORIAL_REPORT,
      );
      return {
        family: result.family,
        note: `gate=${result.gate.status}`,
      };
    }
    case "reference_low_confidence": {
      const result = profileToTemplateFamily(
        lowConfidenceReferenceProfile(),
        FORMA_EDITORIAL_REPORT,
      );
      return {
        family: result.family,
        note: `gate=${result.gate.status}`,
      };
    }
    case "invalid_slot": {
      const family: TemplateFamily = {
        ...FORMA_EDITORIAL_REPORT,
        id: "forma-editorial-report::invalid-slot",
        layouts: FORMA_EDITORIAL_REPORT.layouts.map((layout, index) =>
          index === 0
            ? {
                ...layout,
                slots: [
                  ...layout.slots,
                  {
                    id: `${layout.id}-broken`,
                    role: "body",
                    accepts: [],
                    required: false,
                  },
                ],
              }
            : layout,
        ),
      };
      return { family, note: "slot with empty accepts" };
    }
    case "missing_alternative": {
      const family: TemplateFamily = {
        ...FORMA_EDITORIAL_REPORT,
        id: "forma-editorial-report::missing-alternative",
        layouts: FORMA_EDITORIAL_REPORT.layouts.map((layout, index) =>
          index === 0
            ? { ...layout, compatibleAlternatives: ["layout-that-is-absent"] }
            : layout,
        ),
      };
      return { family, note: "compatible alternative that is absent" };
    }
    case "table_smoke":
    case "text_smoke":
      return { family: FORMA_EDITORIAL_REPORT, note: "built-in family" };
  }
}
