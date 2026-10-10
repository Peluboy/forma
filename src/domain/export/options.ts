import {
  DEFAULT_PDF_OPTIONS,
  type PdfExportOptions,
  type PdfPageRange,
  type PdfQuality,
} from "./types.js";

const QUALITIES = new Set<PdfQuality>(["draft", "standard", "high"]);

export function normalizePdfOptions(
  options?: Partial<PdfExportOptions>,
): PdfExportOptions {
  const pageRange = normalizePageRange(options?.pageRange);
  const quality = QUALITIES.has(options?.quality as PdfQuality)
    ? (options?.quality as PdfQuality)
    : DEFAULT_PDF_OPTIONS.quality;
  return {
    pageRange,
    quality,
    includeMetadata:
      options?.includeMetadata ?? DEFAULT_PDF_OPTIONS.includeMetadata,
    rasterizeUnsupportedEffects:
      options?.rasterizeUnsupportedEffects ??
      DEFAULT_PDF_OPTIONS.rasterizeUnsupportedEffects,
    preserveSelectableText:
      options?.preserveSelectableText ??
      DEFAULT_PDF_OPTIONS.preserveSelectableText,
    embedImages: options?.embedImages ?? DEFAULT_PDF_OPTIONS.embedImages,
    includeBleed: options?.includeBleed ?? DEFAULT_PDF_OPTIONS.includeBleed,
    includeCropMarks:
      options?.includeCropMarks ?? DEFAULT_PDF_OPTIONS.includeCropMarks,
  };
}

export function normalizePageRange(range?: PdfPageRange): PdfPageRange {
  if (!range || range === "all") return "all";
  if (!Array.isArray(range)) return "all";
  const pages = [
    ...new Set(range.filter((value) => Number.isInteger(value) && value >= 1)),
  ].sort((a, b) => a - b);
  return pages.length ? pages : "all";
}

export function selectPages<T>(pages: T[], range?: PdfPageRange): T[] {
  const normalized = normalizePageRange(range);
  if (normalized === "all") return pages;
  return normalized
    .map((index) => pages[index - 1])
    .filter((page): page is T => Boolean(page));
}

export function validatePdfOptions(options?: Partial<PdfExportOptions>): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (
    options?.quality !== undefined &&
    !QUALITIES.has(options.quality as PdfQuality)
  ) {
    issues.push("quality must be draft, standard, or high.");
  }
  if (
    options?.pageRange !== undefined &&
    options.pageRange !== "all" &&
    !Array.isArray(options.pageRange)
  ) {
    issues.push("pageRange must be all or an array of page numbers.");
  }
  return { valid: issues.length === 0, issues };
}
