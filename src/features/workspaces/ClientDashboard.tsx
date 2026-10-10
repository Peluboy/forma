import { useState } from "react";
import {
  ArrowLeft,
  FolderOpen,
  LayoutTemplate,
  Plus,
  Sparkles,
  Archive,
  RefreshCw,
} from "lucide-react";
import type { ClientRecord } from "../../domain/workspace/client";
import type { WorkspaceRecord } from "../../domain/workspace/types";
import type { TemplateFamilyRecord } from "../../domain/template-authoring/types";
import type { Project } from "../../domain/design/model";
import {
  Button,
  EmptyState,
  LinkButton,
  ProjectCard,
  StatusBadge,
  Tabs,
} from "../../ui";

interface ClientDashboardProps {
  workspace: WorkspaceRecord;
  client: ClientRecord;
  templates: TemplateFamilyRecord[];
  projects: Project[];
  onBack: () => void;
  onArchiveToggle: (client: ClientRecord) => void;
  onRefresh: () => void;
  userRole?: string;
}

export function ClientDashboard({
  workspace,
  client,
  templates,
  projects,
  onBack,
  onArchiveToggle,
  onRefresh: _onRefresh,
  userRole = "owner",
}: ClientDashboardProps) {
  const [tab, setTab] = useState<"templates" | "projects" | "notes">(
    "templates",
  );

  const canEdit =
    userRole === "owner" || userRole === "admin" || userRole === "designer";
  const canArchive = userRole === "owner" || userRole === "admin";

  const clientTemplates = templates.filter((t) => t.clientId === client.id);
  const workspaceTemplates = templates.filter(
    (t) => !t.clientId && t.workspaceId === workspace.id,
  );
  const clientProjects = projects.filter((p) => p.clientId === client.id);

  return (
    <div className="client-dashboard space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary mb-2 transition-colors"
          >
            <ArrowLeft size={14} /> Back to {workspace.name}
          </button>
          <div className="flex items-center gap-3">
            <h1 className="forma-display m-0 text-[28px] font-semibold tracking-tight text-text-primary">
              {client.name}
            </h1>
            <StatusBadge
              label={client.status === "active" ? "Active" : "Archived"}
              variant={client.status === "active" ? "success" : "neutral"}
            />
          </div>
          {client.description && (
            <p className="text-sm text-text-secondary mt-1">
              {client.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEdit && client.status === "active" && (
            <LinkButton
              href={`/create?workspace=${encodeURIComponent(workspace.id)}&client=${encodeURIComponent(client.id)}`}
              variant="primary"
              size="sm"
              iconLeft={<Sparkles size={14} />}
            >
              Create for this client
            </LinkButton>
          )}
          {canArchive && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onArchiveToggle(client)}
            >
              {client.status === "active" ? (
                <>
                  <Archive size={14} className="mr-1.5" /> Archive Client
                </>
              ) : (
                <>
                  <RefreshCw size={14} className="mr-1.5" /> Restore Client
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <Tabs
        activeId={tab}
        onChange={(id) => setTab(id as "templates" | "projects" | "notes")}
        items={[
          {
            id: "templates",
            label: "Templates",
            badge: clientTemplates.length + workspaceTemplates.length,
          },
          { id: "projects", label: "Projects", badge: clientProjects.length },
          { id: "notes", label: "Notes" },
        ]}
      />

      {/* Tab Content: Templates */}
      {tab === "templates" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Client templates
            </h3>
            {clientTemplates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-secondary">
                <LayoutTemplate size={24} className="mx-auto mb-2 opacity-50" />
                No client templates yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-lg border border-border bg-bg-panel space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-accent/10 text-accent">
                        Client
                      </span>
                      <span className="text-xs text-text-secondary">
                        v{t.versionNumber}
                      </span>
                    </div>
                    <h4 className="font-semibold text-text-primary text-sm">
                      {t.name}
                    </h4>
                    <p className="text-xs text-text-secondary line-clamp-2">
                      {t.description || "No description provided."}
                    </p>
                    <div className="pt-2 flex justify-between items-center text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {t.status}
                      </span>
                      {canEdit && (
                        <a
                          href={`/create?workspace=${encodeURIComponent(workspace.id)}&client=${encodeURIComponent(client.id)}&template=${encodeURIComponent(t.id)}`}
                          className="font-semibold text-accent hover:underline inline-flex items-center gap-1"
                        >
                          Use in create <Plus size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Workspace Templates Available to this Client
            </h3>
            {workspaceTemplates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-secondary">
                No workspace-wide templates available.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {workspaceTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-lg border border-border bg-bg-panel space-y-2 opacity-90"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-bg-elevated text-text-secondary">
                        Workspace-wide
                      </span>
                      <span className="text-xs text-text-secondary">
                        v{t.versionNumber}
                      </span>
                    </div>
                    <h4 className="font-semibold text-text-primary text-sm">
                      {t.name}
                    </h4>
                    <p className="text-xs text-text-secondary line-clamp-2">
                      {t.description || "Workspace template."}
                    </p>
                    <div className="pt-2 flex justify-between items-center text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {t.status}
                      </span>
                      {canEdit && (
                        <a
                          href={`/create?workspace=${encodeURIComponent(workspace.id)}&client=${encodeURIComponent(client.id)}&template=${encodeURIComponent(t.id)}`}
                          className="font-semibold text-accent hover:underline inline-flex items-center gap-1"
                        >
                          Use in create <Plus size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Projects */}
      {tab === "projects" && (
        <div className="space-y-4">
          {clientProjects.length === 0 ? (
            <EmptyState
              illustration={
                <FolderOpen size={32} className="text-text-tertiary" />
              }
              title="No projects for this client yet"
              description="Start a design for this client using their dedicated brand and approved templates."
              action={
                canEdit && client.status === "active"
                  ? {
                      label: "Create design for client",
                      onClick: () =>
                        location.assign(
                          `/create?workspace=${encodeURIComponent(workspace.id)}&client=${encodeURIComponent(client.id)}`,
                        ),
                      icon: <Sparkles size={14} />,
                    }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  family={project.family}
                  templateName={project.template}
                  updatedAt={project.updatedAt}
                  qualityScore={
                    typeof project.metadata?.qualityScore === "number"
                      ? project.metadata.qualityScore
                      : 90
                  }
                  clientName={client.name}
                  onOpen={() =>
                    location.assign(
                      `/editor?project=${encodeURIComponent(project.id)}`,
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Notes */}
      {tab === "notes" && (
        <div className="p-5 rounded-lg border border-border bg-bg-panel space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Client Brief & Notes
          </h3>
          <p className="text-sm text-text-secondary whitespace-pre-line">
            {client.notes ||
              "No notes or specific brand guidelines recorded for this client."}
          </p>
        </div>
      )}
    </div>
  );
}
