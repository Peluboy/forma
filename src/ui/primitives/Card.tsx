import React from "react";
import { cx } from "../lib/cx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  selected?: boolean;
  tone?: "panel" | "subtle" | "glow";
  padding?: "none" | "sm" | "md" | "lg";
  children: React.ReactNode;
}

const PADDING = { none: "p-0", sm: "p-3", md: "p-5", lg: "p-6" };
const TONES = {
  panel: "bg-bg-panel",
  subtle: "bg-bg-subtle",
  glow: "forma-glow-surface",
};

export function Card({
  hoverable = false,
  selected = false,
  tone = "panel",
  padding = "md",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cx(
        "rounded-2xl border transition-[box-shadow,border-color,transform] duration-150",
        TONES[tone],
        selected
          ? "border-accent ring-4 ring-accent/10 shadow-[var(--shadow-sm)]"
          : "border-border shadow-[var(--shadow-xs)]",
        hoverable && "forma-card-hover",
        PADDING[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
