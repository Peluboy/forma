import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-sm text-sm font-[550] border border-transparent transition-[background,border-color,color] duration-150 ease-out disabled:opacity-45 disabled:cursor-not-allowed";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-text-on-accent hover:enabled:bg-accent-hover",
  secondary:
    "bg-bg-panel text-text-primary border-border hover:enabled:bg-bg-muted",
  ghost:
    "bg-transparent text-text-secondary hover:enabled:bg-bg-muted hover:enabled:text-text-primary",
  danger: "bg-danger text-white hover:enabled:opacity-90",
};

const SIZES: Record<Size, string> = {
  md: "h-[var(--control-height)] px-4",
  sm: "h-7 px-3 text-xs",
};

export function Button({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        "ui-button",
        variant,
        size === "sm" ? "ui-button-sm" : "",
        BASE,
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
