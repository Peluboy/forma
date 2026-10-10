import React from "react";

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function Tabs({
  items,
  activeId,
  onChange,
  className = "",
  size = "md",
}: TabsProps) {
  const sizeClasses = size === "sm" ? "h-8 text-xs px-3" : "h-9 text-sm px-4";

  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-1 p-1 bg-[var(--bg-muted)] rounded-xl border border-border select-none ${className}`}
    >
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all ${sizeClasses} ${
              isActive
                ? "bg-[var(--bg-panel)] text-text-primary shadow-xs font-semibold"
                : "text-text-secondary hover:text-text-primary hover:bg-[var(--bg-panel)]/50"
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                  isActive
                    ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                    : "bg-slate-200 dark:bg-slate-700 text-text-secondary"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
