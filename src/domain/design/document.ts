import { orderedLayerIds } from "./layers";
import {
  canvasHeight,
  canvasWidth,
  fieldIds,
  isManagedBlockLayerId,
  isProject,
  templates,
  type Project,
} from "./model";

/** Versioned portability boundary. The current editor still uses Project. */
export type DesignDocument = {
  schemaVersion: 1 | 2 | 3;
  kind: "forma-design";
  family: "graphics" | "documents" | "presentations";
  id: string;
  name: string;
  content: { id: string; text: string; sourceField: string }[];
  pages: {
    id: string;
    width: number;
    height: number;
    background: string;
    elements: (
      | {
          id: string;
          type: "text";
          contentId: string;
          x: number;
          y: number;
          width: number;
          height: number;
          fontSize: number;
          fontFamily: string;
          color: string;
          align: "left" | "center" | "right";
          locked: boolean;
          visible: boolean;
        }
      | {
          id: string;
          type: "shape" | "image" | "frame";
          x: number;
          y: number;
          width: number;
          height: number;
          locked: boolean;
          visible: boolean;
          assetId?: string;
          shape?: "rectangle" | "ellipse" | "rounded" | "triangle";
          color?: string;
        }
    )[];
  }[];
  // Preserve original artwork, cover geometry, manuscript and all legacy settings.
  // Reference bytes occur only here, avoiding a second embedded image per backup.
  compatibility: { renderer: "legacy-poster"; project: Project };
};

export function toDesignDocument(project: Project): DesignDocument {
  if (!isProject(project))
    throw new Error("This design cannot be saved as a Forma file.");
  const snapshot = structuredClone(project);
  const theme = templates.find((t) => t.id === project.template)!;
  const width = canvasWidth(project);
  const height = canvasHeight(project);
  const scaleX = width / 720;
  const scaleY = height / 900;
  return {
    schemaVersion:
      project.graphicLayers?.length || project.layerOrder
        ? 3
        : project.textLayers?.length
          ? 2
          : 1,
    kind: "forma-design",
    family:
      project.family === "document"
        ? "documents"
        : project.family === "presentation"
          ? "presentations"
          : "graphics",
    id: project.id,
    name: project.name,
    content: project.contentBlocks?.length
      ? [
          ...project.contentBlocks.map((block) => ({
            id: block.fieldId ? `copy-${block.fieldId}` : `copy-${block.id}`,
            text: block.text,
            sourceField: block.fieldId || block.id,
          })),
          ...(project.textLayers || [])
            .filter((l) => !isManagedBlockLayerId(l.id))
            .map((l) => ({
              id: `copy-${l.id}`,
              text: l.text,
              sourceField: l.id,
            })),
        ]
      : [
          ...fieldIds.map((id) => ({
            id: `copy-${id}`,
            text: project.copy[id],
            sourceField: id,
          })),
          ...(project.textLayers || []).map((l) => ({
            id: `copy-${l.id}`,
            text: l.text,
            sourceField: l.id,
          })),
        ],
    pages: [
      {
        id: "page-1",
        width,
        height,
        background: project.backgroundColor || theme.color,
        elements: [
          ...fieldIds.map((id) => {
            const b = project.layouts[id];
            return {
              id: `text-${id}`,
              type: "text" as const,
              contentId: `copy-${id}`,
              x: b.x * scaleX,
              y: b.y * scaleY,
              width: b.width * scaleX,
              height: b.height * scaleY,
              fontSize: b.size,
              fontFamily:
                b.fontFamily || (id === "title" ? theme.font : "Arial"),
              color: b.color || theme.text,
              align: b.align || "left",
              locked: Boolean(b.locked),
              visible:
                !b.hidden &&
                (project.designMode !== "reference" ||
                  Boolean(project.mappedFields?.includes(id))),
            };
          }),
          ...orderedLayerIds(project).map((id) => {
            const graphic = project.graphicLayers?.find((l) => l.id === id);
            if (graphic)
              return {
                id,
                type: graphic.type,
                x: graphic.layout.x * scaleX,
                y: graphic.layout.y * scaleY,
                width: graphic.layout.width * scaleX,
                height: graphic.layout.height * scaleY,
                locked: graphic.layout.locked,
                visible: !graphic.layout.hidden,
                ...(graphic.type === "image"
                  ? { assetId: graphic.id }
                  : graphic.type === "frame"
                    ? {
                        shape: graphic.shape,
                        assetId: graphic.src ? graphic.id : undefined,
                      }
                    : { shape: graphic.shape, color: graphic.color }),
              };
            const l = project.textLayers!.find((l) => l.id === id)!;
            return {
              id: l.id,
              type: "text" as const,
              contentId: `copy-${l.id}`,
              x: l.layout.x * scaleX,
              y: l.layout.y * scaleY,
              width: l.layout.width * scaleX,
              height: l.layout.height * scaleY,
              fontSize: l.layout.size,
              fontFamily: l.layout.fontFamily || "Arial",
              color: l.layout.color || "#252920",
              align: l.layout.align || ("left" as const),
              locked: l.layout.locked,
              visible: !l.layout.hidden,
            };
          }),
        ],
      },
    ],
    compatibility: { renderer: "legacy-poster", project: snapshot },
  };
}

function equivalent(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = a as Record<string, unknown>,
    right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) => Object.hasOwn(right, key) && equivalent(left[key], right[key]),
    )
  );
}

/** Never silently drop pages or edits that the current editor cannot represent. */
export function readDesignFile(value: unknown): Project {
  if (!value || typeof value !== "object")
    throw new Error("Please choose a valid Forma design file.");
  const record = value as Record<string, unknown>;
  if ("schemaVersion" in record || "kind" in record) {
    if (
      record.kind !== "forma-design" ||
      ![1, 2, 3].includes(record.schemaVersion as number)
    )
      throw new Error(
        "This file uses a newer or unsupported Forma format. Keep the original file and open it in a compatible version.",
      );
    const compatibility = record.compatibility as
      DesignDocument["compatibility"] | undefined;
    if (
      !compatibility ||
      compatibility.renderer !== "legacy-poster" ||
      !isProject(compatibility.project)
    )
      throw new Error(
        "This design cannot be opened in this version of the editor. Your file has not been changed.",
      );
    const expected = toDesignDocument(compatibility.project);
    if (!equivalent(value, expected))
      throw new Error(
        "This file contains changes this editor cannot safely open. Your current design has not been changed.",
      );
    return structuredClone(compatibility.project);
  }
  if (!isProject(value))
    throw new Error("Please choose a valid Forma design file.");
  return structuredClone(value);
}

export function serializeDesignFile(project: Project): string {
  return JSON.stringify(toDesignDocument(project), null, 2);
}
