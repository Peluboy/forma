import type { ContentGraph, ContentNode } from "../content/types.js";
import type {
  DesignElement,
  DesignPage,
  DesignSpec,
  ImageElement,
  ShapeElement,
  TableCell,
  TableElement,
  TextElement,
  TextStyle,
} from "../design-spec/types.js";
import type { DesignPlan, SlotAssignment } from "../design-plan/types.js";
import { validateDesignPlan } from "../design-plan/validation.js";
import type { TemplateFamily, TemplateLayout } from "./types.js";

function collectAllNodes(nodes: ContentNode[]): Map<string, ContentNode> {
  const map = new Map<string, ContentNode>();
  function walk(node: ContentNode) {
    map.set(node.id, node);
    node.children?.forEach(walk);
  }
  nodes.forEach(walk);
  return map;
}

export interface ResolverOptions {
  skipValidation?: boolean;
}

export function instantiatePageFromLayout(
  layout: TemplateLayout,
  pageId: string,
  assignments: SlotAssignment[],
  family: TemplateFamily,
  graph: ContentGraph,
  pageRole?: DesignPage["role"],
  order?: number,
  rationale?: string,
): DesignPage {
  const nodesById = collectAllNodes(graph.nodes);
  const spansById = new Map(graph.spans.map((s) => [s.id, s]));

  const pageElements: DesignElement[] = [];
  const elementIds: string[] = [];
  const assignmentsBySlotId = new Map(
    (assignments || []).map((a) => [a.slotId, a]),
  );

  let zIndex = 1;

  for (const baseEl of layout.baseElements) {
    const elementId = `${pageId}:${baseEl.id}`;

    // Case 1: Element is bound to a slot
    if (baseEl.slotId) {
      const assignment = assignmentsBySlotId.get(baseEl.slotId);
      if (!assignment) {
        // Unassigned optional slot: omit element
        continue;
      }

      // Collect all assigned content nodes
      const assignedNodes = assignment.contentNodeIds
        .map((id) => nodesById.get(id))
        .filter((n): n is ContentNode => Boolean(n));

      // Collect all content source span IDs (preserving manuscript order)
      const contentSpanIds: string[] = [];
      const seenSpanIds = new Set<string>();

      const addSpanId = (sId: string) => {
        if (seenSpanIds.has(sId)) return;
        const s = spansById.get(sId);
        if (s && s.role === "content") {
          seenSpanIds.add(sId);
          contentSpanIds.push(sId);
        }
      };

      for (const n of assignedNodes) {
        const walkSpans = (node: ContentNode) => {
          node.sourceSpanIds.forEach(addSpanId);
          node.children?.forEach(walkSpans);
        };
        walkSpans(n);
      }

      for (const sId of assignment.sourceSpanIds) {
        addSpanId(sId);
      }

      if (baseEl.type === "text") {
        if (contentSpanIds.length === 0) continue;

        const text = contentSpanIds
          .map((sId) => spansById.get(sId)?.text || "")
          .join(" ");

        const resolvedStyle: TextStyle = {
          fontFamily:
            baseEl.textStyle?.fontFamily ||
            family.designTokens.typography.body?.fontFamily ||
            "Inter",
          fontSize:
            baseEl.textStyle?.fontSize ||
            family.designTokens.typography.body?.fontSize ||
            11,
          fontWeight:
            typeof baseEl.textStyle?.fontWeight === "number"
              ? baseEl.textStyle.fontWeight
              : 400,
          lineHeight: baseEl.textStyle?.lineHeight || 1.5,
          letterSpacing: baseEl.textStyle?.letterSpacing,
          color:
            baseEl.textStyle?.color ||
            family.designTokens.colors.secondary ||
            "#334155",
          align: baseEl.textStyle?.align || "left",
        };

        const textEl: TextElement = {
          id: elementId,
          type: "text",
          x: baseEl.x,
          y: baseEl.y,
          width: baseEl.width,
          height: baseEl.height,
          zIndex: zIndex++,
          text,
          sourceSpanIds: contentSpanIds,
          constraints: baseEl.constraints,
          metadata: {
            ...baseEl.metadata,
            semanticRole: layout.slots.find((slot) => slot.id === baseEl.slotId)
              ?.role,
          },
          provenance: {
            origin: "template",
            templateId: family.id,
            sourceSpanIds: contentSpanIds,
          },
          ...resolvedStyle,
        };

        pageElements.push(textEl);
        elementIds.push(elementId);
      } else if (baseEl.type === "table") {
        const tableNode = assignedNodes.find((n) => n.type === "table");
        const rowNodes =
          tableNode?.children ||
          assignedNodes.filter((n) => n.type === "table_row");

        const rows: TableCell[][] = [];

        if (rowNodes.length > 0) {
          for (const rNode of rowNodes) {
            const cellNodes = (rNode.children || []).filter(
              (c) => c.type === "table_cell",
            );
            const rowCells: TableCell[] = cellNodes.map((cNode) => {
              const cellSpanIds = cNode.sourceSpanIds.filter(
                (sId) => spansById.get(sId)?.role === "content",
              );
              const cellText = cellSpanIds
                .map((sId) => spansById.get(sId)?.text || "")
                .join(" ");
              return {
                text: cellText,
                sourceSpanIds: cellSpanIds,
              };
            });
            if (rowCells.length > 0) {
              rows.push(rowCells);
            }
          }
        }

        const columns =
          rows.length > 0 ? Math.max(...rows.map((r) => r.length)) : 3;

        const tableEl: TableElement = {
          id: elementId,
          type: "table",
          x: baseEl.x,
          y: baseEl.y,
          width: baseEl.width,
          height: baseEl.height,
          zIndex: zIndex++,
          columns: Math.max(1, columns),
          rows,
          headerRows: 1,
          sourceSpanIds: contentSpanIds,
          provenance: {
            origin: "template",
            templateId: family.id,
            sourceSpanIds: contentSpanIds,
          },
        };

        pageElements.push(tableEl);
        elementIds.push(elementId);
      } else if (baseEl.type === "image") {
        const imgEl: ImageElement = {
          id: elementId,
          type: "image",
          assetRef: baseEl.assetRef || "default-editorial-placeholder",
          fit: baseEl.fit || "crop",
          x: baseEl.x,
          y: baseEl.y,
          width: baseEl.width,
          height: baseEl.height,
          zIndex: zIndex++,
          provenance: { origin: "template", templateId: family.id },
        };
        pageElements.push(imgEl);
        elementIds.push(elementId);
      } else if (baseEl.type === "chart") {
        const chartEl: any = {
          id: elementId,
          type: "chart",
          chartType: "bar",
          labels: ["Q1", "Q2", "Q3", "Q4"],
          data: [45, 68, 85, 92],
          title: "Performance Overview",
          x: baseEl.x,
          y: baseEl.y,
          width: baseEl.width,
          height: baseEl.height,
          zIndex: zIndex++,
          provenance: { origin: "template", templateId: family.id },
        };
        pageElements.push(chartEl);
        elementIds.push(elementId);
      }
    } else {
      // Case 2: Base decorative element (shapes, dividers, card backgrounds)
      if (baseEl.type === "shape") {
        const shapeEl: ShapeElement = {
          id: elementId,
          type: "shape",
          shape: baseEl.shape || "rectangle",
          fill: baseEl.fill,
          stroke: baseEl.stroke,
          strokeWidth: baseEl.strokeWidth,
          x: baseEl.x,
          y: baseEl.y,
          width: baseEl.width,
          height: baseEl.height,
          zIndex: zIndex++,
          provenance: { origin: "template", templateId: family.id },
        };
        pageElements.push(shapeEl);
        elementIds.push(elementId);
      } else if (baseEl.type === "image") {
        const imgEl: ImageElement = {
          id: elementId,
          type: "image",
          assetRef: baseEl.assetRef || "default-editorial-placeholder",
          fit: baseEl.fit || "crop",
          x: baseEl.x,
          y: baseEl.y,
          width: baseEl.width,
          height: baseEl.height,
          zIndex: zIndex++,
          provenance: { origin: "template", templateId: family.id },
        };
        pageElements.push(imgEl);
        elementIds.push(elementId);
      }
    }
  }

  return {
    id: pageId,
    name: layout.name,
    role: pageRole || layout.role,
    width: family.pageSize.width,
    height: family.pageSize.height,
    background: { color: family.designTokens.colors.background || "#ffffff" },
    elementIds,
    elements: pageElements,
    metadata: {
      layoutId: layout.id,
      order,
      rationale,
    },
  };
}

