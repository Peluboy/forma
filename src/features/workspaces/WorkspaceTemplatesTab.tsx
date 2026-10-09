import { useState } from "react";
import { LayoutTemplate, Plus } from "lucide-react";
import type { ClientRecord } from "../../domain/workspace/client";
import type { WorkspaceRecord } from "../../domain/workspace/types";
import type { TemplateFamilyRecord } from "../../domain/template-authoring/types";

interface WorkspaceTemplatesTabProps {
  workspace: WorkspaceRecord;
  clients: ClientRecord[];
  templates: TemplateFamilyRecord[];
  onAssignTemplate: (templateId: string, clientId?: string) => Promise<void>;
  userRole?: string;
}

export function WorkspaceTemplatesTab({
  workspace,
  clients,
  templates,
  onAssignTemplate,
  userRole = "owner",
}: WorkspaceTemplatesTabProps) {
  const [busy, setBusy] = useState(false);

  const canManage =
    userRole === "owner" || userRole === "admin" || userRole === "designer";

  const workspaceTemplates = templates.filter(
    (t) => t.workspaceId === workspace.id || !t.workspaceId,
  );

  async function handleAssign(templateId: string, clientId?: string) {
    setBusy(true);
    try {
      await onAssignTemplate(templateId, clientId || undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Workspace Template Library
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage templates scoped to this agency workspace or assign them
            exclusively to specific clients.
          </p>
        </div>
        <a
          href="/dev/templates"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <Plus size={14} /> Open Authoring Lab
        </a>
      </div>

      {workspaceTemplates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-text-secondary">
          <LayoutTemplate size={28} className="mx-auto mb-2 opacity-50" />
          No templates associated with this workspace yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaceTemplates.map((t) => {
            const assignedClient = clients.find((c) => c.id === t.clientId);
            return (
              <div
                key={t.id}
                className="p-4 rounded-lg border border-border bg-bg-panel space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        assignedClient
                          ? "bg-accent/10 text-accent border border-accent/20"
                          : t.workspaceId
                            ? "bg-bg-elevated text-text-primary border border-border"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {assignedClient
                        ? `Client: ${assignedClient.name}`
                        : t.workspaceId
                          ? "Workspace-Wide"
                          : "Global / Forked"}
                    </span>
                    <span className="text-xs text-text-secondary font-mono">
                      v{t.versionNumber}
                    </span>
                  </div>

                  <h4 className="font-semibold text-sm text-text-primary">
                    {t.name}
                  </h4>
                  <p className="text-xs text-text-secondary line-clamp-2 mt-1">
                    {t.description || "No description provided."}
                  </p>
                </div>

                {canManage && (
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <select
                      value={t.clientId || ""}
                      onChange={(e) => handleAssign(t.id, e.target.value)}
                      disabled={busy}
                      className="text-xs px-2 py-1 rounded border border-border bg-bg-elevated text-text-primary focus:outline-hidden"
                    >
                      <option value="">Workspace-wide (All Clients)</option>
                      {clients
                        .filter((c) => c.status === "active")
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            Client: {c.name}
                          </option>
                        ))}
                    </select>

                    <a
                      href={`/create?workspace=${encodeURIComponent(workspace.id)}${t.clientId ? `&client=${encodeURIComponent(t.clientId)}` : ""}&template=${encodeURIComponent(t.id)}`}
                      className="text-xs font-semibold text-accent hover:underline whitespace-nowrap"
                    >
                      Use in /create
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
