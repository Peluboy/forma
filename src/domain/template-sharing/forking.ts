import {
  createTemplateFamilyRecord,
  finalizeTemplateRecord,
  initialApprovalState,
  updateTemplateFamilyRecord,
  type TemplateFamily,
  type TemplateFamilyRecord,
  type TemplateForkLineage,
} from "../template-authoring/index.js";
import {
  canForkTemplate,
  forkingBlockReason,
  type TemplateActor,
} from "./permissions.js";

/**
 * Template forking (Phase 6, Part H).
 *
 * A fork is a brand-new lineage root owned by the forking user. The original
 * record is never mutated: the family is deep-copied, the approval is either
 * re-derived or reset, and the lineage back to the original is recorded.
 *
 * Policy: when the source is an approved template its family is copied
 * unchanged, so the fork may start `approved` but `private` (the recommended
 * safe default). Any later edit goes through the normal versioning path, which
 * resets approval. Non-approved sources fork into a `draft`.
 */

export interface ForkOptions {
  ownerId?: string;
  name?: string;
  description?: string;
  /** Copy approval from the source. Defaults to true for approved sources. */
  inheritApproval?: boolean;
  forkOwnerName?: string;
  lineageRootId?: string;
  originalTemplateId?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Deep copy so a fork can never share mutable state with the original. */
function deepCopyFamily(family: TemplateFamily): TemplateFamily {
  if (typeof structuredClone === "function") return structuredClone(family);
  return JSON.parse(JSON.stringify(family)) as TemplateFamily;
}

export function forkTemplateRecord(
  source: TemplateFamilyRecord,
  actor: TemplateActor,
  options: ForkOptions = {},
): TemplateFamilyRecord {
  if (!canForkTemplate(source, actor))
    throw new Error(
      forkingBlockReason(source, actor) ?? "This template cannot be forked.",
    );

  const lineage: TemplateForkLineage = {
    forkedFromTemplateId: source.templateId,
    forkedFromVersionId: source.id,
    ...(source.ownerId ? { forkedFromOwnerId: source.ownerId } : {}),
    forkedAt: nowIso(),
    originalTemplateId:
      options.originalTemplateId ??
      source.forkedFrom?.originalTemplateId ??
      source.templateId,
    lineageRootId:
      options.lineageRootId ??
      source.forkedFrom?.lineageRootId ??
      source.templateId,
    ...(options.forkOwnerName ? { forkOwnerName: options.forkOwnerName } : {}),
  };

  const draft = createTemplateFamilyRecord({
    family: deepCopyFamily(source.family),
    source: "forked",
    name: options.name || `${source.name} (fork)`,
    ...((options.description ?? source.description)
      ? { description: options.description ?? source.description }
      : {}),
    ...(options.ownerId ? { ownerId: options.ownerId } : {}),
    status: "draft",
    forkedFrom: lineage,
  });

  const inheritApproval =
    options.inheritApproval ?? source.status === "approved";
  if (
    inheritApproval &&
    source.status === "approved" &&
    source.approval.approved
  ) {
    const layoutIds = draft.family.layouts.map((layout) => layout.id);
    const approval = initialApprovalState(layoutIds, {
      approved: true,
      approvedBy: source.approval.approvedBy,
    });
    for (const id of layoutIds)
      approval.reviewedLayouts[id] = source.approval.reviewedLayouts[id] ?? {
        status: "approved",
        lastReviewedAt: nowIso(),
      };
    const approved = updateTemplateFamilyRecord(draft, {
      status: "approved",
      approval,
      changelog: "Forked from an approved template (private).",
    });
    return finalizeTemplateRecord(approved, {});
  }

  return updateTemplateFamilyRecord(draft, {
    changelog: "Forked from a shared template.",
  });
}
