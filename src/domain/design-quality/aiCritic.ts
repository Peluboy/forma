import type { DesignSpec } from "../design-spec/types.js";
import type {
  BoundedCorrectionActionV2,
  DesignQualityIssue,
  QualityIssueSeverity,
  QualityIssueType,
} from "./qualityTypes.js";

/**
 * AI visual review is advisory. It may add subjective issues, but those issues
 * only influence the correction planner when the type is recognized, the ids
 * are real, and the recommendation maps to a supported bounded action.
 */

export const KNOWN_QUALITY_ISSUE_TYPES: ReadonlySet<QualityIssueType> = new Set(
  [
    "weak_hierarchy",
    "heading_not_dominant",
    "body_too_dense",
    "excessive_line_length",
    "insufficient_whitespace",
    "excessive_whitespace",
    "poor_vertical_rhythm",
    "inconsistent_alignment",
    "weak_grid_adherence",
    "uneven_column_balance",
    "low_contrast",
    "small_body_text",
    "crowded_stat_block",
    "repeated_layout_pattern",
    "page_too_similar_to_previous",
    "overuse_of_cards",
    "underused_visual_area",
    "orphaned_element",
    "weak_focal_point",
    "image_crop_issue",
    "image_subject_cutoff",
    "visual_weight_imbalance",
    "brand_color_misuse",
    "off_brand_typography",
    "inconsistent_spacing",
    "weak_section_transition",
    "page_density_spike",
    "visual_monotony",
    "poor_table_readability",
    "chart_overcrowding",
    "disconnected_caption",
    "insufficient_page_variety",
    "too_many_type_sizes",
    "overly_tight_leading",
    "overly_loose_leading",
    "typography_collision",
    "short_last_line",
    "all_caps_overuse",
    "repeated_image_reuse",
  ],
);

export interface AiVisualIssueInput {
  type: string;
  severity: QualityIssueSeverity;
  pageId: string;
  message: string;
  elementIds?: string[];
  confidence?: "low" | "medium" | "high";
}

export interface AiCriticOptions {
  enabled: boolean;
  minSeverity?: QualityIssueSeverity;
  minConfidence?: "low" | "medium" | "high";
}

export interface RejectedAiIssue {
  issue: AiVisualIssueInput;
  reason: string;
}

export interface AiCriticValidation {
  accepted: DesignQualityIssue[];
  rejected: RejectedAiIssue[];
}

const SEVERITY_RANK: Record<QualityIssueSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const CONFIDENCE_RANK: Record<"low" | "medium" | "high", number> = {
  low: 0,
  medium: 1,
  high: 2,
};

/**
 * Only subjective spacing issues map to a bounded action we can apply safely.
 * Everything else is recorded as a signal but cannot mutate the design.
 */
function actionFor(
  type: QualityIssueType,
  pageId: string,
  elementId: string | undefined,
): BoundedCorrectionActionV2[] {
  if (type === "insufficient_whitespace" && elementId)
    return [
      {
        type: "increase_spacing",
        pageId,
        elementId,
        params: { amount: 4, axis: "y" },
        rationale: "AI review flagged insufficient whitespace.",
        expectedImprovements: ["spacing"],
        confidence: "medium",
      },
    ];
  return [];
}

export function validateAiVisualIssues(
  spec: DesignSpec,
  issues: AiVisualIssueInput[],
  options: AiCriticOptions,
): AiCriticValidation {
  const accepted: DesignQualityIssue[] = [];
  const rejected: RejectedAiIssue[] = [];
  if (!options.enabled)
    return {
      accepted: [],
      rejected: issues.map((issue) => ({
        issue,
        reason: "AI visual critic influence is disabled.",
      })),
    };

  const pageIds = new Set(spec.pages.map((page) => page.id));
  const elementIds = new Set(
    spec.pages.flatMap((page) => page.elements.map((element) => element.id)),
  );
  const minSeverity = SEVERITY_RANK[options.minSeverity ?? "medium"];
  const minConfidence = CONFIDENCE_RANK[options.minConfidence ?? "medium"];

  for (const issue of issues) {
    if (!KNOWN_QUALITY_ISSUE_TYPES.has(issue.type as QualityIssueType)) {
      rejected.push({ issue, reason: `Unknown issue type "${issue.type}".` });
      continue;
    }
    if (!pageIds.has(issue.pageId)) {
      rejected.push({ issue, reason: `Unknown page id "${issue.pageId}".` });
      continue;
    }
    if (
      issue.elementIds?.length &&
      issue.elementIds.some((id) => !elementIds.has(id))
    ) {
      rejected.push({
        issue,
        reason: "AI issue references an unknown element.",
      });
      continue;
    }
    if (SEVERITY_RANK[issue.severity] < minSeverity) {
      rejected.push({
        issue,
        reason: "Severity below the AI influence threshold.",
      });
      continue;
    }
    const confidence = issue.confidence ?? "medium";
    if (CONFIDENCE_RANK[confidence] < minConfidence) {
      rejected.push({
        issue,
        reason: "Confidence below the AI influence threshold.",
      });
      continue;
    }
    const elementId = issue.elementIds?.[0];
    accepted.push({
      id: `ai-${issue.pageId}-${issue.type}-${accepted.length}`,
      type: issue.type as QualityIssueType,
      severity: issue.severity,
      pageId: issue.pageId,
      elementIds: issue.elementIds,
      message: issue.message,
      evidence: `source: ai_visual, confidence: ${confidence}`,
      recommendedActions: actionFor(
        issue.type as QualityIssueType,
        issue.pageId,
        elementId,
      ),
      source: "ai_visual",
      confidence,
    });
  }
  return { accepted, rejected };
}

export interface MergedIssues {
  issues: DesignQualityIssue[];
  aiAccepted: number;
  aiRejected: number;
}

/** Deterministic issues always win; AI issues are appended. */
export function mergeDeterministicAndAiIssues(
  deterministic: DesignQualityIssue[],
  ai: DesignQualityIssue[],
): MergedIssues {
  return {
    issues: [...deterministic, ...ai],
    aiAccepted: ai.length,
    aiRejected: 0,
  };
}

/**
 * Resolves the opt-in env map without dereferencing the Node `process` global,
 * which does not exist in the browser bundle (it would throw
 * `ReferenceError: process is not defined`). In the browser this falls back to
 * an empty map, so AI critic influence stays opt-in and off by default.
 */
function defaultAiCriticEnv(): Record<string, string | undefined> {
  return typeof process !== "undefined" && process.env ? process.env : {};
}

export function aiCriticInfluenceEnabled(
  env: Record<string, string | undefined> = defaultAiCriticEnv(),
): boolean {
  return env.FORMA_AI_CRITIC_INFLUENCE === "true";
}
