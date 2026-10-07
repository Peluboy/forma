import {
  contentGraphFromManuscript,
  stableTextHash,
  type ExactCopyResult,
} from "../content/index.js";
import type { ContentGraph } from "../content/types.js";
import { validateDesignSpecCopyCoverage } from "../design-spec/copyCoverage.js";
import type { DesignSpec } from "../design-spec/types.js";
import { validateDesignSpec } from "../design-spec/validation.js";
import { projectDesignSpecToFlowDocument } from "../design-spec/adapters/toFlowDocument.js";
import { checkEditorExportConsistency } from "../design-spec/adapters/exportConsistency.js";
import type { EditorProjectionFidelityReport } from "../design-spec/fidelity/index.js";
import type { Project } from "../design/model.js";
import { planDesignDeterministically } from "../design-plan/artDirector.js";
import type { DesignPlan } from "../design-plan/types.js";
import { validateDesignPlan } from "../design-plan/validation.js";
import { FORMA_EDITORIAL_REPORT } from "../template-family/builtin/editorialReport.js";
import { instantiateDesignSpec } from "../template-family/resolver.js";
import type { TemplateFamily } from "../template-family/types.js";
import {
  evaluateDocumentFit,
  repairDocumentFit,
  applyContinuationPagination,
  type ContinuationReport,
} from "../layout-fit/index.js";
import type { DocumentFitReport } from "../layout-fit/types.js";
import {
  runQualityLoop,
  type QualityLoopResult,
} from "../design-quality/qualityLoop.js";
import {
  aiCriticInfluenceEnabled,
  validateAiVisualIssues,
  type AiVisualIssueInput,
} from "../design-quality/aiCritic.js";
import {
  assessDeliverableQuality,
  type DeliverableQualityAssessment,
} from "../design-quality/trustGate.js";
import { evaluatePageVisuals } from "../visual-critic/critic.js";
import type {
  IterationReport,
  VisualCriticReport,
} from "../visual-critic/types.js";
import {
  resolveReferenceFamily,
  computeReferenceSimilarity,
} from "../reference-design/index.js";
import type {
  ReferenceDesignProfile,
  ReferenceSimilarityReport,
  ReferenceSourceType,
  ReferenceTemplateGateResult,
  ReferenceUsageMode,
} from "../reference-design/types.js";

export type PipelineStage =
  | "understanding_content"
  | "planning_pages"
  | "building_layouts"
  | "checking_copy"
  | "checking_fit"
  | "splitting_continuations"
  | "reviewing_design"
  | "projecting_to_editor"
  | "ready"
  | "failed";

export interface GenerationProvenance {
  modelProvider: string;
  modelId: string;
  promptVersion: string;
  generatorVersion: string;
  templateFamilyId: string;
  templateFamilyVersion: string;
  designPlanVersion: string;
  contentHash: string;
  generatedAt: string;
  initialCriticScore: number;
  finalCriticScore: number;
  correctionsAppliedCount: number;
}

export interface PipelineProgressUpdate {
  stage: PipelineStage;
  message: string;
  progressPercent: number;
}

export interface DesignerPipelineOptions {
  family?: TemplateFamily;
  customPlan?: DesignPlan;
  onProgress?: (update: PipelineProgressUpdate) => void;
  maxCriticIterations?: number;
  qualityPresetId?: string;
  /** Enable continuation pagination for oversized content (default true). */
  enableContinuations?: boolean;
  maxContinuationPages?: number;
  /** Allow AI visual issues to influence the planner (feature flag). */
  enableAiCritic?: boolean;
  aiVisualIssues?: AiVisualIssueInput[];
  /** Optional reference design intelligence guiding styling or layout. */
  referenceProfile?: ReferenceDesignProfile | null;
}

export interface ReferenceUsageReport {
  profileId: string | null;
  sourceType: ReferenceSourceType | null;
  confidence: number | null;
  usageMode: ReferenceUsageMode;
  gate: ReferenceTemplateGateResult | null;
  similarity: ReferenceSimilarityReport | null;
  reasons: string[];
}

export interface AiCriticInfluenceReport {
  enabled: boolean;
  accepted: number;
  rejected: number;
  rejectedReasons: string[];
  source: "deterministic" | "ai_visual";
}

