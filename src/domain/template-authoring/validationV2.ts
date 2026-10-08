import type { ContentNodeType } from "../content/types.js";
import { fontFamilies } from "../design/fonts.js";
import type {
  TemplateFamily,
  TemplateLayout,
  TemplateSlotRole,
} from "../template-family/types.js";
import type {
  TemplateValidationIssue,
  TemplateValidationStatus,
  TemplateValidationV2Result,
  TemplateWarning,
} from "./types.js";

const VALID_CONTENT_TYPES: Set<ContentNodeType> = new Set([
  "document",
  "section",
  "heading",
  "subheading",
  "paragraph",
  "list",
  "list_item",
  "quote",
  "statistic",
  "table",
  "table_row",
  "table_cell",
  "caption",
  "callout",
  "cta",
  "metadata",
  "unknown",
]);

const VALID_LAYOUT_ROLES = new Set<TemplateLayout["role"]>([
  "cover",
  "intro",
  "section",
  "content",
  "stats",
  "quote",
  "table",
  "chart",
  "closing",
  "custom",
]);

const VALID_SLOT_ROLES = new Set<TemplateSlotRole>([
  "kicker",
  "heading",
  "subheading",
  "body",
  "caption",
  "quote",
  "attribution",
  "stat_value",
  "stat_label",
  "stat_description",
  "table",
  "chart",
  "image",
  "custom",
]);

const HEX_OR_NAMED = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|transparent)$/i;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roleSet(layout: TemplateLayout): Set<string> {
  const roles = new Set<string>();
  for (const slot of layout.slots) if (slot.role) roles.add(slot.role);
  return roles;
}

function acceptsSet(layout: TemplateLayout): Set<string> {
  const types = new Set<string>();
  for (const slot of layout.slots)
    for (const type of slot.accepts) types.add(type);
  return types;
}

/** Checks whether a layout can be mapped from another layout's content. */
function alternativesCompatible(
  from: TemplateLayout,
  to: TemplateLayout,
): boolean {
  if (from.role === to.role) return true;
  const toAccept = acceptsSet(to);
  const fromAccept = acceptsSet(from);
  // Compatible when they share enough accepted content types to remap.
  let shared = 0;
  for (const type of fromAccept) if (toAccept.has(type)) shared++;
  // Heading presence and at least one body/table/quote carrier.
  const rolesA = roleSet(from);
  const rolesB = roleSet(to);
  const carriesContent = (roles: Set<string>) =>
    roles.has("body") ||
    roles.has("table") ||
    roles.has("quote") ||
    roles.has("chart");
  return (
    shared >= 2 &&
    rolesA.has("heading") === rolesB.has("heading") &&
    carriesContent(rolesA) &&
    carriesContent(rolesB)
  );
}

