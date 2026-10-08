/**
 * Template Authoring + Approval System v1 (Phase 5).
 *
 * Turns a built-in family, a reference-derived candidate, a DesignSpec, or a
 * saved project into a reviewable, approvable, versioned, reusable
 * `TemplateFamilyRecord`. The runtime `TemplateFamily` model is untouched.
 */

export * from "./types.js";
export { templateAuthoringEnabled } from "./flags.js";
export {
  validateTemplateFamilyV2,
  validationIssuesToWarnings,
} from "./validationV2.js";
export {
  emptyLayoutApproval,
  initialApprovalState,
  reviewLayout,
  layoutApprovalStatus,
  applyApprovalToFamily,
  summarizeApproval,
  approveAllLayouts,
  setApprovalWarnings,
  setTemplateApproved,
  setTemplateUnapproved,
  type ApprovalFilterOptions,
  type ApprovalSummary,
} from "./approval.js";
export {
  computeCoverage,
  buildTemplateQualitySummary,
  type BuildQualitySummaryInput,
} from "./qualitySummary.js";
export {
  runTemplateCapacityTests,
  applyCapacitySuggestions,
  measureStringWidth,
  type CapacityChange,
} from "./capacity.js";
export {
  defaultStatusForSource,
  createTemplateFamilyRecord,
  finalizeTemplateRecord,
  updateTemplateFamilyRecord,
  archiveTemplateFamilyRecord,
  rejectTemplateFamilyRecord,
  duplicateTemplateFamilyRecord,
  isTemplateFamilyRecord,
  MemoryTemplateRecordStore,
  LocalStorageTemplateRecordStore,
  type FinalizeInput,
  type TemplateRecordPatch,
  type TemplateFamilyRecordStore,
} from "./records.js";
export {
  emptyUsageMetadata,
  recordTemplateUsage,
  mergeHumanVerdict,
  type UsageRunReport,
} from "./usage.js";
export {
  createTemplateVersion,
  listTemplateVersions,
  latestTemplateVersion,
} from "./versioning.js";
export {
  TEMPLATE_SMOKE_CASES,
  runTemplateSmokeGeneration,
  type SmokeOptions,
} from "./smoke.js";
export {
  isTemplateReview,
  summarizeTemplateReviews,
  type TemplateReviewSummary,
} from "./reviews.js";
