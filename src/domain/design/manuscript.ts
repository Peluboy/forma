import {
  fieldIds,
  labels,
  isManagedBlockLayerId,
  layerIdForBlock,
  type ContentBlock,
  type Copy,
  type FieldId,
  type Project,
} from "./schema.js";
import {
  createSourceSpans,
  sourceSpanIdsForText,
  stableTextHash,
} from "../content/sourceSpans.js";

function withSourceSpans(raw: string, blocks: ContentBlock[]): ContentBlock[] {
  const spans = createSourceSpans(raw, `source-${stableTextHash(raw)}`);
  return blocks.map((block) => {
    const ids = sourceSpanIdsForText(spans, block.text);
    return ids.length ? { ...block, sourceSpanIds: ids } : block;
  });
}

export const sampleManuscript = `Eyebrow: THE CREATIVE GATHERING · VOL. 04\n\nHeadline: Good things\ntake shape.\n\nBody copy: A little curiosity. A fresh perspective.\nAn evening for people who make things happen.\n\nDate & time: OCTOBER 24, 2026\n6:00 PM — 9:00 PM\n\nLocation: THE FOUNDRY\n120 West Kinzie, Chicago\n\nFooter: COME CURIOUS. LEAVE INSPIRED.`;
const emptyCopy = (): Copy => ({
  kicker: "",
  title: "",
  description: "",
  date: "",
  location: "",
  footer: "",
});
const aliases: Record<string, FieldId> = {
  eyebrow: "kicker",
  kicker: "kicker",
  headline: "title",
  title: "title",
  "body copy": "description",
  body: "description",
  description: "description",
  "date & time": "date",
  date: "date",
  location: "location",
  footer: "footer",
};
export function parseManuscriptBlocks(raw: string): ContentBlock[] {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const labeled = lines.some((line) => {
    const match = line.match(/^([^:]+):\s?(.*)$/);
    return Boolean(match && match[1].trim());
  });
  if (!labeled) {
    const paragraphs = raw
      .trim()
      .split(/\n\s*\n/)
      .filter(Boolean);
    if (!paragraphs.length) return [];
    const blocks: ContentBlock[] = [
      {
        id: "block-title",
        label: labels.title,
        text: paragraphs[0],
        fieldId: "title",
      },
    ];
    if (paragraphs.length > 1)
      blocks.push({
        id: "block-description",
        label: labels.description,
        text: paragraphs.slice(1).join("\n\n"),
        fieldId: "description",
      });
    return withSourceSpans(raw, blocks);
  }

  type Section = { label: string; fieldId?: FieldId; lines: string[] };
  const sections: Section[] = [];
  let preamble: string[] = [];
  let started = false;
  let active: Section | null = null;
  let previousBlank = true;

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s?(.*)$/);
    if (match && match[1].trim()) {
      const label = match[1].trim();
      const fieldId = aliases[label.toLowerCase()];
      // Known labels always start a section. Unknown labels only start a
      // section after a blank line so mid-copy lines like "Tickets: $25"
      // stay with the active field.
      if (fieldId || previousBlank || !active) {
        started = true;
        active = { label, fieldId, lines: [match[2]] };
        sections.push(active);
        previousBlank = false;
        continue;
      }
    }
    if (!line.trim()) {
      previousBlank = true;
      if (!started) preamble.push(line);
      else if (active) active.lines.push(line);
      continue;
    }
    previousBlank = false;
    if (!started) preamble.push(line);
    else if (active) active.lines.push(line);
  }

  const blocks: ContentBlock[] = [];
  const preambleText = preamble.join("\n").trim();
  if (preambleText)
    blocks.push({
      id: "block-description",
      label: labels.description,
      text: preambleText,
      fieldId: "description",
    });

  const fieldSeen = new Set<FieldId>();
  let extra = 0;
  for (const section of sections) {
    const text = section.lines.join("\n").trim();
    if (section.fieldId) {
      const existing = blocks.find((b) => b.fieldId === section.fieldId);
      if (existing) {
        existing.text = existing.text ? `${existing.text}\n${text}` : text;
      } else {
        blocks.push({
          id: `block-${section.fieldId}`,
          label: labels[section.fieldId],
          text,
          fieldId: section.fieldId,
        });
        fieldSeen.add(section.fieldId);
      }
    } else {
      blocks.push({
        id: `block-extra-${extra++}`,
        label: section.label,
        text,
      });
    }
  }
  void fieldSeen;
  return withSourceSpans(
    raw,
    blocks.filter((b) => b.text.length > 0),
  );
}

export function blocksToCopy(blocks: ContentBlock[]): Copy {
  const copy = emptyCopy();
  for (const block of blocks) {
    if (!block.fieldId) continue;
    copy[block.fieldId] = copy[block.fieldId]
      ? `${copy[block.fieldId]}\n${block.text}`
      : block.text;
  }
  fieldIds.forEach((id) => (copy[id] = copy[id].trim()));
  return copy;
}

export function parseManuscript(raw: string): Copy {
  return blocksToCopy(parseManuscriptBlocks(raw));
}