export interface DesignerPipelineResult {
  success: boolean;
  provenance: GenerationProvenance;
  graph: ContentGraph;
  plan: DesignPlan;
  family: TemplateFamily;
  initialSpec: DesignSpec;
  finalSpec: DesignSpec;
  fitReport: DocumentFitReport;
  copyCoverage: ExactCopyResult;
  continuation: ContinuationReport;
  criticReports: VisualCriticReport[];
  iterationReport: IterationReport;
  quality: QualityLoopResult;
  pageSvgs: string[];
  project: Project;
  projectionFidelity: EditorProjectionFidelityReport;
  exportConsistency: ReturnType<typeof checkEditorExportConsistency>;
  deliverableQuality: DeliverableQualityAssessment;
  aiCritic: AiCriticInfluenceReport;
  reference: ReferenceUsageReport;
  errors: string[];
}

export async function runAiDesignerPipeline(
  manuscript: string,
  options: DesignerPipelineOptions = {},
): Promise<DesignerPipelineResult> {
  const baseFamily = options.family || FORMA_EDITORIAL_REPORT;
  const referenceResolution = resolveReferenceFamily(
    options.referenceProfile,
    baseFamily,
  );
  const family = referenceResolution.family;
  const errors: string[] = [];
  const contentHash = stableTextHash(manuscript);
  const notify = (
    stage: PipelineStage,
    message: string,
    progressPercent: number,
  ) => {
    options.onProgress?.({ stage, message, progressPercent });
  };

  // Step 1: Understanding Content -> ContentGraph
  notify(
    "understanding_content",
    "Parsing approved manuscript and establishing source provenance...",
    12,
  );
  const graph = contentGraphFromManuscript(manuscript, { copyPolicy: "exact" });

  // Step 2: Planning Pages -> DesignPlan
  notify(
    "planning_pages",
    "Art Director is structuring pages and mapping content to semantic slots...",
    28,
  );
  let plan = options.customPlan;
  if (!plan) {
    plan = planDesignDeterministically(graph, family);
  }

  const planVal = validateDesignPlan(plan, family, graph);
  if (!planVal.valid) {
    const errorDetails = planVal.issues
      .map((i) => `${i.type}: ${i.message}`)
      .join("; ");
    errors.push(`DesignPlan validation failed: ${errorDetails}`);
  }

  // Step 3: Building Layouts -> Deterministic DesignSpec Instantiation
  notify(
    "building_layouts",
    "Instantiating approved template geometry and binding copy...",
    44,
  );
  const initialSpec = instantiateDesignSpec(family, plan, graph, {
    skipValidation: true,
  });

  const specVal = validateDesignSpec(initialSpec);
  if (!specVal.valid) {
    errors.push(
      `DesignSpec validation failed: ${specVal.issues.map((i) => i.message).join("; ")}`,
    );
  }

  // Step 4: Checking Copy Integrity
  notify(
    "checking_copy",
    "Verifying Exact Copy integrity against original source spans...",
    56,
  );
  const copyCoverage = validateDesignSpecCopyCoverage(graph, initialSpec);
  if (!copyCoverage.valid) {
    const copyIssues = copyCoverage.issues
      .map((i) => `${i.type}: ${i.message}`)
      .join("; ");
    errors.push(`Exact Copy validation failed: ${copyIssues}`);
  }

  // Step 5: Checking Fit & Repairing Overflow
  notify(
    "checking_fit",
    "Measuring typography line wrapping and repairing overflow...",
    66,
  );
  const { spec: fitRepairedSpec } = repairDocumentFit(initialSpec, family);

  // Step 5b: Continuation Pagination for content that still does not fit.
  notify(
    "splitting_continuations",
    "Splitting oversized content into continuation pages...",
    74,
  );
  const enableContinuations = options.enableContinuations !== false;
  const continuationResult = enableContinuations
    ? applyContinuationPagination(fitRepairedSpec, family, graph, {
        maxContinuationPages: options.maxContinuationPages,
      })
    : { spec: fitRepairedSpec, report: emptyContinuationReport() };
  const continuationSpec = continuationResult.spec;
  if (enableContinuations) {
    const contCopy = validateDesignSpecCopyCoverage(graph, continuationSpec);
    if (!contCopy.valid)
      errors.push(
        `Continuation copy validation failed: ${contCopy.issues.map((i) => i.message).join("; ")}`,
      );
  }

  // Step 6: Optional AI visual issues -> controlled taxonomy.
  const aiEnabled = options.enableAiCritic ?? aiCriticInfluenceEnabled();
  const aiValidation = validateAiVisualIssues(
    continuationSpec,
    options.aiVisualIssues || [],
    { enabled: aiEnabled },
  );
  const aiCritic: AiCriticInfluenceReport = {
    enabled: aiEnabled,
    accepted: aiValidation.accepted.length,
    rejected: aiValidation.rejected.length,
    rejectedReasons: aiValidation.rejected.map((entry) => entry.reason),
    source: aiValidation.accepted.length ? "ai_visual" : "deterministic",
  };

  // Step 7: Reviewing Design -> Deterministic quality loop.
  notify(
    "reviewing_design",
    "Visual Critic evaluating layout hierarchy, whitespace, and balance...",
    86,
  );
  const quality = runQualityLoop(
    continuationSpec,
    family,
    graph,
    options.qualityPresetId,
    options.maxCriticIterations ?? 3,
    aiValidation.accepted,
  );
  const finalSpec = quality.spec;

  const finalCopyVal = validateDesignSpecCopyCoverage(graph, finalSpec);
  if (!finalCopyVal.valid) {
    errors.push(
      `Post-critic copy validation failed: ${finalCopyVal.issues.map((i) => i.message).join("; ")}`,
    );
  }
  const finalFitEval = evaluateDocumentFit(finalSpec, family);

  // Step 8: Project to the editable editor and measure projection fidelity.
  notify(
    "projecting_to_editor",
    "Projecting the design into the editable document and measuring fidelity...",
    94,
  );
  const projection = projectDesignSpecToFlowDocument(finalSpec, manuscript);
  const project = projection.project;
  const exportConsistency = checkEditorExportConsistency(finalSpec, project);
  const deliverableQuality = assessDeliverableQuality(
    quality.report.finalScore,
    projection.fidelity,
  );

  const success =
    errors.length === 0 &&
    finalCopyVal.valid &&
    planVal.valid &&
    finalFitEval.valid &&
    quality.report.copyIntact &&
    quality.report.fitIntact &&
    projection.fidelity.overall !== "unsafe";

  notify(
    success ? "ready" : "failed",
    success
      ? "Report draft ready for review and editing."
      : "Generation completed with unresolved errors.",
    100,
  );

  const referenceSimilarity = options.referenceProfile
    ? computeReferenceSimilarity(options.referenceProfile, finalSpec)
    : null;
  const reference: ReferenceUsageReport = {
    profileId: options.referenceProfile?.id ?? null,
    sourceType: options.referenceProfile?.source?.type ?? null,
    confidence: options.referenceProfile?.confidence.overall ?? null,
    usageMode: referenceResolution.mode,
    gate: options.referenceProfile ? referenceResolution.gate : null,
    similarity: referenceSimilarity,
    reasons: referenceResolution.reasons,
  };
  if (options.referenceProfile)
    finalSpec.metadata = {
      ...finalSpec.metadata,
      referenceProfileId: options.referenceProfile.id,
      referenceSourceType: options.referenceProfile.source.type,
      referenceConfidence: options.referenceProfile.confidence.overall,
      referenceUsageMode: referenceResolution.mode,
    };

  const initialScore = quality.report.initialScore;
  const finalScore = quality.report.finalScore;
  const correctionsCount = quality.report.steps.reduce(
    (sum, step) => sum + step.appliedCorrections.length,
    0,
  );

  const provenance: GenerationProvenance = {
    modelProvider: "deterministic-art-director",
    modelId: "none",
    promptVersion: "1.0",
    generatorVersion: "forma-pipeline-v2b",
    templateFamilyId: family.id,
    templateFamilyVersion: family.version,
    designPlanVersion: plan.version,
    contentHash,
    generatedAt: new Date().toISOString(),
    initialCriticScore: initialScore,
    finalCriticScore: finalScore,
    correctionsAppliedCount: correctionsCount,
  };

  return {
    success,
    provenance,
    graph,
    plan,
    family,
    initialSpec,
    finalSpec,
    fitReport: finalFitEval,
    copyCoverage: finalCopyVal,
    continuation: continuationResult.report,
    criticReports: finalSpec.pages.map((page) =>
      evaluatePageVisuals(page, family),
    ),
    iterationReport: {
      steps: [],
      totalIterations: quality.report.totalIterations,
      finalQualityScore: quality.report.finalScore,
    },
    quality,
    pageSvgs: quality.snapshots.map((snapshot) => snapshot.finalSvg),
    project,
    projectionFidelity: projection.fidelity,
    exportConsistency,
    deliverableQuality,
    aiCritic,
    reference,
    errors,
  };
}

function emptyContinuationReport(): ContinuationReport {
  return {
    applied: false,
    splits: [],
    continuationPageCount: 0,
    unresolvedCount: 0,
  };
}
