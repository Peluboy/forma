import {
  updateTemplateFamilyRecord,
  type TemplateFamilyRecord,
  type TemplateLicense,
  type TemplateSharingState,
  type TemplateVisibility,
} from "../template-authoring/index.js";
import {
  ANONYMOUS,
  canMakeTemplatePublic,
  canShareTemplate,
  canViewSharedTemplate,
  isShareRevoked,
  isTemplateOwner,
  sharingBlockReason,
  type TemplateActor,
} from "./permissions.js";
import { generatePublicId, generateUniqueShareToken } from "./tokens.js";

/**
 * Sharing orchestration (Phase 6, Parts B/E/G/N).
 *
 * Every transition re-checks the deterministic permissions in
 * `permissions.ts`; the UI never decides whether a share is legal.
 */

export function emptySharingState(): TemplateSharingState {
  return { visibility: "private", allowForking: false };
}

export function getSharingState(
  record: TemplateFamilyRecord,
): TemplateSharingState {
  return record.sharing ?? emptySharingState();
}

export function isShareActive(record: TemplateFamilyRecord): boolean {
  const sharing = record.sharing;
  return Boolean(
    sharing &&
    !sharing.revokedAt &&
    sharing.visibility !== "private" &&
    record.status === "approved",
  );
}

export interface ShareOptions {
  visibility: Exclude<TemplateVisibility, "private">;
  allowForking?: boolean;
  galleryListed?: boolean;
  license?: TemplateLicense;
  creatorName?: string;
  sharedBy?: string;
}

export interface ShareResult {
  record: TemplateFamilyRecord;
  shareToken: string;
  publicId?: string;
}

/**
 * Shares an approved record. Throws with a clear reason when the transition is
 * not allowed, so callers surface the same message the lab shows.
 */
export function shareTemplateRecord(
  record: TemplateFamilyRecord,
  actor: TemplateActor,
  options: ShareOptions,
  existingTokens: Iterable<string> = [],
  existingPublicIds: Iterable<string> = [],
): ShareResult {
  if (!canShareTemplate(record, actor))
    throw new Error(
      sharingBlockReason(record, actor) ?? "This template cannot be shared.",
    );
  if (options.visibility === "public" && !canMakeTemplatePublic(record, actor))
    throw new Error("Only approved templates can be made public.");

  const shareToken =
    record.sharing?.shareToken &&
    !isShareRevoked(record) &&
    record.sharing.visibility === options.visibility
      ? record.sharing.shareToken
      : generateUniqueShareToken(existingTokens);

  const publicId =
    options.visibility === "public"
      ? (record.sharing?.publicId ??
        generatePublicId(record.name, existingPublicIds))
      : record.sharing?.publicId;

  const sharing: TemplateSharingState = {
    visibility: options.visibility,
    shareToken,
    ...(publicId ? { publicId } : {}),
    sharedAt: new Date().toISOString(),
    ...((options.sharedBy ?? actor.ownerId)
      ? { sharedBy: options.sharedBy ?? actor.ownerId ?? undefined }
      : {}),
    revokedAt: undefined,
    allowForking: options.allowForking ?? false,
    galleryListed:
      options.galleryListed ?? (options.visibility === "public" ? true : false),
    ...(options.license ? { license: options.license } : {}),
    attribution: {
      ...record.sharing?.attribution,
      ...(options.creatorName ? { creatorName: options.creatorName } : {}),
    },
  };

  return {
    record: updateTemplateFamilyRecord(record, {
      sharing,
      changelog: `Shared as ${options.visibility}.`,
    }),
    shareToken,
    ...(publicId ? { publicId } : {}),
  };
}

/** Revoking stops the share link (and any public listing). Forks survive. */
export function revokeTemplateShare(
  record: TemplateFamilyRecord,
  actor: TemplateActor,
): TemplateFamilyRecord {
  if (!isTemplateOwner(record, actor))
    throw new Error("Only the owner can revoke sharing.");
  const sharing: TemplateSharingState = {
    ...getSharingState(record),
    visibility: "private",
    revokedAt: new Date().toISOString(),
    galleryListed: false,
    shareToken: undefined,
  };
  return updateTemplateFamilyRecord(record, {
    sharing,
    changelog: "Share revoked.",
  });
}

/** Changes visibility without touching tokens for the same non-private target. */
export function setTemplateVisibility(
  record: TemplateFamilyRecord,
  actor: TemplateActor,
  visibility: TemplateVisibility,
): TemplateFamilyRecord {
  if (visibility === "private") {
    // Downgrading to private also un-lists but keeps the owner's record usable.
    if (!isTemplateOwner(record, actor))
      throw new Error("Only the owner can change visibility.");
    return updateTemplateFamilyRecord(record, {
      sharing: {
        ...getSharingState(record),
        visibility: "private",
        galleryListed: false,
      },
      changelog: "Visibility set to private.",
    });
  }
  return shareTemplateRecord(record, actor, {
    visibility,
    allowForking: getSharingState(record).allowForking,
    galleryListed: visibility === "public",
    license: record.sharing?.license,
    creatorName: record.sharing?.attribution?.creatorName,
  }).record;
}

/** Resolves an unlisted/public template by share token, honouring revocation. */
export function resolveSharedTemplate(
  records: Iterable<TemplateFamilyRecord>,
  token: string,
): TemplateFamilyRecord | undefined {
  for (const record of records)
    if (record.sharing?.shareToken === token) {
      if (isShareRevoked(record)) return undefined;
      if (!canViewSharedTemplate(record, ANONYMOUS, token)) return undefined;
      return record;
    }
  return undefined;
}

/** Public, gallery-listed, approved, non-revoked templates. */
export function listPublicGallery(
  records: Iterable<TemplateFamilyRecord>,
): TemplateFamilyRecord[] {
  return Array.from(records)
    .filter(
      (record) =>
        record.status === "approved" &&
        Boolean(record.approval?.approved) &&
        record.sharing?.visibility === "public" &&
        record.sharing?.galleryListed !== false &&
        !isShareRevoked(record),
    )
    .sort((a, b) =>
      (b.sharing?.sharedAt ?? b.updatedAt).localeCompare(
        a.sharing?.sharedAt ?? a.updatedAt,
      ),
    );
}

export function isPublicGalleryListed(record: TemplateFamilyRecord): boolean {
  return listPublicGallery([record]).length > 0;
}
