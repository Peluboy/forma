import { type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cx } from "../lib/cx";

export interface ActionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  art?: ReactNode;
  href?: string;
  onClick?: () => void;
  tone?: "feature" | "plain";
  disabled?: boolean;
  className?: string;
}

/** A starting point: icon tile, short title, one-line caption, arrow. */
export function ActionCard({
  title,
  description,
  icon,
  art,
  href,
  onClick,
  tone = "plain",
  disabled = false,
  className = "",
}: ActionCardProps) {
  const feature = tone === "feature";
  const classes = cx(
    "group relative flex min-h-[132px] flex-col justify-between gap-4 overflow-hidden rounded-2xl border p-5 text-left no-underline forma-focus-ring",
    "transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-out)]",
    feature
      ? "border-transparent bg-[image:var(--gradient-accent)] text-white! shadow-[var(--shadow-md)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]"
      : "border-border bg-bg-panel text-text-primary! shadow-[var(--shadow-xs)] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]",
    disabled && "pointer-events-none opacity-50",
    className,
  );
  const body = (
    <>
      {art && (
        <span
          className="pointer-events-none absolute -right-3 -bottom-4 w-[150px] opacity-95 transition-transform duration-300 group-hover:-translate-y-1"
          aria-hidden="true"
        >
          {art}
        </span>
      )}
      <span className="relative flex items-start justify-between gap-3">
        {icon && (
          <span
            className={cx(
              "grid h-10 w-10 place-items-center rounded-[12px]",
              feature
                ? "bg-white/18 text-white"
                : "bg-accent-muted text-selected-fg",
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <ArrowUpRight
          size={18}
          aria-hidden="true"
          className={cx(
            "ml-auto transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
            feature ? "text-white/80" : "text-text-tertiary",
          )}
        />
      </span>
      <span className={cx("relative flex flex-col gap-1", art ? "pr-24" : "")}>
        <strong className="text-[15px] font-semibold tracking-[-0.01em]">
          {title}
        </strong>
        {description && (
          <span
            className={cx(
              "text-[13px] leading-5",
              feature ? "text-white/80" : "text-text-secondary",
            )}
          >
            {description}
          </span>
        )}
      </span>
    </>
  );
  if (href)
    return (
      <a href={href} className={classes} aria-disabled={disabled || undefined}>
        {body}
      </a>
    );
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {body}
    </button>
  );
}
