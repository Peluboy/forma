/**
 * Agency Workspace v1 (Phase 7) — Core Types.
 */

export const WORKSPACE_RECORD_VERSION = "1.0" as const;
export const CLIENT_RECORD_VERSION = "1.0" as const;

export type WorkspaceType = "personal" | "agency" | "team";

export type WorkspaceMemberRole = "owner" | "admin" | "designer" | "viewer";

export type WorkspaceMemberStatus = "active" | "invited" | "removed";

export interface WorkspaceMember {
  userId: string;
  email?: string;
  name?: string;
  role: WorkspaceMemberRole;
  status: WorkspaceMemberStatus;
  invitedAt?: string;
  joinedAt?: string;
}

export interface WorkspaceSettings {
  defaultProjectVisibility?: "workspace" | "private";
  allowTemplateSharing?: boolean;
  allowPublicTemplatePublishing?: boolean;
}

export interface WorkspaceRecord {
  id: string;
  version: typeof WORKSPACE_RECORD_VERSION;

  name: string;
  description?: string;

  ownerId?: string;

  type: WorkspaceType;

  members: WorkspaceMember[];

  settings: WorkspaceSettings;

  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceActor {
  userId: string;
  email?: string;
  name?: string;
}

export interface WorkspaceContext {
  workspaceId?: string;
  clientId?: string;
  workspaceName?: string;
  clientName?: string;
  role?: WorkspaceMemberRole;
  isPersonal: boolean;
}
