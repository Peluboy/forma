import type { ContentGraph } from "../content/types.js";
import { validateDesignSpecCopyCoverage } from "../design-spec/copyCoverage.js";
import type {
  DesignPage,
  DesignSpec,
  TextElement,
} from "../design-spec/types.js";
import { validateDesignSpec } from "../design-spec/validation.js";
import { evaluatePageFit } from "../layout-fit/engine.js";
import type {
  TemplateFamily,
  TemplateLayout,
} from "../template-family/types.js";
import type { BoundedCorrectionAction } from "./types.js";

export function applyCorrectionToPage(
  page: DesignPage,
  action: BoundedCorrectionAction,
  layout: TemplateLayout,
  pageHeight: number = 792,
): { page: DesignPage; applied: boolean; reason?: string } {
  const elements = [...page.elements];
  const targetIndex = elements.findIndex((el) => el.id === action.elementId);

  if (targetIndex === -1 && action.type !== "change_layout_variant") {
    return {
      page,
      applied: false,
      reason: `Element '${action.elementId}' not found on page.`,
    };
  }

  const target = elements[targetIndex];

  switch (action.type) {
    case "increase_text_scale": {
      if (target.type !== "text")
        return { page, applied: false, reason: "Element is not text." };
      const textEl = target as TextElement;
      const amount = action.amount || 1;
      const max = textEl.constraints?.maxFontSize;
      if (max !== undefined && (textEl.fontSize || 12) + amount > max) {
        return {
          page,
          applied: false,
          reason: `Action exceeds maximum allowed font size constraint (${max}pt).`,
        };
      }
      const newSize = (textEl.fontSize || 12) + amount;
      const candidateEl: TextElement = { ...textEl, fontSize: newSize };
      elements[targetIndex] = candidateEl;
      const candidatePage: DesignPage = { ...page, elements };

      // Validate fit: cannot introduce overflow
      const fit = evaluatePageFit(candidatePage, layout);
      if (!fit.resolved) {
        return {
          page,
          applied: false,
          reason: "Increasing text scale introduces container overflow.",
        };
      }
      return { page: candidatePage, applied: true };
    }

    case "decrease_text_scale": {
      if (target.type !== "text")
        return { page, applied: false, reason: "Element is not text." };
      const textEl = target as TextElement;
      const amount = action.amount || 1;
      const min = textEl.constraints?.minFontSize;
      if (min !== undefined && (textEl.fontSize || 12) - amount < min) {
        return {
          page,
          applied: false,
          reason: `Action drops below minimum allowed font size constraint (${min}pt).`,
        };
      }
      const newSize = Math.max(8, (textEl.fontSize || 12) - amount);
      elements[targetIndex] = { ...textEl, fontSize: newSize };
      return { page: { ...page, elements }, applied: true };
    }

    case "move_within_region": {
      const deltaX = action.amount || 0;
      const newX = target.x + deltaX;
      if (newX < 0 || newX + target.width > (page.width || 612)) {
        return {
          page,
          applied: false,
          reason: "Moving element would push it outside artboard bounds.",
        };
      }
      elements[targetIndex] = { ...target, x: newX };
      return { page: { ...page, elements }, applied: true };
    }

    case "resize_element": {
      const deltaH = action.amount || 0;
      const newH = target.height + deltaH;
      if (newH < 10 || target.y + newH > pageHeight - 40) {
        return {
          page,
          applied: false,
          reason: "Resizing would violate vertical boundary.",
        };
      }
      elements[targetIndex] = { ...target, height: newH };
      return { page: { ...page, elements }, applied: true };
    }

    case "change_alignment": {
      if (target.type !== "text")
        return { page, applied: false, reason: "Element is not text." };
      if (!action.alignment)
        return { page, applied: false, reason: "No alignment specified." };
      elements[targetIndex] = {
        ...(target as TextElement),
        align: action.alignment,
      };
      return { page: { ...page, elements }, applied: true };
    }

    default:
      return {
        page,
        applied: false,
        reason: `Action '${action.type}' is not yet implemented or disallowed.`,
      };
  }
}

export function applyBoundedCorrections(
  spec: DesignSpec,
  corrections: BoundedCorrectionAction[],
  family: TemplateFamily,
  graph: ContentGraph,
): { spec: DesignSpec; appliedActions: BoundedCorrectionAction[] } {
  const layoutsById = new Map(family.layouts.map((l) => [l.id, l]));
  let currentSpec = { ...spec, pages: [...spec.pages] };
  const appliedActions: BoundedCorrectionAction[] = [];

  for (const action of corrections) {
    const pageIndex = currentSpec.pages.findIndex(
      (p) => p.id === action.pageId,
    );
    if (pageIndex === -1) continue;

    const page = currentSpec.pages[pageIndex];
    const layoutId = (page.metadata?.layoutId as string) || "heading-body";
    const layout = layoutsById.get(layoutId) || family.layouts[0];

    const { page: updatedPage, applied } = applyCorrectionToPage(
      page,
      action,
      layout,
      family.pageSize.height,
    );

    if (applied) {
      // Test full candidate spec
      const candidateSpec: DesignSpec = {
        ...currentSpec,
        pages: currentSpec.pages.map((p, idx) =>
          idx === pageIndex ? updatedPage : p,
        ),
      };

      const specVal = validateDesignSpec(candidateSpec);
      const copyVal = validateDesignSpecCopyCoverage(graph, candidateSpec);

      if (specVal.valid && copyVal.valid) {
        currentSpec = candidateSpec;
        appliedActions.push(action);
      }
    }
  }

  return {
    spec: currentSpec,
    appliedActions,
  };
}
