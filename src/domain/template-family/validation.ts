import type { ContentNodeType } from "../content/types.js";
import type {
  TemplateFamily,
  TemplateFamilyIssue,
  TemplateFamilyValidation,
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

export function validateTemplateFamily(
  family: TemplateFamily,
): TemplateFamilyValidation {
  const issues: TemplateFamilyIssue[] = [];

  if (
    !family ||
    family.version !== "1.0" ||
    !family.id ||
    !family.name ||
    !["graphic", "document", "presentation"].includes(family.family) ||
    !family.pageSize ||
    family.pageSize.width <= 0 ||
    family.pageSize.height <= 0
  ) {
    issues.push({
      type: "invalid_family",
      message:
        "Template family has invalid root fields, dimensions, or version.",
    });
    return { valid: false, issues };
  }

  const layoutIds = new Set<string>();

  for (const layout of family.layouts || []) {
    if (!layout.id || typeof layout.id !== "string") {
      issues.push({
        type: "invalid_family",
        message: "Layout is missing a valid id.",
      });
      continue;
    }

    if (layoutIds.has(layout.id)) {
      issues.push({
        type: "duplicate_layout_id",
        layoutId: layout.id,
        message: `Duplicate layout ID '${layout.id}'.`,
      });
    }
    layoutIds.add(layout.id);

    const slotIds = new Set<string>();
    for (const slot of layout.slots || []) {
      if (!slot.id || typeof slot.id !== "string") {
        issues.push({
          type: "invalid_family",
          layoutId: layout.id,
          message: "Slot is missing a valid id.",
        });
        continue;
      }

      if (slotIds.has(slot.id)) {
        issues.push({
          type: "duplicate_slot_id",
          layoutId: layout.id,
          slotId: slot.id,
          message: `Duplicate slot ID '${slot.id}' in layout '${layout.id}'.`,
        });
      }
      slotIds.add(slot.id);

      if (!Array.isArray(slot.accepts) || slot.accepts.length === 0) {
        issues.push({
          type: "unsupported_content_type",
          layoutId: layout.id,
          slotId: slot.id,
          message: `Slot '${slot.id}' has no accepted content node types.`,
        });
      } else {
        for (const type of slot.accepts) {
          if (!VALID_CONTENT_TYPES.has(type)) {
            issues.push({
              type: "unsupported_content_type",
              layoutId: layout.id,
              slotId: slot.id,
              message: `Slot '${slot.id}' accepts unsupported content node type '${type}'.`,
            });
          }
        }
      }
    }

    const elementIds = new Set<string>();
    for (const el of layout.baseElements || []) {
      if (!el.id || typeof el.id !== "string") {
        issues.push({
          type: "invalid_family",
          layoutId: layout.id,
          message: "Element is missing a valid id.",
        });
        continue;
      }

      if (elementIds.has(el.id)) {
        issues.push({
          type: "duplicate_element_id",
          layoutId: layout.id,
          elementId: el.id,
          message: `Duplicate element ID '${el.id}' in layout '${layout.id}'.`,
        });
      }
      elementIds.add(el.id);

      if (
        !Number.isFinite(el.x) ||
        !Number.isFinite(el.y) ||
        !Number.isFinite(el.width) ||
        !Number.isFinite(el.height) ||
        el.width < 0 ||
        el.height < 0
      ) {
        issues.push({
          type: "invalid_geometry",
          layoutId: layout.id,
          elementId: el.id,
          message: `Element '${el.id}' has invalid geometry coordinates or dimensions.`,
        });
      }

      if (el.slotId && !slotIds.has(el.slotId)) {
        issues.push({
          type: "invalid_slot_reference",
          layoutId: layout.id,
          elementId: el.id,
          slotId: el.slotId,
          message: `Element '${el.id}' references undefined slot '${el.slotId}'.`,
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
