import type { ContentGraph } from "../content/types.js";
import { validateDesignSpecCopyCoverage } from "../design-spec/copyCoverage.js";
import type {
  DesignElement,
  DesignPage,
  DesignSpec,
} from "../design-spec/types.js";
import { validateDesignSpec } from "../design-spec/validation.js";
import { evaluateDocumentFit } from "../layout-fit/engine.js";
import type { TemplateFamily } from "../template-family/types.js";
import type { BoundedCorrectionActionV2 } from "./qualityTypes.js";

export interface CorrectionOutcome {
  spec: DesignSpec;
  applied: boolean;
  reason?: string;
}

function updateElement(
  target: DesignElement,
  action: BoundedCorrectionActionV2,
): DesignElement | null {
  const amount = action.params?.amount;
  switch (action.type) {
    case "increase_text_scale":
    case "decrease_text_scale": {
      if (
        target.type !== "text" ||
        !Number.isFinite(amount) ||
        !amount ||
        amount <= 0 ||
        amount > 4
      )
        return null;
      const delta = action.type === "increase_text_scale" ? amount : -amount;
      const size = target.fontSize + delta;
      if (
        size < (target.constraints?.minFontSize ?? 9) ||
        size > (target.constraints?.maxFontSize ?? 96)
      )
        return null;
      return { ...target, fontSize: size };
    }
    case "align_to_grid":
    case "align_elements": {
      if (
        target.constraints?.allowMove === false ||
        action.params?.axis === "y"
      )
        return null;
      const x = action.params?.value;
      if (
        typeof x !== "number" ||
        !Number.isFinite(x) ||
        Math.abs(x - target.x) > 18
      )
        return null;
      return { ...target, x };
    }
    case "increase_spacing":
    case "decrease_spacing": {
      if (
        target.constraints?.allowMove === false ||
        action.params?.axis === "x"
      )
        return null;
      if (!Number.isFinite(amount) || !amount || amount <= 0 || amount > 12)
        return null;
      const delta = action.type === "increase_spacing" ? amount : -amount;
      return { ...target, y: target.y + delta };
    }
    case "adjust_region_width": {
      if (target.type !== "text" || target.constraints?.allowResize === false)
        return null;
      const width = action.params?.value;
      if (
        typeof width !== "number" ||
        !Number.isFinite(width) ||
        width < 100 ||
        width > target.width ||
        target.width - width > 100
      )
        return null;
      return { ...target, width };
    }
    case "adjust_image_crop":
    case "change_image_focal_point": {
      if (target.type !== "image") return null;
      const focalPoint = action.params?.focalPoint;
      if (
        !focalPoint ||
        ![focalPoint.x, focalPoint.y].every(
          (value) => Number.isFinite(value) && value >= 0 && value <= 1,
        )
      )
        return null;
      return { ...target, fit: "crop", focalPoint };
    }
    case "change_image_fit": {
      if (target.type !== "image" || !action.params?.imageFit) return null;
      return { ...target, fit: action.params.imageFit };
    }
    default:
      return null;
  }
}

function insidePage(page: DesignPage, element: DesignElement): boolean {
  return (
    element.x >= 0 &&
    element.y >= 0 &&
    element.width >= 0 &&
    element.height >= 0 &&
    element.x + element.width <= page.width &&
    element.y + element.height <= page.height
  );
}

function newCollision(
  page: DesignPage,
  before: DesignElement,
  after: DesignElement,
): boolean {
  const overlaps = (a: DesignElement, b: DesignElement) =>
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 2 &&
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 2;
  if (!["text", "image", "table", "chart"].includes(before.type)) return false;
  return page.elements.some(
    (other) =>
      other.id !== before.id &&
      !other.hidden &&
      ["text", "image", "table", "chart"].includes(other.type) &&
      !overlaps(before, other) &&
      overlaps(after, other),
  );
}

export function applyQualityCorrection(
  spec: DesignSpec,
  action: BoundedCorrectionActionV2,
  family: TemplateFamily,
  graph: ContentGraph,
): CorrectionOutcome {
  const pageIndex = spec.pages.findIndex((page) => page.id === action.pageId);
  if (pageIndex < 0 || !action.elementId)
    return { spec, applied: false, reason: "Page or element target missing." };
  const page = spec.pages[pageIndex];
  const target = page.elements.find(
    (element) => element.id === action.elementId,
  );
  if (!target || target.locked)
    return { spec, applied: false, reason: "Element missing or locked." };
  const updated = updateElement(target, action);
  if (!updated)
    return {
      spec,
      applied: false,
      reason: "Unsupported action or parameter outside safe bounds.",
    };
  if (JSON.stringify(updated) === JSON.stringify(target))
    return {
      spec,
      applied: false,
      reason: "Action would not change the design.",
    };
  if (!insidePage(page, updated) || newCollision(page, target, updated))
    return {
      spec,
      applied: false,
      reason: "Artboard bounds or element collision.",
    };
  const nextPage = {
    ...page,
    elements: page.elements.map((element) =>
      element.id === target.id ? updated : element,
    ),
  };
  const candidate = {
    ...spec,
    pages: spec.pages.map((item, index) =>
      index === pageIndex ? nextPage : item,
    ),
  };
  if (!validateDesignSpec(candidate).valid)
    return { spec, applied: false, reason: "DesignSpec validation failed." };
  if (!validateDesignSpecCopyCoverage(graph, candidate).valid)
    return { spec, applied: false, reason: "Exact Copy validation failed." };
  if (!evaluateDocumentFit(candidate, family).valid)
    return { spec, applied: false, reason: "Fit validation failed." };
  return { spec: candidate, applied: true };
}
