import { Building2 } from "lucide-react";
import type { WorkspaceRecord, ClientRecord } from "../../domain/workspace";

interface CreateWorkspaceSelectorProps {
  workspaces: WorkspaceRecord[];
  clients: ClientRecord[];
  selectedWorkspaceId: string;
  selectedClientId: string;
  onSelectWorkspace: (id: string) => void;
  onSelectClient: (id: string) => void;
}

export function CreateWorkspaceSelector({
  workspaces,
  clients,
  selectedWorkspaceId,
  selectedClientId,
  onSelectWorkspace,
  onSelectClient,
}: CreateWorkspaceSelectorProps) {
  if (workspaces.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-bg-panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <Building2 size={13} className="text-accent" /> Workspace & Client
        </span>
        <a
          href="/workspaces"
          className="text-xs text-accent hover:underline font-medium"
        >
          Manage Workspaces
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Workspace
          </label>
          <select
            value={selectedWorkspaceId}
            onChange={(e) => onSelectWorkspace(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-bg-elevated px-2.5 text-xs text-text-primary"
          >
            <option value="">Personal (No Workspace)</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Client
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => onSelectClient(e.target.value)}
            disabled={!selectedWorkspaceId || clients.length === 0}
            className="w-full h-9 rounded-md border border-border bg-bg-elevated px-2.5 text-xs text-text-primary disabled:opacity-50"
          >
            <option value="">None (Workspace-level)</option>
            {clients
              .filter((c) => c.status === "active")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>
      </div>
    </div>
  );
}
