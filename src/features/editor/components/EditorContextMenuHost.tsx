import type { RefObject } from "react";
import type { Project, FieldId } from "../../../domain/design/model";
import { EditorContextMenu, type ContextAction } from "./EditorContextMenu";
import type { CanvasClipboard, CanvasTarget } from "../lib/canvasActions";

export function EditorContextMenuHost({
  contextMenu,
  project,
  clipboard,
  guides,
  onAction,
  onClose,
}: {
  contextMenu: { x: number; y: number; target: CanvasTarget } | null;
  project: Project;
  clipboard: RefObject<CanvasClipboard | null>;
  guides: boolean;
  onAction: (action: ContextAction) => void;
  onClose: () => void;
}) {
  if (!contextMenu) return null;
  const target = contextMenu.target;
  const layout =
    target?.kind === "field"
      ? project.layouts[target.id as FieldId]
      : project.textLayers?.find((layer) => layer.id === target?.id)?.layout ||
        project.graphicLayers?.find((layer) => layer.id === target?.id)?.layout;
  return (
    <EditorContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      project={project}
      objectSelected={Boolean(target)}
      locked={Boolean(layout?.locked)}
      hidden={Boolean(layout?.hidden)}
      canPaste={
        clipboard.current?.kind === "text" ||
        clipboard.current?.kind === "graphic"
      }
      canPasteStyle={
        target
          ? clipboard.current?.kind === "text-style" ||
            clipboard.current?.kind === "shape-style"
          : clipboard.current?.kind === "page-style"
      }
      guides={guides}
      onAction={onAction}
      onClose={onClose}
    />
  );
}
