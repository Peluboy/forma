import { categorize, overallFromScore, scoreFidelity } from "./compare.js";
import type {
  EditorProjectionFidelityReport,
  FidelityBlocker,
  FidelityItem,
  FidelityWarning,
  ProjectionOutcome,
} from "./types.js";

export interface BuildFidelityReportInput {
  sourceSpecId: string;
  projectedProjectId: string;
  items: FidelityItem[];
  warnings?: FidelityWarning[];
  blockers?: FidelityBlocker[];
}

export function buildFidelityReport(
  input: BuildFidelityReportInput,
): EditorProjectionFidelityReport {
  const { preserved, transformed, unsupported, lost } = categorize(input.items);
  const blockers = [...(input.blockers ?? [])];
  // Any copy-affecting loss is promoted to a blocker so a high DesignSpec
  // score can never be presented as a trustworthy deliverable.
  for (const item of lost) {
    if (item.impact === "copy_affecting") {
      blockers.push({
        code: "copy_loss",
        pageId: item.pageId,
        elementId: item.elementId,
        impact: "copy_affecting",
        message: item.userImpact,
      });
    }
  }
  const score = scoreFidelity(input.items);
  return {
    sourceSpecId: input.sourceSpecId,
    projectedProjectId: input.projectedProjectId,
    overall: overallFromScore(score, blockers.length > 0),
    score,
    preserved,
    transformed,
    unsupported,
    lost,
    warnings: input.warnings ?? [],
    blockers,
    counts: {
      total: input.items.length,
      preserved: preserved.length,
      transformed: transformed.length,
      unsupported: unsupported.length,
      lost: lost.length,
      blockers: blockers.length,
    },
  };
}

/** Merge projector outcomes into flat item/warning/blocker lists. */
export function collectProjectionOutcomes(
  outcomes: Array<ProjectionOutcome<unknown>>,
): {
  items: FidelityItem[];
  warnings: FidelityWarning[];
  blockers: FidelityBlocker[];
} {
  return {
    items: outcomes.flatMap((outcome) => outcome.fidelityItems),
    warnings: outcomes.flatMap((outcome) => outcome.warnings),
    blockers: outcomes.flatMap((outcome) => outcome.blockers),
  };
}

/** Human-readable summary line for dev lab and benchmark output. */
export function summarizeFidelity(
  report: EditorProjectionFidelityReport,
): string {
  return [
    `fidelity ${report.overall} (${report.score}/100)`,
    `${report.counts.preserved} preserved`,
    `${report.counts.transformed} transformed`,
    `${report.counts.unsupported} unsupported`,
    `${report.counts.lost} lost`,
    `${report.counts.blockers} blocker(s)`,
  ].join(", ");
}
