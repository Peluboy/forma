import type {
  TemplateFamily,
  TemplateLayout,
  TemplateSlot,
} from "../template-family/types.js";

/**
 * Template Authoring + Approval System v1 (Phase 5).
 *
 * This module formalises a persisted, reviewable, versioned wrapper around the
 * runtime `TemplateFamily` model. The runtime model is unchanged: a
 * `TemplateFamilyRecord` carries a `family` plus approval, quality, usage, and
 * versioning metadata so candidates can be reviewed before production use.
 */

export const TEMPLATE_FAMILY_RECORD_VERSION = "1.0" as const;

export type TemplateRecordStatus =
  "draft" | "candidate" | "approved" | "archived" | "rejected";

export type TemplateRecordSource =
  | "builtin"
  | "reference_derived"
  | "designspec_derived"
  | "project_derived"
  | "manual"
  | "forked";

// ─── Visibility + sharing (Phase 6, Part B) ──────────────────────────────────

export type TemplateVisibility = "private" | "unlisted" | "public";

export type TemplateLicense =
  "private_use" | "internal_use" | "free_to_fork" | "custom";

export interface TemplateAttribution {
  creatorName?: string;
  sourceTemplateId?: string;
  sourceVersionId?: string;
  originalCreatorName?: string;
}

export interface TemplateSharingState {
  visibility: TemplateVisibility;
  /** Hard-to-guess token that resolves an unlisted template. */
  shareToken?: string;
  /** Stable, collision-checked public locator (no owner ids). */
  publicId?: string;
  sharedAt?: string;
  sharedBy?: string;
  /** When set, the share link (and public listing) no longer resolves. */
  revokedAt?: string;
  allowForking: boolean;
  /** Whether a public template appears in the gallery. */
  galleryListed?: boolean;
  license?: TemplateLicense;
  attribution?: TemplateAttribution;
}

// ─── Fork lineage (Phase 6, Part H) ──────────────────────────────────────────

export interface TemplateForkLineage {
  forkedFromTemplateId: string;
  forkedFromVersionId: string;
  forkedFromOwnerId?: string;
  forkedAt: string;
  originalTemplateId: string;
  lineageRootId: string;
  forkOwnerName?: string;
}

export type TemplateIssueSeverity = "error" | "warning" | "info";

export interface TemplateValidationIssue {
  code: string;
  severity: TemplateIssueSeverity;
  message: string;
  layoutId?: string;
  slotId?: string;
  elementId?: string;
}

export type TemplateValidationStatus =
  "valid" | "valid_with_warnings" | "invalid";

export interface TemplateValidationV2Result {
  valid: boolean;
  status: TemplateValidationStatus;
  issues: TemplateValidationIssue[];
  errorCount: number;
  warningCount: number;
}

export interface TemplateWarning {
  code: string;
  message: string;
  severity: TemplateIssueSeverity;
  layoutId?: string;
}

export interface TemplateBlocker {
  code: string;
  message: string;
}

// ─── Approval state (Part C) ─────────────────────────────────────────────────

export type LayoutApprovalStatus =
  "unreviewed" | "approved" | "needs_changes" | "rejected";

export interface LayoutApprovalState {
  status: LayoutApprovalStatus;
  reviewerNotes?: string;
  lastReviewedAt?: string;
}

export interface TemplateApprovalState {
  approved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  reviewedLayouts: Record<string, LayoutApprovalState>;
  unresolvedWarnings: TemplateWarning[];
  notes?: string;
}

// ─── Quality summary (Part D) ────────────────────────────────────────────────

export interface TemplateCoverage {
  hasCover: boolean;
  hasContent: boolean;
  hasTable: boolean;
  hasStats: boolean;
  hasQuote: boolean;
  hasClosing: boolean;
}

export interface TemplateQualitySummary {
  validationStatus: TemplateValidationStatus;
  layoutCount: number;
  approvedLayoutCount: number;
  coverage: TemplateCoverage;
  averageFitScore?: number;
  averageQualityScore?: number;
  projectionFidelityScore?: number;
  exactCopyPassRate?: number;
  warnings: TemplateWarning[];
  blockers: TemplateBlocker[];
}

// ─── Capacity testing (Part F) ───────────────────────────────────────────────

export type CapacityOverflowBehavior =
  "fits" | "shrinks" | "overflow" | "continuation" | "unknown";

