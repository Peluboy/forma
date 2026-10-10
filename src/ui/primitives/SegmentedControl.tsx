import { type ReactNode } from "react";
import { cx } from "../lib/cx";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  fullWidth?: boolean;
  className?: string;
}

/** Single-choice pill group (radiogroup semantics). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  fullWidth = false,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(
        "inline-flex items-center gap-0.5 rounded-[12px] bg-bg-muted p-[3px]",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cx(
              "inline-flex items-center justify-center gap-1.5 rounded-[9px] font-semibold whitespace-nowrap transition-[background,color,box-shadow] duration-150 forma-focus-ring",
              size === "sm"
                ? "h-7 px-2.5 text-xs"
                : "h-[30px] px-3 text-[13px]",
              fullWidth && "flex-1",
              active
                ? "bg-bg-panel text-text-primary shadow-[var(--shadow-sm)]"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {option.icon && (
              <span className="inline-flex shrink-0" aria-hidden="true">
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={cx(
                  "rounded-full px-1.5 text-[10px] leading-4",
                  active
                    ? "bg-accent-muted text-selected-fg"
                    : "bg-bg-panel/70 text-text-tertiary",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
