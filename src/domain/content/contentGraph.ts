import { parseManuscriptBlocks } from "../design/manuscript.js";
import { createSourceSpans, stableTextHash } from "./sourceSpans.js";
import type {
  ContentGraph,
  ContentNode,
  ContentNodeType,
  ContentValidationResult,
  CopyPolicy,
} from "./types.js";

export function contentGraphFromManuscript(
  sourceText: string,
  options: { sourceId?: string; copyPolicy?: CopyPolicy } = {},
): ContentGraph {
  const sourceId = options.sourceId || `source-${stableTextHash(sourceText)}`;
  const spans = createSourceSpans(sourceText, sourceId);
  // Existing deterministic parser remains the source of known graphics-field semantics.
  const legacy = parseManuscriptBlocks(sourceText);
  const bySpan = new Map(
    legacy.flatMap((block) =>
      (block.sourceSpanIds || []).map((id) => [id, block] as const),
    ),
  );
  const nodes: ContentNode[] = [];
  let currentTable: ContentNode | null = null;
  let lineStart = 0;
  let nodeIndex = 0;
  const lines = sourceText.split("\n");
  for (const line of lines) {
    const lineEnd = lineStart + line.length;
    const lineSpans = spans.filter(
      (span) => span.start >= lineStart && span.end <= lineEnd,
    );
    const newline = spans.find(
      (span) => span.start === lineEnd && span.text === "\n",
    );
    if (newline) lineSpans.push(newline);
    const content = lineSpans.filter((span) => span.role === "content");
    const trim = line.trim();
    const separator = /^\|[\s|:-]+\|$/.test(trim);
    let type: ContentNodeType = "unknown";
    if (/^\|/.test(trim)) type = "table_row";
    else if (
      /^(?:#{1,6}\s+|(?:title|headline|heading|h1|chapter):)/i.test(trim)
    )
      type = "heading";
    else if (/^(?:subheading|subtitle|h2):/i.test(trim)) type = "subheading";
    else if (/^[\s]*[-*+]\s+|^[\s]*\d+[.)]\s+/.test(line)) type = "list_item";
    else if (/^(?:quote):|^>\s*/i.test(trim)) type = "quote";
    else if (/^(?:statistic|stat):/i.test(trim)) type = "statistic";
    else if (/^(?:cta|call to action):/i.test(trim)) type = "cta";
    else if (/^(?:caption):/i.test(trim)) type = "caption";
    else if (/^(?:date|location|footer|metadata|author):/i.test(trim))
      type = "metadata";
    else if (/^(?:callout|note):/i.test(trim)) type = "callout";
    else if (trim) type = "paragraph";
    const node: ContentNode = {
      id: `${sourceId}:node:${nodeIndex++}`,
      type,
      sourceSpanIds: lineSpans.map((span) => span.id),
      metadata: {
        ...(content[0] && bySpan.get(content[0].id)?.fieldId
          ? { fieldId: bySpan.get(content[0].id)!.fieldId }
          : {}),
        ...(separator ? { tableSeparator: true } : {}),
      },
    };
    if (type === "table_row") {
      node.children = content.map((span, cellIndex) => ({
        id: `${node.id}:cell:${cellIndex}`,
        type: "table_cell",
        sourceSpanIds: [span.id],
        metadata: { column: cellIndex },
      }));
      if (!currentTable) {
        currentTable = {
          id: `${sourceId}:table:${nodeIndex}`,
          type: "table",
          sourceSpanIds: [],
          children: [],
          metadata: { extractionConfidence: "low" },
        };
        nodes.push(currentTable);
      }
      currentTable.children!.push(node);
    } else {
      currentTable = null;
      nodes.push(node);
    }
    lineStart = lineEnd + 1;
  }
  return {
    version: "1.0",
    id: `${sourceId}:graph:v1`,
    sourceId,
    sourceText,
    copyPolicy: options.copyPolicy || "exact",
    spans,
    nodes,
  };
}

export function validateContentGraphCoverage(
  graph: ContentGraph,
): ContentValidationResult {
  const issues: ContentValidationResult["issues"] = [];
  const ids = new Set<string>();
  const references = new Set<string>();
  let offset = 0;
  for (const span of graph.spans) {
    if (ids.has(span.id))
      issues.push({
        type: "duplicate_id",
        spanId: span.id,
        message: "Duplicate span ID.",
      });
    ids.add(span.id);
    if (span.start > offset)
      issues.push({
        type: "gap",
        spanId: span.id,
        message: "Unspanned source text.",
      });
    if (span.start < offset)
      issues.push({
        type: "overlap",
        spanId: span.id,
        message: "Overlapping spans.",
      });
    if (graph.sourceText.slice(span.start, span.end) !== span.text)
      issues.push({
        type: "altered_span",
        spanId: span.id,
        message: "Span differs from raw source.",
      });
    offset = span.end;
  }
  if (offset !== graph.sourceText.length)
    issues.push({ type: "gap", message: "Source ends after the last span." });
  const visit = (node: ContentNode) => {
    for (const id of node.sourceSpanIds) {
      references.add(id);
      if (!ids.has(id))
        issues.push({
          type: "unknown_span",
          nodeId: node.id,
          spanId: id,
          message: "Unknown span reference.",
        });
    }
    node.children?.forEach(visit);
  };
  graph.nodes.forEach(visit);
  for (const span of graph.spans)
    if (!references.has(span.id))
      issues.push({
        type: "unrepresented_span",
        spanId: span.id,
        message: "Source span has no semantic node.",
      });
  return { valid: issues.length === 0, issues };
}
