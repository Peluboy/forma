import { flowFrameText } from "../../design/documentVisibility.js";
import type {
  FlowDecorationElement,
  FlowDocument,
  FlowPage,
} from "../../design/flowDocument.js";
import type { Project } from "../../design/schema.js";
import type {
  DesignElement,
  DesignPage,
  DesignSpec,
  TableCell,
} from "../types.js";
import { getDesignLink, makeDesignLink } from "./links.js";

export function fromFlowDocumentToDesignSpec(
  project: Project,
  existing?: DesignSpec,
): { spec: DesignSpec; warnings: string[] } {
  if (project.family !== "document" || !project.flow) {
    throw new Error("A flow document is required.");
  }
  const flow = project.flow;
  const warnings: string[] = [];
  const specId = existing?.id || `${project.id}-spec`;
  const pages = flow.pages.map((page, index) =>
    pageToSpec(page, flow, specId, existing, index, warnings),
  );
  return {
    spec: {
      version: "1.0",
      id: specId,
      name: project.name,
      family: "document",
      copyPolicy: project.copyPolicy || existing?.copyPolicy || "exact",
      documentSize: {
        width: flow.pageSize.width,
        height: flow.pageSize.height,
        unit: existing?.documentSize.unit || "pt",
      },
      pages,
      assets: existing?.assets || [],
      styles: existing?.styles,
      metadata: {
        ...(existing?.metadata || {}),
        recoveredFromFlow: true,
      },
    },
    warnings,
  };
}

function pageToSpec(
  page: FlowPage,
  flow: FlowDocument,
  specId: string,
  existing: DesignSpec | undefined,
  index: number,
  warnings: string[],
): DesignPage {
  const pageId = getDesignLink(page)?.designSpecPageId || page.id;
  const existingPage = existing?.pages.find((item) => item.id === pageId);
  const elements: DesignElement[] = [];
  for (const element of page.decorations || []) {
    elements.push(decorationToElement(element, existingPage, warnings));
  }
  for (const element of page.elements) {
    if (element.type === "text") {
      const text = flowFrameText(flow, element) || "";
      const specElementId =
        getDesignLink(element)?.designSpecElementId || element.id;
      elements.push({
        id: specElementId,
        type: "text",
        text,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
        fontWeight: element.fontWeight,
        lineHeight: element.lineHeight,
        letterSpacing: element.letterSpacing,
        color: element.color,
        align: element.align,
        verticalAlign: element.verticalAlign,
        paragraphSpacing: element.paragraphSpacing,
        sourceSpanIds: element.sourceSpanIds,
        overflow: "warn",
      });
    } else {
      const specElementId =
        getDesignLink(element)?.designSpecElementId || element.id;
      const rows: TableCell[][] = element.rows.map((row, rowIndex) =>
        row.map((text, columnIndex) => ({
          text,
          sourceSpanIds: element.cellSourceSpanIds?.[rowIndex]?.[columnIndex],
        })),
      );
      elements.push({
        id: specElementId,
        type: "table",
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        columns: Math.max(1, ...rows.map((row) => row.length)),
        rows,
        headerRows: element.headerRow ? 1 : 0,
        sourceSpanIds: element.sourceSpanIds,
      });
    }
  }
  if (flow.master.header || flow.master.footer) {
    warnings.push(
      "Header and footer stay as page chrome, not native elements.",
    );
  }
  return {
    id: pageId,
    name: existingPage?.name || `Page ${index + 1}`,
    role: existingPage?.role || "content",
    width: flow.pageSize.width,
    height: flow.pageSize.height,
    background: { color: page.background || "#ffffff" },
    elementIds: elements.map((element) => element.id),
    elements,
    metadata: {
      ...(existingPage?.metadata || {}),
      hidden: Boolean(page.hidden),
      designLink: makeDesignLink(specId, pageId),
    },
  };
}

function decorationToElement(
  element: FlowDecorationElement,
  existingPage: DesignPage | undefined,
  warnings: string[],
): DesignElement {
  const id = getDesignLink(element)?.designSpecElementId || element.id;
  const existing = existingPage?.elements.find((item) => item.id === id);
  const base = {
    id,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    opacity: element.opacity,
    hidden: element.hidden,
  };
  if (element.type === "shape") {
    return {
      ...base,
      type: "shape",
      shape: element.shape,
      fill: element.fill ? { color: element.fill } : undefined,
      stroke: element.stroke ? { color: element.stroke } : undefined,
      strokeWidth: element.strokeWidth,
    };
  }
  if (element.type === "image") {
    if (!existing && !element.assetRef)
      warnings.push(`Image ${element.id} has no stored asset reference.`);
    return {
      ...base,
      type: "image",
      assetRef:
        element.assetRef ||
        (existing && existing.type === "image" ? existing.assetRef : ""),
      fit: element.fit,
      focalPoint: element.focalPoint,
      altText: element.altText,
    };
  }
  return {
    ...base,
    type: "chart",
    chartType: element.chartType,
    labels: element.labels,
    data: element.data,
    title: element.title,
  };
}
