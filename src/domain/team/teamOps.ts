export type WorkspaceRole =
  "owner" | "admin" | "editor" | "designer" | "reviewer" | "viewer";

export type WorkspaceAction =
  "view" | "publish" | "manage_members" | "approve" | "audit";

export type WorkspaceMember = {
  userId: string;
  email: string;
  name: string;
  role: WorkspaceRole;
  joinedAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  members: WorkspaceMember[];
  type?: "personal" | "agency" | "team";
  description?: string;
  settings?: {
    defaultProjectVisibility?: "workspace" | "private";
    allowTemplateSharing?: boolean;
    allowPublicTemplatePublishing?: boolean;
  };
};

export type PublicationKind = "project" | "template" | "skill" | "brand";

export type Publication = {
  id: string;
  workspaceId: string;
  kind: PublicationKind;
  sourceId: string;
  pinnedVersion: number;
  name: string;
  snapshot: unknown;
  publishedBy: { userId: string; email: string; name: string };
  publishedAt: string;
};

export type AuditEvent = {
  id: string;
  workspaceId: string;
  at: string;
  actor: { userId: string; email: string; name: string };
  action: string;
  target?: string;
  detail?: Record<string, unknown>;
};

export type WorkspaceMembership = {
  workspaceId: string;
  workspaceName: string;
  ownerId: string;
  role: WorkspaceRole;
  joinedAt: string;
};

const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 1,
  reviewer: 2,
  designer: 3,
  editor: 3,
  admin: 3.5,
  owner: 4,
};

const ACTION_MIN_ROLE: Record<WorkspaceAction, WorkspaceRole> = {
  view: "viewer",
  approve: "reviewer",
  publish: "editor",
  audit: "editor",
  manage_members: "owner",
};

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return (
    value === "owner" ||
    value === "admin" ||
    value === "editor" ||
    value === "designer" ||
    value === "reviewer" ||
    value === "viewer"
  );
}

export function isWorkspace(value: unknown): value is Workspace {
  if (!value || typeof value !== "object") return false;
  const w = value as Workspace;
  return (
    typeof w.id === "string" &&
    typeof w.name === "string" &&
    typeof w.createdAt === "string" &&
    typeof w.updatedAt === "string" &&
    typeof w.ownerId === "string" &&
    Array.isArray(w.members) &&
    w.members.every(
      (m) =>
        m &&
        typeof m.userId === "string" &&
        typeof m.email === "string" &&
        typeof m.name === "string" &&
        isWorkspaceRole(m.role) &&
        typeof m.joinedAt === "string",
    )
  );
}

export function isPublication(value: unknown): value is Publication {
  if (!value || typeof value !== "object") return false;
  const p = value as Publication;
  return (
    typeof p.id === "string" &&
    typeof p.workspaceId === "string" &&
    ["project", "template", "skill", "brand"].includes(p.kind) &&
    typeof p.sourceId === "string" &&
    Number.isInteger(p.pinnedVersion) &&
    p.pinnedVersion >= 1 &&
    typeof p.name === "string" &&
    typeof p.publishedAt === "string" &&
    !!p.publishedBy &&
    typeof p.publishedBy.userId === "string"
  );
}

export function isAuditEvent(value: unknown): value is AuditEvent {
  if (!value || typeof value !== "object") return false;
  const e = value as AuditEvent;
  return (
    typeof e.id === "string" &&
    typeof e.workspaceId === "string" &&
    typeof e.at === "string" &&
    typeof e.action === "string" &&
    !!e.actor &&
    typeof e.actor.userId === "string"
  );
}

export function memberRole(
  workspace: Workspace,
  userId: string,
): WorkspaceRole | null {
  return workspace.members.find((m) => m.userId === userId)?.role ?? null;
}

export function canPerform(
  role: WorkspaceRole | null,
  action: WorkspaceAction,
): boolean {
  if (!role) return false;
  if (action === "manage_members") return role === "owner" || role === "admin";
  return ROLE_RANK[role] >= ROLE_RANK[ACTION_MIN_ROLE[action]];
}

