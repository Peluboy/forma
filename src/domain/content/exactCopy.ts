import type { ContentGraph } from "./types.js";

export type VisibleCopyFragment = {
  pageId: string;
  elementId: string;
  text: string;
  sourceSpanIds: string[];
};

export type ExactCopyIssue = {
  type:
    | "missing_source_span"
    | "duplicated_source_span"
    | "altered_copy"
    | "untracked_text"
    | "reordered_source_span"
    | "conflicting_copy";
  sourceSpanId?: string;
  expected?: string;
  actual?: string;
  pageId?: string;
  elementId?: string;
  message: string;
};

export type ExactCopyResult = { valid: boolean; issues: ExactCopyIssue[] };

/** Normalize layout-only whitespace, while retaining every letter, symbol, digit, and case. */
export function normalizeForStructuralComparison(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\s\u00a0]+/g, " ")
    .trim();
}

export function compareSourceCoverage(
  graph: ContentGraph,
  visible: VisibleCopyFragment[],
): ExactCopyResult {
  const issues: ExactCopyIssue[] = [];
  const required = graph.spans.filter((span) => span.role === "content");
  const byId = new Map(required.map((span) => [span.id, span]));
  const positions = new Map(required.map((span, index) => [span.id, index]));
  const appearances = new Map<string, VisibleCopyFragment[]>();
  let lastPosition = -1;
  for (const fragment of visible) {
    const tracked = fragment.sourceSpanIds.filter((id) => byId.has(id));
    if (!tracked.length && fragment.text.trim()) {
      issues.push({
        type: "untracked_text",
        pageId: fragment.pageId,
        elementId: fragment.elementId,
        actual: fragment.text,
        message: "Visible text has no required manuscript source span.",
      });
      continue;
    }
    if (fragment.sourceSpanIds.some((id) => !byId.has(id))) {
      issues.push({
        type: "conflicting_copy",
        pageId: fragment.pageId,
        elementId: fragment.elementId,
        actual: fragment.text,
        message: "Text refers to a missing or non-copy source span.",
      });
    }
    for (const id of tracked) {
      const seen = appearances.get(id) || [];
      seen.push(fragment);
      appearances.set(id, seen);
      const position = positions.get(id)!;
      if (position < lastPosition)
        issues.push({
          type: "reordered_source_span",
          sourceSpanId: id,
          pageId: fragment.pageId,
          elementId: fragment.elementId,
          message: "Copy appears out of manuscript order.",
        });
      lastPosition = position;
    }
    const expected = tracked.map((id) => byId.get(id)!.text).join(" ");
    if (
      normalizeForStructuralComparison(expected) !==
      normalizeForStructuralComparison(fragment.text)
    ) {
      issues.push({
        type: "altered_copy",
        sourceSpanId: tracked[0],
        expected,
        actual: fragment.text,
        pageId: fragment.pageId,
        elementId: fragment.elementId,
        message: "Visible copy differs from its approved source span.",
      });
    }
  }
  for (const span of required) {
    const refs = appearances.get(span.id) || [];
    if (!refs.length)
      issues.push({
        type: "missing_source_span",
        sourceSpanId: span.id,
        expected: span.text,
        message: "Approved copy is missing from the design.",
      });
    if (refs.length > 1)
      issues.push({
        type: "duplicated_source_span",
        sourceSpanId: span.id,
        expected: span.text,
        pageId: refs[1].pageId,
        elementId: refs[1].elementId,
        message: "Approved copy appears more than once.",
      });
  }
  return { valid: issues.length === 0, issues };
}

export const validateExactCopy = compareSourceCoverage;
