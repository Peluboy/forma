import type {
  TemplateFamilyRecord,
  TemplateLayout,
} from "../template-authoring/index.js";

/**
 * Preview thumbnails (Phase 6, Part I).
 *
 * We never store large blobs inside the record. Layouts can ship a `preview`
 * string (already part of `TemplateLayout`); when they do not, callers render a
 * labelled placeholder. Descriptors are cheap and cacheable by version.
 */

export interface TemplatePreviewDescriptor {
  layoutId: string;
  role: TemplateLayout["role"];
  label: string;
  kind: "layout_preview" | "placeholder";
  /** Present only when the layout ships a preview string. */
  src?: string;
}

export function templatePreviewDescriptor(
  record: TemplateFamilyRecord,
): TemplatePreviewDescriptor[] {
  return record.family.layouts.map((layout) => ({
    layoutId: layout.id,
    role: layout.role,
    label: layout.name,
    kind: layout.preview ? "layout_preview" : "placeholder",
    ...(layout.preview ? { src: layout.preview } : {}),
  }));
}

/** The cover (or first) layout preview, used as the gallery card image. */
export function primaryTemplatePreview(
  record: TemplateFamilyRecord,
): TemplatePreviewDescriptor | undefined {
  const previews = templatePreviewDescriptor(record);
  return previews.find((preview) => preview.role === "cover") ?? previews[0];
}

/** Cache key for a generated/cached preview, scoped to an immutable version. */
export function templatePreviewCacheKey(record: TemplateFamilyRecord): string {
  return `${record.family.id}::${record.versionNumber}`;
}

export function hasRealPreviews(record: TemplateFamilyRecord): boolean {
  return record.family.layouts.some((layout) => Boolean(layout.preview));
}
