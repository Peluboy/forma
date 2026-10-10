import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "../lib/cx";

export type IconButtonVariant =
  "primary" | "secondary" | "outline" | "ghost" | "danger";
export type IconButtonSize = "xs" | "sm" | "md" | "lg";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  label: string;
  selected?: boolean;
  children: ReactNode;
}

const VARIANTS: Record<IconButtonVariant, string> = {
  primary: "bg-accent text-text-on-accent hover:bg-accent-hover",
  secondary:
    "bg-bg-panel text-text-primary border border-border hover:bg-bg-subtle hover:border-border-strong shadow-[var(--shadow-xs)]",
  outline:
    "bg-transparent text-text-primary border border-border hover:bg-bg-muted",
  ghost:
    "bg-transparent text-text-secondary hover:bg-bg-muted hover:text-text-primary",
  danger: "bg-transparent text-danger hover:bg-danger-muted",
};

const SIZES: Record<IconButtonSize, string> = {
  xs: "w-6 h-6 rounded-[6px]",
  sm: "w-8 h-8 rounded-[8px]",
  md: "w-9 h-9 rounded-[10px]",
  lg: "w-11 h-11 rounded-[12px]",
};

export function IconButton({
  variant = "ghost",
  size = "md",
  label,
  selected = false,
  className = "",
  type = "button",
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={selected || undefined}
      className={cx(
        "inline-flex items-center justify-center shrink-0 select-none forma-focus-ring transition-colors duration-150 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        selected && "bg-accent-muted text-selected-fg",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
