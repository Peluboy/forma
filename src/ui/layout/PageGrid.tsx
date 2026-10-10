import React from "react";

export interface PageGridProps {
  children: React.ReactNode;
  minWidth?: number;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export function PageGrid({
  children,
  minWidth = 280,
  gap = "md",
  className = "",
}: PageGridProps) {
  const gapClasses = {
    sm: "gap-3",
    md: "gap-5",
    lg: "gap-6",
  }[gap];

  return (
    <div
      className={`grid w-full ${gapClasses} ${className}`}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}
