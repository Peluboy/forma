import {
  compareSourceCoverage,
  type ExactCopyResult,
  type VisibleCopyFragment,
} from "../content/exactCopy.js";
import type { ContentGraph } from "../content/types.js";
import type { DesignSpec } from "./types.js";

export function validateDesignSpecCopyCoverage(
  graph: ContentGraph,
  spec: DesignSpec,
): ExactCopyResult {
  if (graph.copyPolicy !== "exact" || spec.copyPolicy !== "exact")
    return { valid: true, issues: [] };
  const visible: VisibleCopyFragment[] = [];
  for (const page of spec.pages) {
    if (page.metadata?.hidden === true) continue;
    const ordered = new Map(
      page.elements.map((element) => [element.id, element]),
    );
    for (const id of page.elementIds) {
      const element = ordered.get(id);
      if (!element || element.hidden) continue;
      if (element.type === "text")
        visible.push({
          pageId: page.id,
          elementId: element.id,
          text: element.text,
          sourceSpanIds: element.sourceSpanIds || [],
        });
      if (element.type === "table")
        element.rows.forEach((row, ri) =>
          row.forEach((cell, ci) =>
            visible.push({
              pageId: page.id,
              elementId: `${element.id}:r${ri}:c${ci}`,
              text: cell.text,
              sourceSpanIds: cell.sourceSpanIds || [],
            }),
          ),
        );
    }
  }
  return compareSourceCoverage(graph, visible);
}
