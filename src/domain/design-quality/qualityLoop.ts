import type { ContentGraph } from "../content/types.js";
import { validateDesignSpecCopyCoverage } from "../design-spec/copyCoverage.js";
import type { DesignSpec } from "../design-spec/types.js";
import { validateDesignSpec } from "../design-spec/validation.js";
import { evaluateDocumentFit } from "../layout-fit/engine.js";
import type { TemplateFamily } from "../template-family/types.js";
import { renderPageToSvg } from "../visual-critic/renderSvg.js";
import { applyQualityCorrection } from "./correctionExecutor.js";
import { planCorrections } from "./correctionPlanner.js";
import {
  evaluateDocumentQuality,
  type DocumentQualityReport,
} from "./documentQuality.js";
import { getQualityPreset } from "./presets.js";
import type {
  BeforeAfterSnapshot,
  BoundedCorrectionActionV2,
  DesignQualityIssue,
  IterationReportV2,
  IterationStepV2,
} from "./qualityTypes.js";

export interface QualityLoopResult {
  spec: DesignSpec;
  initial: DocumentQualityReport;
  final: DocumentQualityReport;
  report: IterationReportV2;
  snapshots: BeforeAfterSnapshot[];
}

export function runQualityLoop(
  initialSpec: DesignSpec,
  family: TemplateFamily,
  graph: ContentGraph,
  presetId = "editorial_report",
  requestedIterations = 3,
  supplementalIssues: DesignQualityIssue[] = [],
): QualityLoopResult {
  const preset = getQualityPreset(presetId);
  const initial = evaluateDocumentQuality(initialSpec, family, presetId);
  const initialSvgs = new Map(
    initialSpec.pages.map((page) => [
      page.id,
      renderPageToSvg(page, initialSpec.assets),
    ]),
  );
  const initialScores = new Map(
    initial.pageScores.map((item) => [item.pageId, item.score]),
  );
  const history = new Set<string>();
  const failed = new Set<string>();
  const steps: IterationStepV2[] = [];
  const appliedAll: BoundedCorrectionActionV2[] = [];
  let currentSpec = initialSpec;
  let current = initial;
  let bestSpec = initialSpec;
  let bestReport = initial;
  let bestVersionIteration = 0;
  const maxIterations = Math.min(
    3,
    preset.maxIterations,
    Math.max(0, requestedIterations),
  );

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    // Deterministic issues always run. Supplemental AI issues may be added,
    // but the executor still validates every resulting bounded action.
    const issuesForPlanning = [
      ...current.aggregateIssues,
      ...supplementalIssues,
    ];
    const planned = planCorrections(issuesForPlanning, {
      maxCorrectionsPerIteration: 3,
      minSeverityToAct: "medium",
      previouslyAppliedTypes: history,
      previouslyFailedTypes: failed,
    });
    const rejected: IterationStepV2["rejectedCorrections"] = [
      ...planned.skipped,
    ];
    const applied: BoundedCorrectionActionV2[] = [];
    let candidate = currentSpec;
    for (const action of planned.selected) {
      const key = `${action.type}:${action.pageId}:${action.elementId ?? "page"}`;
      if (history.has(key) || failed.has(key)) {
        rejected.push({
          action,
          reason: "Repeated correction on the same target.",
        });
        continue;
      }
      const result = applyQualityCorrection(candidate, action, family, graph);
      if (result.applied) {
        candidate = result.spec;
        applied.push(action);
        history.add(key);
      } else {
        failed.add(key);
        rejected.push({
          action,
          reason: result.reason ?? "Safety validation failed.",
        });
      }
    }
    const next = applied.length
      ? evaluateDocumentQuality(candidate, family, presetId)
      : current;
    const improvement = next.overallScore - current.overallScore;
    const valid =
      validateDesignSpec(candidate).valid &&
      validateDesignSpecCopyCoverage(graph, candidate).valid &&
      evaluateDocumentFit(candidate, family).valid;
    let stopReason: IterationStepV2["stopReason"] =
      iteration === maxIterations ? "max_iterations" : "continuing";
    if (!planned.selected.length) stopReason = "no_actionable_issues";
    else if (!applied.length) stopReason = "constraint_blocked";
    else if (!valid || improvement <= 0) stopReason = "no_improvement";
    else if (next.overallScore >= preset.targetOverallScore)
      stopReason = "threshold_reached";
    const isBestVersion = valid && next.overallScore > bestReport.overallScore;
    if (isBestVersion) {
      bestSpec = candidate;
      bestReport = next;
      bestVersionIteration = iteration;
      appliedAll.push(...applied);
    } else {
      rejected.push(
        ...applied.map((action) => ({
          action,
          reason:
            "Candidate did not improve the best valid version; retained the previous design.",
        })),
      );
    }
    steps.push({
      iteration,
      scoreBeforeCorrections: {
        overall: current.overallScore,
        dimensions: averageDimensions(current),
        issues: issuesForPlanning,
      },
      scoreAfterCorrections: {
        overall: next.overallScore,
        dimensions: averageDimensions(next),
        issues: next.aggregateIssues,
      },
      issues: issuesForPlanning,
      consideredCorrections: planned.selected,
      appliedCorrections: isBestVersion ? applied : [],
      rejectedCorrections: rejected,
      stopReason,
      isBestVersion,
    });
    if (stopReason !== "continuing") break;
    if (!applied.length || !valid || improvement <= 0) break;
    currentSpec = candidate;
    current = next;
  }

  const snapshots: BeforeAfterSnapshot[] = bestSpec.pages.map((page) => ({
    pageId: page.id,
    initialScore: initialScores.get(page.id)!,
    finalScore: bestReport.pageScores.find((item) => item.pageId === page.id)!
      .score,
    initialSvg: initialSvgs.get(page.id)!,
    finalSvg: renderPageToSvg(page, bestSpec.assets),
    appliedCorrections: appliedAll.filter(
      (action) => action.pageId === page.id,
    ),
  }));
  return {
    spec: bestSpec,
    initial,
    final: bestReport,
    report: {
      steps,
      totalIterations: steps.length,
      bestVersionIteration,
      initialScore: initial.overallScore,
      finalScore: bestReport.overallScore,
      improvementDelta: bestReport.overallScore - initial.overallScore,
      copyIntact: validateDesignSpecCopyCoverage(graph, bestSpec).valid,
      fitIntact: evaluateDocumentFit(bestSpec, family).valid,
    },
    snapshots,
  };
}

function averageDimensions(report: DocumentQualityReport) {
  const keys = [
    "hierarchy",
    "typography",
    "spacing",
    "alignment",
    "composition",
    "balance",
    "density",
    "rhythm",
    "brandConsistency",
    "imagery",
    "readability",
    "consistency",
  ] as const;
  return Object.fromEntries(
    keys.map((key) => [
      key,
      Math.round(
        report.pageScores.reduce(
          (sum, item) => sum + item.score.dimensions[key],
          0,
        ) / Math.max(1, report.pageScores.length),
      ),
    ]),
  ) as unknown as import("./qualityTypes.js").DesignQualityDimensions;
}
