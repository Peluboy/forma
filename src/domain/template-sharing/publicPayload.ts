import type {
  TemplateAttribution,
  TemplateCoverage,
  TemplateFamilyRecord,
  TemplateLicense,
  TemplateRecordSource,
  TemplateVisibility,
} from "../template-authoring/index.js";
import {
  primaryTemplatePreview,
  templatePreviewDescriptor,
  type TemplatePreviewDescriptor,
} from "./preview.js";

/**
 * Public template payload (Phase 6, Part D).
 *
 * A sanitized projection of an approved record. It deliberately omits owner
 * ids, usage analytics, reference lineage, review notes, and approval identity
 * so a shared preview cannot leak private data.
 */

export interface PublicTemplateWarning {
  code: string;
  message: string;
}

export interface PublicTemplateQuality {
  validationStatus: string;
  layoutCount: number;
  approvedLayoutCount: number;
  coverage: TemplateCoverage;
  averageFitScore?: number;
  averageQualityScore?: number;
  projectionFidelityScore?: number;
  exactCopyPassRate?: number;
  warnings: PublicTemplateWarning[];
}

export interface PublicTemplatePayload {
  /** Public locator (slug), never the internal record id or owner id. */
  id: string;
  /** Lineage root id — safe, contains no owner information. */
  templateId: string;
  name: string;
  description?: string;
  source: TemplateRecordSource;
  status: "approved";
  versionNumber: number;
  layoutCount: number;
  pageRoles: string[];
  coverage: TemplateCoverage;
  quality: PublicTemplateQuality;
  previews: TemplatePreviewDescriptor[];
  primaryPreview?: TemplatePreviewDescriptor;
  attribution?: TemplateAttribution;
  allowForking: boolean;
  license?: TemplateLicense;
  visibility: Exclude<TemplateVisibility, "private">;
  sharedAt?: string;
  forkedFromOriginalTemplateId?: string;
  lineageRootId?: string;
  createdAt: string;
}

export interface SanitizeOptions {
  publicId: string;
  visibility: Exclude<TemplateVisibility, "private">;
  maxWarnings?: number;
}

export function sanitizeTemplateForPublicView(
  record: TemplateFamilyRecord,
  options: SanitizeOptions,
): PublicTemplatePayload {
  if (record.status !== "approved")
    throw new Error(
      "Only approved templates can be exposed publicly (received " +
        record.status +
        ").",
    );

  const maxWarnings = options.maxWarnings ?? 5;
  const warnings: PublicTemplateWarning[] = (record.quality.warnings ?? [])
    .filter((warning) => warning.severity !== "info")
    .slice(0, maxWarnings)
    .map((warning) => ({ code: warning.code, message: warning.message }));

  const quality: PublicTemplateQuality = {
    validationStatus: record.quality.validationStatus,
    layoutCount: record.quality.layoutCount,
    approvedLayoutCount: record.quality.approvedLayoutCount,
    coverage: record.quality.coverage,
    ...(record.quality.averageFitScore !== undefined
      ? { averageFitScore: record.quality.averageFitScore }
      : {}),
    ...(record.quality.averageQualityScore !== undefined
      ? { averageQualityScore: record.quality.averageQualityScore }
      : {}),
    ...(record.quality.projectionFidelityScore !== undefined
      ? { projectionFidelityScore: record.quality.projectionFidelityScore }
      : {}),
    ...(record.quality.exactCopyPassRate !== undefined
      ? { exactCopyPassRate: record.quality.exactCopyPassRate }
      : {}),
    warnings,
  };

  const previews = templatePreviewDescriptor(record);
  const primary = primaryTemplatePreview(record);

  const attribution = record.sharing?.attribution;
  const forkedFrom = record.forkedFrom;

  return {
    id: options.publicId,
    templateId: record.templateId,
    name: record.name,
    ...(record.description ? { description: record.description } : {}),
    source: record.source,
    status: "approved",
    versionNumber: record.versionNumber,
    layoutCount: record.family.layouts.length,
    pageRoles: Array.from(
      new Set(record.family.layouts.map((layout) => layout.role)),
    ).sort(),
    coverage: record.quality.coverage,
    quality,
    previews,
    ...(primary ? { primaryPreview: primary } : {}),
    ...(attribution ? { attribution } : {}),
    allowForking: Boolean(record.sharing?.allowForking),
    ...(record.sharing?.license ? { license: record.sharing.license } : {}),
    visibility: options.visibility,
    ...(record.sharing?.sharedAt ? { sharedAt: record.sharing.sharedAt } : {}),
    ...(forkedFrom
      ? {
          forkedFromOriginalTemplateId: forkedFrom.originalTemplateId,
          lineageRootId: forkedFrom.lineageRootId,
        }
      : {}),
    createdAt: record.createdAt,
  };
}

/** Strips a sanitized payload down to a gallery card. */
export function templateGalleryCard(payload: PublicTemplatePayload): {
  id: string;
  name: string;
  description?: string;
  source: TemplateRecordSource;
  layoutCount: number;
  pageRoles: string[];
  creatorName?: string;
  license?: TemplateLicense;
  allowForking: boolean;
  averageQualityScore?: number;
  primaryPreview?: TemplatePreviewDescriptor;
  sharedAt?: string;
} {
  return {
    id: payload.id,
    name: payload.name,
    ...(payload.description ? { description: payload.description } : {}),
    source: payload.source,
    layoutCount: payload.layoutCount,
    pageRoles: payload.pageRoles,
    ...(payload.attribution?.creatorName
      ? { creatorName: payload.attribution.creatorName }
      : {}),
    ...(payload.license ? { license: payload.license } : {}),
    allowForking: payload.allowForking,
    ...(payload.quality.averageQualityScore !== undefined
      ? { averageQualityScore: payload.quality.averageQualityScore }
      : {}),
    ...(payload.primaryPreview
      ? { primaryPreview: payload.primaryPreview }
      : {}),
    ...(payload.sharedAt ? { sharedAt: payload.sharedAt } : {}),
  };
}
