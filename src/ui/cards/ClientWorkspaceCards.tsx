import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Folder,
  LayoutTemplate,
} from "lucide-react";
import { Card } from "../primitives/Card";
import { Badge } from "../primitives/Badge";
import { Button } from "../primitives/Button";

export interface ClientCardProps {
  id: string;
  name: string;
  description?: string;
  status: "active" | "archived";
  projectCount: number;
  templateCount: number;
  onOpen: () => void;
  onCreateProject?: () => void;
  className?: string;
}

export function ClientCard({
  name,
  description,
  status,
  projectCount,
  templateCount,
  onOpen,
  onCreateProject,
  className = "",
}: ClientCardProps) {
  return (
    <Card
      hoverable
      padding="md"
      className={`flex flex-col gap-3 group select-none ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <Briefcase size={20} />
          </div>
          <div>
            <h3
              role="button"
              tabIndex={0}
              onClick={onOpen}
              className="text-sm font-semibold text-text-primary group-hover:text-[var(--accent)] transition-colors truncate cursor-pointer m-0"
            >
              {name}
            </h3>
            <span className="text-xs text-text-tertiary">Client hub</span>
          </div>
        </div>

        <Badge variant={status === "active" ? "success" : "neutral"} size="sm">
          {status === "active" ? "Active" : "Archived"}
        </Badge>
      </div>

      {description && (
        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed m-0">
          {description}
        </p>
      )}

      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-xs text-text-tertiary">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 font-medium">
            <Folder size={13} />
            {projectCount}
          </span>
          <span className="inline-flex items-center gap-1 font-medium">
            <LayoutTemplate size={13} />
            {templateCount}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onCreateProject && (
            <Button variant="ghost" size="sm" onClick={onCreateProject}>
              Create
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            iconRight={<ArrowUpRight size={13} />}
            onClick={onOpen}
          >
            Open
          </Button>
        </div>
      </div>
    </Card>
  );
}

export interface WorkspaceCardProps {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  clientCount: number;
  onOpen: () => void;
  className?: string;
}

export function WorkspaceCard({
  name,
  type,
  memberCount,
  clientCount,
  onOpen,
  className = "",
}: WorkspaceCardProps) {
  return (
    <Card
      hoverable
      padding="md"
      className={`flex flex-col gap-3 group select-none ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <h3
              role="button"
              tabIndex={0}
              onClick={onOpen}
              className="text-sm font-semibold text-text-primary group-hover:text-[var(--accent)] transition-colors truncate cursor-pointer m-0"
            >
              {name}
            </h3>
            <span className="text-xs text-text-tertiary">
              {type === "agency"
                ? "Agency"
                : type === "team"
                  ? "Team"
                  : "Personal"}
            </span>
          </div>
        </div>

        <Badge variant="info" size="sm">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </Badge>
      </div>

      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-xs text-text-tertiary">
        <span>
          {clientCount} {clientCount === 1 ? "client" : "clients"}
        </span>
        <Button
          variant="secondary"
          size="sm"
          iconRight={<ArrowUpRight size={13} />}
          onClick={onOpen}
        >
          Open
        </Button>
      </div>
    </Card>
  );
}
