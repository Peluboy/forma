import { flowFrameText } from "../../design/documentVisibility.js";
import type {
  FlowChartElement,
  FlowDecorationElement,
  FlowDocument,
  FlowImageElement,
  FlowPage,
  FlowShapeElement,
  FlowTableElement,
  FlowTextFrame,
} from "../../design/flowDocument.js";
import type { DesignSpec } from "../types.js";
import { getDesignLink } from "./links.js";
import type { EditorChangeOperation, EditorChangeSource } from "./types.js";

export function diffFlowDocuments(
  previous: FlowDocument | undefined,
  next: FlowDocument | undefined,
  spec: DesignSpec,
  projectId: string,
  source: EditorChangeSource = "user",
  now = new Date().toISOString(),
): EditorChangeOperation[] {
  if (!previous || !next) return [];
  const ops: EditorChangeOperation[] = [];
  const prevPages = new Map(previous.pages.map((page) => [page.id, page]));
  const nextPages = new Map(next.pages.map((page) => [page.id, page]));

  if (
    previous.master.header !== next.master.header ||
    previous.master.footer !== next.master.footer ||
    previous.master.showPageNumbers !== next.master.showPageNumbers
  ) {
    ops.push({
      kind: "unsupported",
      projectId,
      timestamp: now,
      source,
      reason: "Header and footer are not part of the native design file.",
    });
  }

  for (const page of next.pages) {
    const prior = prevPages.get(page.id);
    if (!prior) {
      const linked = Boolean(
        getDesignLink(page) || spec.pages.some((item) => item.id === page.id),
      );
      ops.push(
        linked
          ? {
              kind: "page_added",
              projectId,
              pageId: page.id,
              designSpecPageId:
                getDesignLink(page)?.designSpecPageId || page.id,
              timestamp: now,
              source,
              width: next.pageSize.width,
              height: next.pageSize.height,
            }
          : {
              kind: "unsupported",
              projectId,
              pageId: page.id,
              timestamp: now,
              source,
              reason: "A new page is not linked to the native design.",
            },
      );
      continue;
    }
    const pageLink = getDesignLink(page)?.designSpecPageId || page.id;
    if ((prior.background || "") !== (page.background || "")) {
      ops.push({
        kind: "page_background",
        projectId,
        pageId: page.id,
        designSpecPageId: pageLink,
        timestamp: now,
        source,
        color: page.background || "#ffffff",
      });
    }
    if (Boolean(prior.hidden) !== Boolean(page.hidden)) {
      ops.push({
        kind: "page_hidden",
        projectId,
        pageId: page.id,
        designSpecPageId: pageLink,
        timestamp: now,
        source,
        hidden: Boolean(page.hidden),
      });
    }
    ops.push(
      ...diffPageNodes(
        previous,
        next,
        prior,
        page,
        spec,
        projectId,
        source,
        now,
      ),
    );
  }

  for (const page of previous.pages) {
    if (nextPages.has(page.id)) continue;
    ops.push({
      kind: "page_deleted",
      projectId,
      pageId: page.id,
      designSpecPageId: getDesignLink(page)?.designSpecPageId || page.id,
      timestamp: now,
      source,
    });
  }

  return ops;
}

