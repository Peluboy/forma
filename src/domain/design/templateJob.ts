import { applyBrandToProject, type BrandSystem } from "./designSystem.js";
import { applyContentBlocks, parseManuscriptBlocks } from "./manuscript.js";
import { DESIGN_HEIGHT, fitText } from "./model.js";
import { fieldIds, type Project } from "./schema.js";

export type TemplateLayoutMode = "match" | "fit";

/** A repeat job is always a new project; the approved template stays untouched. */
export function createTemplateJob(
  source: Project,
  manuscript: string,
  options: { layoutMode: TemplateLayoutMode; brand?: BrandSystem },
): Project {
  if (
    !source.isTemplate ||
    source.family === "document" ||
    source.family === "presentation"
  )
    throw new Error("Choose a saved graphic template.");
  if (!manuscript.trim()) throw new Error("Add your manuscript first.");
  if (manuscript.length > 30000)
    throw new Error(
      "This manuscript is too long for a graphic. Use a shorter source or a document.",
    );
  const next: Project = {
    ...structuredClone(source),
    id: crypto.randomUUID(),
    name: `${source.name.replace(/\s+template$/i, "")} design`,
    isTemplate: false,
    updatedAt: new Date().toISOString(),
  };
  const blocks = parseManuscriptBlocks(manuscript);
  Object.assign(next, applyContentBlocks(next, blocks, manuscript));
  if (options.brand)
    Object.assign(next, applyBrandToProject(next, options.brand));
  // "Fit" is a review permission, not a license to silently distort the layout.
  // The editor's measured fit and exact-copy checks remain the export gate.
  if (options.layoutMode === "fit") {
    const ordered = fieldIds
      .filter((id) => next.copy[id])
      .sort((a, b) => next.layouts[a].y - next.layouts[b].y);
    for (const id of ordered) {
      const layout = next.layouts[id];
      const atOriginalSize = fitText(
        next.copy[id],
        { ...layout, height: DESIGN_HEIGHT * 2 },
        (text, size) => text.length * size * 0.55,
      );
      const neededHeight = Math.ceil(
        atOriginalSize.lines.length * layout.size * (layout.lineHeight ?? 1.18),
      );
      if (atOriginalSize.overflow || neededHeight <= layout.height) continue;
      const nextBoundary = ordered
        .filter((other) => next.layouts[other].y > layout.y)
        .map((other) => next.layouts[other].y - 12)
        .concat(
          [...(next.textLayers || []), ...(next.graphicLayers || [])]
            .filter(
              (layer) =>
                !layer.layout.hidden &&
                layer.layout.y >= layout.y + layout.height &&
                layer.layout.x < layout.x + layout.width &&
                layer.layout.x + layer.layout.width > layout.x,
            )
            .map((layer) => layer.layout.y - 12),
        )
        .reduce((a, b) => Math.min(a, b), DESIGN_HEIGHT - 12);
      const available = Math.max(layout.height, nextBoundary - layout.y);
      // Expand only inside the text hierarchy's existing vertical gap.
      next.layouts[id] = {
        ...layout,
        height: Math.min(available, neededHeight),
      };
    }
  }
  return next;
}
