import type { ClientRecord } from "./client.js";
import { getMemberRole } from "./permissions.js";
import type {
  WorkspaceActor,
  WorkspaceContext,
  WorkspaceRecord,
} from "./types.js";

export function resolveCurrentWorkspaceContext(
  user: WorkspaceActor | null | undefined,
  options?: {
    activeWorkspaceId?: string | null;
    activeClientId?: string | null;
    workspaces?: WorkspaceRecord[];
    clients?: ClientRecord[];
  },
): WorkspaceContext {
  const personalContext: WorkspaceContext = {
    isPersonal: true,
    workspaceId: undefined,
    clientId: undefined,
    role: "owner",
  };

  if (!user || !user.userId || !options?.activeWorkspaceId) {
    return personalContext;
  }

  const workspace = options.workspaces?.find(
    (w) => w.id === options.activeWorkspaceId,
  );
  if (!workspace) {
    return personalContext;
  }

  const role = getMemberRole(user, workspace);
  if (!role) {
    // User is not a member of this workspace
    return personalContext;
  }

  let client: ClientRecord | undefined;
  if (options.activeClientId && options.clients) {
    client = options.clients.find(
      (c) =>
        c.id === options.activeClientId &&
        c.workspaceId === workspace.id &&
        c.status === "active",
    );
  }

  return {
    isPersonal: workspace.type === "personal",
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    clientId: client?.id,
    clientName: client?.name,
    role,
  };
}
