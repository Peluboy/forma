import { contentGraphFromManuscript } from "../../content/contentGraph.js";
import { sourceSpanIdsForText } from "../../content/sourceSpans.js";
import {
  designScale,
  fieldIds,
  resolvePageSize,
  templates,
  type Project,
} from "../../design/model.js";
import { orderedLayerIds } from "../../design/layers.js";
import type {
  AdapterResult,
  DesignAssetRef,
  DesignElement,
  DesignPage,
  DesignSpec,
  TextElement,
} from "../types.js";

export function fromLegacyGraphicProject(project: Project): AdapterResult {
  if (project.family === "document" || project.family === "presentation")
    throw new Error("Use a family-specific legacy adapter.");
  const warnings: string[] = [];
  const graph = contentGraphFromManuscript(project.manuscript);
  const size = resolvePageSize(project);
  const scale = designScale(project);
  const theme = templates.find((item) => item.id === project.template);
  const assets: DesignAssetRef[] = [];
  const elements: DesignElement[] = [];
  const addAsset = (id: string, uri: string) => {
    assets.push({
      id,
      kind: "image",
      uri,
      mimeType: uri.slice(5).split(";")[0],
      legacyInline: true,
    });
    warnings.push(
      `Asset ${id} is an inline legacy image; move it to owned storage before using DesignSpec as persistence.`,
    );
    return id;
  };
  if (project.designMode === "reference" && project.reference) {
    elements.push({
      id: `${project.id}:reference`,
      type: "image",
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      assetRef: addAsset(`${project.id}:reference-asset`, project.reference),
      fit: "fill",
      locked: true,
      zIndex: 0,
      provenance: { origin: "legacy_adapter" },
    });
    warnings.push(
      "Reference artwork remains one raster image; the adapter does not reconstruct editable design elements.",
    );
  } else {
    warnings.push(
      "Built-in template SVG artwork is not represented as editable DesignSpec elements.",
    );
  }
  const spanIds = (text: string) => sourceSpanIdsForText(graph.spans, text);
  for (const fieldId of fieldIds) {
    const layout = project.layouts[fieldId];
    const text = project.copy[fieldId];
    if (!text) continue;
    const sourceSpanIds = spanIds(text);
    if (!sourceSpanIds.length)
      warnings.push(`Field ${fieldId} has no reliable manuscript provenance.`);
    if (project.designMode === "reference" && !layout.hidden) {
      elements.push({
        id: `${project.id}:cover:${fieldId}`,
        type: "shape",
        shape: "rectangle",
        x: layout.x * scale.x,
        y: layout.y * scale.y,
        width: layout.width * scale.x,
        height: layout.height * scale.y,
        fill: { color: project.covers?.[fieldId] || "#ffffff" },
        zIndex: elements.length,
        provenance: { origin: "legacy_adapter" },
      });
    }
    elements.push({
      id: `${project.id}:field:${fieldId}`,
      type: "text",
      text,
      x: layout.x * scale.x,
      y: layout.y * scale.y,
      width: layout.width * scale.x,
      height: layout.height * scale.y,
      fontFamily:
        layout.fontFamily ||
        (fieldId === "title" ? theme?.font || "Arial" : "Arial"),
      fontSize: layout.size,
      fontWeight: layout.fontWeight || (layout.bold ? 700 : 400),
      lineHeight: layout.lineHeight,
      letterSpacing: layout.letterSpacing,
      color: layout.color || theme?.text || "#252920",
      align: layout.align,
      hidden: layout.hidden,
      locked: layout.locked,
      zIndex: elements.length,
      sourceSpanIds,
      provenance: {
        origin: "legacy_adapter",
        sourceSpanIds,
        unavailable: !sourceSpanIds.length,
      },
      overflow: "warn",
    } satisfies TextElement);
  }
  const added = new Map<string, DesignElement>();
  for (const layer of project.textLayers || []) {
    const box = layer.layout;
    const sourceSpanIds = spanIds(layer.text);
    if (layer.text && !sourceSpanIds.length)
      warnings.push(
        `Text layer ${layer.id} has no reliable manuscript provenance.`,
      );
    added.set(layer.id, {
      id: `${project.id}:${layer.id}`,
      type: "text",
      text: layer.text,
      x: box.x * scale.x,
      y: box.y * scale.y,
      width: box.width * scale.x,
      height: box.height * scale.y,
      fontFamily: box.fontFamily || "Arial",
      fontSize: box.size,
      fontWeight: box.fontWeight || (box.bold ? 700 : 400),
      lineHeight: box.lineHeight,
      letterSpacing: box.letterSpacing,
      color: box.color || "#252920",
      align: box.align,
      hidden: box.hidden,
      locked: box.locked,
      sourceSpanIds,
      provenance: {
        origin: "legacy_adapter",
        sourceSpanIds,
        unavailable: !sourceSpanIds.length,
      },
      overflow: "warn",
    });
  }
  for (const layer of project.graphicLayers || []) {
    const box = layer.layout;
    const base = {
      id: `${project.id}:${layer.id}`,
      x: box.x * scale.x,
      y: box.y * scale.y,
      width: box.width * scale.x,
      height: box.height * scale.y,
      hidden: box.hidden,
      locked: box.locked,
      provenance: { origin: "legacy_adapter" as const },
    };
    if (layer.type === "shape")
      added.set(layer.id, {
        ...base,
        type: "shape",
        shape: layer.shape,
        fill: { color: layer.color },
      });
    else if (layer.type === "image")
      added.set(layer.id, {
        ...base,
        type: "image",
        assetRef: addAsset(`${project.id}:asset:${layer.id}`, layer.src),
        fit: "fill",
        altText: layer.name,
      });
    else
      added.set(layer.id, {
        ...base,
        type: "frame",
        shape: layer.shape,
        fit: "fill",
        assetRef: layer.src
          ? addAsset(`${project.id}:asset:${layer.id}`, layer.src)
          : undefined,
      });
  }
  for (const id of orderedLayerIds(project)) {
    const element = added.get(id);
    if (element) elements.push({ ...element, zIndex: elements.length });
  }
  const page: DesignPage = {
    id: `${project.id}:page:1`,
    role: "content",
    width: size.width,
    height: size.height,
    background: { color: project.backgroundColor || theme?.color || "#ffffff" },
    elementIds: elements.map((element) => element.id),
    elements,
  };
  const spec: DesignSpec = {
    version: "1.0",
    id: project.id,
    name: project.name,
    family: "graphic",
    copyPolicy: project.copyPolicy || "exact",
    documentSize: { ...size, unit: "px" },
    pages: [page],
    assets,
    metadata: { legacyProjectId: project.id, legacyTemplate: project.template },
  };
  return { spec, warnings };
}
