import type { ExportWarning } from "./types.js";

export type PdfStandardFont = "helvetica" | "times" | "courier";
export type PdfFontStyle = "normal" | "bold" | "italic" | "bolditalic";

export interface MappedPdfFont {
  requested: string;
  family: PdfStandardFont;
  style: PdfFontStyle;
  substituted: boolean;
  warning?: ExportWarning;
}

const KNOWN_SANS = new Set([
  "helvetica",
  "arial",
  "inter",
  "roboto",
  "dm sans",
  "manrope",
  "plus jakarta sans",
  "space grotesk",
  "sans-serif",
]);

const KNOWN_SERIF = new Set([
  "times",
  "times new roman",
  "georgia",
  "playfair display",
  "lora",
  "serif",
]);

const KNOWN_MONO = new Set(["courier", "courier new", "monospace"]);

export function normalizeFontFamily(family: string | undefined): string {
  return (family || "").trim();
}

export function resolvePdfFontFamily(family: string | undefined): {
  pdf: PdfStandardFont;
  known: boolean;
} {
  const key = normalizeFontFamily(family).toLowerCase();
  if (!key) return { pdf: "helvetica", known: false };
  if (KNOWN_SANS.has(key)) return { pdf: "helvetica", known: true };
  if (KNOWN_SERIF.has(key)) return { pdf: "times", known: true };
  if (KNOWN_MONO.has(key)) return { pdf: "courier", known: true };
  return { pdf: "helvetica", known: false };
}

export function resolvePdfFontStyle(
  weight?: number,
  italic?: boolean,
): PdfFontStyle {
  const bold = typeof weight === "number" && weight >= 600;
  if (bold && italic) return "bolditalic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "normal";
}

export function mapFontForPdf(
  family: string | undefined,
  weight?: number,
  italic?: boolean,
  context?: { pageId?: string; elementId?: string },
): MappedPdfFont {
  const requested = normalizeFontFamily(family) || "Helvetica";
  const resolved = resolvePdfFontFamily(family);
  const substituted =
    !resolved.known || requested.toLowerCase() !== resolved.pdf;
  const mapped: MappedPdfFont = {
    requested,
    family: resolved.pdf,
    style: resolvePdfFontStyle(weight, italic),
    substituted,
  };
  if (substituted) {
    mapped.warning = {
      code: "font_substitution",
      message: `${requested} will be replaced with ${resolved.pdf}.`,
      pageId: context?.pageId,
      elementId: context?.elementId,
    };
  }
  return mapped;
}

export function pdfFontDisplayName(family: PdfStandardFont): string {
  if (family === "times") return "Times";
  if (family === "courier") return "Courier";
  return "Helvetica";
}
