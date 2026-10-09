import type { TemplateFamilyRecord } from "../template-authoring/index.js";

/**
 * Deterministic permission rules (Phase 6, Part C).
 *
 * These live in the domain so the UI, server, and tests all agree. They are
 * pure functions of the record and the actor — no clock, no I/O.
 */

export interface TemplateActor {
  ownerId?: string | null;
  signedIn?: boolean;
}

export const ANONYMOUS: TemplateActor = { ownerId: null, signedIn: false };

export function isTemplateOwner(
  record: TemplateFamilyRecord,
  actor: TemplateActor,
): boolean {
  return Boolean(actor.ownerId) && record.ownerId === actor.ownerId;
}

export function isShareRevoked(record: TemplateFamilyRecord): boolean {
  return Boolean(record.sharing?.revokedAt);
}

/** Owner can edit their own template (any status except a final rejected one). */
export function canEditTemplate(
  record: TemplateFamilyRecord,
  actor: TemplateActor,
): boolean {
  if (!isTemplateOwner(record, actor)) return false;
  return record.status !== "rejected";
}

export function canArchiveTemplate(
  record: TemplateFamilyRecord,
  actor: TemplateActor,
): boolean {
  return isTemplateOwner(record, actor) && record.status !== "archived";
}

/**
 * Only an owner can share, and only an approved template. Draft/candidate/
 * rejected templates can never be shared; archived templates cannot newly
 * become public.
 */
export function canShareTemplate(
  record: TemplateFamilyRecord,
  actor: TemplateActor,
): boolean {
  if (!isTemplateOwner(record, actor)) return false;
  if (record.status !== "approved") return false;
  if (!record.approval?.approved) return false;
  return true;
}

export function canMakeTemplatePublic(
  record: TemplateFamilyRecord,
  actor: TemplateActor,
): boolean {
  return canShareTemplate(record, actor);
}

/**
 * Viewing a shared template.
 * - public: anyone, while not revoked.
 * - unlisted: only with the matching, non-revoked token.
 * - private: only the owner.
 */
export function canViewSharedTemplate(
  record: TemplateFamilyRecord,
  actor: TemplateActor,
  token?: string | null,
): boolean {
  if (isTemplateOwner(record, actor)) return true;
  const sharing = record.sharing;
  if (!sharing || isShareRevoked(record)) return false;
  if (sharing.visibility === "public") return record.status === "approved";
  if (sharing.visibility === "unlisted")
    return (
      record.status === "approved" &&
      typeof token === "string" &&
      Boolean(sharing.shareToken) &&
      token === sharing.shareToken
    );
  return false;
}

export function canForkTemplate(
  record: TemplateFamilyRecord,
  actor: TemplateActor,
): boolean {
  const sharing = record.sharing;
  if (!sharing?.allowForking) return false;
  if (isShareRevoked(record)) return false;
  if (record.status !== "approved") return false;
  // A viewer must be able to see the shared template to fork it. The owner can
  // always fork their own.
  if (isTemplateOwner(record, actor)) return true;
  return sharing.visibility === "public" || sharing.visibility === "unlisted";
}

/** Generation requires ownership of an approved, non-archived template. */
export function canUseTemplateInGeneration(
  record: TemplateFamilyRecord,
  actor: TemplateActor,
): boolean {
  if (!isTemplateOwner(record, actor)) return false;
  return record.status === "approved" && Boolean(record.approval?.approved);
}

/** Human-readable reason sharing is disabled, or null when it is allowed. */
export function sharingBlockReason(
  record: TemplateFamilyRecord,
  actor: TemplateActor,
): string | null {
  if (!isTemplateOwner(record, actor))
    return "Only the owner can share this template.";
  if (record.status === "draft")
    return "Drafts cannot be shared. Approve this template first.";
  if (record.status === "candidate")
    return "Candidates cannot be shared. Review and approve this template first.";
  if (record.status === "rejected")
    return "Rejected templates can never be shared.";
  if (record.status === "archived")
    return "Archived templates cannot newly become public.";
  if (!record.approval?.approved)
    return "This template is not approved yet. Approve it before sharing.";
  return null;
}

/** Reason forking is disabled, or null when it is allowed. */
export function forkingBlockReason(
  record: TemplateFamilyRecord,
  actor: TemplateActor,
): string | null {
  if (!record.sharing?.allowForking)
    return "The owner has not enabled forking for this template.";
  if (isShareRevoked(record)) return "This share link has been revoked.";
  if (record.status !== "approved")
    return "Only approved templates can be forked.";
  if (
    !isTemplateOwner(record, actor) &&
    record.sharing.visibility === "private"
  )
    return "This template is private.";
  return null;
}
