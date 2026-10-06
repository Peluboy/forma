// ============================================================
// Correction Planner — Phase 2 Part J
// ============================================================

import type {
  DesignQualityIssue,
  BoundedCorrectionActionV2,
  QualityIssueSeverity,
} from "./qualityTypes.js";

const SEVERITY_PRIORITY: Record<QualityIssueSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

const SUPPORTED_ACTIONS = new Set<BoundedCorrectionActionV2["type"]>([
  "increase_text_scale",
  "decrease_text_scale",
  "align_to_grid",
  "align_elements",
  "increase_spacing",
  "decrease_spacing",
  "adjust_region_width",
  "adjust_image_crop",
  "change_image_focal_point",
  "change_image_fit",
]);

export interface CorrectionPlannerConfig {
  maxCorrectionsPerIteration: number; // recommended: 3
  minSeverityToAct: QualityIssueSeverity;
  previouslyAppliedTypes: Set<string>; // avoid oscillation
  previouslyFailedTypes: Set<string>; // don't retry known failures
}

export interface PlannedCorrectionSet {
  selected: BoundedCorrectionActionV2[];
  skipped: Array<{ action: BoundedCorrectionActionV2; reason: string }>;
}

export function planCorrections(
  issues: DesignQualityIssue[],
  config: CorrectionPlannerConfig,
): PlannedCorrectionSet {
  const selected: BoundedCorrectionActionV2[] = [];
  const skipped: PlannedCorrectionSet["skipped"] = [];

  // Sort issues by severity descending
  const sorted = [...issues].sort(
    (a, b) => SEVERITY_PRIORITY[b.severity] - SEVERITY_PRIORITY[a.severity],
  );

  const minPriority = SEVERITY_PRIORITY[config.minSeverityToAct];

  for (const issue of sorted) {
    if (selected.length >= config.maxCorrectionsPerIteration) break;

    if (SEVERITY_PRIORITY[issue.severity] < minPriority) {
      for (const action of issue.recommendedActions) {
        skipped.push({
          action,
          reason: `Severity '${issue.severity}' below threshold '${config.minSeverityToAct}'.`,
        });
      }
      continue;
    }

    for (const action of issue.recommendedActions) {
      if (selected.length >= config.maxCorrectionsPerIteration) break;

      if (!SUPPORTED_ACTIONS.has(action.type)) {
        skipped.push({
          action,
          reason: "Correction command is not implemented safely yet.",
        });
        continue;
      }

      // Skip previously failed action types
      const targetKey = `${action.type}:${action.pageId}:${action.elementId ?? "page"}`;
      if (
        config.previouslyFailedTypes.has(targetKey) ||
        config.previouslyAppliedTypes.has(targetKey)
      ) {
        skipped.push({
          action,
          reason: `Action type '${action.type}' previously failed. Skipping to avoid oscillation.`,
        });
        continue;
      }

      // Skip low-confidence actions on structural issues
      const isStructural =
        action.type === "swap_compatible_layout" ||
        action.type === "change_layout_variant" ||
        action.type === "redistribute_whitespace";

      if (action.confidence === "low" && isStructural) {
        skipped.push({
          action,
          reason: "Low-confidence structural action rejected.",
        });
        continue;
      }

      // Skip if recently applied the same type to the same element (oscillation guard)
      const alreadyPending = selected.some(
        (s) => s.pageId === action.pageId && s.elementId === action.elementId,
      );
      if (alreadyPending) {
        skipped.push({
          action,
          reason: "Duplicate action for same element already queued.",
        });
        continue;
      }

      selected.push(action);
    }
  }

  return { selected, skipped };
}
