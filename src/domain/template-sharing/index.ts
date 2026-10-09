/**
 * Template Distribution, Sharing & Forking v1 (Phase 6).
 *
 * A safe sharing/forking layer on top of Phase 5's `TemplateFamilyRecord`:
 * visibility + permission rules, share tokens/public ids, a sanitized public
 * payload, a simple gallery, and deep-copy forking that preserves lineage.
 */

export { templateSharingEnabled } from "./flags.js";
export {
  SHARE_TOKEN_LENGTH,
  generateShareToken,
  isShareTokenShaped,
  generateUniqueShareToken,
  generatePublicId,
} from "./tokens.js";
export {
  ANONYMOUS,
  isTemplateOwner,
  isShareRevoked,
  canEditTemplate,
  canArchiveTemplate,
  canShareTemplate,
  canMakeTemplatePublic,
  canViewSharedTemplate,
  canForkTemplate,
  canUseTemplateInGeneration,
  sharingBlockReason,
  forkingBlockReason,
  type TemplateActor,
} from "./permissions.js";
export {
  templatePreviewDescriptor,
  primaryTemplatePreview,
  templatePreviewCacheKey,
  hasRealPreviews,
  type TemplatePreviewDescriptor,
} from "./preview.js";
export {
  sanitizeTemplateForPublicView,
  templateGalleryCard,
  type PublicTemplatePayload,
  type PublicTemplateQuality,
  type PublicTemplateWarning,
  type SanitizeOptions,
} from "./publicPayload.js";
export {
  emptySharingState,
  getSharingState,
  isShareActive,
  shareTemplateRecord,
  revokeTemplateShare,
  setTemplateVisibility,
  resolveSharedTemplate,
  listPublicGallery,
  isPublicGalleryListed,
  type ShareOptions,
  type ShareResult,
} from "./sharing.js";
export { forkTemplateRecord, type ForkOptions } from "./forking.js";
