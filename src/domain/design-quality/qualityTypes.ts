// ============================================================
// Design Quality Types — Phase 2
// ============================================================

export type QualityIssueSeverity =
  "info" | "low" | "medium" | "high" | "critical";

export type QualityIssueType =
  | "weak_hierarchy"
  | "heading_not_dominant"
  | "body_too_dense"
  | "excessive_line_length"
  | "insufficient_whitespace"
  | "excessive_whitespace"
  | "poor_vertical_rhythm"
  | "inconsistent_alignment"
  | "weak_grid_adherence"
  | "uneven_column_balance"
  | "low_contrast"
  | "small_body_text"
  | "crowded_stat_block"
  | "repeated_layout_pattern"
  | "page_too_similar_to_previous"
  | "overuse_of_cards"
  | "underused_visual_area"
  | "orphaned_element"
  | "weak_focal_point"
  | "image_crop_issue"
  | "image_subject_cutoff"
  | "visual_weight_imbalance"
  | "brand_color_misuse"
  | "off_brand_typography"
  | "inconsistent_spacing"
  | "weak_section_transition"
  | "page_density_spike"
  | "visual_monotony"
  | "poor_table_readability"
  | "chart_overcrowding"
  | "disconnected_caption"
  | "insufficient_page_variety"
  | "too_many_type_sizes"
  | "overly_tight_leading"
  | "overly_loose_leading"
  | "typography_collision"
  | "short_last_line"
  | "all_caps_overuse"
  | "repeated_image_reuse";

// ─── Correction Action Vocabulary V2 ─────────────────────────────────────────

export type CorrectionActionType =
  // Typography
  | "increase_text_scale"
  | "decrease_text_scale"
  | "apply_text_style"
  // Spacing / Layout
  | "increase_spacing"
  | "decrease_spacing"
  | "normalize_spacing"
  | "increase_section_spacing"
  | "decrease_section_spacing"
  | "equalize_gaps"
  | "redistribute_whitespace"
  // Alignment / Grid
  | "align_to_grid"
  | "align_elements"
  | "change_alignment"
  // Region sizing
  | "adjust_region_width"
  | "adjust_region_height"
  | "resize_element"
  | "balance_columns"
  // Position
  | "move_within_region"
  // Image
  | "adjust_image_crop"
  | "change_image_fit"
  | "change_image_focal_point"
  // Visual weight
  | "reduce_visual_weight"
  | "increase_visual_weight"
  | "adjust_visual_weight"
  // Layout switching
  | "change_layout_variant"
  | "swap_compatible_layout"
  // Stat blocks
  | "change_stat_emphasis"
  | "reduce_card_count";

export interface CorrectionActionParams {
  // Font scale
  amount?: number;
  // Alignment
  alignment?: "left" | "center" | "right" | "justify";
  // Layout switch
  alternateLayoutId?: string;
  // Image
  focalPoint?: { x: number; y: number };
  imageFit?: "fill" | "fit" | "crop";
  // Style reference
  styleRef?: string;
  // Axis
  axis?: "x" | "y" | "both";
  // Named value
  value?: number | string;
}

export interface BoundedCorrectionActionV2 {
  type: CorrectionActionType;
  pageId: string;
  elementId?: string;
  params?: CorrectionActionParams;
  rationale: string;
  expectedImprovements: Array<keyof DesignQualityDimensions>;
  confidence: "low" | "medium" | "high";
}

// ─── Quality Dimensions ──────────────────────────────────────────────────────

export interface DesignQualityDimensions {
  hierarchy: number;
  typography: number;
  spacing: number;
  alignment: number;
  composition: number;
  balance: number;
  density: number;
  rhythm: number;
  brandConsistency: number;
  imagery: number;
  readability: number;
  consistency: number;
}

// Weighting table for computing overall score
// Total must sum to 1.0
export const QUALITY_DIMENSION_WEIGHTS: Record<
  keyof DesignQualityDimensions,
  number
> = {
  readability: 0.15, // most critical for business documents
  hierarchy: 0.15, // visual communication depends on this
  composition: 0.12, // page-level arrangement
  consistency: 0.1, // cross-page coherence
  typography: 0.1, // quality signal
  brandConsistency: 0.1, // brand fidelity
  spacing: 0.08, // air / breathing room
  alignment: 0.07, // grid discipline
  balance: 0.07, // visual equilibrium
  density: 0.03, // information density
  rhythm: 0.02, // pacing
  imagery: 0.01, // image quality
};

export interface DesignQualityStrength {
  dimension: keyof DesignQualityDimensions;
  message: string;
}

export type DesignQualityIssueSource =
  "deterministic" | "ai_visual" | "human_review";

export interface DesignQualityIssue {
  id: string;
  type: QualityIssueType;
  severity: QualityIssueSeverity;
  pageId?: string;
  elementIds?: string[];
  message: string;
  evidence?: string;
  recommendedActions: BoundedCorrectionActionV2[];
  /** Which signal produced this issue. Defaults to deterministic when absent. */
  source?: DesignQualityIssueSource;
  confidence?: "low" | "medium" | "high";
}

export interface DesignQualityScore {
  overall: number;
  dimensions: DesignQualityDimensions;
  issues: DesignQualityIssue[];
  strengths?: DesignQualityStrength[];
}

// ─── Document Rhythm ─────────────────────────────────────────────────────────

export type DocumentRhythmIssueType =
  | "repeated_layout_pattern"
  | "dense_sequence"
  | "text_heavy_sequence"
  | "stat_heavy_sequence"
  | "lack_of_visual_reset"
  | "weak_section_transition"
  | "inconsistent_density"
  | "visual_monotony"
  | "poor_opening_closing_balance";

