import type { ContentGraph, ContentNode } from "../content/types.js";
import type { SlotAssignment } from "../design-plan/types.js";
import type { TemplateFamily, TemplateLayout, TemplateSlot } from "./types.js";

export interface SlotRemapResult {
  valid: boolean;
  assignments: SlotAssignment[];
  error?: string;
}

function collectAllNodes(nodes: ContentNode[]): Map<string, ContentNode> {
  const map = new Map<string, ContentNode>();
  function walk(node: ContentNode) {
    map.set(node.id, node);
    node.children?.forEach(walk);
  }
  nodes.forEach(walk);
  return map;
}

export function remapLayoutSlots(
  currentLayout: TemplateLayout,
  targetLayout: TemplateLayout,
  currentAssignments: SlotAssignment[],
  graph: ContentGraph,
): SlotRemapResult {
  const nodesById = collectAllNodes(graph.nodes);

  // Collect all assigned node IDs and span IDs in their original order
  const allAssignedNodeIds: string[] = [];
  const allAssignedSpanIds: string[] = [];
  const assignedNodesByRole: Record<string, string[]> = {};
  const assignedSpansByRole: Record<string, string[]> = {};

  const currentSlotsById = new Map(currentLayout.slots.map((s) => [s.id, s]));

  for (const assignment of currentAssignments) {
    const slot = currentSlotsById.get(assignment.slotId);
    const role = slot?.role || "body";

    if (!assignedNodesByRole[role]) assignedNodesByRole[role] = [];
    if (!assignedSpansByRole[role]) assignedSpansByRole[role] = [];

    for (const nId of assignment.contentNodeIds) {
      if (!allAssignedNodeIds.includes(nId)) {
        allAssignedNodeIds.push(nId);
        assignedNodesByRole[role].push(nId);
      }
    }
    for (const sId of assignment.sourceSpanIds) {
      if (!allAssignedSpanIds.includes(sId)) {
        allAssignedSpanIds.push(sId);
        assignedSpansByRole[role].push(sId);
      }
    }
  }

  // If no content was assigned at all, return empty
  if (allAssignedNodeIds.length === 0 && allAssignedSpanIds.length === 0) {
    return { valid: true, assignments: [] };
  }

  const targetAssignments: SlotAssignment[] = [];
  const assignedNodeIdsSet = new Set<string>();
  const assignedSpanIdsSet = new Set<string>();

  // Helper to gather all sourceSpanIds for a set of nodes
  const getSpansForNodes = (nodeIds: string[]): string[] => {
    const spans: string[] = [];
    const seen = new Set<string>();
    for (const nId of nodeIds) {
      const node = nodesById.get(nId);
      if (!node) continue;
      const walk = (n: ContentNode) => {
        for (const sId of n.sourceSpanIds) {
          if (!seen.has(sId)) {
            seen.add(sId);
            spans.push(sId);
          }
        }
        n.children?.forEach(walk);
      };
      walk(node);
    }
    return spans;
  };

  // 1. Map single-role slots (heading, kicker, subheading, quote, attribution, table, chart, image)
  const singleRoles: Array<TemplateSlot["role"]> = [
    "kicker",
    "heading",
    "subheading",
    "quote",
    "attribution",
    "table",
    "chart",
    "image",
  ];

  for (const role of singleRoles) {
    const matchingTargetSlots = targetLayout.slots.filter(
      (s) => s.role === role,
    );
    const nodeIdsForRole = (assignedNodesByRole[role || ""] || []).filter(
      (id) => !assignedNodeIdsSet.has(id),
    );
    const spanIdsForRole = (assignedSpansByRole[role || ""] || []).filter(
      (id) => !assignedSpanIdsSet.has(id),
    );

    if (matchingTargetSlots.length === 1) {
      const slot = matchingTargetSlots[0];
      if (nodeIdsForRole.length > 0 || spanIdsForRole.length > 0) {
        const spans =
          spanIdsForRole.length > 0
            ? spanIdsForRole
            : getSpansForNodes(nodeIdsForRole);
        targetAssignments.push({
          slotId: slot.id,
          contentNodeIds: nodeIdsForRole,
          sourceSpanIds: spans,
        });
        nodeIdsForRole.forEach((id) => assignedNodeIdsSet.add(id));
        spans.forEach((id) => assignedSpanIdsSet.add(id));
      }
    } else if (matchingTargetSlots.length > 1 && nodeIdsForRole.length > 0) {
      // Distribute across multiple matching slots if present
      const chunkSize = Math.max(
        1,
        Math.ceil(nodeIdsForRole.length / matchingTargetSlots.length),
      );
      matchingTargetSlots.forEach((slot, idx) => {
        const chunk = nodeIdsForRole.slice(
          idx * chunkSize,
          (idx + 1) * chunkSize,
        );
        if (chunk.length > 0) {
          const spans = getSpansForNodes(chunk);
          targetAssignments.push({
            slotId: slot.id,
            contentNodeIds: chunk,
            sourceSpanIds: spans,
          });
          chunk.forEach((id) => assignedNodeIdsSet.add(id));
          spans.forEach((id) => assignedSpanIdsSet.add(id));
        }
      });
    }
  }

  // 2. Handle Body Slots (paragraphs, lists, etc.)
  const targetBodySlots = targetLayout.slots.filter(
    (s) => s.role === "body" || (!s.role && s.accepts.includes("paragraph")),
  );

  const remainingNodeIds = allAssignedNodeIds.filter(
    (id) => !assignedNodeIdsSet.has(id),
  );
  const remainingSpanIds = allAssignedSpanIds.filter(
    (id) => !assignedSpanIdsSet.has(id),
  );

  if (
    targetBodySlots.length > 0 &&
    (remainingNodeIds.length > 0 || remainingSpanIds.length > 0)
  ) {
    if (targetBodySlots.length === 1) {
      const slot = targetBodySlots[0];
      const spans =
        remainingSpanIds.length > 0
          ? remainingSpanIds
          : getSpansForNodes(remainingNodeIds);
      targetAssignments.push({
        slotId: slot.id,
        contentNodeIds: remainingNodeIds,
        sourceSpanIds: spans,
      });
      remainingNodeIds.forEach((id) => assignedNodeIdsSet.add(id));
      spans.forEach((id) => assignedSpanIdsSet.add(id));
    } else {
      // Distribute remaining nodes across target body columns/slots
      const numSlots = targetBodySlots.length;
      if (remainingNodeIds.length > 0) {
        const chunkSize = Math.max(
          1,
          Math.ceil(remainingNodeIds.length / numSlots),
        );
        targetBodySlots.forEach((slot, idx) => {
          const chunk = remainingNodeIds.slice(
            idx * chunkSize,
            idx === numSlots - 1 ? undefined : (idx + 1) * chunkSize,
          );
          if (chunk.length > 0) {
            const spans = getSpansForNodes(chunk);
            targetAssignments.push({
              slotId: slot.id,
              contentNodeIds: chunk,
              sourceSpanIds: spans,
            });
            chunk.forEach((id) => assignedNodeIdsSet.add(id));
            spans.forEach((id) => assignedSpanIdsSet.add(id));
          }
        });
      } else if (remainingSpanIds.length > 0) {
        // Distribute remaining spans directly if no nodes
        const chunkSize = Math.max(
          1,
          Math.ceil(remainingSpanIds.length / numSlots),
        );
        targetBodySlots.forEach((slot, idx) => {
          const chunk = remainingSpanIds.slice(
            idx * chunkSize,
            idx === numSlots - 1 ? undefined : (idx + 1) * chunkSize,
          );
          if (chunk.length > 0) {
            targetAssignments.push({
              slotId: slot.id,
              contentNodeIds: [],
              sourceSpanIds: chunk,
            });
            chunk.forEach((id) => assignedSpanIdsSet.add(id));
          }
        });
      }
    }
  }

  // 3. Check for unassigned required target slots
  for (const slot of targetLayout.slots) {
    if (slot.required) {
      const existing = targetAssignments.find((a) => a.slotId === slot.id);
      if (
        !existing ||
        (existing.contentNodeIds.length === 0 &&
          existing.sourceSpanIds.length === 0)
      ) {
        // Try fallback assignment from any unassigned compatible content
        const unassignedNodes = allAssignedNodeIds.filter(
          (id) => !assignedNodeIdsSet.has(id),
        );
        const compatibleNode = unassignedNodes.find((id) => {
          const node = nodesById.get(id);
          return node && slot.accepts.includes(node.type);
        });

        if (compatibleNode) {
          const spans = getSpansForNodes([compatibleNode]);
          targetAssignments.push({
            slotId: slot.id,
            contentNodeIds: [compatibleNode],
            sourceSpanIds: spans,
          });
          assignedNodeIdsSet.add(compatibleNode);
          spans.forEach((id) => assignedSpanIdsSet.add(id));
        } else {
          return {
            valid: false,
            assignments: [],
            error: `Target layout '${targetLayout.id}' requires slot '${slot.id}' which cannot be satisfied from source content.`,
          };
        }
      }
    }
  }

  // 4. Exact Copy Preserving Check: Ensure NO content was lost
  const unassignedRemainingNodes = allAssignedNodeIds.filter(
    (id) => !assignedNodeIdsSet.has(id),
  );
  if (unassignedRemainingNodes.length > 0) {
    return {
      valid: false,
      assignments: [],
      error: `Cannot remap slots: ${unassignedRemainingNodes.length} content node(s) would be dropped, violating Exact Copy.`,
    };
  }

  return {
    valid: true,
    assignments: targetAssignments,
  };
}

export function findCompatibleLayouts(
  currentLayout: TemplateLayout,
  family: TemplateFamily,
): TemplateLayout[] {
  const compatibleIds = new Set<string>([
    ...(currentLayout.compatibleAlternatives || []),
    ...(currentLayout.fallbackLayouts || []),
  ]);

  // If no explicit alternatives, find layouts with same role
  if (compatibleIds.size === 0) {
    return family.layouts.filter(
      (l) => l.id !== currentLayout.id && l.role === currentLayout.role,
    );
  }

  return family.layouts.filter((l) => compatibleIds.has(l.id));
}
