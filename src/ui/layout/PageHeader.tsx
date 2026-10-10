import React from "react";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  badge,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-3 pb-6 border-b border-border/60 ${className}`}
    >
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-0.5" />}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1 max-w-2xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary m-0">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-sm text-text-secondary leading-relaxed m-0">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2.5 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}

export function SectionHeader({
  title,
  count,
  actions,
  className = "",
}: {
  title: string;
  count?: number;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 mb-4 select-none ${className}`}
    >
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-text-primary tracking-tight m-0">
          {title}
        </h2>
        {count !== undefined && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--bg-muted)] text-text-secondary border border-border">
            {count}
          </span>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
