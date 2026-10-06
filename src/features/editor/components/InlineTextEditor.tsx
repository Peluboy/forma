import { useEffect, useRef, useState } from "react";

/** A temporary canvas editor. Saved artwork remains plain SVG text. */
export function InlineTextEditor({
  x,
  y,
  width,
  height,
  value,
  onCommit,
  onClose,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  onCommit: (value: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  const done = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  function finish(save: boolean) {
    if (done.current) return;
    done.current = true;
    if (save && draft !== value) onCommit(draft);
    onClose();
  }
  return (
    <foreignObject
      x={x}
      y={y}
      width={Math.max(80, width)}
      height={Math.max(52, height)}
      style={{ overflow: "visible" }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <textarea
        ref={ref}
        aria-label="Edit text on canvas"
        className="canvas-inline-text"
        maxLength={10000}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") finish(false);
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey))
            finish(true);
        }}
      />
    </foreignObject>
  );
}
