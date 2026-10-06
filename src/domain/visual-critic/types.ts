export type BoundedCorrectionActionType =
  | "increase_text_scale"
  | "decrease_text_scale"
  | "increase_spacing"
  | "decrease_spacing"
  | "move_within_region"
  | "resize_element"
  | "change_alignment"
  | "change_layout_variant"
  | "adjust_image_crop"
  | "reduce_visual_weight"
  | "increase_visual_weight";

export interface BoundedCorrectionAction {
  type: BoundedCorrectionActionType;
  pageId: string;
  elementId?: string;
  amount?: number; // scale steps or delta px
  alignment?: "left" | "center" | "right" | "justify";
  alternateLayoutId?: string;
  rationale?: string;
}

export type VisualIssueSeverity = "low" | "medium" | "high";

export type VisualIssueType =
  | "weak_hierarchy"
  | "poor_balance"
  | "awkward_spacing"
  | "overcrowded"
  | "awkward_whitespace"
  | "low_contrast"
  | "alignment_inconsistency"
  | "typography_collision"
  | "brand_divergence";

export interface VisualIssue {
  type: VisualIssueType;
  pageId: string;
  elementIds?: string[];
  severity: VisualIssueSeverity;
  message: string;
  recommendedAction?: BoundedCorrectionAction;
}

export interface VisualCriticScores {
  overall: number;
  hierarchy: number;
  balance: number;
  spacing: number;
  typography: number;
  brandConsistency: number;
}

export interface VisualCriticReport {
  pageId: string;
  scores: VisualCriticScores;
  issues: VisualIssue[];
  passedThreshold: boolean; // e.g. overall >= 80
}

export interface IterationStep {
  iteration: number;
  initialScore: number;
  finalScore: number;
  issues: VisualIssue[];
  appliedCorrections: BoundedCorrectionAction[];
  stopReason:
    | "threshold_reached"
    | "max_iterations"
    | "no_actionable_issues"
    | "constraint_blocked";
}

export interface IterationReport {
  steps: IterationStep[];
  totalIterations: number;
  finalQualityScore: number;
}
