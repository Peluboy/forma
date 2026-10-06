import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/** Accessible tooltip: hover + keyboard focus. Not for essential instructions. */
export function Tooltip({
  label,
  shortcut,
  children,
}: {
  label: string;
  shortcut?: string;
  children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<number>(0);
  const text = shortcut ? `${label} (${shortcut})` : label;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function show() {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), 280);
  }
  function hide() {
    window.clearTimeout(timer.current);
    setOpen(false);
  }

  return (
    <span
      className="tooltip-wrap"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {children}
      {open && (
        <span role="tooltip" id={id} className="tooltip-bubble">
          {text}
        </span>
      )}
    </span>
  );
}
