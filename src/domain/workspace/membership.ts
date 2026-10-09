import type {
  WorkspaceMember,
  WorkspaceMemberRole,
  WorkspaceRecord,
} from "./types.js";

export function findWorkspaceMember(
  workspace: WorkspaceRecord,
  userId?: string | null,
): WorkspaceMember | null {
  if (!userId) return null;
  return workspace.members.find((m) => m.userId === userId) || null;
}

export function findWorkspaceMemberByEmail(
  workspace: WorkspaceRecord,
  email?: string | null,
): WorkspaceMember | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return (
    workspace.members.find(
      (m) => m.email && m.email.trim().toLowerCase() === normalized,
    ) || null
  );
}

export function addMemberToWorkspace(
  workspace: WorkspaceRecord,
  input: {
    userId: string;
    email?: string;
    name?: string;
    role: WorkspaceMemberRole;
    status?: "active" | "invited" | "removed";
    invitedAt?: string;
    joinedAt?: string;
  },
  actorUserId?: string,
): WorkspaceRecord {
  if (actorUserId) {
    const actor = findWorkspaceMember(workspace, actorUserId);
    if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
      throw new Error("Only workspace owners and admins can invite members");
    }
    if (input.role === "owner" && actor.role !== "owner") {
      throw new Error("Only the owner can assign the owner role");
    }
  }

  const existing = findWorkspaceMember(workspace, input.userId);
  if (existing) {
    if (existing.status === "removed") {
      // Re-activate member
      return {
        ...workspace,
        updatedAt: new Date().toISOString(),
        members: workspace.members.map((m) =>
          m.userId === input.userId
            ? {
                ...m,
                role: input.role,
                status: "active",
                email: input.email || m.email,
                name: input.name || m.name,
                joinedAt: new Date().toISOString(),
              }
            : m,
        ),
      };
    }
    throw new Error("User is already a member of this workspace");
  }

  const now = new Date().toISOString();
  const status = input.status || (input.invitedAt ? "invited" : "active");
  const newMember: WorkspaceMember = {
    userId: input.userId,
    email: input.email?.trim().toLowerCase(),
    name: input.name?.trim(),
    role: input.role,
    status,
    invitedAt: status === "invited" ? input.invitedAt || now : input.invitedAt,
    joinedAt: status === "active" ? input.joinedAt || now : undefined,
  };

  return {
    ...workspace,
    updatedAt: now,
    members: [...workspace.members, newMember],
  };
}

export function removeMemberFromWorkspace(
  workspace: WorkspaceRecord,
  targetUserId: string,
  actorUserId?: string,
): WorkspaceRecord {
  if (actorUserId) {
    const actor = findWorkspaceMember(workspace, actorUserId);
    if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
      throw new Error("Only workspace owners and admins can remove members");
    }
  }
  const target = findWorkspaceMember(workspace, targetUserId);
  if (!target) {
    throw new Error("Target member not found in workspace");
  }
  if (target.role === "owner") {
    throw new Error("Cannot remove the workspace owner");
  }

  return {
    ...workspace,
    updatedAt: new Date().toISOString(),
    members: workspace.members.filter((m) => m.userId !== targetUserId),
  };
}

export function updateMemberRole(
  workspace: WorkspaceRecord,
  targetUserId: string,
  nextRole: WorkspaceMemberRole,
  actorUserId?: string,
): WorkspaceRecord {
  if (actorUserId) {
    const actor = findWorkspaceMember(workspace, actorUserId);
    if (!actor || actor.role !== "owner") {
      throw new Error("Only the workspace owner can change member roles");
    }
  }
  const target = findWorkspaceMember(workspace, targetUserId);
  if (!target) {
    throw new Error("Target member not found in workspace");
  }
  if (target.role === "owner" && nextRole !== "owner") {
    throw new Error(
      "Cannot demote the workspace owner without transferring ownership",
    );
  }

  return {
    ...workspace,
    updatedAt: new Date().toISOString(),
    members: workspace.members.map((m) =>
      m.userId === targetUserId ? { ...m, role: nextRole } : m,
    ),
  };
}
