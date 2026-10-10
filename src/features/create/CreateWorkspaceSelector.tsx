import { Building2 } from "lucide-react";
import type { WorkspaceRecord, ClientRecord } from "../../domain/workspace";
import { Select } from "../../ui";

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
    <div className="rounded-xl border border-border bg-[var(--bg-panel)] p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
          <Building2 size={13} className="text-[var(--accent)]" /> Save to
        </span>
        <a
          href="/workspaces"
          className="text-xs text-[var(--accent)] hover:underline font-medium"
        >
          Manage Workspaces
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Workspace"
          value={selectedWorkspaceId}
          onChange={(e) => onSelectWorkspace(e.target.value)}
        >
          <option value="">Personal</option>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>

        <Select
          label="Client"
          value={selectedClientId}
          onChange={(e) => onSelectClient(e.target.value)}
          disabled={!selectedWorkspaceId || clients.length === 0}
        >
          <option value="">Workspace</option>
          {clients
            .filter((c) => c.status === "active")
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </Select>
      </div>
    </div>
  );
}
