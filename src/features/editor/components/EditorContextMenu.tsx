import { useEffect } from "react";
import type { Project } from "../../../domain/design/model";

export type ContextAction =
  | "copy"
  | "copy-style"
  | "paste"
  | "paste-style"
  | "duplicate"
  | "forward"
  | "backward"
  | "lock"
  | "hide"
  | "layers"
  | "add-page"
  | "duplicate-page"
  | "copy-page-style"
  | "paste-page-style"
  | "resize"
  | "guides"
  | "hide-page";

export function EditorContextMenu({
  x,
  y,
  project,
  objectSelected,
  locked,
  hidden,
  canPaste,
  canPasteStyle,
  guides,
  onAction,
  onClose,
}: {
  x: number;
  y: number;
  project: Project;
  objectSelected: boolean;
  locked: boolean;
  hidden: boolean;
  canPaste: boolean;
  canPasteStyle: boolean;
  guides: boolean;
  onAction: (action: ContextAction) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest(".editor-context-menu"))
        onClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", escape);
    };
  }, [onClose]);
  const isPage =
    project.family === "document" || project.family === "presentation";
  const pages =
    project.family === "document"
      ? project.flow?.pages
      : project.presentation?.slides;
  const activeId =
    project.family === "document"
      ? project.flow?.activePageId
      : project.presentation?.activeSlideId;
  const activePage = pages?.find((page) => page.id === activeId);
  const items: { id: ContextAction; label: string; disabled?: boolean }[] =
    objectSelected && !isPage
      ? [
          { id: "copy", label: "Copy" },
          { id: "copy-style", label: "Copy style" },
          { id: "paste", label: "Paste", disabled: !canPaste },
          {
            id: "paste-style",
            label: "Paste style",
            disabled: !canPasteStyle || locked,
          },
          { id: "duplicate", label: "Duplicate", disabled: locked },
          { id: "forward", label: "Move forward", disabled: locked },
          { id: "backward", label: "Move backward", disabled: locked },
          { id: "lock", label: locked ? "Unlock" : "Lock" },
          { id: "hide", label: hidden ? "Show" : "Hide" },
          { id: "layers", label: "Layers" },
        ]
      : [
          { id: "paste", label: "Paste", disabled: !canPaste || isPage },
          ...(isPage
            ? [
                {
                  id: "duplicate-page" as const,
                  label:
                    project.family === "presentation"
                      ? "Duplicate slide"
                      : "Duplicate page",
                },
                {
                  id: "add-page" as const,
                  label:
                    project.family === "presentation"
                      ? "Add slide"
                      : "Add page",
                },
                {
                  id: "hide-page" as const,
                  label: activePage?.hidden ? "Show page" : "Hide page",
                  disabled:
                    !activePage?.hidden &&
                    pages?.filter((page) => !page.hidden).length === 1,
                },
              ]
            : []),
          { id: "copy-page-style", label: "Copy page style" },
          {
            id: "paste-page-style",
            label: "Paste page style",
            disabled: !canPasteStyle,
          },
          ...(!isPage
            ? [
                { id: "layers" as const, label: "Layers" },
                {
                  id: "resize" as const,
                  label: "Resize page",
                  disabled: project.designMode === "reference",
                },
                {
                  id: "guides" as const,
                  label: guides ? "Hide guides" : "Show guides",
                },
              ]
            : []),
        ];
  return (
    <div
      className="editor-context-menu"
      role="menu"
      aria-label="Canvas actions"
      style={{
        left: Math.max(8, Math.min(x, window.innerWidth - 230)),
        top: Math.max(
          8,
          Math.min(y, window.innerHeight - items.length * 39 - 20),
        ),
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map(({ id, label, disabled }) => (
        <button
          key={id}
          type="button"
          role="menuitem"
          disabled={disabled}
          onClick={() => {
            onAction(id);
            onClose();
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
