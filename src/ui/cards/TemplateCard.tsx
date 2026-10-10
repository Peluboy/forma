import { ArrowUpRight, GitFork, Layout } from "lucide-react";
import { Card } from "../primitives/Card";
import { Badge } from "../primitives/Badge";
import { Button } from "../primitives/Button";
import { TemplateStatusBadge } from "../status/TemplateStatusBadge";

export interface TemplateCardProps {
  id: string;
  name: string;
  description?: string;
  layoutCount?: number;
  status?: string;
  source?: string;
  previewSrc?: string;
  canFork?: boolean;
  onUse: () => void;
  onFork?: () => void;
  className?: string;
}

export function TemplateCard({
  name,
  description,
  layoutCount = 1,
  status = "approved",
  source,
  previewSrc,
  canFork = false,
  onUse,
  onFork,
  className = "",
}: TemplateCardProps) {
  return (
    <Card
      hoverable
      padding="none"
      className={`flex flex-col overflow-hidden group select-none ${className}`}
    >
      {/* Cover */}
      <div
        role="button"
        tabIndex={0}
        onClick={onUse}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onUse()}
        className="relative aspect-[16/10] bg-[var(--bg-muted)] border-b border-border flex items-center justify-center overflow-hidden cursor-pointer"
      >
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-text-tertiary">
            <Layout size={24} strokeWidth={1.5} />
            <span className="text-[11px] font-medium">
              {layoutCount} layouts
            </span>
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <TemplateStatusBadge status={status} />
        </div>

        {source && (
          <div className="absolute top-2.5 right-2.5">
            <Badge variant="neutral" size="sm">
              {source}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3
          role="button"
          tabIndex={0}
          onClick={onUse}
          className="font-semibold text-sm text-text-primary group-hover:text-[var(--accent)] transition-colors truncate cursor-pointer m-0"
        >
          {name}
        </h3>

        {description && (
          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed m-0">
            {description}
          </p>
        )}

        <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between gap-2">
          <span className="text-[11px] text-text-tertiary font-medium">
            {layoutCount} {layoutCount === 1 ? "layout" : "layouts"}
          </span>

          <div className="flex items-center gap-2">
            {canFork && onFork && (
              <Button
                variant="ghost"
                size="sm"
                iconLeft={<GitFork size={13} />}
                onClick={onFork}
              >
                Fork
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              iconRight={<ArrowUpRight size={13} />}
              onClick={onUse}
            >
              Use template
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