function diffPageNodes(
  previousFlow: FlowDocument,
  nextFlow: FlowDocument,
  prior: FlowPage,
  page: FlowPage,
  spec: DesignSpec,
  projectId: string,
  source: EditorChangeSource,
  now: string,
): EditorChangeOperation[] {
  const ops: EditorChangeOperation[] = [];
  const priorNodes = indexNodes(prior);
  const nextNodes = indexNodes(page);

  for (const [id, node] of nextNodes) {
    const before = priorNodes.get(id);
    const link = getDesignLink(node);
    const specId = link?.designSpecElementId || id;
    const linked = Boolean(
      link ||
      spec.pages.some((item) => item.elements.some((el) => el.id === specId)),
    );
    if (!before) {
      ops.push(
        linked
          ? {
              kind: "unsupported",
              projectId,
              pageId: page.id,
              editorElementId: id,
              linkedDesignSpecElementId: specId,
              timestamp: now,
              source,
              reason: "An added element could not be created safely.",
            }
          : {
              kind: "element_added",
              projectId,
              pageId: page.id,
              editorElementId: id,
              timestamp: now,
              source,
              elementType: node.type,
            },
      );
      continue;
    }
    if (!linked) {
      ops.push({
        kind: "unsupported",
        projectId,
        pageId: page.id,
        editorElementId: id,
        timestamp: now,
        source,
        reason: "An editor element has no native design link.",
      });
      continue;
    }
    const base = {
      projectId,
      pageId: page.id,
      editorElementId: id,
      linkedDesignSpecElementId: specId,
      designSpecPageId: link?.designSpecPageId || page.id,
      timestamp: now,
      source,
    };
    if (before.x !== node.x || before.y !== node.y) {
      ops.push({ kind: "element_moved", ...base, x: node.x, y: node.y });
    }
    if (before.width !== node.width || before.height !== node.height) {
      ops.push({
        kind: "element_resized",
        ...base,
        width: node.width,
        height: node.height,
        x: node.x,
        y: node.y,
      });
    }
    if (node.type === "text" && before.type === "text") {
      const prevText = flowFrameText(previousFlow, before) || "";
      const nextText = flowFrameText(nextFlow, node) || "";
      if (prevText !== nextText) {
        ops.push({
          kind: "text_content",
          ...base,
          previousText: prevText,
          nextText,
          sourceLocked: Boolean(node.sourceSpanIds?.length),
        });
      }
      const stylePatch: Record<string, unknown> = {};
      if (before.fontFamily !== node.fontFamily && node.fontFamily)
        stylePatch.fontFamily = node.fontFamily;
      if (before.fontSize !== node.fontSize)
        stylePatch.fontSize = node.fontSize;
      if (before.fontWeight !== node.fontWeight && node.fontWeight)
        stylePatch.fontWeight = node.fontWeight;
      if (before.color !== node.color) stylePatch.color = node.color;
      if (before.align !== node.align && node.align)
        stylePatch.align = node.align;
      if (before.lineHeight !== node.lineHeight && node.lineHeight)
        stylePatch.lineHeight = node.lineHeight;
      if (before.letterSpacing !== node.letterSpacing && node.letterSpacing)
        stylePatch.letterSpacing = node.letterSpacing;
      if (Object.keys(stylePatch).length) {
        ops.push({
          kind: "text_style",
          ...base,
          patch: stylePatch as Extract<
            EditorChangeOperation,
            { kind: "text_style" }
          >["patch"],
        });
      }
    }
    if (node.type === "table" && before.type === "table") {
      ops.push(...diffTable(before, node, base));
    }
    if (node.type === "shape" && before.type === "shape") {
      if (
        before.fill !== node.fill ||
        before.stroke !== node.stroke ||
        before.strokeWidth !== node.strokeWidth ||
        before.opacity !== node.opacity
      ) {
        ops.push({
          kind: "shape_style",
          ...base,
          fill: node.fill,
          stroke: node.stroke,
          strokeWidth: node.strokeWidth,
          opacity: node.opacity,
        });
      }
    }
    if (node.type === "image" && before.type === "image") {
      if (before.fit !== node.fit) {
        ops.push({ kind: "image_fit", ...base, fit: node.fit });
      }
      if (
        before.focalPoint?.x !== node.focalPoint?.x ||
        before.focalPoint?.y !== node.focalPoint?.y ||
        before.altText !== node.altText
      ) {
        ops.push({
          kind: "image_focal",
          ...base,
          focalPoint: node.focalPoint || { x: 0.5, y: 0.5 },
          altText: node.altText,
        });
      }
    }
    if (node.type === "chart" && before.type === "chart") {
      if (
        before.title !== node.title ||
        JSON.stringify(before.labels) !== JSON.stringify(node.labels) ||
        JSON.stringify(before.data) !== JSON.stringify(node.data) ||
        before.chartType !== node.chartType
      ) {
        ops.push({
          kind: "chart_data",
          ...base,
          title: node.title,
          labels: node.labels,
          data: node.data,
          chartType: node.chartType,
          sourceLocked: Boolean(getDesignLink(node)?.sourceSpanIds?.length),
        });
      }
    }
  }

  for (const [id, node] of priorNodes) {
    if (nextNodes.has(id)) continue;
    ops.push({
      kind: "element_deleted",
      projectId,
      pageId: page.id,
      editorElementId: id,
      linkedDesignSpecElementId: getDesignLink(node)?.designSpecElementId || id,
      designSpecPageId: getDesignLink(node)?.designSpecPageId || page.id,
      timestamp: now,
      source,
    });
  }
  return ops;
}

function diffTable(
  before: FlowTableElement,
  node: FlowTableElement,
  base: Omit<EditorChangeOperation, "kind">,
): EditorChangeOperation[] {
  const ops: EditorChangeOperation[] = [];
  const maxRows = Math.max(before.rows.length, node.rows.length);
  for (let row = 0; row < maxRows; row++) {
    const prevRow = before.rows[row] || [];
    const nextRow = node.rows[row] || [];
    const maxCols = Math.max(prevRow.length, nextRow.length);
    for (let column = 0; column < maxCols; column++) {
      const prev = prevRow[column] || "";
      const next = nextRow[column] || "";
      if (prev === next) continue;
      if (row >= before.rows.length || column >= prevRow.length) {
        ops.push({
          kind: "unsupported",
          ...base,
          reason: "Table structure changed in an unsupported way.",
        });
        return ops;
      }
      ops.push({
        kind: "table_cell",
        ...base,
        row,
        column,
        nextText: next,
        sourceLocked: Boolean(node.cellSourceSpanIds?.[row]?.[column]?.length),
        headerRow: node.headerRow,
      });
    }
  }
  if (before.headerRow !== node.headerRow && !ops.length) {
    ops.push({
      kind: "table_cell",
      ...base,
      row: 0,
      column: 0,
      nextText: node.rows[0]?.[0] || "",
      headerRow: node.headerRow,
    });
  }
  return ops;
}

function indexNodes(page: FlowPage) {
  const map = new Map<
    string,
    FlowTextFrame | FlowTableElement | FlowDecorationElement
  >();
  for (const element of page.elements) map.set(element.id, element);
  for (const element of page.decorations || []) map.set(element.id, element);
  return map;
}

export type { FlowChartElement, FlowImageElement, FlowShapeElement };
