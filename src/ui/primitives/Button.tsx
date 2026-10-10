import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import { cx } from "../lib/cx";

export type ButtonVariant =
  "primary" | "secondary" | "outline" | "ghost" | "danger" | "soft";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {
  loading?: boolean;
  children: ReactNode;
}

export interface LinkButtonProps
  extends AnchorHTMLAttributes<HTMLAnchorElement>, ButtonStyleProps {
  href: string;
  children: ReactNode;
}

const BASE =
  "inline-flex items-center justify-center font-semibold whitespace-nowrap no-underline select-none forma-focus-ring transition-[background,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:pointer-events-none";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-text-on-accent! hover:bg-accent-hover shadow-[var(--shadow-xs)]",
  secondary:
    "bg-bg-panel text-text-primary border border-border hover:border-border-strong hover:bg-bg-subtle shadow-[var(--shadow-xs)]",
  outline:
    "bg-transparent text-text-primary border border-border hover:bg-bg-muted hover:border-border-strong",
  ghost:
    "bg-transparent text-text-secondary hover:bg-bg-muted hover:text-text-primary",
  soft: "bg-accent-muted text-selected-fg hover:bg-accent/15",
  danger: "bg-danger text-white hover:opacity-90 shadow-[var(--shadow-xs)]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-[30px] px-3 text-xs gap-1.5 rounded-[8px]",
  md: "h-9 px-4 text-[13px] gap-2 rounded-[10px]",
  lg: "h-11 px-5 text-sm gap-2 rounded-[12px]",
};

export function buttonClasses({
  variant = "secondary",
  size = "md",
  fullWidth = false,
}: ButtonStyleProps = {}) {
  return cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full");
}

export function Button({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  loading = false,
  iconLeft,
  iconRight,
  className = "",
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(buttonClasses({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Loader2
          className="animate-spin shrink-0"
          size={size === "sm" ? 14 : 16}
          aria-hidden="true"
        />
      ) : (
        iconLeft && (
          <span className="shrink-0 inline-flex" aria-hidden="true">
            {iconLeft}
          </span>
        )
      )}
      <span>{children}</span>
      {!loading && iconRight && (
        <span className="shrink-0 inline-flex" aria-hidden="true">
          {iconRight}
        </span>
      )}
    </button>
  );
}

export function LinkButton({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  iconLeft,
  iconRight,
  className = "",
  children,
  ...props
}: LinkButtonProps) {
  return (
    <a
      className={cx(buttonClasses({ variant, size, fullWidth }), className)}
      {...props}
    >
      {iconLeft && (
        <span className="shrink-0 inline-flex" aria-hidden="true">
          {iconLeft}
        </span>
      )}
      <span>{children}</span>
      {iconRight && (
        <span className="shrink-0 inline-flex" aria-hidden="true">
          {iconRight}
        </span>
      )}
    </a>
  );
}
