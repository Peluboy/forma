import { computeLineWraps, measureStringWidth } from "../layout-fit/measure.js";
import type {
  TemplateElementDefinition,
  TemplateFamily,
  TemplateLayout,
  TemplateSlot,
} from "../template-family/types.js";
import type {
  LayoutCapacityReport,
  SlotCapacityEstimate,
  TemplateCapacityReport,
  TemplateWarning,
} from "./types.js";

/**
 * Capacity testing (Part F).
 *
 * Templates must not only validate structurally — they must be tested with
 * content. We measure how much text actually fits in each bound element using
 * the deterministic fit engine metrics, then record safe limits, overflow
 * behaviour, and continuation behaviour. Measurements never mutate the family
 * on their own; suggestions are applied explicitly (and recorded).
 */

const SAMPLE_WORD = "manuscript ";

function syntheticText(characters: number): string {
  const repeated = SAMPLE_WORD.repeat(Math.ceil(characters / 11) + 1);
  return repeated.slice(0, characters).trim();
}

function linesAvailable(element: TemplateElementDefinition): {
  fontSize: number;
  lineHeight: number;
  linePx: number;
  linesFit: number;
} {
  const fontSize = element.textStyle?.fontSize ?? 11;
  const lineHeight = element.textStyle?.lineHeight ?? 1.5;
  const linePx = fontSize * lineHeight;
  const linesFit = Math.max(1, Math.floor((element.height + 2) / linePx));
  return { fontSize, lineHeight, linePx, linesFit };
}

function measuredCharacters(
  element: TemplateElementDefinition,
  fontFamily: string,
): number {
  const { fontSize, linesFit } = linesAvailable(element);
  const width = element.width;
  if (width <= 0) return 0;
  let low = 1;
  let high = Math.max(64, Math.ceil((width / (fontSize * 0.5)) * linesFit * 2));
  let best = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const text = syntheticText(mid);
    const lines = computeLineWraps(text, width, fontFamily, fontSize);
    if (lines.length <= linesFit) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}

function boundElement(
  layout: TemplateLayout,
  slot: TemplateSlot,
): TemplateElementDefinition | undefined {
  return layout.baseElements.find((el) => el.slotId === slot.id);
}

function estimateSlot(
  layout: TemplateLayout,
  slot: TemplateSlot,
  family: TemplateFamily,
  hasContinuation: boolean,
): SlotCapacityEstimate {
  const warnings: TemplateWarning[] = [];
  const element = boundElement(layout, slot);
  const declared = slot.maxCharacters;

  if (!element) {
    warnings.push({
      code: "slot_has_no_element",
      message: `Slot '${slot.id}' in layout '${layout.id}' is not bound to an element.`,
      severity: "warning",
      layoutId: layout.id,
    });
    return {
      slotId: slot.id,
      role: slot.role,
      ...(declared !== undefined ? { declaredMaxCharacters: declared } : {}),
      measuredMaxCharacters: declared ?? 0,
      recommendedCharacters: declared ?? 0,
      sampleLengths: { short: 0, normal: 0, long: 0, edge: 0 },
      overflowBehavior: "unknown",
      continuationBehavior: hasContinuation ? "extends" : "none",
      warnings,
    };
  }

  if (element.type !== "text") {
    // Non-text slots (table/chart/image) are measured by item density below.
    return {
      slotId: slot.id,
      role: slot.role,
      ...(declared !== undefined ? { declaredMaxCharacters: declared } : {}),
      measuredMaxCharacters: declared ?? 0,
      recommendedCharacters: declared ?? 0,
      sampleLengths: {
        short: Math.round((declared ?? 40) * 0.25),
        normal: Math.round((declared ?? 40) * 0.6),
        long: declared ?? 80,
        edge: Math.round((declared ?? 40) * 1.4),
      },
      overflowBehavior: "fits",
      continuationBehavior: hasContinuation ? "extends" : "none",
      warnings,
    };
  }

  const fontFamily =
    element.textStyle?.fontFamily ||
    family.designTokens.typography.body?.fontFamily ||
    "Inter";
  const measured = Math.max(1, measuredCharacters(element, fontFamily));
  const canScale =
    (element.constraints?.allowResize ?? false) ||
    (element.constraints?.allowReflow ?? false) ||
    (element.constraints?.minFontSize ?? Infinity) <
      (element.textStyle?.fontSize ?? 0);

  let overflowBehavior: SlotCapacityEstimate["overflowBehavior"];
  if (declared === undefined) overflowBehavior = "fits";
  else if (measured >= declared) overflowBehavior = "fits";
  else if (canScale) overflowBehavior = "shrinks";
  else overflowBehavior = "overflow";

  if (declared !== undefined && declared > measured)
    warnings.push({
      code: "declared_capacity_exceeds_measured",
      message: `Slot '${slot.id}' declares maxCharacters ${declared} but only ~${measured} fit in the bound element.`,
      severity: "warning",
      layoutId: layout.id,
    });

  const recommended = Math.max(
    1,
    Math.min(declared ?? Number.MAX_SAFE_INTEGER, Math.round(measured * 0.9)),
  );

  return {
    slotId: slot.id,
    role: slot.role,
    ...(declared !== undefined ? { declaredMaxCharacters: declared } : {}),
    measuredMaxCharacters: measured,
    recommendedCharacters: recommended,
    sampleLengths: {
      short: Math.max(1, Math.round(measured * 0.25)),
      normal: Math.max(1, Math.round(measured * 0.6)),
      long: declared ?? measured,
      edge: Math.round(measured * 1.25),
    },
    overflowBehavior,
    continuationBehavior: hasContinuation ? "extends" : "none",
    warnings,
  };
}