export function assertWorkspaceAccess(
  workspace: Workspace,
  userId: string,
  action: WorkspaceAction,
): WorkspaceRole {
  const role = memberRole(workspace, userId);
  if (!canPerform(role, action)) {
    const err = new Error(
      action === "view"
        ? "You are not a member of this workspace"
        : "Your role cannot perform this action in this workspace",
    ) as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  return role!;
}

export function createWorkspace(input: {
  id: string;
  name: string;
  owner: { userId: string; email: string; name: string };
  now?: string;
}): Workspace {
  const name = input.name.trim();
  if (!name || name.length > 80) throw new Error("Workspace name is required");
  const now = input.now || new Date().toISOString();
  return {
    id: input.id,
    name,
    createdAt: now,
    updatedAt: now,
    ownerId: input.owner.userId,
    members: [
      {
        userId: input.owner.userId,
        email: input.owner.email,
        name: input.owner.name,
        role: "owner",
        joinedAt: now,
      },
    ],
  };
}

export function addWorkspaceMember(
  workspace: Workspace,
  member: Omit<WorkspaceMember, "joinedAt"> & { joinedAt?: string },
  actorUserId: string,
): Workspace {
  assertWorkspaceAccess(workspace, actorUserId, "manage_members");
  if (workspace.members.some((m) => m.userId === member.userId))
    throw Object.assign(new Error("Member already belongs to this workspace"), {
      status: 409,
    });
  if (workspace.members.some((m) => m.email === member.email.toLowerCase()))
    throw Object.assign(new Error("Member already belongs to this workspace"), {
      status: 409,
    });
  if (member.role === "owner")
    throw Object.assign(
      new Error("Use ownership transfer to add another owner"),
      {
        status: 400,
      },
    );
  const now = member.joinedAt || new Date().toISOString();
  return {
    ...workspace,
    updatedAt: now,
    members: [
      ...workspace.members,
      {
        userId: member.userId,
        email: member.email.trim().toLowerCase(),
        name: member.name.trim(),
        role: member.role,
        joinedAt: now,
      },
    ],
  };
}

export function removeWorkspaceMember(
  workspace: Workspace,
  userId: string,
  actorUserId: string,
): Workspace {
  assertWorkspaceAccess(workspace, actorUserId, "manage_members");
  const target = workspace.members.find((m) => m.userId === userId);
  if (!target)
    throw Object.assign(new Error("Member not found"), { status: 404 });
  if (target.role === "owner")
    throw Object.assign(new Error("Cannot remove the workspace owner"), {
      status: 400,
    });
  const now = new Date().toISOString();
  return {
    ...workspace,
    updatedAt: now,
    members: workspace.members.filter((m) => m.userId !== userId),
  };
}

export function createPublication(input: {
  id: string;
  workspace: Workspace;
  actor: { userId: string; email: string; name: string };
  kind: PublicationKind;
  sourceId: string;
  pinnedVersion: number;
  name: string;
  snapshot: unknown;
  now?: string;
}): Publication {
  assertWorkspaceAccess(input.workspace, input.actor.userId, "publish");
  if (!Number.isInteger(input.pinnedVersion) || input.pinnedVersion < 1)
    throw Object.assign(
      new Error("Pinned version must be a positive integer"),
      {
        status: 400,
      },
    );
  if (!input.name.trim())
    throw Object.assign(new Error("Publication name is required"), {
      status: 400,
    });
  return {
    id: input.id,
    workspaceId: input.workspace.id,
    kind: input.kind,
    sourceId: input.sourceId,
    pinnedVersion: input.pinnedVersion,
    name: input.name.trim(),
    snapshot: input.snapshot,
    publishedBy: input.actor,
    publishedAt: input.now || new Date().toISOString(),
  };
}

export function createAuditEvent(input: {
  id: string;
  workspaceId: string;
  actor: { userId: string; email: string; name: string };
  action: string;
  target?: string;
  detail?: Record<string, unknown>;
  now?: string;
}): AuditEvent {
  return {
    id: input.id,
    workspaceId: input.workspaceId,
    at: input.now || new Date().toISOString(),
    actor: input.actor,
    action: input.action,
    target: input.target,
    detail: input.detail,
  };
}

export function membershipFromWorkspace(
  workspace: Workspace,
  userId: string,
): WorkspaceMembership | null {
  const member = workspace.members.find((m) => m.userId === userId);
  if (!member) return null;
  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    ownerId: workspace.ownerId,
    role: member.role,
    joinedAt: member.joinedAt,
  };
}

/** Recovery: rebuild membership index entries from a workspace record. */
export function recoverMemberships(
  workspace: Workspace,
): WorkspaceMembership[] {
  return workspace.members
    .map((m) => membershipFromWorkspace(workspace, m.userId))
    .filter((m): m is WorkspaceMembership => !!m);
}
