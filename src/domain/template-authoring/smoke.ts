import { runAiDesignerPipeline } from "../pipeline/designerPipeline.js";
import type { TemplateFamily } from "../template-family/types.js";
import type {
  TemplateSmokeCase,
  TemplateSmokeCaseResult,
  TemplateSmokeReport,
} from "./types.js";

/**
 * Smoke generation (Part M). Before a template can be approved, run it against
 * small fixture manuscripts that exercise the main content shapes. A template
 * is never marked approved if smoke generation fails a critical check.
 */

export const TEMPLATE_SMOKE_CASES: TemplateSmokeCase[] = [
  {
    id: "smoke-short",
    name: "Short report",
    manuscript: `Title: Short Operations Brief

Subtitle: A concise summary prepared for the leadership review.

Heading: Overview

Paragraph: A single approved paragraph describing the engagement and its outcome in plain terms.`,
  },
  {
    id: "smoke-text-heavy",
    name: "Text-heavy report",
    manuscript: `Title: Comprehensive Operations Review

Heading: Operating Context

Paragraph: The first approved paragraph describes the operating plan in enough detail to fill several lines of body copy on the page and to force the fit engine to measure real line wrapping behaviour.

Paragraph: The second approved paragraph describes the next stage of rollout, the teams responsible for delivery, and the milestones that must be met before the following phase begins.

Paragraph: The third approved paragraph summarises the principal risks, the mitigations already in place, and the decision points that remain open for the review board.

Heading: Detailed Analysis

Paragraph: A further approved paragraph adds additional body copy so that continuation pagination has an opportunity to exercise its split path if the template cannot hold everything on one page.`,
  },
  {
    id: "smoke-stats-heavy",
    name: "Stats-heavy report",
    manuscript: `Title: Performance Summary 2026

Heading: Performance Overview

Paragraph: The metrics below reflect measured outcomes across every operating region for the reporting period.

Statistic: 18%
Paragraph: Revenue growth against the prior comparable period across all regions.

Statistic: 92%
Paragraph: Customer retention measured at the end of the reporting period.

Statistic: 64%
Paragraph: Adoption of the new operating model by internal teams.`,
  },
  {
    id: "smoke-table",
    name: "Table report",
    manuscript: `Title: Regional Results

Heading: Regional Results

Paragraph: Comparative results across regions for the reporting period.

| Region | Revenue | Growth |
| --- | --- | --- |
| North | 12.4 | 8% |
| South | 9.8 | 5% |
| East | 7.1 | 3% |

Caption: Source: Regional finance ledger, closed period.`,
  },
];

export interface SmokeOptions {
  signal?: AbortSignal;
}

export async function runTemplateSmokeGeneration(
  family: TemplateFamily,
  cases: TemplateSmokeCase[] = TEMPLATE_SMOKE_CASES,
  options: SmokeOptions = {},
): Promise<TemplateSmokeReport> {
  const results: TemplateSmokeCaseResult[] = [];
  const criticalFailures: string[] = [];

  for (const testCase of cases) {
    if (options.signal?.aborted) break;
    try {
      const result = await runAiDesignerPipeline(testCase.manuscript, {
        family,
      });
      const critical =
        !result.success ||
        !result.copyCoverage.valid ||
        !result.fitReport.valid ||
        result.projectionFidelity.overall === "unsafe";
      if (critical)
        criticalFailures.push(
          `${testCase.id}: ${result.errors.join("; ") || "critical check failed"}`,
        );
      results.push({
        caseId: testCase.id,
        name: testCase.name,
        success: result.success,
        critical,
        pageCount: result.finalSpec.pages.length,
        qualityScore: result.quality.final.overallScore,
        projectionFidelityScore: result.projectionFidelity.score,
        exactCopyPass: result.copyCoverage.valid,
        fitPass: result.fitReport.valid,
        trusted: result.deliverableQuality.trusted,
        errors: result.errors,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown failure";
      criticalFailures.push(`${testCase.id}: ${message}`);
      results.push({
        caseId: testCase.id,
        name: testCase.name,
        success: false,
        critical: true,
        pageCount: 0,
        qualityScore: 0,
        projectionFidelityScore: 0,
        exactCopyPass: false,
        fitPass: false,
        trusted: false,
        errors: [message],
      });
    }
  }

  return {
    passed: criticalFailures.length === 0,
    criticalFailures,
    cases: results,
    generatedAt: new Date().toISOString(),
  };
}
