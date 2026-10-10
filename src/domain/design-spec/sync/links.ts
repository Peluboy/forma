import type {
  FlowDecorationElement,
  FlowDocument,
  FlowPage,
  FlowTableElement,
  FlowTextFrame,
} from "../../design/flowDocument.js";
import type { DesignElement, DesignSpec } from "../types.js";
import { PROJECTION_VERSION, type DesignSpecLink } from "./types.js";

export type LinkedEditorElement =
  FlowTextFrame | FlowTableElement | FlowDecorationElement;

export function makeDesignLink(
  specId: string,
  pageId: string,
  elementId?: string,
  sourceSpanIds?: string[],
): DesignSpecLink {
  return {
    designSpecId: specId,
    designSpecPageId: pageId,
    designSpecElementId: elementId,
    sourceSpanIds,
    projectionId: elementId ? `${pageId}:${elementId}` : pageId,
    projectionVersion: PROJECTION_VERSION,
  };
}

export function getDesignLink(
  value: { designLink?: DesignSpecLink; id?: string } | undefined,
): DesignSpecLink | undefined {
  if (!value) return undefined;
  if (value.designLink) return value.designLink;
  return undefined;
}

export function getDesignSpecLinkFromEditorElement(
  element: LinkedEditorElement,
  page?: FlowPage,
): DesignSpecLink | undefined {
  return getDesignLink(element) || getDesignLink(page);
}

export function getEditorElementsForDesignSpecElement(
  flow: FlowDocument,
  designSpecElementId: string,
): Array<{ page: FlowPage; element: LinkedEditorElement }> {
  const matches: Array<{ page: FlowPage; element: LinkedEditorElement }> = [];
  for (const page of flow.pages) {
    for (const element of page.elements) {
      if (elementMatches(element, designSpecElementId))
        matches.push({ page, element });
    }
    for (const element of page.decorations || []) {
      if (elementMatches(element, designSpecElementId))
        matches.push({ page, element });
    }
  }
  return matches;
}

export function findDesignElement(
  spec: DesignSpec,
  elementId?: string,
  pageId?: string,
): { pageId: string; element: DesignElement } | undefined {
  if (!elementId) return undefined;
  if (pageId) {
    const page = spec.pages.find((item) => item.id === pageId);
    const element = page?.elements.find((item) => item.id === elementId);
    if (page && element) return { pageId: page.id, element };
  }
  for (const page of spec.pages) {
    const element = page.elements.find((item) => item.id === elementId);
    if (element) return { pageId: page.id, element };
  }
  return undefined;
}

export function validateProjectionLinks(
  spec: DesignSpec,
  flow: FlowDocument,
): {
  valid: boolean;
  missingLinks: string[];
  invalidLinks: string[];
  linkedCount: number;
} {
  const missingLinks: string[] = [];
  const invalidLinks: string[] = [];
  let linkedCount = 0;
  for (const page of flow.pages) {
    const nodes: LinkedEditorElement[] = [
      ...page.elements,
      ...(page.decorations || []),
    ];
    for (const element of nodes) {
      const link = getDesignLink(element);
      const targetId = link?.designSpecElementId || element.id;
      const found = findDesignElement(
        spec,
        targetId,
        link?.designSpecPageId || page.id,
      );
      if (!link && !found) {
        missingLinks.push(`${page.id}:${element.id}`);
        continue;
      }
      if (!found) {
        invalidLinks.push(`${page.id}:${element.id}`);
        continue;
      }
      linkedCount += 1;
    }
  }
  return {
    valid: missingLinks.length === 0 && invalidLinks.length === 0,
    missingLinks,
    invalidLinks,
    linkedCount,
  };
}

function elementMatches(
  element: LinkedEditorElement,
  designSpecElementId: string,
): boolean {
  return (
    element.id === designSpecElementId ||
    getDesignLink(element)?.designSpecElementId === designSpecElementId
  );
}
