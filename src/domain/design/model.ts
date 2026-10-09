import { validGraphics } from "./layers.js";
import {
  fieldIds,
  fontFamilies,
  formatPresets,
  isValidPageSize,
  resolvePageSize,
  validTextLayers,
  type Copy,
  type FieldId,
  type Layout,
  type PageSize,
  type Project,
  type TemplateId,
  type ContentBlock,
} from "./schema.js";
import { sampleManuscript, parseManuscript } from "./manuscript.js";
export * from "./schema.js";
export * from "./manuscript.js";

export const defaultLayouts = (): Record<FieldId, Layout> => ({
  kicker: { x: 54, y: 48, width: 600, height: 40, size: 13, locked: false },
  title: { x: 50, y: 124, width: 625, height: 230, size: 94, locked: false },
  description: {
    x: 56,
    y: 400,
    width: 264,
    height: 220,
    size: 23,
    locked: false,
  },
  date: { x: 56, y: 730, width: 280, height: 70, size: 17, locked: false },
  location: { x: 387, y: 730, width: 290, height: 70, size: 17, locked: false },
  footer: { x: 56, y: 840, width: 600, height: 38, size: 12, locked: false },
});
export const templates: {
  id: TemplateId;
  name: string;
  category: string;
  color: string;
  text: string;
  accent: string;
  font: string;
}[] = [
  {
    id: "gathering",
    name: "Good company",
    category: "Events",
    color: "#f3eee5",
    text: "#252920",
    accent: "#e9783d",
    font: "Georgia",
  },
  {
    id: "botanical",
    name: "Slow mornings",
    category: "Lifestyle",
    color: "#e8eddb",
    text: "#234735",
    accent: "#8c9f61",
    font: "Georgia",
  },
  {
    id: "editorial",
    name: "The new chapter",
    category: "Editorial",
    color: "#f0d6d6",
    text: "#5a263c",
    accent: "#a74661",
    font: "Georgia",
  },
  {
    id: "electric",
    name: "Outside the lines",
    category: "Events",
    color: "#deec70",
    text: "#252b22",
    accent: "#5951d8",
    font: "Arial",
  },
  {
    id: "atelier",
    name: "Atelier notes",
    category: "Business",
    color: "#ece5dc",
    text: "#443e37",
    accent: "#b59478",
    font: "Georgia",
  },
  {
    id: "midnight",
    name: "After hours",
    category: "Events",
    color: "#242c45",
    text: "#f5eddd",
    accent: "#a7b9ec",
    font: "Georgia",
  },
];
export function createProject(): Project {
  return {
    copyPolicy: "exact",
    id: crypto.randomUUID(),
    name: "The creative gathering",
    template: "gathering",
    copy: parseManuscript(sampleManuscript),
    manuscript: sampleManuscript,
    layouts: defaultLayouts(),
    reference: null,
    referenceName: "",
    designMode: "template",
    mappedFields: [],
    covers: {},
    updatedAt: new Date().toISOString(),
    backgroundLocked: true,
    format: "portrait",
    pageSize: { ...formatPresets.portrait },
  };
}
export function changedFields(a: Copy, b: Copy): FieldId[] {
  return fieldIds.filter((id) => a[id] !== b[id]);
}
export function wordCount(copy: Copy) {
  return fieldIds
    .map((id) => copy[id])
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
export function validContentBlocks(value: unknown): value is ContentBlock[] {
  if (!Array.isArray(value) || value.length > 80) return false;
  const ids = new Set<string>();
  return value.every((block) => {
    if (
      !block ||
      typeof block !== "object" ||
      typeof block.id !== "string" ||
      !/^block-[a-zA-Z0-9-]{1,80}$/.test(block.id) ||
      ids.has(block.id) ||
      typeof block.label !== "string" ||
      block.label.length > 120 ||
      typeof block.text !== "string" ||
      block.text.length > 30000 ||
      (block.sourceSpanIds !== undefined &&
        (!Array.isArray(block.sourceSpanIds) ||
          block.sourceSpanIds.length > 100 ||
          !block.sourceSpanIds.every(
            (id: unknown) => typeof id === "string" && id.length <= 160,
          ))) ||
      (block.fieldId !== undefined && !fieldIds.includes(block.fieldId))
    )
      return false;
    ids.add(block.id);
    return true;
  });
}
export function isProject(value: unknown): value is Project {
  if (!value || typeof value !== "object") return false;
  const p = value as Project;
  if (p.graphicLayers !== undefined && !validGraphics(p.graphicLayers))
    return false;
  if (
    p.layerOrder !== undefined &&
    (!Array.isArray(p.layerOrder) ||
      p.layerOrder.length > 80 ||
      new Set(p.layerOrder).size !== p.layerOrder.length ||
      !p.layerOrder.every(
        (id) =>
          typeof id === "string" &&
          /^(layer|graphic)-[a-zA-Z0-9-]{1,80}$/.test(id),
      ))
  )
    return false;
  if (p.textLayers !== undefined && !validTextLayers(p.textLayers))
    return false;
  if (
    typeof p.id !== "string" ||
    typeof p.name !== "string" ||
    p.name.length > 200 ||
    typeof p.manuscript !== "string" ||
    p.manuscript.length > 30000 ||
    typeof p.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(p.updatedAt)) ||
    typeof p.referenceName !== "string"
  )
    return false;
  if (
    p.copyPolicy !== undefined &&
    !["exact", "light_edit", "rewrite_allowed"].includes(p.copyPolicy)
  )
    return false;
  if (
    !templates.some((t) => t.id === p.template) ||
    !["portrait", "square", "story", "banner", "custom"].includes(p.format)
  )
    return false;
  if (p.pageSize !== undefined && !isValidPageSize(p.pageSize)) return false;
  if (p.format === "custom" && !isValidPageSize(p.pageSize)) return false;
  if (p.contentBlocks !== undefined && !validContentBlocks(p.contentBlocks))
    return false;
  if (
    p.reference !== null &&
    !(
      typeof p.reference === "string" &&
      p.reference.length < 3000000 &&
      /^data:image\/(png|jpeg|webp);base64,/.test(p.reference)
    )
  )
    return false;
  if (p.backgroundColor && !/^#[0-9a-f]{6}$/i.test(p.backgroundColor))
    return false;
  if (p.isTemplate !== undefined && typeof p.isTemplate !== "boolean")
    return false;
  if (
    p.brandRef !== undefined &&
    (!p.brandRef ||
      typeof p.brandRef.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,100}$/.test(p.brandRef.id) ||
      typeof p.brandRef.version !== "number" ||
      p.brandRef.version < 1)
  )
    return false;
  if (
    p.templateRef !== undefined &&
    (!p.templateRef ||
      typeof p.templateRef.id !== "string" ||
      !/^template-[a-zA-Z0-9-]{1,80}$/.test(p.templateRef.id) ||
      typeof p.templateRef.version !== "number" ||
      p.templateRef.version < 1)
  )
    return false;
  if (
    p.skillRef !== undefined &&
    (!p.skillRef ||
      typeof p.skillRef.id !== "string" ||
      !/^skill-[a-zA-Z0-9-]{1,80}$/.test(p.skillRef.id) ||
      typeof p.skillRef.version !== "number" ||
      p.skillRef.version < 1)
  )
    return false;
  if (
    p.family !== undefined &&
    !["graphics", "document", "presentation"].includes(p.family)
  )
    return false;
  if (p.workspaceId !== undefined && typeof p.workspaceId !== "string")
    return false;
  if (p.clientId !== undefined && typeof p.clientId !== "string") return false;
  if (
    p.metadata !== undefined &&
    (!p.metadata || typeof p.metadata !== "object" || Array.isArray(p.metadata))
  )
    return false;
  if (p.flow !== undefined) {
    const flow = p.flow as {
      pages?: unknown;
      content?: unknown;
      activePageId?: unknown;
      master?: unknown;
      pageSize?: { width?: unknown; height?: unknown };
    };
    if (
      !flow ||
      !Array.isArray(flow.pages) ||
      flow.pages.length < 1 ||
      flow.pages.length > 200 ||
      !Array.isArray(flow.content) ||
      typeof flow.activePageId !== "string" ||
      !flow.master ||
      !flow.pageSize ||
      !Number.isFinite(flow.pageSize.width) ||
      !Number.isFinite(flow.pageSize.height)
    )
      return false;
  }
  if (p.family === "document" && !p.flow) return false;
  if (p.presentation !== undefined) {
    const deck = p.presentation as {
      slides?: unknown;
      activeSlideId?: unknown;
      pageSize?: { width?: unknown; height?: unknown };
      theme?: unknown;
    };
    if (
      !deck ||
      !Array.isArray(deck.slides) ||
      deck.slides.length < 1 ||
      deck.slides.length > 100 ||
      typeof deck.activeSlideId !== "string" ||
      !deck.theme ||
      !deck.pageSize ||
      !Number.isFinite(deck.pageSize.width) ||
      !Number.isFinite(deck.pageSize.height)
    )
      return false;
  }
  if (p.family === "presentation" && !p.presentation) return false;
  if (p.designMode && !["template", "reference"].includes(p.designMode))
    return false;
  if (
    p.designMode === "reference" &&
    (!p.reference ||
      !p.referenceHeight ||
      p.referenceHeight < 180 ||
      p.referenceHeight > 2400)
  )
    return false;
  if (
    p.mappedFields &&
    (!Array.isArray(p.mappedFields) ||
      !p.mappedFields.every((id) => fieldIds.includes(id)))
  )
    return false;
  if (
    p.covers &&
    (typeof p.covers !== "object" ||
      Object.values(p.covers).some(
        (c) => typeof c !== "string" || !/^#[0-9a-f]{6}$/i.test(c),
      ))
  )
    return false;
  return fieldIds.every((id) => {
    const box = p.layouts?.[id];
    return (
      typeof p.copy?.[id] === "string" &&
      p.copy[id].length <= 30000 &&
      box &&
      ["x", "y", "width", "height", "size"].every((key) =>
        Number.isFinite(box[key as keyof Layout]),
      ) &&
      box.x >= 0 &&
      box.x <= 720 &&
      box.y >= 0 &&
      box.y <= 900 &&
      box.width > 0 &&
      box.width <= 720 &&
      box.height > 0 &&
      box.height <= 900 &&
      (!box.fontFamily || fontFamilies.includes(box.fontFamily)) &&
      (box.fontWeight === undefined ||
        (Number.isInteger(box.fontWeight) &&
          box.fontWeight >= 100 &&
          box.fontWeight <= 900)) &&
      (box.bold === undefined || typeof box.bold === "boolean") &&
      (box.italic === undefined || typeof box.italic === "boolean") &&
      (box.underline === undefined || typeof box.underline === "boolean") &&
      (box.strikeThrough === undefined ||
        typeof box.strikeThrough === "boolean") &&
      (box.letterSpacing === undefined ||
        (Number.isFinite(box.letterSpacing) &&
          box.letterSpacing >= -2 &&
          box.letterSpacing <= 20)) &&
      (box.lineHeight === undefined ||
        (Number.isFinite(box.lineHeight) &&
          box.lineHeight >= 0.8 &&
          box.lineHeight <= 2)) &&
      (box.opacity === undefined ||
        (Number.isFinite(box.opacity) &&
          box.opacity >= 0 &&
          box.opacity <= 1)) &&
      box.size >= 11 &&
      box.size <= 180 &&
      (!box.color || /^#[0-9a-f]{6}$/i.test(box.color)) &&
      (!box.align || ["left", "center", "right"].includes(box.align))
    );
  });
}
export function canvasWidth(project: Project): number {
  return resolvePageSize(project).width;
}
export function canvasHeight(project: Project): number {
  return resolvePageSize(project).height;
}
export function outputPixels(project: Project): PageSize {
  return {
    width: Math.round(canvasWidth(project) * 1.5),
    height: Math.round(canvasHeight(project) * 1.5),
  };
}
export function unmappedFields(project: Project): FieldId[] {
  return project.designMode === "reference"
    ? fieldIds.filter(
        (id) => project.copy[id] && !project.mappedFields?.includes(id),
      )
    : [];
}
export type TextFit = { lines: string[]; size: number; overflow: boolean };
export function fitText(
  text: string,
  layout: Layout,
  measure: (text: string, size: number) => number,
): TextFit {
  if (!text) return { lines: [], size: layout.size, overflow: false };
  const lineHeight = layout.lineHeight ?? 1.18;
  const wrap = (size: number) =>
    text.split("\n").flatMap((paragraph) => {
      if (!paragraph) return [""];
      const words = paragraph.split(/(\s+)/);
      const result: string[] = [];
      let line = "";
      for (const word of words) {
        if (line && measure(line + word, size) > layout.width && word.trim()) {
          result.push(line.trimEnd());
          line = word;
        } else line += word;
      }
      result.push(line.trimEnd());
      return result;
    });
  let size = layout.size;
  let lines = wrap(size);
  const minimum = Math.max(11, layout.size * 0.72);
  while (
    size > minimum &&
    (lines.length * size * lineHeight > layout.height ||
      lines.some((line) => measure(line, size) > layout.width))
  ) {
    size = Math.max(minimum, size - 1);
    lines = wrap(size);
  }
  return {
    lines,
    size,
    overflow:
      lines.length * size * lineHeight > layout.height ||
      lines.some((line) => measure(line, size) > layout.width),
  };
}
