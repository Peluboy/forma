import type { GraphicLayer } from "./layers.js";
import { fontFamilies, type FontFamily } from "./fonts.js";
import type { CopyPolicy } from "../content/types.js";
export {
  fontCatalog,
  fontFamilies,
  fontWeights,
  nearestFontWeight,
  effectiveFontWeight,
} from "./fonts.js";
export type { FontFamily } from "./fonts.js";
export const fieldIds = [
  "kicker",
  "title",
  "description",
  "date",
  "location",
  "footer",
] as const;
export type FieldId = (typeof fieldIds)[number];
export type Copy = Record<FieldId, string>;
export type TemplateId =
  "gathering" | "botanical" | "editorial" | "electric" | "atelier" | "midnight";
export type Layout = {
  x: number;
  y: number;
  width: number;
  height: number;
  size: number;
  locked: boolean;
  hidden?: boolean;
  fontFamily?: FontFamily;
  fontWeight?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikeThrough?: boolean;
  letterSpacing?: number;
  lineHeight?: number;
  opacity?: number;
  color?: string;
  align?: "left" | "center" | "right";
};
export type PageSize = { width: number; height: number };
export type FormatId = "portrait" | "square" | "story" | "banner" | "custom";
export const DESIGN_WIDTH = 720;
export const DESIGN_HEIGHT = 900;
export const PAGE_SIZE_MIN = 360;
export const PAGE_SIZE_MAX = 2400;
export const formatPresets: Record<Exclude<FormatId, "custom">, PageSize> = {
  portrait: { width: 720, height: 900 },
  square: { width: 720, height: 720 },
  story: { width: 720, height: 1280 },
  banner: { width: 1280, height: 720 },
};
export const formatLabels: Record<FormatId, string> = {
  portrait: "Portrait",
  square: "Square",
  story: "Story",
  banner: "Banner",
  custom: "Custom",
};
export function isValidPageSize(value: unknown): value is PageSize {
  if (!value || typeof value !== "object") return false;
  const size = value as PageSize;
  return (
    Number.isFinite(size.width) &&
    Number.isFinite(size.height) &&
    size.width >= PAGE_SIZE_MIN &&
    size.width <= PAGE_SIZE_MAX &&
    size.height >= PAGE_SIZE_MIN &&
    size.height <= PAGE_SIZE_MAX
  );
}
/** Canvas size in design units. Layouts stay in 720×900 and scale to this page. */
export function resolvePageSize(project: Project): PageSize {
  if (project.designMode === "reference")
    return {
      width: DESIGN_WIDTH,
      height: project.referenceHeight || DESIGN_HEIGHT,
    };
  if (project.format === "custom")
    return isValidPageSize(project.pageSize)
      ? project.pageSize
      : formatPresets.portrait;
  return formatPresets[project.format] || formatPresets.portrait;
}
export function designScale(project: Project): { x: number; y: number } {
  const size = resolvePageSize(project);
  return {
    x: size.width / DESIGN_WIDTH,
    y: size.height / DESIGN_HEIGHT,
  };
}
export type Project = {
  /** Optional on legacy records; newly created projects use exact copy by default. */
  copyPolicy?: CopyPolicy;
  graphicLayers?: GraphicLayer[];
  layerOrder?: string[];
  textLayers?: TextLayer[];
  id: string;
  name: string;
  template: TemplateId;
  copy: Copy;
  manuscript: string;
  layouts: Record<FieldId, Layout>;
  reference: string | null;
  referenceName: string;
  referenceHeight?: number;
  designMode?: "template" | "reference";
  mappedFields?: FieldId[];
  covers?: Partial<Record<FieldId, string>>;
  updatedAt: string;
  backgroundLocked: boolean;
  format: FormatId;
  /** Required when format is custom; ignored for named presets. */
  pageSize?: PageSize;
  /** Ordered manuscript blocks from the last apply; free blocks bind to text layers. */
  contentBlocks?: ContentBlock[];
  isTemplate?: boolean;
  backgroundColor?: string;
  brandRef?: { id: string; version: number };
  templateRef?: { id: string; version: number };
  skillRef?: { id: string; version: number };
  /** graphics (default) or multi-page document */
  family?: "graphics" | "document" | "presentation";
  /** Present when family is document */
  flow?: import("./flowDocument.js").FlowDocument;
  /** Present when family is presentation */
  presentation?: import("./presentation.js").PresentationDeck;
  /** Phase 7: Agency Workspace and Client scoping */
  workspaceId?: string;
  clientId?: string;
  metadata?: Record<string, unknown>;
};
export type ContentBlock = {
  id: string;
  label: string;
  text: string;
  fieldId?: FieldId;
  /** Optional provenance for newly parsed copy; absent on legacy saved projects. */
  sourceSpanIds?: string[];
};
export type TextLayer = { id: string; text: string; layout: Layout };
export function isManagedBlockLayerId(id: string): boolean {
  return id.startsWith("layer-block-");
}
export function layerIdForBlock(blockId: string): string {
  return `layer-${blockId}`;
}
export function validTextLayers(value: unknown): value is TextLayer[] {
  if (!Array.isArray(value) || value.length > 50) return false;
  const ids = new Set<string>();
  return value.every((v) => {
    if (
      !v ||
      typeof v !== "object" ||
      typeof v.id !== "string" ||
      !/^layer-[a-zA-Z0-9-]{1,80}$/.test(v.id) ||
      ids.has(v.id) ||
      typeof v.text !== "string" ||
      v.text.length > 10000
    )
      return false;
    ids.add(v.id);
    const b = v.layout;
    return (
      b &&
      [b.x, b.y, b.width, b.height, b.size].every(Number.isFinite) &&
      b.x >= 0 &&
      b.x <= 720 &&
      b.y >= 0 &&
      b.y <= 900 &&
      b.width > 0 &&
      b.width <= 720 &&
      b.height > 0 &&
      b.height <= 900 &&
      b.size >= 11 &&
      b.size <= 180 &&
      typeof b.locked === "boolean" &&
      (b.hidden === undefined || typeof b.hidden === "boolean") &&
      (b.fontFamily === undefined || fontFamilies.includes(b.fontFamily)) &&
      (b.fontWeight === undefined ||
        (Number.isInteger(b.fontWeight) &&
          b.fontWeight >= 100 &&
          b.fontWeight <= 900)) &&
      (b.bold === undefined || typeof b.bold === "boolean") &&
      (b.italic === undefined || typeof b.italic === "boolean") &&
      (b.underline === undefined || typeof b.underline === "boolean") &&
      (b.strikeThrough === undefined || typeof b.strikeThrough === "boolean") &&
      (b.letterSpacing === undefined ||
        (Number.isFinite(b.letterSpacing) &&
          b.letterSpacing >= -2 &&
          b.letterSpacing <= 20)) &&
      (b.lineHeight === undefined ||
        (Number.isFinite(b.lineHeight) &&
          b.lineHeight >= 0.8 &&
          b.lineHeight <= 2)) &&
      (b.opacity === undefined ||
        (Number.isFinite(b.opacity) && b.opacity >= 0 && b.opacity <= 1)) &&
      (b.align === undefined ||
        ["left", "center", "right"].includes(b.align)) &&
      (b.color === undefined ||
        (typeof b.color === "string" && /^#[0-9a-f]{6}$/i.test(b.color)))
    );
  });
}
export const labels: Record<FieldId, string> = {
  kicker: "Eyebrow",
  title: "Headline",
  description: "Body copy",
  date: "Date & time",
  location: "Location",
  footer: "Footer",
};