export function serializeCopy(copy: Copy): string {
  return fieldIds
    .filter((id) => copy[id])
    .map((id) => `${labels[id]}: ${copy[id]}`)
    .join("\n\n");
}

export function serializeBlocks(blocks: ContentBlock[]): string {
  return blocks
    .filter((b) => b.text.trim())
    .map((b) => `${b.label}: ${b.text}`)
    .join("\n\n");
}

/** Wording for one of the six standard manuscript fields, if present. */
export function fieldText(manuscript: string, fieldId: FieldId): string {
  return (
    parseManuscriptBlocks(manuscript).find((block) => block.fieldId === fieldId)
      ?.text ?? ""
  );
}

/**
 * Replace one standard field's wording while preserving every other block,
 * including custom sections. Returns the serialized manuscript so the
 * structured fields and the raw text view stay in sync.
 */
export function setFieldText(
  manuscript: string,
  fieldId: FieldId,
  text: string,
): string {
  const blocks = parseManuscriptBlocks(manuscript);
  const index = blocks.findIndex((block) => block.fieldId === fieldId);
  const cleaned = text.replace(/[ \t]+$/gm, "").replace(/\n+$/g, "");
  if (index === -1) {
    if (!cleaned) return serializeBlocks(blocks);
    blocks.push({
      id: `block-${fieldId}`,
      label: labels[fieldId],
      fieldId,
      text: cleaned,
    });
    return serializeBlocks(blocks);
  }
  if (!cleaned) blocks.splice(index, 1);
  else blocks[index] = { ...blocks[index], text: cleaned };
  return serializeBlocks(blocks);
}

/** Keep the manuscript and its mapped canvas wording together after an explicit edit. */
export function editCanvasText(
  project: Project,
  id: FieldId | string,
  text: string,
): Partial<Project> {
  const blocks =
    project.contentBlocks || parseManuscriptBlocks(project.manuscript);
  if (fieldIds.includes(id as FieldId)) {
    const fieldId = id as FieldId;
    const next = blocks.some((block) => block.fieldId === fieldId)
      ? blocks.map((block) =>
          block.fieldId === fieldId ? { ...block, text } : block,
        )
      : [...blocks, { id: fieldId, label: labels[fieldId], fieldId, text }];
    return {
      copy: { ...project.copy, [fieldId]: text },
      contentBlocks: next,
      manuscript: serializeBlocks(next),
    };
  }
  const layer = project.textLayers?.find((item) => item.id === id);
  if (!layer) return {};
  const block = blocks.find((item) => layerIdForBlock(item.id) === id);
  if (block) {
    const next = blocks.map((item) =>
      item.id === block.id ? { ...item, text } : item,
    );
    return {
      textLayers: project.textLayers?.map((item) =>
        item.id === id ? { ...item, text } : item,
      ),
      contentBlocks: next,
      manuscript: serializeBlocks(next),
    };
  }
  return {
    textLayers: project.textLayers?.map((item) =>
      item.id === id ? { ...item, text } : item,
    ),
  };
}

export function changedBlocks(
  previous: ContentBlock[],
  next: ContentBlock[],
): ContentBlock[] {
  const before = new Map(previous.map((b) => [b.id, b]));
  const after = new Map(next.map((b) => [b.id, b]));
  const ids = new Set([...before.keys(), ...after.keys()]);
  return [...ids]
    .filter(
      (id) => (before.get(id)?.text || "") !== (after.get(id)?.text || ""),
    )
    .map(
      (id) =>
        after.get(id) || {
          id,
          label: before.get(id)!.label,
          text: "",
          fieldId: before.get(id)!.fieldId,
        },
    );
}

/** Apply manuscript blocks: six fields update copy; free blocks bind to managed text layers. */
export function applyContentBlocks(
  project: Project,
  blocks: ContentBlock[],
  manuscript: string,
): Partial<Project> {
  const copy = blocksToCopy(blocks);
  const free = blocks.filter((b) => !b.fieldId);
  const kept = (project.textLayers || []).filter(
    (l) => !isManagedBlockLayerId(l.id),
  );
  if (kept.length + free.length > 50)
    throw new Error(
      "Too many text layers to apply every manuscript section. Remove some layers or shorten the manuscript.",
    );
  const managed = free.map((block, index) => {
    const id = layerIdForBlock(block.id);
    const previous = project.textLayers?.find((l) => l.id === id);
    return {
      id,
      text: block.text,
      layout: previous?.layout || {
        x: 56,
        y: Math.min(780, 180 + index * 96),
        width: 600,
        height: 80,
        size: 18,
        locked: false,
        color: "#252920",
        fontFamily: "Arial" as const,
      },
    };
  });
  const textLayers = [...kept, ...managed];
  const managedIds = managed.map((l) => l.id);
  const order = [
    ...(project.layerOrder || []).filter(
      (id) =>
        textLayers.some((l) => l.id === id) ||
        project.graphicLayers?.some((g) => g.id === id),
    ),
    ...managedIds.filter((id) => !project.layerOrder?.includes(id)),
  ];
  return {
    copy,
    manuscript,
    contentBlocks: blocks,
    textLayers: textLayers.length ? textLayers : undefined,
    layerOrder: order.length ? order : undefined,
  };
}
