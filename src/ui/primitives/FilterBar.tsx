import { type ReactNode } from "react";
import { cx } from "../lib/cx";

export interface FilterBarProps {
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

/** Horizontal row for search + filters; wraps on narrow screens. */
export function FilterBar({
  children,
  trailing,
  className = "",
}: FilterBarProps) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {children}
      </div>
      {trailing && (
        <div className="flex shrink-0 items-center gap-2">{trailing}</div>
      )}
    </div>
  );
}

export interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

/** Toggle chip for category filters. */
export function FilterChip({ label, active, onClick, count }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors forma-focus-ring",
        active
          ? "border-text-primary bg-text-primary text-bg-panel"
          : "border-border bg-bg-panel text-text-secondary hover:border-border-strong hover:text-text-primary",
      )}
    >
      {label}
      {count !== undefined && (
        <span className={active ? "opacity-70" : "text-text-tertiary"}>
          {count}
        </span>
      )}
    </button>
  );
}