export function validateTemplateFamilyV2(
  family: TemplateFamily,
): TemplateValidationV2Result {
  const issues: TemplateValidationIssue[] = [];
  const add = (issue: TemplateValidationIssue) => issues.push(issue);

  if (!family || typeof family !== "object") {
    add({
      code: "invalid_family",
      severity: "error",
      message: "Template family is missing or not an object.",
    });
    return summarize(issues);
  }

  if (family.version !== "1.0")
    add({
      code: "invalid_version",
      severity: "error",
      message: `Unsupported TemplateFamily version '${String(family.version)}'.`,
    });
  if (!family.id || typeof family.id !== "string")
    add({
      code: "invalid_family",
      severity: "error",
      message: "Template family has no id.",
    });
  if (!family.name || typeof family.name !== "string")
    add({
      code: "invalid_family",
      severity: "error",
      message: "Template family has no name.",
    });
  if (!["graphic", "document", "presentation"].includes(family.family))
    add({
      code: "invalid_family",
      severity: "error",
      message: `Unsupported family '${String(family.family)}'.`,
    });
  if (
    !family.pageSize ||
    !isFiniteNumber(family.pageSize.width) ||
    family.pageSize.width <= 0 ||
    !isFiniteNumber(family.pageSize.height) ||
    family.pageSize.height <= 0
  )
    add({
      code: "invalid_geometry",
      severity: "error",
      message: "Page size is missing or not positive.",
    });

  // Design tokens (colors, typography, fonts).
  const colors = family.designTokens?.colors || {};
  for (const [role, color] of Object.entries(colors)) {
    if (typeof color !== "string" || !HEX_OR_NAMED.test(color))
      add({
        code: "invalid_color_token",
        severity: "error",
        message: `Color token '${role}' has an invalid value '${String(color)}'.`,
      });
  }
  if (Object.keys(colors).length === 0)
    add({
      code: "invalid_design_tokens",
      severity: "warning",
      message: "Template family declares no color tokens.",
    });

  const knownFonts = new Set<string>(fontFamilies);
  for (const [role, style] of Object.entries(
    family.designTokens?.typography || {},
  )) {
    if (!style || typeof style.fontFamily !== "string" || !style.fontFamily)
      add({
        code: "invalid_typography_token",
        severity: "error",
        message: `Typography token '${role}' has no font family.`,
      });
    else if (!knownFonts.has(style.fontFamily))
      add({
        code: "unknown_font_token",
        severity: "warning",
        message: `Typography token '${role}' uses font '${style.fontFamily}', which is not a known Forma font and will fall back.`,
      });
    if (!isFiniteNumber(style?.fontSize) || style.fontSize <= 0)
      add({
        code: "invalid_typography_token",
        severity: "error",
        message: `Typography token '${role}' has an invalid font size.`,
      });
  }

  const layouts = family.layouts;
  if (!Array.isArray(layouts) || layouts.length === 0) {
    add({
      code: "missing_layouts",
      severity: "error",
      message: "Template family has no layouts.",
    });
    return summarize(issues);
  }

  const layoutIds = new Set<string>();
  const layoutsById = new Map<string, TemplateLayout>();
  for (const layout of layouts) {
    if (layoutIds.has(layout.id))
      add({
        code: "duplicate_layout_id",
        severity: "error",
        layoutId: layout.id,
        message: `Duplicate layout id '${layout.id}'.`,
      });
    layoutIds.add(layout.id);
    layoutsById.set(layout.id, layout);
  }

  const pageWidth = family.pageSize?.width ?? 0;
  const pageHeight = family.pageSize?.height ?? 0;

  for (const layout of layouts) {
    if (!VALID_LAYOUT_ROLES.has(layout.role))
      add({
        code: "invalid_layout_role",
        severity: "error",
        layoutId: layout.id,
        message: `Layout '${layout.id}' has invalid role '${String(layout.role)}'.`,
      });

    const slotIds = new Set<string>();
    for (const slot of layout.slots || []) {
      if (!slot.id || typeof slot.id !== "string")
        add({
          code: "invalid_slot",
          severity: "error",
          layoutId: layout.id,
          message: `A slot in layout '${layout.id}' is missing an id.`,
        });
      if (slotIds.has(slot.id))
        add({
          code: "duplicate_slot_id",
          severity: "error",
          layoutId: layout.id,
          slotId: slot.id,
          message: `Duplicate slot id '${slot.id}' in layout '${layout.id}'.`,
        });
      slotIds.add(slot.id);

      if (slot.role && !VALID_SLOT_ROLES.has(slot.role))
        add({
          code: "invalid_slot_role",
          severity: "error",
          layoutId: layout.id,
          slotId: slot.id,
          message: `Slot '${slot.id}' has invalid role '${String(slot.role)}'.`,
        });

      if (!Array.isArray(slot.accepts) || slot.accepts.length === 0)
        add({
          code: "unsupported_content_type",
          severity: "error",
          layoutId: layout.id,
          slotId: slot.id,
          message: `Slot '${slot.id}' accepts no content node types.`,
        });
      else
        for (const type of slot.accepts)
          if (!VALID_CONTENT_TYPES.has(type))
            add({
              code: "unsupported_content_type",
              severity: "error",
              layoutId: layout.id,
              slotId: slot.id,
              message: `Slot '${slot.id}' accepts unknown content type '${type}'.`,
            });

      if (
        isFiniteNumber(slot.minItems) &&
        isFiniteNumber(slot.maxItems) &&
        slot.minItems > slot.maxItems
      )
        add({
          code: "invalid_item_range",
          severity: "error",
          layoutId: layout.id,
          slotId: slot.id,
          message: `Slot '${slot.id}' has minItems > maxItems.`,
        });

      if (
        isFiniteNumber(slot.minCharacters) &&
        isFiniteNumber(slot.maxCharacters) &&
        slot.minCharacters > slot.maxCharacters
      )
        add({
          code: "invalid_capacity_range",
          severity: "error",
          layoutId: layout.id,
          slotId: slot.id,
          message: `Slot '${slot.id}' has minCharacters > maxCharacters.`,
        });
      if (isFiniteNumber(slot.maxCharacters) && slot.maxCharacters <= 0)
        add({
          code: "invalid_capacity_range",
          severity: "error",
          layoutId: layout.id,
          slotId: slot.id,
          message: `Slot '${slot.id}' has a non-positive maxCharacters.`,
        });
    }

    // Required slots must bind to at least one element.
    for (const slot of layout.slots || []) {
      if (!slot.required) continue;
      const bound = (layout.baseElements || []).some(
        (el) => el.slotId === slot.id,
      );
      if (!bound)
        add({
          code: "missing_required_slot_element",
          severity: "error",
          layoutId: layout.id,
          slotId: slot.id,
          message: `Required slot '${slot.id}' has no element bound to it.`,
        });
    }

    const elementIds = new Set<string>();
    for (const el of layout.baseElements || []) {
      if (elementIds.has(el.id))
        add({
          code: "duplicate_element_id",
          severity: "error",
          layoutId: layout.id,
          elementId: el.id,
          message: `Duplicate element id '${el.id}' in layout '${layout.id}'.`,
        });
      elementIds.add(el.id);

      if (el.slotId && !slotIds.has(el.slotId))
        add({
          code: "invalid_slot_reference",
          severity: "error",
          layoutId: layout.id,
          elementId: el.id,
          slotId: el.slotId,
          message: `Element '${el.id}' references undefined slot '${el.slotId}'.`,
        });

      if (
        !isFiniteNumber(el.x) ||
        !isFiniteNumber(el.y) ||
        !isFiniteNumber(el.width) ||
        !isFiniteNumber(el.height) ||
        el.width < 0 ||
        el.height < 0
      )
        add({
          code: "invalid_geometry",
          severity: "error",
          layoutId: layout.id,
          elementId: el.id,
          message: `Element '${el.id}' has invalid geometry.`,
        });
      else {
        const allowOutOfBounds =
          (el.metadata?.allowOutOfBounds as boolean | undefined) === true ||
          (layout.metadata?.allowOutOfBounds as boolean | undefined) === true;
        if (!allowOutOfBounds) {
          const overflowRight = el.x + el.width - pageWidth;
          const overflowBottom = el.y + el.height - pageHeight;
          if (el.x < -0.5 || el.y < -0.5)
            add({
              code: "element_out_of_bounds",
              severity: "error",
              layoutId: layout.id,
              elementId: el.id,
              message: `Element '${el.id}' starts outside the page bounds.`,
            });
          else if (overflowRight > 0.5 || overflowBottom > 0.5)
            add({
              code: "element_out_of_bounds",
              severity: "warning",
              layoutId: layout.id,
              elementId: el.id,
              message: `Element '${el.id}' extends past the page edge.`,
            });
        }
      }
    }

    // compatibleAlternatives must exist and be compatible enough.
    for (const altId of layout.compatibleAlternatives || []) {
      const alt = layoutsById.get(altId);
      if (!alt)
        add({
          code: "missing_compatible_alternative",
          severity: "error",
          layoutId: layout.id,
          message: `Layout '${layout.id}' lists missing compatible alternative '${altId}'.`,
        });
      else if (!alternativesCompatible(layout, alt))
        add({
          code: "incompatible_alternative",
          severity: "warning",
          layoutId: layout.id,
          message: `Layout '${layout.id}' and alternative '${altId}' may not remap content safely.`,
        });
    }
    for (const altId of layout.fallbackLayouts || []) {
      if (!layoutsById.has(altId))
        add({
          code: "missing_fallback_layout",
          severity: "error",
          layoutId: layout.id,
          message: `Layout '${layout.id}' lists missing fallback layout '${altId}'.`,
        });
    }
  }

  // varietyRules referencing unknown layouts are stale but not fatal.
  for (const layoutId of Object.keys(family.varietyRules || {}))
    if (!layoutIds.has(layoutId))
      add({
        code: "stale_variety_rule",
        severity: "info",
        layoutId,
        message: `varietyRules references unknown layout '${layoutId}'.`,
      });

  return summarize(issues);
}

function summarize(
  issues: TemplateValidationIssue[],
): TemplateValidationV2Result {
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const status: TemplateValidationStatus =
    errorCount > 0
      ? "invalid"
      : warningCount > 0
        ? "valid_with_warnings"
        : "valid";
  return {
    valid: errorCount === 0,
    status,
    issues,
    errorCount,
    warningCount,
  };
}

export function validationIssuesToWarnings(
  issues: TemplateValidationIssue[],
): TemplateWarning[] {
  return issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    severity: issue.severity,
    layoutId: issue.layoutId,
  }));
}