export interface SlotCapacityEstimate {
  slotId: string;
  role?: string;
  declaredMaxCharacters?: number;
  measuredMaxCharacters: number;
  recommendedCharacters: number;
  sampleLengths: {
    short: number;
    normal: number;
    long: number;
    edge: number;
  };
  overflowBehavior: CapacityOverflowBehavior;
  continuationBehavior: "none" | "extends" | "unknown";
  warnings: TemplateWarning[];
}

export interface LayoutCapacityReport {
  layoutId: string;
  name: string;
  role: TemplateLayout["role"];
  slots: SlotCapacityEstimate[];
  maxTableRows?: number;
  maxStatItems?: number;
  recommendedDensity: "sparse" | "balanced" | "dense";
  fitStatus: "fits" | "tight" | "overflow" | "unknown";
  warnings: TemplateWarning[];
}

export interface TemplateCapacityReport {
  templateId: string;
  layouts: LayoutCapacityReport[];
  warnings: TemplateWarning[];
  suggestedSlotMaxCharacters: Record<string, Record<string, number>>;
}

// ─── Smoke generation (Part M) ───────────────────────────────────────────────

export interface TemplateSmokeCase {
  id: string;
  name: string;
  manuscript: string;
}

export interface TemplateSmokeCaseResult {
  caseId: string;
  name: string;
  success: boolean;
  critical: boolean;
  pageCount: number;
  qualityScore: number;
  projectionFidelityScore: number;
  exactCopyPass: boolean;
  fitPass: boolean;
  trusted: boolean;
  errors: string[];
}

export interface TemplateSmokeReport {
  passed: boolean;
  criticalFailures: string[];
  cases: TemplateSmokeCaseResult[];
  generatedAt: string;
}

// ─── Usage analytics (Part N) ────────────────────────────────────────────────

export interface TemplateUsageFailure {
  code: string;
  count: number;
}

export interface TemplateUsageMetadata {
  timesUsed: number;
  lastUsedAt?: string;
  averageQualityScore?: number;
  averageProjectionFidelity?: number;
  averagePageCount?: number;
  continuationFrequency?: number;
  commonFailures: TemplateUsageFailure[];
  humanVerdicts: {
    approved: number;
    needs_refinement: number;
    reject: number;
  };
}

// ─── Human review (Part O) ───────────────────────────────────────────────────

export type TemplateReviewVerdict = "approved" | "needs_refinement" | "reject";

export interface TemplateReviewLayoutNote {
  layoutId: string;
  note: string;
}

export interface TemplateReview {
  templateId: string;
  templateVersionId: string;
  reviewer: string;
  rating: number; // 1..5
  verdict: TemplateReviewVerdict;
  layoutNotes: TemplateReviewLayoutNote[];
  createdAt: string;
  notes?: string;
}

// ─── Versioning (Part J) ─────────────────────────────────────────────────────

export interface TemplateVersionSummary {
  templateId: string;
  versionNumber: number;
  recordId: string;
  parentVersionId?: string;
  changelog: string;
  createdAt: string;
  status: TemplateRecordStatus;
}

// ─── The persisted record (Part B) ───────────────────────────────────────────

export interface TemplateReferenceLineage {
  profileId?: string;
  sourceType?: string;
  confidence?: number;
  usageMode?: string;
}

export interface TemplateFamilyRecord {
  id: string;
  ownerId?: string;

  version: typeof TEMPLATE_FAMILY_RECORD_VERSION;

  name: string;
  description?: string;

  status: TemplateRecordStatus;

  source: TemplateRecordSource;

  family: TemplateFamily;

  approval: TemplateApprovalState;
  quality: TemplateQualitySummary;
  usage?: TemplateUsageMetadata;

  reference?: TemplateReferenceLineage;

  // Phase 6: safe visibility/sharing and fork lineage. Absent means private +
  // not forkable (the safe default).
  sharing?: TemplateSharingState;
  forkedFrom?: TemplateForkLineage;

  // Versioning (Part J). `templateId` is the lineage root; `id` is the record id.
  templateId: string;
  versionNumber: number;
  parentVersionId?: string;
  changelog?: string;

  createdAt: string;
  updatedAt: string;
}

export interface TemplateRecordInput {
  family: TemplateFamily;
  source: TemplateRecordSource;
  name?: string;
  description?: string;
  ownerId?: string;
  status?: TemplateRecordStatus;
  reference?: TemplateReferenceLineage;
  sharing?: TemplateSharingState;
  forkedFrom?: TemplateForkLineage;
}

export type { TemplateFamily, TemplateLayout, TemplateSlot };
