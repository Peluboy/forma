import { useEffect, useRef } from "react";

type Shortcuts = {
  blocked: boolean;
  hasSelectedLayer: boolean;
  onApplyContent: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onEscape: () => void;
  onRemoveLayer: () => void;
  onDuplicateLayer: () => void;
};

/** One document listener reads the latest editor actions without re-registering. */
export function useEditorKeyboard(shortcuts: Shortcuts) {
  const current = useRef(shortcuts);
  current.current = shortcuts;
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const actions = current.current;
      if (actions.blocked) return;
      const editing = ["INPUT", "TEXTAREA"].includes(
        (event.target as HTMLElement).tagName,
      );
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === "Enter" &&
        !(event.target as HTMLElement).closest(".canvas-inline-text")
      ) {
        event.preventDefault();
        actions.onApplyContent();
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "z" &&
        !editing
      ) {
        event.preventDefault();
        event.shiftKey ? actions.onRedo() : actions.onUndo();
      }
      if (event.key === "Escape") actions.onEscape();
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        !editing &&
        actions.hasSelectedLayer
      ) {
        event.preventDefault();
        actions.onRemoveLayer();
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "d" &&
        !editing &&
        actions.hasSelectedLayer
      ) {
        event.preventDefault();
        actions.onDuplicateLayer();
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
}
