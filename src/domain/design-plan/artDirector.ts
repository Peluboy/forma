import type { ContentGraph, ContentNode } from "../content/types.js";
import type { TemplateFamily } from "../template-family/types.js";
import type { DesignPlan, PlannedPage, SlotAssignment } from "./types.js";

/**
 * Creates a deterministic, valid DesignPlan from a ContentGraph and TemplateFamily.
 * Used as the reference baseline, for offline tests, and as a guaranteed fallback.
 */
export function planDesignDeterministically(
  graph: ContentGraph,
  family: TemplateFamily,
): DesignPlan {
  const pages: PlannedPage[] = [];
  const layoutsById = new Map(family.layouts.map((l) => [l.id, l]));

  // Helper to extract node content spans
  const getNodeContentSpans = (node: ContentNode): string[] => {
    const spanIds: string[] = [];
    const walk = (n: ContentNode) => {
      for (const sId of n.sourceSpanIds) {
        const span = graph.spans.find((s) => s.id === sId);
        if (span && span.role === "content") {
          spanIds.push(sId);
        }
      }
      n.children?.forEach(walk);
    };
    walk(node);
    return spanIds;
  };

  // Only consider nodes that contain actual content spans (ignore syntax-only empty lines)
  const remainingNodes = graph.nodes.filter(
    (n) => getNodeContentSpans(n).length > 0,
  );
  let pageOrder = 1;

  // 1. Plan Cover Page
  const coverLayout = layoutsById.get("cover");
  if (coverLayout && remainingNodes.length > 0) {
    const assignments: SlotAssignment[] = [];

    // First heading is title
    const headingIndex = remainingNodes.findIndex((n) => n.type === "heading");
    if (headingIndex !== -1) {
      const headingNode = remainingNodes.splice(headingIndex, 1)[0];
      assignments.push({
        slotId: "title",
        contentNodeIds: [headingNode.id],
        sourceSpanIds: getNodeContentSpans(headingNode),
      });
    }

    // Subtitle / Intro
    if (
      remainingNodes.length > 0 &&
      (remainingNodes[0].type === "subheading" ||
        remainingNodes[0].type === "paragraph") &&
      getNodeContentSpans(remainingNodes[0]).reduce(
        (length, id) =>
          length +
          (graph.spans.find((span) => span.id === id)?.text.length ?? 0),
        0,
      ) <=
        (coverLayout.slots.find((slot) => slot.id === "subtitle")
          ?.maxCharacters ?? 250)
    ) {
      const subNode = remainingNodes.shift()!;
      assignments.push({
        slotId: "subtitle",
        contentNodeIds: [subNode.id],
        sourceSpanIds: getNodeContentSpans(subNode),
      });
    }

    // Metadata
    if (remainingNodes.length > 0 && remainingNodes[0].type === "metadata") {
      const metaNode = remainingNodes.shift()!;
      assignments.push({
        slotId: "metadata",
        contentNodeIds: [metaNode.id],
        sourceSpanIds: getNodeContentSpans(metaNode),
      });
    }

    pages.push({
      id: `page-${pageOrder}`,
      order: pageOrder++,
      role: "cover",
      layoutId: coverLayout.id,
      assignments,
      rationale: "Cover page establishing document title and metadata.",
    });
  }

  // 2. Process Content Sections into Planned Pages
  while (remainingNodes.length > 0) {
    const nextThree = remainingNodes.slice(0, 4);

    // Section Type Detection
    const hasTableAhead = nextThree.some(
      (n) => n.type === "table" || n.type === "table_row",
    );
    const hasQuoteAhead = nextThree.some((n) => n.type === "quote");
    const hasStatsAhead = nextThree.some((n) => n.type === "statistic");
    const isClosingAhead =
      remainingNodes.length <= 4 &&
      remainingNodes.some(
        (n) =>
          n.type === "cta" ||
          (n.type === "heading" &&
            /closing|conclusion|summary|recommendations/i.test(
              (n.metadata?.label as string) || "",
            )),
      );

    // Case 1: Table Section
    if (
      hasTableAhead &&
      (layoutsById.has("table-page") || layoutsById.has("heading-body"))
    ) {
      const layout =
        layoutsById.get("table-page") || layoutsById.get("heading-body")!;
      const assignments: SlotAssignment[] = [];

      // Heading
      if (remainingNodes[0].type === "heading") {
        const hNode = remainingNodes.shift()!;
        assignments.push({
          slotId: "heading",
          contentNodeIds: [hNode.id],
          sourceSpanIds: getNodeContentSpans(hNode),
        });
      }

      // Intro Commentary
      if (
        remainingNodes.length > 0 &&
        (remainingNodes[0].type === "paragraph" ||
          remainingNodes[0].type === "callout") &&
        layout.slots.some((s) => s.id === "intro")
      ) {
        const introNode = remainingNodes.shift()!;
        assignments.push({
          slotId: "intro",
          contentNodeIds: [introNode.id],
          sourceSpanIds: getNodeContentSpans(introNode),
        });
      }

      // Table Node
      if (
        remainingNodes.length > 0 &&
        (remainingNodes[0].type === "table" ||
          remainingNodes[0].type === "table_row")
      ) {
        const tNode = remainingNodes.shift()!;
        assignments.push({
          slotId: layout.slots.some((s) => s.id === "table") ? "table" : "body",
          contentNodeIds: [tNode.id],
          sourceSpanIds: getNodeContentSpans(tNode),
        });
      }

      // Caption
      if (
        remainingNodes.length > 0 &&
        (remainingNodes[0].type === "caption" ||
          remainingNodes[0].type === "metadata") &&
        layout.slots.some((s) => s.id === "caption")
      ) {
        const capNode = remainingNodes.shift()!;
        assignments.push({
          slotId: "caption",
          contentNodeIds: [capNode.id],
          sourceSpanIds: getNodeContentSpans(capNode),
        });
      }

      pages.push({
        id: `page-${pageOrder}`,
        order: pageOrder++,
        role: "table",
        layoutId: layout.id,
        assignments,
        continuationOfPrevious: !assignments.some(
          (assignment) => assignment.slotId === "heading",
        ),
        rationale: "Structured data table with contextual commentary.",
      });
      continue;
    }

    // Case 2: Statistics Section (3 or 4 stats)
    if (
      hasStatsAhead &&
      (layoutsById.has("three-stat") || layoutsById.has("four-stat"))
    ) {
      let statsCountInSection = 0;
      for (const node of remainingNodes) {
        if (
          node !== remainingNodes[0] &&
          (node.type === "heading" ||
            node.type === "table" ||
            node.type === "quote")
        )
          break;
        if (node.type === "statistic") statsCountInSection++;
      }
      const isFour = statsCountInSection >= 4;
      const layoutId =
        isFour && layoutsById.has("four-stat") ? "four-stat" : "three-stat";
      const layout = layoutsById.get(layoutId)!;
      const assignments: SlotAssignment[] = [];

      // Heading
      if (remainingNodes[0].type === "heading") {
        const hNode = remainingNodes.shift()!;
        assignments.push({
          slotId: "heading",
          contentNodeIds: [hNode.id],
          sourceSpanIds: getNodeContentSpans(hNode),
        });
      }

      // Intro
      if (
        remainingNodes.length > 0 &&
        (remainingNodes[0].type === "paragraph" ||
          remainingNodes[0].type === "callout")
      ) {
        const introNode = remainingNodes.shift()!;
        assignments.push({
          slotId: "intro",
          contentNodeIds: [introNode.id],
          sourceSpanIds: getNodeContentSpans(introNode),
        });
      }

      // Assign stats & descriptions
      const targetCount = layoutId === "four-stat" ? 4 : 3;
      let statIndex = 0;
      while (remainingNodes.length > 0 && statIndex < targetCount) {
        if (remainingNodes[0].type !== "statistic") break;
        const statNode = remainingNodes.shift()!;
        statIndex++;
        assignments.push({
          slotId: `stat${statIndex}-value`,
          contentNodeIds: [statNode.id],
          sourceSpanIds: getNodeContentSpans(statNode),
        });

        const nextNode = remainingNodes[0] as ContentNode | undefined;
        if (
          nextNode &&
          (nextNode.type === "paragraph" || nextNode.type === "caption")
        ) {
          const descNode = remainingNodes.shift()!;
          assignments.push({
            slotId: `stat${statIndex}-desc`,
            contentNodeIds: [descNode.id],
            sourceSpanIds: getNodeContentSpans(descNode),
          });
        }
      }

      pages.push({
        id: `page-${pageOrder}`,
        order: pageOrder++,
        role: "stats",
        layoutId: layout.id,
        assignments,
        continuationOfPrevious: !assignments.some(
          (assignment) => assignment.slotId === "heading",
        ),
        rationale: `${targetCount}-stat editorial metrics grid.`,
      });
      continue;
    }

    // Case 3: Quote Feature Section
    if (
      hasQuoteAhead &&
      ["quote", "heading", "subheading"].includes(remainingNodes[0].type) &&
      layoutsById.has("quote-feature")
    ) {
      const layout = layoutsById.get("quote-feature")!;
      const assignments: SlotAssignment[] = [];

      // Leading kicker/heading if present
      if (
        remainingNodes[0].type === "heading" ||
        remainingNodes[0].type === "subheading"
      ) {
        const hNode = remainingNodes.shift()!;
        assignments.push({
          slotId: "kicker",
          contentNodeIds: [hNode.id],
          sourceSpanIds: getNodeContentSpans(hNode),
        });
      }

      // Quote node
      if (remainingNodes.length > 0 && remainingNodes[0].type === "quote") {
        const qNode = remainingNodes.shift()!;
        assignments.push({
          slotId: "quote",
          contentNodeIds: [qNode.id],
          sourceSpanIds: getNodeContentSpans(qNode),
        });
      }

      // Attribution
      if (
        remainingNodes.length > 0 &&
        (remainingNodes[0].type === "caption" ||
          remainingNodes[0].type === "metadata")
      ) {
        const aNode = remainingNodes.shift()!;
        assignments.push({
          slotId: "attribution",
          contentNodeIds: [aNode.id],
          sourceSpanIds: getNodeContentSpans(aNode),
        });
      }

      // Supporting body
      if (remainingNodes.length > 0 && remainingNodes[0].type === "paragraph") {
        const supNode = remainingNodes.shift()!;
        assignments.push({
          slotId: "supporting-body",
          contentNodeIds: [supNode.id],
          sourceSpanIds: getNodeContentSpans(supNode),
        });
      }

      pages.push({
        id: `page-${pageOrder}`,
        order: pageOrder++,
        role: "quote",
        layoutId: layout.id,
        assignments,
        rationale: "Editorial pull quote feature.",
      });
      continue;
    }

    // Case 4: Closing Section
    if (isClosingAhead && layoutsById.has("closing")) {
      const layout = layoutsById.get("closing")!;
      const assignments: SlotAssignment[] = [];

      if (remainingNodes[0].type === "heading") {
        const hNode = remainingNodes.shift()!;
        assignments.push({
          slotId: "heading",
          contentNodeIds: [hNode.id],
          sourceSpanIds: getNodeContentSpans(hNode),
        });
      }

      while (remainingNodes.length > 0) {
        const node = remainingNodes.shift()!;
        let slotId = "conclusion";
        if (node.type === "cta") {
          slotId = "next-steps";
        } else if (node.type === "metadata" || node.type === "caption") {
          slotId = "sign-off";
        }

        assignments.push({
          slotId,
          contentNodeIds: [node.id],
          sourceSpanIds: getNodeContentSpans(node),
        });
      }

      pages.push({
        id: `page-${pageOrder}`,
        order: pageOrder++,
        role: "closing",
        layoutId: layout.id,
        assignments,
        rationale: "Strategic conclusions and call to action.",
      });
      continue;
    }

    // Case 5: Standard Content Page (Text Dominant Article)
    const layout = layoutsById.get("heading-body") || family.layouts[0];
    const assignments: SlotAssignment[] = [];

    // Heading
    if (
      remainingNodes[0].type === "heading" ||
      remainingNodes[0].type === "subheading"
    ) {
      const hNode = remainingNodes.shift()!;
      assignments.push({
        slotId: "heading",
        contentNodeIds: [hNode.id],
        sourceSpanIds: getNodeContentSpans(hNode),
      });
    }

    // Collect up to 3 body paragraphs
    const bodyNodes: ContentNode[] = [];
    while (
      remainingNodes.length > 0 &&
      remainingNodes[0].type !== "heading" &&
      remainingNodes[0].type !== "table" &&
      remainingNodes[0].type !== "table_row" &&
      remainingNodes[0].type !== "quote" &&
      remainingNodes[0].type !== "statistic" &&
      remainingNodes[0].type !== "cta" &&
      bodyNodes.length < 3
    ) {
      bodyNodes.push(remainingNodes.shift()!);
    }

    if (bodyNodes.length > 0) {
      assignments.push({
        slotId: "body",
        contentNodeIds: bodyNodes.map((n) => n.id),
        sourceSpanIds: bodyNodes.flatMap(getNodeContentSpans),
      });
    }

    pages.push({
      id: `page-${pageOrder}`,
      order: pageOrder++,
      role: "content",
      layoutId: layout.id,
      assignments,
      continuationOfPrevious: !assignments.some(
        (assignment) => assignment.slotId === "heading",
      ),
      rationale: "Structured article page with clear typography.",
    });
  }

  return {
    version: "1.0",
    id: `plan-${graph.id}-${Date.now()}`,
    contentGraphId: graph.id,
    templateFamilyId: family.id,
    pages,
    metadata: {
      artDirectorModel: "forma-art-director-deterministic-v1",
      plannedAt: new Date().toISOString(),
      estimatedPageCount: pages.length,
    },
  };
}
