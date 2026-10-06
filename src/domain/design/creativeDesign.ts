import { applyContentBlocks, parseManuscriptBlocks } from "./manuscript.js";
import {
  createProject,
  formatPresets,
  templates,
  type Project,
  type TemplateId,
} from "./model.js";
import { createDocumentProject } from "./flowDocument.js";
import { createPresentationProject } from "./presentation.js";
import { isBrandSystem, type BrandSystem } from "./designSystem.js";
import { fontFamilies, type FontFamily } from "./fonts.js";

export type CreativeFamily = "graphics" | "document" | "presentation";
export type ReferenceFreedom = "close" | "style" | "explore";
export type CreativeBrief = {
  family: CreativeFamily;
  manuscript: string;
  reference?: string;
  freedom: ReferenceFreedom;
  format: "portrait" | "square" | "story" | "banner";
  brand?: BrandSystem;
};
export type CreativeConcept = {
  id: string;
  name: string;
  rationale: string;
  template: TemplateId;
  composition: "editorial" | "centered" | "split";
  colors: { background: string; text: string; accent: string };
  fonts: { display: FontFamily; body: FontFamily };
};

const hex = /^#[\da-f]{6}$/i;
export function validCreativeBrief(value: unknown): value is CreativeBrief {
  const b = value as CreativeBrief;
  return (
    !!b &&
    ["graphics", "document", "presentation"].includes(b.family) &&
    ["close", "style", "explore"].includes(b.freedom) &&
    ["portrait", "square", "story", "banner"].includes(b.format) &&
    typeof b.manuscript === "string" &&
    b.manuscript.trim().length > 0 &&
    b.manuscript.length <= 30000 &&
    (b.reference === undefined ||
      (typeof b.reference === "string" && b.reference.length <= 2800000)) &&
    (b.brand === undefined || isBrandSystem(b.brand))
  );
}
export function normalizeCreativeConcepts(raw: unknown): CreativeConcept[] {
  if (!Array.isArray(raw)) throw new Error("The design response was invalid.");
  const plans = raw.slice(0, 3).map((value, index) => {
    const c = value as Partial<CreativeConcept>;
    if (
      !c ||
      typeof c !== "object" ||
      !templates.some((t) => t.id === c.template) ||
      !["editorial", "centered", "split"].includes(c.composition || "") ||
      !c.colors ||
      !hex.test(c.colors.background || "") ||
      !hex.test(c.colors.text || "") ||
      !hex.test(c.colors.accent || "") ||
      !c.fonts ||
      !fontFamilies.includes(c.fonts.display as FontFamily) ||
      !fontFamilies.includes(c.fonts.body as FontFamily)
    )
      throw new Error("The design response contained an unsupported concept.");
    return {
      id: `concept-${index + 1}`,
      name:
        typeof c.name === "string"
          ? c.name.slice(0, 60)
          : `Direction ${index + 1}`,
      rationale:
        typeof c.rationale === "string" ? c.rationale.slice(0, 300) : "",
      template: c.template!,
      composition: c.composition!,
      colors: c.colors,
      fonts: c.fonts,
    };
  });
  if (
    plans.length !== 3 ||
    new Set(plans.map((plan) => `${plan.template}:${plan.composition}`))
      .size !== 3
  )
    throw new Error(
      "The design response did not provide three distinct directions.",
    );
  return plans;
}

/** Convert a bounded AI art-direction proposal to editable Forma source. The model never writes the copy. */
export function projectFromCreativeConcept(
  brief: CreativeBrief,
  concept: CreativeConcept,
): Project {
  if (!validCreativeBrief(brief))
    throw new Error("Add a valid manuscript and output format.");
  if (brief.family === "document") {
    const project = createDocumentProject(brief.manuscript, concept.name);
    if (project.flow)
      project.flow.master = { header: "", footer: "", showPageNumbers: false };
    project.backgroundColor = concept.colors.background;
    project.flow?.pages.forEach((page) =>
      page.elements.forEach((element) => {
        if (element.type === "text") {
          element.color = concept.colors.text;
          element.fontFamily = ["Georgia", "Lora", "Playfair Display"].includes(
            concept.fonts.body,
          )
            ? "Georgia"
            : "Arial";
        }
      }),
    );
    return project;
  }
  if (brief.family === "presentation") {
    const project = createPresentationProject(brief.manuscript, concept.name);
    if (project.presentation)
      project.presentation.theme = {
        background: concept.colors.background,
        text: concept.colors.text,
        accent: concept.colors.accent,
      };
    return project;
  }
  const project = createProject();
  project.id = crypto.randomUUID();
  project.family = "graphics";
  project.name = concept.name;
  project.template = concept.template;
  project.format = brief.format;
  project.pageSize = { ...formatPresets[brief.format] };
  project.backgroundColor = concept.colors.background;
  const title = project.layouts.title;
  const body = project.layouts.description;
  if (concept.composition === "centered") {
    Object.assign(title, {
      x: 66,
      y: 140,
      width: 588,
      height: 220,
      align: "center",
    });
    Object.assign(body, {
      x: 140,
      y: 442,
      width: 440,
      height: 176,
      align: "center",
    });
  } else if (concept.composition === "split") {
    Object.assign(title, { x: 52, y: 150, width: 350, height: 260, size: 72 });
    Object.assign(body, { x: 52, y: 475, width: 340, height: 184 });
  }
  for (const [id, layout] of Object.entries(project.layouts)) {
    layout.color = concept.colors.text;
    layout.fontFamily =
      id === "title" ? concept.fonts.display : concept.fonts.body;
  }
  const blocks = parseManuscriptBlocks(brief.manuscript);
  Object.assign(project, applyContentBlocks(project, blocks, brief.manuscript));
  // Unlabelled uploads are still real design content. Promote the first free
  // block into the visual headline instead of leaving every word as 18px body.
  const hasTitle = !!project.copy.title.trim();
  project.textLayers = project.textLayers?.map((layer, index) => {
    const isHeadline = index === 0 && !hasTitle;
    const words = layer.text.trim().split(/\s+/).length;
    const size = isHeadline ? (words <= 9 ? 54 : words <= 18 ? 40 : 29) : 21;
    const centered = concept.composition === "centered";
    return {
      ...layer,
      layout: {
        ...layer.layout,
        x: centered ? 66 : 56,
        y: isHeadline
          ? 118
          : Math.min(790, 690 + (index - (hasTitle ? 0 : 1)) * 72),
        width: centered ? 588 : concept.composition === "split" ? 350 : 600,
        height: isHeadline ? 228 : 100,
        size,
        color: concept.colors.text,
        fontFamily: isHeadline ? concept.fonts.display : concept.fonts.body,
        align: centered ? ("center" as const) : ("left" as const),
        bold: isHeadline,
      },
    };
  });
  project.updatedAt = new Date().toISOString();
  return project;
}
