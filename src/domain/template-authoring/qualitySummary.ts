import type { TemplateFamily } from "../template-family/types.js";
import { summarizeApproval } from "./approval.js";
import { validationIssuesToWarnings } from "./validationV2.js";
import type {
  TemplateApprovalState,
  TemplateBlocker,
  TemplateCapacityReport,
  TemplateCoverage,
  TemplateQualitySummary,
  TemplateSmokeReport,
  TemplateValidationV2Result,
  TemplateWarning,
} from "./types.js";

export function computeCoverage(family: TemplateFamily): TemplateCoverage {
  const roles = new Set(family.layouts.map((layout) => layout.role));
  const hasContent = family.layouts.some(
    (layout) =>
      layout.role === "content" ||
      layout.role === "section" ||
      layout.role === "intro",
  );
  return {
    hasCover: roles.has("cover"),
    hasContent,
    hasTable: roles.has("table"),
    hasStats: roles.has("stats"),
    hasQuote: roles.has("quote"),
    hasClosing: roles.has("closing"),
  };
}

export interface BuildQualitySummaryInput {
  family: TemplateFamily;
  validation: TemplateValidationV2Result;
  approval?: TemplateApprovalState;
  smoke?: TemplateSmokeReport | null;
  capacity?: TemplateCapacityReport | null;
}

export function buildTemplateQualitySummary(
  input: BuildQualitySummaryInput,
): TemplateQualitySummary {
  const { family, validation, approval, smoke, capacity } = input;

  const warnings: TemplateWarning[] = [
    ...validationIssuesToWarnings(
      validation.issues.filter((issue) => issue.severity !== "error"),
    ),
    ...(capacity?.warnings ?? []),
  ];

  const blockers: TemplateBlocker[] = [];
  if (!validation.valid)
    blockers.push({
      code: "validation_invalid",
      message: `Template has ${validation.errorCount} validation error(s).`,
    });
  if (smoke && !smoke.passed)
    blockers.push({
      code: "smoke_failed",
      message: `Smoke generation failed: ${smoke.criticalFailures.join("; ") || "critical checks did not pass"}.`,
    });

  const approvalSummary = summarizeApproval(approval, family);
  if (approval && approvalSummary.approvedLayoutCount === 0)
    blockers.push({
      code: "no_approved_layouts",
      message: "No layout has been approved yet.",
    });

  const cases = smoke?.cases ?? [];
  const exactCopyPassRate = cases.length
    ? cases.filter((c) => c.exactCopyPass).length / cases.length
    : undefined;
  const averageFitScore = cases.length
    ? Math.round((cases.filter((c) => c.fitPass).length / cases.length) * 100)
    : undefined;
  const averageQualityScore = cases.length
    ? Math.round(
        cases.reduce((sum, c) => sum + c.qualityScore, 0) / cases.length,
      )
    : undefined;
  const projectionFidelityScore = cases.length
    ? Math.round(
        cases.reduce((sum, c) => sum + c.projectionFidelityScore, 0) /
          cases.length,
      )
    : undefined;

  return {
    validationStatus: validation.status,
    layoutCount: family.layouts.length,
    approvedLayoutCount: approvalSummary.approvedLayoutCount,
    coverage: computeCoverage(family),
    ...(averageFitScore !== undefined ? { averageFitScore } : {}),
    ...(averageQualityScore !== undefined ? { averageQualityScore } : {}),
    ...(projectionFidelityScore !== undefined
      ? { projectionFidelityScore }
      : {}),
    ...(exactCopyPassRate !== undefined ? { exactCopyPassRate } : {}),
    warnings,
    blockers,
  };
}
