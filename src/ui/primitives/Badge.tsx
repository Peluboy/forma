import React from "react";
import { STATUS_STYLES, type StatusVariant } from "../theme";
import { cx } from "../lib/cx";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusVariant;
  size?: "sm" | "md";
  dot?: boolean;
  children: React.ReactNode;
}

export function Badge({
  variant = "neutral",
  size = "sm",
  dot = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  const styles = STATUS_STYLES[variant];
  return (
    <span
      className={cx(
        "inline-flex items-center font-semibold rounded-full border leading-none whitespace-nowrap select-none",
        styles.badge,
        size === "sm"
          ? "h-[22px] px-2 text-[11px] gap-1.5"
          : "h-7 px-2.5 text-xs gap-2",
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cx("w-1.5 h-1.5 rounded-full shrink-0", styles.dot)}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
}
