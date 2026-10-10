import React from "react";
import { ArrowUpRight, Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { Card } from "../primitives/Card";
import { TrustStatus } from "../status/TrustStatus";
import { Badge } from "../primitives/Badge";
import { IconButton } from "../primitives/IconButton";

export interface ProjectCardProps {
  id: string;
  name: string;
  family?: string;
  templateName?: string;
  updatedAt?: string;
  qualityScore?: number;
  fidelity?: string;
  workspaceName?: string;
  clientName?: string;
  thumbnailSrc?: string;
  preview?: React.ReactNode;
  onOpen: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function ProjectCard({
  name,
  family,
  templateName,
  updatedAt,
  qualityScore = 90,
  fidelity,
  workspaceName,
  clientName,
  thumbnailSrc,
  preview,
  onOpen,
  onDuplicate,
  onDelete,
  className = "",
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <Card
      hoverable
      padding="none"
      className={`flex flex-col overflow-hidden group select-none ${className}`}
    >
      {/* Thumbnail / Preview Area */}
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
        className="forma-preview-frame relative aspect-[16/10] border-b border-border flex items-center justify-center overflow-hidden cursor-pointer"
      >
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : preview ? (
          <div className="forma-preview-paper max-h-[88%] max-w-[78%] overflow-hidden rounded-[4px] bg-bg-panel [&_svg]:h-full [&_svg]:w-full">
            {preview}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-text-tertiary">
            <span className="text-xs font-medium">
              {family === "presentation"
                ? "Slides"
                : family === "graphics"
                  ? "Graphic"
                  : "Document"}
            </span>
          </div>
        )}

        {/* Hover open overlay */}
        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-900 font-semibold text-xs shadow-md">
            <span>Open in editor</span>
            <ArrowUpRight size={14} />
          </span>
        </div>

        {/* Scope badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
          {clientName ? (
            <Badge variant="accent" size="sm">
              {clientName}
            </Badge>
          ) : workspaceName ? (
            <Badge variant="info" size="sm">
              {workspaceName}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3
            role="button"
            tabIndex={0}
            onClick={onOpen}
            className="font-semibold text-sm text-text-primary group-hover:text-[var(--accent)] transition-colors truncate cursor-pointer m-0 flex-1"
          >
            {name || "Untitled document"}
          </h3>

          <div className="relative">
            <IconButton
              size="xs"
              variant="ghost"
              label="Options"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
            >
              <MoreHorizontal size={14} />
            </IconButton>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-36 rounded-xl bg-[var(--bg-elevated)] border border-border shadow-lg p-1 z-30 flex flex-col gap-0.5 animate-in fade-in"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {onDuplicate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDuplicate();
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-[var(--bg-muted)] rounded-lg text-left"
                  >
                    <Copy size={13} />
                    <span>Make a copy</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-left"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-text-tertiary mt-auto pt-2 border-t border-border/50">
          <span className="truncate max-w-[140px]">
            {templateName || "Custom design"}
            {updatedAt
              ? ` · ${new Date(updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
              : ""}
          </span>
          <TrustStatus score={qualityScore} fidelity={fidelity} />
        </div>
      </div>
    </Card>
  );
}