function tableRows(element: TemplateElementDefinition): number {
  const fontSize = element.textStyle?.fontSize ?? 10;
  const rowPx = Math.max(18, fontSize * 1.6 + 10);
  return Math.max(1, Math.floor(element.height / rowPx));
}

function measureLayout(
  layout: TemplateLayout,
  family: TemplateFamily,
  hasContinuation: boolean,
): LayoutCapacityReport {
  const warnings: TemplateWarning[] = [];
  const slots = layout.slots.map((slot) =>
    estimateSlot(layout, slot, family, hasContinuation),
  );
  for (const slot of slots) warnings.push(...slot.warnings);

  const tableElement = layout.baseElements.find((el) => el.type === "table");
  const maxTableRows = tableElement
    ? tableRows(tableElement)
    : layout.role === "table"
      ? 0
      : undefined;

  const maxStatItems = layout.slots.filter(
    (slot) => slot.role === "stat_value",
  ).length;

  const declaredTotal = layout.slots.reduce(
    (sum, slot) => sum + (slot.maxCharacters ?? 0),
    0,
  );
  const recommendedDensity: LayoutCapacityReport["recommendedDensity"] =
    declaredTotal > 2200
      ? "dense"
      : declaredTotal > 900
        ? "balanced"
        : "sparse";

  const hasOverflow = slots.some(
    (slot) => slot.overflowBehavior === "overflow",
  );
  const hasShrink = slots.some((slot) => slot.overflowBehavior === "shrinks");
  const fitStatus: LayoutCapacityReport["fitStatus"] = hasOverflow
    ? "overflow"
    : hasShrink
      ? "tight"
      : "fits";

  if (fitStatus === "overflow")
    warnings.push({
      code: "layout_capacity_overflow",
      message: `Layout '${layout.id}' has slots that can overflow with declared limits.`,
      severity: "warning",
      layoutId: layout.id,
    });

  return {
    layoutId: layout.id,
    name: layout.name,
    role: layout.role,
    slots,
    ...(maxTableRows !== undefined ? { maxTableRows } : {}),
    ...(maxStatItems > 0 ? { maxStatItems } : {}),
    recommendedDensity,
    fitStatus,
    warnings,
  };
}

export function runTemplateCapacityTests(
  family: TemplateFamily,
): TemplateCapacityReport {
  const hasContinuation = family.layouts.some(
    (layout) => layout.id.includes("continuation") || layout.role === "content",
  );
  const layouts = family.layouts.map((layout) =>
    measureLayout(layout, family, hasContinuation),
  );

  const suggestedSlotMaxCharacters: Record<string, Record<string, number>> = {};
  for (const layout of layouts) {
    const perSlot: Record<string, number> = {};
    for (const slot of layout.slots) {
      const declared = slot.declaredMaxCharacters;
      if (declared === undefined || declared > slot.recommendedCharacters)
        perSlot[slot.slotId] = slot.recommendedCharacters;
    }
    if (Object.keys(perSlot).length)
      suggestedSlotMaxCharacters[layout.layoutId] = perSlot;
  }

  const warnings = layouts.flatMap((layout) => layout.warnings);
  return {
    templateId: family.id,
    layouts,
    warnings,
    suggestedSlotMaxCharacters,
  };
}

export interface CapacityChange {
  layoutId: string;
  slotId: string;
  from: number | undefined;
  to: number;
}

/**
 * Applies safe capacity suggestions (tightening only) and reports every change.
 * Callers must persist the changelog so approved templates are never silently
 * modified.
 */
export function applyCapacitySuggestions(
  family: TemplateFamily,
  report: TemplateCapacityReport,
): { family: TemplateFamily; changes: CapacityChange[] } {
  const changes: CapacityChange[] = [];
  const layouts = family.layouts.map((layout) => {
    const slotSuggestions = report.suggestedSlotMaxCharacters[layout.id];
    if (!slotSuggestions) return layout;
    const slots = layout.slots.map((slot) => {
      const suggestion = slotSuggestions[slot.id];
      if (suggestion === undefined) return slot;
      const current = slot.maxCharacters;
      // Never raise a declared limit; only tighten an over-generous one.
      if (current !== undefined && current <= suggestion) return slot;
      changes.push({
        layoutId: layout.id,
        slotId: slot.id,
        from: current,
        to: suggestion,
      });
      return { ...slot, maxCharacters: suggestion };
    });
    return { ...layout, slots };
  });
  return {
    family: { ...family, layouts },
    changes,
  };
}

export { measureStringWidth };
