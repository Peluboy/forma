import { type ReactNode } from "react";
import { cx } from "../lib/cx";

export function InspectorPanel({
  title,
  actions,
  children,
  className = "",
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cx(
        "flex h-full min-h-0 w-[320px] flex-col border-l border-border bg-bg-panel",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="forma-display m-0 text-[18px] font-semibold text-text-primary">
          {title}
        </h2>
        {actions}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
    </aside>
  );
}

export function InspectorSection({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("mb-5 flex flex-col gap-2.5", className)}>
      {title && (
        <h3 className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-text-tertiary">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

export function EditorToolButton({
  label,
  icon,
  selected = false,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        "flex h-[62px] w-[64px] flex-col items-center justify-center gap-1 rounded-[12px] text-[11px] font-semibold transition-colors forma-focus-ring",
        selected
          ? "bg-accent-muted text-selected-fg"
          : "text-text-secondary hover:bg-bg-muted hover:text-text-primary",
      )}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}