export interface DocumentRhythmIssue {
  type: DocumentRhythmIssueType;
  pages: string[];
  severity: QualityIssueSeverity;
  recommendation: string;
}

export interface DocumentRhythmReport {
  score: number;
  issues: DocumentRhythmIssue[];
  pageSequence: Array<{
    pageId: string;
    layoutId: string;
    role: string;
    densityScore: number; // 0-100
    visualType: string;
  }>;
}

// ─── Page Composition ────────────────────────────────────────────────────────

export interface CompositionRegion {
  quadrant: "tl" | "tr" | "bl" | "br";
  occupiedRatio: number; // 0–1
  elementIds: string[];
}

export interface PageCompositionAnalysis {
  pageId: string;
  focalPointCandidate?: { x: number; y: number; elementId: string };
  leftWeight: number; // 0–100
  rightWeight: number;
  topWeight: number;
  bottomWeight: number;
  quadrants: CompositionRegion[];
  whitespaceRatio: number; // proportion of page that is empty
  elementCount: number;
  issues: DesignQualityIssue[];
}

// ─── Art Direction Profile ────────────────────────────────────────────────────

export type ArtDirectionStyle =
  | "editorial"
  | "corporate"
  | "data-forward"
  | "image-led"
  | "minimal"
  | "premium"
  | "bold";

export interface ArtDirectionProfile {
  id: string;
  name: string;
  style: ArtDirectionStyle;
  description: string;

  densityTarget: "light" | "medium" | "dense";
  imageProminence: "low" | "medium" | "high";
  typographyEmphasis: "headline" | "balanced" | "body";
  sectionTransitionStyle: "subtle" | "clear" | "bold";
  statTreatment: "minimal" | "card" | "large-number";

  // Constraints
  maxLayoutRepeat: number;
  minBodyFontSize: number;
  maxLineLength: number; // in characters
  preferredHeadingRatio: number; // heading/body size ratio
  spacingTolerance: "tight" | "standard" | "loose";
  contrastMinimum: number; // 0-100 luminance difference
}

// ─── Design Quality Preset ────────────────────────────────────────────────────

export interface DesignQualityPreset {
  id: string;
  name: string;
  description: string;
  artDirectionProfileId: string;

  // Score thresholds
  targetOverallScore: number;
  minAcceptableScore: number;

  // Specific targets
  minBodyFontSize: number;
  maxBodyLineLength: number; // characters
  maxLayoutRepeat: number;
  maxDensityVariation: number; // between adjacent pages 0-100
  minHierarchyRatio: number;
  contrastMinimum: number;
  maxTypeStyleCount: number;
  maxIterations: number;
}

// ─── Iteration V2 ────────────────────────────────────────────────────────────

export interface IterationStepV2 {
  iteration: number;
  scoreBeforeCorrections: DesignQualityScore;
  scoreAfterCorrections: DesignQualityScore;
  issues: DesignQualityIssue[];
  consideredCorrections: BoundedCorrectionActionV2[];
  appliedCorrections: BoundedCorrectionActionV2[];
  rejectedCorrections: Array<{
    action: BoundedCorrectionActionV2;
    reason: string;
  }>;
  stopReason:
    | "continuing"
    | "threshold_reached"
    | "max_iterations"
    | "no_actionable_issues"
    | "constraint_blocked"
    | "no_improvement"
    | "repeated_issue";
  isBestVersion: boolean;
}

export interface IterationReportV2 {
  steps: IterationStepV2[];
  totalIterations: number;
  bestVersionIteration: number;
  initialScore: number;
  finalScore: number;
  improvementDelta: number;
  copyIntact: boolean;
  fitIntact: boolean;
}

// ─── Before/After Snapshot ───────────────────────────────────────────────────

export interface BeforeAfterSnapshot {
  pageId: string;
  initialScore: DesignQualityScore;
  finalScore: DesignQualityScore;
  initialSvg: string;
  finalSvg: string;
  appliedCorrections: BoundedCorrectionActionV2[];
}

// ─── Evaluation Dataset Record ───────────────────────────────────────────────

export type HumanReviewVerdict =
  "acceptable" | "needs_refinement" | "needs_redesign";

export interface EvaluationRecord {
  id: string;
  label: string;
  manuscriptCategory:
    | "short"
    | "long"
    | "dense_narrative"
    | "statistics_heavy"
    | "table_heavy"
    | "quote_heavy"
    | "mixed"
    | "long_headings"
    | "many_sections"
    | "sparse"
    | "image_heavy"
    | "brand_light"
    | "brand_heavy";
  manuscriptWordCount: number;
  templateFamilyId: string;
  initialScore: number;
  finalScore: number;
  issues: DesignQualityIssue[];
  corrections: BoundedCorrectionActionV2[];
  copyResult: "pass" | "fail";
  fitResult: "pass" | "fail" | "partial";
  humanReview?: HumanReviewVerdict;
  humanNotes?: string;
}

// ─── Benchmark Summary ───────────────────────────────────────────────────────

export interface QualityBenchmarkSummary {
  totalFixtures: number;
  averageInitialScore: number;
  averageFinalScore: number;
  medianImprovement: number;
  percentAboveThreshold: number; // pages >= 80
  percentWithUnresolvedFit: number;
  percentWithCopyIssues: number;
  averageCorrectionsPerDocument: number;
  mostCommonIssues: Array<{ type: QualityIssueType; count: number }>;
  mostCommonFailedCorrections: Array<{
    type: CorrectionActionType;
    count: number;
  }>;
  humanReviewBreakdown: Record<HumanReviewVerdict, number>;
}
