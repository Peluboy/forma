import type { ContentGraph, ContentNode } from "../content/types.js";
import type { TemplateFamily } from "../template-family/types.js";
import type {
  DesignPlan,
  DesignPlanIssue,
  DesignPlanValidationResult,
} from "./types.js";

function collectAllNodes(nodes: ContentNode[]): Map<string, ContentNode> {
  const map = new Map<string, ContentNode>();
  function walk(node: ContentNode) {
    map.set(node.id, node);
    node.children?.forEach(walk);
  }
  nodes.forEach(walk);
  return map;
}

export function validateDesignPlan(
  plan: DesignPlan,
  family: TemplateFamily,
  graph: ContentGraph,
): DesignPlanValidationResult {
  const issues: DesignPlanIssue[] = [];

  if (
    !plan ||
    plan.version !== "1.0" ||
    !plan.id ||
    !plan.contentGraphId ||
    !plan.templateFamilyId ||
    !Array.isArray(plan.pages)
  ) {
    issues.push({
      type: "invalid_root",
      message: "DesignPlan has missing or invalid root fields.",
    });
    return { valid: false, issues };
  }

  if (plan.templateFamilyId !== family.id) {
    issues.push({
      type: "invalid_root",
      message: `Plan references templateFamilyId '${plan.templateFamilyId}' but validated against '${family.id}'.`,
    });
  }

  if (plan.contentGraphId !== graph.id) {
    issues.push({
      type: "invalid_root",
      message: `Plan references contentGraphId '${plan.contentGraphId}' but validated against '${graph.id}'.`,
    });
  }

  const layoutsById = new Map(family.layouts.map((l) => [l.id, l]));
  const nodesById = collectAllNodes(graph.nodes);
  const spansById = new Map(graph.spans.map((s) => [s.id, s]));

  const assignedNodeIds = new Set<string>();
  const assignedSpanIds = new Set<string>();
  const pageIds = new Set<string>();
  let lastOrder = 0;

  for (const page of plan.pages) {
    if (!page.id || typeof page.id !== "string") {
      issues.push({
        type: "invalid_root",
        message: "Page is missing an id.",
      });
      continue;
    }

    if (pageIds.has(page.id)) {
      issues.push({
        type: "duplicate_page_id",
        pageId: page.id,
        message: `Duplicate page id '${page.id}'.`,
      });
    }
    pageIds.add(page.id);

    if (typeof page.order !== "number" || page.order <= lastOrder) {
      issues.push({
        type: "invalid_page_order",
        pageId: page.id,
        message: `Page order '${page.order}' is not strictly ascending after '${lastOrder}'.`,
      });
    }
    lastOrder = page.order;

    const layout = layoutsById.get(page.layoutId);
    if (!layout) {
      issues.push({
        type: "unknown_layout",
        pageId: page.id,
        layoutId: page.layoutId,
        message: `Layout '${page.layoutId}' not found in template family '${family.id}'.`,
      });
      continue;
    }

    const slotsById = new Map(layout.slots.map((s) => [s.id, s]));
    const assignedSlotIds = new Set<string>();

    for (const assignment of page.assignments || []) {
      const slot = slotsById.get(assignment.slotId);
      if (!slot) {
        issues.push({
          type: "unknown_slot",
          pageId: page.id,
          layoutId: page.layoutId,
          slotId: assignment.slotId,
          message: `Slot '${assignment.slotId}' does not exist in layout '${page.layoutId}'.`,
        });
        continue;
      }

      assignedSlotIds.add(assignment.slotId);

      // Max items check
      if (
        slot.maxItems !== undefined &&
        assignment.contentNodeIds.length > slot.maxItems
      ) {
        issues.push({
          type: "exceeded_max_items",
          pageId: page.id,
          layoutId: page.layoutId,
          slotId: assignment.slotId,
          message: `Slot '${assignment.slotId}' accepts at most ${slot.maxItems} items, but got ${assignment.contentNodeIds.length}.`,
        });
      }

      // Check each assigned node
      for (const nodeId of assignment.contentNodeIds) {
        const node = nodesById.get(nodeId);
        if (!node) {
          issues.push({
            type: "unknown_node_reference",
            pageId: page.id,
            slotId: assignment.slotId,
            nodeId,
            message: `Assigned node '${nodeId}' not found in ContentGraph.`,
          });
          continue;
        }

        // Allowed content type check
        if (
          !slot.accepts.includes(node.type) &&
          !slot.accepts.includes("unknown")
        ) {
          issues.push({
            type: "disallowed_content_type",
            pageId: page.id,
            layoutId: page.layoutId,
            slotId: assignment.slotId,
            nodeId,
            message: `Node '${nodeId}' with type '${node.type}' is not accepted by slot '${slot.id}' (accepts: ${slot.accepts.join(", ")}).`,
          });
        }

        // Check for duplicate assignments across pages/slots
        if (assignedNodeIds.has(nodeId)) {
          issues.push({
            type: "duplicate_content_assignment",
            pageId: page.id,
            slotId: assignment.slotId,
            nodeId,
            message: `Node '${nodeId}' is assigned more than once across the design plan.`,
          });
        }
        assignedNodeIds.add(nodeId);

        // Also track all node's source spans and its children's source spans
        const registerSpans = (n: ContentNode) => {
          for (const sId of n.sourceSpanIds) {
            assignedSpanIds.add(sId);
          }
          n.children?.forEach(registerSpans);
        };
        registerSpans(node);
      }

      // Check directly assigned source spans
      for (const spanId of assignment.sourceSpanIds) {
        if (!spansById.has(spanId)) {
          issues.push({
            type: "unknown_span_reference",
            pageId: page.id,
            slotId: assignment.slotId,
            spanId,
            message: `Assigned span '${spanId}' not found in ContentGraph.`,
          });
        } else {
          assignedSpanIds.add(spanId);
        }
      }
    }

    // Check required slots in this layout
    for (const slot of layout.slots) {
      const headingContinues =
        slot.role === "heading" &&
        page.continuationOfPrevious &&
        plan.pages.some(
          (earlier) =>
            earlier.order < page.order &&
            earlier.assignments.some((assignment) =>
              ["heading", "title", "kicker"].includes(assignment.slotId),
            ),
        );
      if (slot.required && !assignedSlotIds.has(slot.id) && !headingContinues) {
        issues.push({
          type: "missing_required_slot",
          pageId: page.id,
          layoutId: page.layoutId,
          slotId: slot.id,
          message: `Required slot '${slot.id}' in layout '${layout.id}' was not assigned any content.`,
        });
      }
    }
  }

  // Check if any required manuscript content was unassigned
  const requiredSpans = graph.spans.filter((s) => s.role === "content");
  for (const span of requiredSpans) {
    if (!assignedSpanIds.has(span.id)) {
      issues.push({
        type: "unassigned_required_content",
        spanId: span.id,
        message: `Approved manuscript content span '${span.id}' ("${span.text.slice(0, 30)}...") was not assigned to any page in the design plan.`,
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
