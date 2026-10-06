import type {
  DesignElement,
  DesignSpec,
  DesignSpecIssue,
  DesignSpecValidation,
} from "./types.js";

export function validateDesignSpec(spec: DesignSpec): DesignSpecValidation {
  const issues: DesignSpecIssue[] = [];
  if (!spec || typeof spec !== "object")
    return {
      valid: false,
      issues: [
        { type: "invalid_root", message: "DesignSpec must be an object." },
      ],
    };
  const add = (
    type: DesignSpecIssue["type"],
    message: string,
    pageId?: string,
    elementId?: string,
  ) => issues.push({ type, message, pageId, elementId });
  if (
    spec.version !== "1.0" ||
    !spec.id ||
    !spec.name ||
    !["graphic", "document", "presentation"].includes(spec.family) ||
    !["exact", "light_edit", "rewrite_allowed"].includes(spec.copyPolicy) ||
    !Number.isFinite(spec.documentSize?.width) ||
    spec.documentSize.width <= 0 ||
    !Number.isFinite(spec.documentSize?.height) ||
    spec.documentSize.height <= 0 ||
    !Array.isArray(spec.pages) ||
    !spec.pages.length
  )
    add("invalid_root", "Invalid DesignSpec root or document size.");
  const ids = new Set<string>();
  const assets = Array.isArray(spec.assets) ? spec.assets : [];
  const assetIds = new Set(assets.map((asset) => asset.id));
  if (assetIds.size !== assets.length)
    add("duplicate_id", "Asset IDs must be unique.");
  const styles = new Set([
    ...Object.keys(spec.styles?.colors || {}),
    ...Object.keys(spec.styles?.textStyles || {}),
    ...Object.keys(spec.styles?.spacing || {}),
  ]);
  for (const page of Array.isArray(spec.pages) ? spec.pages : []) {
    if (!page || typeof page !== "object") {
      add("invalid_root", "Invalid page record.");
      continue;
    }
    if (!page.id || ids.has(page.id))
      add("duplicate_id", `Duplicate/empty page ID ${page.id}.`, page.id);
    ids.add(page.id);
    if (![page.width, page.height].every((v) => Number.isFinite(v) && v > 0))
      add(
        "invalid_geometry",
        "Page dimensions must be positive and finite.",
        page.id,
      );
    const byId = new Map<string, DesignElement>();
    if (!Array.isArray(page.elements) || !Array.isArray(page.elementIds)) {
      add(
        "missing_element",
        "Page elements and elementIds must be arrays.",
        page.id,
      );
      continue;
    }
    for (const element of page.elements) {
      if (!element || typeof element !== "object") {
        add("invalid_element", "Invalid element record.", page.id);
        continue;
      }
      if (!element.id || ids.has(element.id))
        add(
          "duplicate_id",
          `Duplicate/empty element ID ${element.id}.`,
          page.id,
          element.id,
        );
      ids.add(element.id);
      byId.set(element.id, element);
      if (
        ![element.x, element.y, element.width, element.height].every(
          Number.isFinite,
        ) ||
        element.width < 0 ||
        element.height < 0
      )
        add(
          "invalid_geometry",
          "Element geometry must be finite with non-negative dimensions.",
          page.id,
          element.id,
        );
      if (element.styleRef && !styles.has(element.styleRef))
        add(
          "invalid_style_ref",
          `Missing style ${element.styleRef}.`,
          page.id,
          element.id,
        );
      if (
        element.provenance?.sourceSpanIds &&
        JSON.stringify(element.provenance.sourceSpanIds) !==
          JSON.stringify(element.sourceSpanIds || [])
      )
        add(
          "copy_policy",
          "Element and provenance source spans disagree.",
          page.id,
          element.id,
        );
      if (
        element.sourceSpanIds &&
        new Set(element.sourceSpanIds).size !== element.sourceSpanIds.length
      )
        add(
          "copy_policy",
          "Duplicate source-span IDs on one element.",
          page.id,
          element.id,
        );
      if (element.type === "text") {
        if (
          typeof element.text !== "string" ||
          !Number.isFinite(element.fontSize) ||
          element.fontSize <= 0 ||
          !element.fontFamily
        )
          add(
            "invalid_element",
            "Invalid text content or typography.",
            page.id,
            element.id,
          );
        if (
          spec.copyPolicy === "exact" &&
          element.text?.trim() &&
          !element.sourceSpanIds?.length &&
          !element.provenance?.unavailable
        )
          add(
            "copy_policy",
            "Exact-copy text needs source spans or an explicit legacy warning.",
            page.id,
            element.id,
          );
        for (const run of element.runs || [])
          if (run.styleRef && !styles.has(run.styleRef))
            add(
              "invalid_style_ref",
              `Missing run style ${run.styleRef}.`,
              page.id,
              element.id,
            );
      } else if (element.type === "image" || element.type === "frame") {
        if (element.assetRef && !assetIds.has(element.assetRef))
          add(
            "invalid_asset_ref",
            `Missing asset ${element.assetRef}.`,
            page.id,
            element.id,
          );
      } else if (element.type === "table") {
        if (
          !Number.isInteger(element.columns) ||
          element.columns < 1 ||
          !Number.isInteger(element.headerRows) ||
          element.headerRows < 0 ||
          !Array.isArray(element.rows) ||
          element.headerRows > element.rows.length ||
          !element.rows.length ||
          element.rows.some(
            (row) =>
              !Array.isArray(row) ||
              row.length !== element.columns ||
              row.some(
                (cell) =>
                  !cell ||
                  typeof cell.text !== "string" ||
                  (cell.styleRef && !styles.has(cell.styleRef)),
              ),
          )
        )
          add(
            "malformed_table",
            "Table rows, columns, header count, or cell styles are invalid.",
            page.id,
            element.id,
          );
        else if (
          spec.copyPolicy === "exact" &&
          !element.provenance?.unavailable &&
          element.rows.some((row) =>
            row.some((cell) => cell.text.trim() && !cell.sourceSpanIds?.length),
          )
        )
          add(
            "copy_policy",
            "Exact-copy table cells need source spans or an explicit legacy warning.",
            page.id,
            element.id,
          );
      } else if (element.type === "chart") {
        if (
          !Array.isArray(element.labels) ||
          !Array.isArray(element.data) ||
          element.labels.length !== element.data.length ||
          element.data.some((value) => !Number.isFinite(value))
        )
          add(
            "invalid_element",
            "Chart labels and finite data values must align.",
            page.id,
            element.id,
          );
      }
    }
    const ordered = new Set(page.elementIds || []);
    if (
      ordered.size !== page.elementIds.length ||
      ordered.size !== byId.size ||
      page.elementIds.some((id) => !byId.has(id))
    )
      add(
        "missing_element",
        "Page elementIds must contain each page element exactly once.",
        page.id,
      );
    for (const element of page.elements) {
      if (element.parentId && byId.get(element.parentId)?.type !== "group")
        add(
          "invalid_parent",
          `Parent ${element.parentId} is not a group on this page.`,
          page.id,
          element.id,
        );
      if (element.type === "group") {
        if (!Array.isArray(element.childIds)) {
          add(
            "invalid_parent",
            "Group childIds must be an array.",
            page.id,
            element.id,
          );
          continue;
        }
        for (const childId of element.childIds) {
          const child = byId.get(childId);
          if (!child || child.parentId !== element.id)
            add(
              "invalid_parent",
              `Group child ${childId} is missing or has a different parent.`,
              page.id,
              element.id,
            );
        }
      }
      const ancestors = new Set<string>([element.id]);
      let current = element;
      while (current.parentId) {
        if (ancestors.has(current.parentId)) {
          add(
            "group_cycle",
            "Group parent cycle detected.",
            page.id,
            element.id,
          );
          break;
        }
        ancestors.add(current.parentId);
        const parent = byId.get(current.parentId);
        if (!parent) break;
        current = parent;
      }
    }
  }
  return { valid: issues.length === 0, issues };
}
