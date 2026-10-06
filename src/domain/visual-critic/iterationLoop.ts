import type { ContentGraph } from "../content/types.js";
import type { DesignSpec } from "../design-spec/types.js";
import { repairDocumentFit } from "../layout-fit/engine.js";
import type { TemplateFamily } from "../template-family/types.js";
import { applyBoundedCorrections } from "./corrections.js";
import { evaluatePageVisuals } from "./critic.js";
import { renderPageToSvg } from "./renderSvg.js";
import type {
  BoundedCorrectionAction,
  IterationReport,
  IterationStep,
  VisualCriticReport,
  VisualIssue,
} from "./types.js";

export interface IterationLoopResult {
  spec: DesignSpec;
  report: IterationReport;
  pageReports: VisualCriticReport[];
  pageSvgs: string[];
}

export function runDesignIterationLoop(
  initialSpec: DesignSpec,
  family: TemplateFamily,
  graph: ContentGraph,
  maxIterations: number = 2,
): IterationLoopResult {
  let currentSpec = initialSpec;
  const steps: IterationStep[] = [];
  let latestPageReports: VisualCriticReport[] = [];

  for (let iter = 1; iter <= maxIterations; iter++) {
    // 1. Run deterministic fit repairs
    const fitResult = repairDocumentFit(currentSpec, family);
    currentSpec = fitResult.spec;

    // 2. Evaluate visuals across pages
    latestPageReports = currentSpec.pages.map((p) =>
      evaluatePageVisuals(p, family),
    );
    const avgScore =
      latestPageReports.reduce((s, r) => s + r.scores.overall, 0) /
      Math.max(1, latestPageReports.length);

    // Collect all actionable issues
    const allIssues: VisualIssue[] = latestPageReports.flatMap((r) => r.issues);
    const candidateCorrections: BoundedCorrectionAction[] = allIssues
      .map((i) => i.recommendedAction)
      .filter((a): a is BoundedCorrectionAction => Boolean(a));

    if (avgScore >= 80 && candidateCorrections.length === 0) {
      steps.push({
        iteration: iter,
        initialScore: Math.round(avgScore),
        finalScore: Math.round(avgScore),
        issues: allIssues,
        appliedCorrections: [],
        stopReason: "threshold_reached",
      });
      break;
    }

    if (candidateCorrections.length === 0) {
      steps.push({
        iteration: iter,
        initialScore: Math.round(avgScore),
        finalScore: Math.round(avgScore),
        issues: allIssues,
        appliedCorrections: [],
        stopReason: "no_actionable_issues",
      });
      break;
    }

    // 3. Apply bounded corrections
    const { spec: nextSpec, appliedActions } = applyBoundedCorrections(
      currentSpec,
      candidateCorrections,
      family,
      graph,
    );

    // If no corrections could be applied within constraints
    if (appliedActions.length === 0) {
      steps.push({
        iteration: iter,
        initialScore: Math.round(avgScore),
        finalScore: Math.round(avgScore),
        issues: allIssues,
        appliedCorrections: [],
        stopReason: "constraint_blocked",
      });
      break;
    }

    currentSpec = nextSpec;

    // Evaluate post-correction score
    const postReports = currentSpec.pages.map((p) =>
      evaluatePageVisuals(p, family),
    );
    const postAvg =
      postReports.reduce((s, r) => s + r.scores.overall, 0) /
      Math.max(1, postReports.length);

    steps.push({
      iteration: iter,
      initialScore: Math.round(avgScore),
      finalScore: Math.round(postAvg),
      issues: allIssues,
      appliedCorrections: appliedActions,
      stopReason:
        iter === maxIterations ? "max_iterations" : "threshold_reached",
    });

    if (postAvg >= 80) {
      break;
    }
  }

  // Generate SVG snapshots for final draft pages
  const pageSvgs = currentSpec.pages.map((p) => renderPageToSvg(p));
  const finalScore =
    latestPageReports.reduce((s, r) => s + r.scores.overall, 0) /
    Math.max(1, latestPageReports.length);

  return {
    spec: currentSpec,
    report: {
      steps,
      totalIterations: steps.length,
      finalQualityScore: Math.round(finalScore),
    },
    pageReports: latestPageReports,
    pageSvgs,
  };
}
