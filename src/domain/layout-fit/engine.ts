import type {
  DesignPage,
  DesignSpec,
  TextElement,
} from "../design-spec/types.js";
import type {
  TemplateFamily,
  TemplateLayout,
} from "../template-family/types.js";
import { measureTextElement } from "./measure.js";
import type {
  DocumentFitReport,
  FitAction,
  PageFitReport,
  TextFitMeasurement,
} from "./types.js";

export function evaluatePageFit(
  page: DesignPage,
  layout: TemplateLayout,
): PageFitReport {
  const measurements: TextFitMeasurement[] = [];
  const actions: FitAction[] = [];

  const textElements = page.elements.filter(
    (el): el is TextElement => el.type === "text" && !el.hidden,
  );

  let allResolved = true;

  for (const textEl of textElements) {
    const baseDef = layout.baseElements.find(
      (b) => `${page.id}:${b.id}` === textEl.id,
    );
    const m = measureTextElement(textEl, baseDef?.slotId);
    measurements.push(m);

    if (m.overflow) {
      allResolved = false;
    }
  }

  return {
    pageId: page.id,
    layoutId: layout.id,
    measurements,
    actions,
    resolved: allResolved,
  };
}

export function evaluateDocumentFit(
  spec: DesignSpec,
  family: TemplateFamily,
): DocumentFitReport {
  const layoutsById = new Map(family.layouts.map((l) => [l.id, l]));
  const pageReports: PageFitReport[] = [];
  let totalOverflows = 0;
  let unresolvedCount = 0;

  for (const page of spec.pages) {
    const layoutId = (page.metadata?.layoutId as string) || "heading-body";
    const layout = layoutsById.get(layoutId) || family.layouts[0];
    const report = evaluatePageFit(page, layout);
    pageReports.push(report);

    const overflowCount = report.measurements.filter((m) => m.overflow).length;
    totalOverflows += overflowCount;
    if (!report.resolved) {
      unresolvedCount += overflowCount;
    }
  }

  return {
    valid: unresolvedCount === 0,
    pages: pageReports,
    totalOverflows,
    repairedCount: 0,
    unresolvedCount,
  };
}

/**
 * Deterministically applies bounded repair strategies:
 * 1. Scale font down towards minFontSize
 * 2. Expand region vertically if space allows
 * 3. Mark for layout switch if still overflowing
 */
export function repairPageFit(
  page: DesignPage,
  layout: TemplateLayout,
  pageHeight: number = 792,
  bottomMargin: number = 54,
): { page: DesignPage; actions: FitAction[]; resolved: boolean } {
  const modifiedElements = [...page.elements];
  const actions: FitAction[] = [];
  let allResolved = true;

  for (let i = 0; i < modifiedElements.length; i++) {
    const el = modifiedElements[i];
    if (el.type !== "text" || el.hidden) continue;

    const textEl: TextElement = { ...el };
    const baseDef = layout.baseElements.find(
      (b) => `${page.id}:${b.id}` === textEl.id,
    );
    let m = measureTextElement(textEl, baseDef?.slotId);

    if (!m.overflow) {
      continue;
    }

    // Step 1: Scale font within allowed minFontSize
    let currentFontSize = textEl.fontSize;
    const minSize =
      textEl.constraints?.minFontSize || Math.max(8, currentFontSize * 0.75);

    if (currentFontSize > minSize) {
      let candidateSize = currentFontSize;
      while (candidateSize > minSize) {
        candidateSize = Math.max(minSize, candidateSize - 0.5);
        const testEl: TextElement = { ...textEl, fontSize: candidateSize };
        const testM = measureTextElement(testEl, baseDef?.slotId);
        if (!testM.overflow) {
          // Solved by font scaling!
          textEl.fontSize = candidateSize;
          actions.push({
            type: "scale_font",
            elementId: textEl.id,
            pageId: page.id,
            description: `Scaled font size from ${currentFontSize}pt to ${candidateSize}pt to resolve overflow`,
            applied: true,
            params: {
              originalFontSize: currentFontSize,
              newFontSize: candidateSize,
            },
          });
          m = testM;
          break;
        }
      }
    }

    // Step 2: If still overflowing, expand height if allowed and within artboard bottom margin
    if (m.overflow && textEl.constraints?.allowResize) {
      const nextContentTop = modifiedElements
        .filter(
          (other) =>
            other.id !== textEl.id &&
            !other.hidden &&
            other.type !== "shape" &&
            other.type !== "group" &&
            other.y >= textEl.y + textEl.height &&
            other.x < textEl.x + textEl.width &&
            other.x + other.width > textEl.x,
        )
        .reduce(
          (nearest, other) => Math.min(nearest, other.y - 4),
          pageHeight - bottomMargin,
        );
      const availableArtboardHeight = Math.min(
        nextContentTop - textEl.y,
        textEl.constraints.maxHeight ?? Infinity,
      );
      const desiredHeight = Math.ceil(m.measuredHeight + 4);
      if (
        desiredHeight <= availableArtboardHeight &&
        desiredHeight > textEl.height
      ) {
        const oldH = textEl.height;
        const newH = desiredHeight;
        textEl.height = newH;
        actions.push({
          type: "expand_region",
          elementId: textEl.id,
          pageId: page.id,
          description: `Expanded text frame height from ${oldH}pt to ${newH}pt`,
          applied: true,
          params: {
            originalHeight: oldH,
            newHeight: newH,
          },
        });
        m = measureTextElement(textEl, baseDef?.slotId);
      }
    }

    // If still overflowing after font scaling and box expansion:
    if (m.overflow) {
      allResolved = false;
      actions.push({
        type: "unresolved_overflow",
        elementId: textEl.id,
        pageId: page.id,
        description: `Text element overflows by ${Math.ceil(m.overflowAmount)}pt; requires layout switch or continuation page`,
        applied: false,
        params: {
          overflowAmount: m.overflowAmount,
        },
      });
    }

    modifiedElements[i] = textEl;
  }

  return {
    page: {
      ...page,
      elements: modifiedElements,
    },
    actions,
    resolved: allResolved,
  };
}

export function repairDocumentFit(
  spec: DesignSpec,
  family: TemplateFamily,
): { spec: DesignSpec; report: DocumentFitReport } {
  const layoutsById = new Map(family.layouts.map((l) => [l.id, l]));
  const repairedPages: DesignPage[] = [];
  const pageReports: PageFitReport[] = [];
  let repairedCount = 0;
  let unresolvedCount = 0;

  for (const page of spec.pages) {
    const layoutId = (page.metadata?.layoutId as string) || "heading-body";
    const layout = layoutsById.get(layoutId) || family.layouts[0];

    const {
      page: repPage,
      actions,
      resolved,
    } = repairPageFit(
      page,
      layout,
      family.pageSize.height,
      family.designTokens.grid?.margin || 54,
    );

    repairedPages.push(repPage);
    const postEval = evaluatePageFit(repPage, layout);
    postEval.actions = actions;
    pageReports.push(postEval);

    repairedCount += actions.filter((a) => a.applied).length;
    if (!resolved) {
      unresolvedCount++;
    }
  }

  const updatedSpec: DesignSpec = {
    ...spec,
    pages: repairedPages,
  };

  return {
    spec: updatedSpec,
    report: {
      valid: unresolvedCount === 0,
      pages: pageReports,
      totalOverflows: pageReports.reduce(
        (sum, p) => sum + p.measurements.filter((m) => m.overflow).length,
        0,
      ),
      repairedCount,
      unresolvedCount,
    },
  };
}
