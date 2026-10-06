import type { SourceSpan } from "./types.js";

export function stableTextHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** Source offsets are UTF-16 string offsets. IDs survive unrelated insertions when sourceId is retained. */
export function createSourceSpans(
  sourceText: string,
  sourceId: string,
): SourceSpan[] {
  const spans: SourceSpan[] = [];
  const counts = new Map<string, number>();
  const add = (
    start: number,
    end: number,
    role: SourceSpan["role"],
    ignoredReason?: string,
  ) => {
    if (end <= start) return;
    const text = sourceText.slice(start, end);
    const key = `${role}:${stableTextHash(text)}`;
    const occurrence = counts.get(key) || 0;
    counts.set(key, occurrence + 1);
    spans.push({
      id: `${sourceId}:span:${key}:${occurrence}`,
      start,
      end,
      text,
      role,
      ignoredReason,
    });
  };
  const syntax = (start: number, end: number) =>
    add(start, end, "syntax", "manuscript formatting");
  let offset = 0;
  while (offset < sourceText.length) {
    const newline = sourceText.indexOf("\n", offset);
    const end = newline === -1 ? sourceText.length : newline;
    const rawLine = sourceText.slice(offset, end);
    const table = rawLine.trim().startsWith("|");
    if (table) {
      let cursor = 0;
      const pipes = [...rawLine.matchAll(/\|/g)].map((match) => match.index);
      if (pipes.length >= 2) {
        for (let i = 0; i < pipes.length - 1; i++) {
          const from = pipes[i] + 1;
          const to = pipes[i + 1];
          if (cursor < from) syntax(offset + cursor, offset + from);
          const cell = rawLine.slice(from, to);
          const leading = cell.length - cell.trimStart().length;
          const trailing = cell.length - cell.trimEnd().length;
          syntax(offset + from, offset + from + leading);
          const cellStart = from + leading;
          const cellEnd = to - trailing;
          if (/^:?-{3,}:?$/.test(cell.trim()))
            syntax(offset + cellStart, offset + cellEnd);
          else add(offset + cellStart, offset + cellEnd, "content");
          syntax(offset + cellEnd, offset + to);
          cursor = to;
        }
        if (cursor < rawLine.length) syntax(offset + cursor, end);
      } else add(offset, end, "content");
    } else if (!rawLine.trim()) {
      syntax(offset, end);
    } else {
      // A time such as 6:00 must remain copy, not become a manuscript label.
      const label = rawLine.match(/^([A-Za-z][^:]{0,60}):(?:[ \t]+|$)/);
      const markdownHeading = rawLine.match(/^(#{1,6})[ \t]+/);
      const listMarker = rawLine.match(/^([ \t]*(?:[-*+]\s+|\d+[.)]\s+))/);
      const prefix =
        label?.[0] || markdownHeading?.[0] || listMarker?.[0] || "";
      if (prefix) syntax(offset, offset + prefix.length);
      const remainder = rawLine.slice(prefix.length);
      const leading = remainder.length - remainder.trimStart().length;
      const trailing = remainder.length - remainder.trimEnd().length;
      syntax(offset + prefix.length, offset + prefix.length + leading);
      add(offset + prefix.length + leading, end - trailing, "content");
      syntax(end - trailing, end);
    }
    if (newline !== -1) syntax(end, end + 1);
    offset = end + (newline === -1 ? 0 : 1);
  }
  return spans;
}

/** Best-effort provenance for existing parser blocks; absence is explicit and safe for legacy data. */
export function sourceSpanIdsForText(
  spans: SourceSpan[],
  text: string,
): string[] {
  const wanted = text
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean);
  const ids: string[] = [];
  let cursor = 0;
  for (const part of wanted) {
    const index = spans.findIndex(
      (span, i) => i >= cursor && span.role === "content" && span.text === part,
    );
    if (index === -1) return [];
    ids.push(spans[index].id);
    cursor = index + 1;
  }
  return ids;
}
