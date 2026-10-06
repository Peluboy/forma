import { contentGraphFromManuscript } from "../../content/contentGraph.js";
import type { SourceSpan } from "../../content/types.js";
import { flowFrameText } from "../../design/documentVisibility.js";
import type { FlowDecorationElement } from "../../design/flowDocument.js";
import type { Project } from "../../design/model.js";
import type {
  AdapterResult,
  DesignAssetRef,
  DesignElement,
  DesignPage,
  DesignSpec,
  TableCell,
} from "../types.js";

export function fromFlowDocument(project: Project): AdapterResult {
  if (project.family !== "document" || !project.flow)
    throw new Error("A legacy flow document is required.");
  const flow = project.flow;
  const graph = contentGraphFromManuscript(project.manuscript);
  const warnings: string[] = [];
  const usedCells = new Set<string>();
  const assets: DesignAssetRef[] = [];
  const findCell = (text: string): string[] => {
    const span = graph.spans.find(
      (item: SourceSpan) =>
        item.role === "content" &&
        item.text === text &&
        !usedCells.has(item.id),
    );
    if (!span) return [];
    usedCells.add(span.id);
    return [span.id];
  };
  const pageRole = (role: string | undefined): DesignPage["role"] => {
    if (
      role === "cover" ||
      role === "section" ||
      role === "table" ||
      role === "chart" ||
      role === "content"
    )
      return role;
    return "content";
  };
  const mapDecoration = (
    element: FlowDecorationElement,
    index: number,
  ): DesignElement => {
    const base = {
      id: `${project.id}:${element.id}`,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      opacity: element.opacity,
      hidden: element.hidden,
      zIndex: index,
      provenance: { origin: "legacy_adapter" as const },
    };
    if (element.type === "shape")
      return {
        ...base,
        type: "shape",
        shape: element.shape,
        fill: element.fill ? { color: element.fill } : undefined,
        stroke: element.stroke ? { color: element.stroke } : undefined,
        strokeWidth: element.strokeWidth,
      };
    if (element.type === "image") {
      const assetId = `${project.id}:asset:${element.id}`;
      if (element.src)
        assets.push({
          id: assetId,
          kind: "image",
          uri: element.src,
          mimeType: element.src.slice(5).split(";")[0],
          legacyInline: true,
        });
      if (element.src)
        warnings.push(
          `Image ${element.id} is an inline legacy asset; move it to owned storage.`,
        );
      return {
        ...base,
        type: "image",
        assetRef: assetId,
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
  };
  const pages: DesignPage[] = flow.pages.map((page, pageIndex) => {
    const elements: DesignElement[] = page.elements.map(
      (element, elementIndex) => {
        const common = {
          id: `${project.id}:${page.id}:${element.id}`,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          zIndex: elementIndex,
          provenance: { origin: "legacy_adapter" as const },
        };
        if (element.type === "text") {
          const text = flowFrameText(flow, element);
          const blocks = element.contentIds.map((id) =>
            flow.content.find((block) => block.id === id),
          );
          const sourceSpanIds = element.sourceSpanIds?.length
            ? element.sourceSpanIds
            : blocks.flatMap((block) => block?.sourceSpanIds || []);
          if (text === null)
            warnings.push(`Frame ${element.id} references missing content.`);
          if (text && !sourceSpanIds.length)
            warnings.push(
              `Frame ${element.id} has no reliable manuscript provenance.`,
            );
          if (element.continuation)
            warnings.push(
              `Frame ${element.id} is part of a continuation sequence; text segmentation is preserved as page metadata.`,
            );
          else if (element.nextFrameId)
            warnings.push(
              `Frame ${element.id} has a legacy continuation; text segmentation is not recoverable.`,
            );
          return {
            ...common,
            type: "text",
            text: text || "",
            fontFamily: element.fontFamily,
            fontSize: element.fontSize,
            fontWeight: element.fontWeight,
            lineHeight: element.lineHeight,
            letterSpacing: element.letterSpacing,
            color: element.color,
            align: element.align,
            verticalAlign: element.verticalAlign,
            paragraphSpacing: element.paragraphSpacing,
            overflow: "warn",
            sourceSpanIds,
            styleRef: element.styleRef,
            metadata: element.continuation
              ? { continuation: element.continuation }
              : undefined,
            provenance: {
              origin: "legacy_adapter",
              sourceSpanIds,
              unavailable: !sourceSpanIds.length,
            },
          };
        }
        const cellSourceSpanIds: string[][][] = [];
        const rows: TableCell[][] = element.rows.map((row, ri) => {
          const spanRow: string[][] = [];
          cellSourceSpanIds.push(spanRow);
          return row.map((text, ci) => {
            const explicit: string[] | undefined =
              element.cellSourceSpanIds?.[ri]?.[ci];
            const sourceSpanIds = explicit?.length ? explicit : findCell(text);
            spanRow.push(sourceSpanIds);
            if (text && !sourceSpanIds.length)
              warnings.push(
                `Table ${element.id} cell "${text.slice(0, 30)}" has no unique manuscript source span.`,
              );
            return { text, sourceSpanIds };
          });
        });
        const provenanceUnavailable = rows.some((row) =>
          row.some((cell) => cell.text && !cell.sourceSpanIds?.length),
        );
        return {
          ...common,
          type: "table",
          rows,
          columns: Math.max(1, ...rows.map((row) => row.length)),
          headerRows: element.headerRow ? 1 : 0,
          cellSourceSpanIds,
          sourceSpanIds: element.sourceSpanIds,
          provenance: {
            origin: "legacy_adapter",
            unavailable: provenanceUnavailable,
          },
          metadata: {
            legacyContentId: element.contentId,
            legacyOverflow: element.overflow,
          },
        };
      },
    );
    const decorations = (page.decorations || []).map((decoration, index) =>
      mapDecoration(decoration, index),
    );
    // Decorations render beneath the flowing text layer, so they lead the
    // DesignSpec element order to preserve the visual stacking.
    const orderedElements = [...decorations, ...elements].map(
      (element, index) => ({
        ...element,
        zIndex: index,
      }),
    );
    return {
      id: `${project.id}:${page.id}`,
      name: `Page ${pageIndex + 1}`,
      role: pageRole(page.role),
      width: flow.pageSize.width,
      height: flow.pageSize.height,
      background: { color: page.background || "#ffffff" },
      elementIds: orderedElements.map((element) => element.id),
      elements: orderedElements,
      metadata: {
        hidden: Boolean(page.hidden),
        legacyPageId: page.id,
        ...(page.designMetadata || {}),
      },
    };
  });
  const spec: DesignSpec = {
    version: "1.0",
    id: project.id,
    name: project.name,
    family: "document",
    copyPolicy: project.copyPolicy || "exact",
    documentSize: { ...flow.pageSize, unit: "pt" },
    pages,
    assets: assets.length ? assets : undefined,
    metadata: {
      legacyProjectId: project.id,
      master: structuredClone(flow.master),
    },
  };
  if (flow.master.header || flow.master.footer || flow.master.showPageNumbers)
    warnings.push(
      "Master header, footer, and page numbers are preserved as metadata, not editable elements.",
    );
  return { spec, warnings };
}
