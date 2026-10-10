import React from "react";

interface Props {
  className?: string;
  intensity?: "subtle" | "medium" | "vivid";
  children?: React.ReactNode;
}

export function FormaGradientMesh({
  className = "",
  intensity = "subtle",
  children,
}: Props) {
  const opacityMap = {
    subtle: "opacity-40 dark:opacity-20",
    medium: "opacity-70 dark:opacity-35",
    vivid: "opacity-100 dark:opacity-60",
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className={`pointer-events-none absolute inset-0 -z-10 ${opacityMap[intensity]}`}
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 10% 15%, var(--art-mint), transparent 70%),
            radial-gradient(ellipse 60% 50% at 85% 25%, var(--art-lilac), transparent 70%),
            radial-gradient(ellipse 70% 60% at 50% 90%, var(--art-peach), transparent 70%)
          `,
        }}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