export function instantiateDesignSpec(
  family: TemplateFamily,
  plan: DesignPlan,
  graph: ContentGraph,
  options: ResolverOptions = {},
): DesignSpec {
  if (!options.skipValidation) {
    const planValidation = validateDesignPlan(plan, family, graph);
    if (!planValidation.valid) {
      const err = new Error(
        `Cannot instantiate DesignSpec: DesignPlan has ${planValidation.issues.length} issue(s).`,
      );
      (err as any).issues = planValidation.issues;
      throw err;
    }
  }

  const layoutsById = new Map(family.layouts.map((l) => [l.id, l]));
  const pages: DesignPage[] = [];

  for (const plannedPage of plan.pages) {
    const layout = layoutsById.get(plannedPage.layoutId);
    if (!layout) {
      throw new Error(`Layout '${plannedPage.layoutId}' not found in family.`);
    }

    const page = instantiatePageFromLayout(
      layout,
      plannedPage.id,
      plannedPage.assignments || [],
      family,
      graph,
      plannedPage.role,
      plannedPage.order,
      plannedPage.rationale,
    );
    pages.push(page);
  }

  return {
    version: "1.0",
    id: `spec-${plan.id}`,
    name: `${family.name} Document`,
    family: family.family,
    copyPolicy: graph.copyPolicy,
    documentSize: {
      width: family.pageSize.width,
      height: family.pageSize.height,
      unit: family.pageSize.unit,
    },
    pages,
    styles: {
      colors: family.designTokens.colors,
      textStyles: Object.fromEntries(
        Object.entries(family.designTokens.typography).map(([k, v]) => [
          k,
          {
            fontFamily: v.fontFamily,
            fontSize: v.fontSize,
            fontWeight: typeof v.fontWeight === "number" ? v.fontWeight : 400,
            lineHeight: v.lineHeight,
            letterSpacing: v.letterSpacing,
            color: v.color,
          },
        ]),
      ),
      spacing: family.designTokens.spacing,
    },
    metadata: {
      templateFamilyId: family.id,
      planId: plan.id,
      contentGraphId: graph.id,
      instantiatedAt: new Date().toISOString(),
    },
  };
}
