import type { ClientRecord } from "./client.js";
import { findWorkspaceMember } from "./membership.js";
import type {
  WorkspaceActor,
  WorkspaceMemberRole,
  WorkspaceRecord,
} from "./types.js";
import type { TemplateFamilyRecord } from "../template-authoring/types.js";
import type { Project } from "../design/schema.js";

export function getMemberRole(
  user: WorkspaceActor | null | undefined,
  workspace: WorkspaceRecord,
): WorkspaceMemberRole | null {
  if (!user || !user.userId) return null;
  // If ownerId matches directly
  if (workspace.ownerId && workspace.ownerId === user.userId) {
    return "owner";
  }
  const member = findWorkspaceMember(workspace, user.userId);
  if (!member || member.status !== "active") return null;
  return member.role;
}

export function canViewWorkspace(
  user: WorkspaceActor | null | undefined,
  workspace: WorkspaceRecord,
): boolean {
  const role = getMemberRole(user, workspace);
  return role !== null;
}

export function canEditWorkspace(
  user: WorkspaceActor | null | undefined,
  workspace: WorkspaceRecord,
): boolean {
  const role = getMemberRole(user, workspace);
  return role === "owner" || role === "admin";
}

export function canManageMembers(
  user: WorkspaceActor | null | undefined,
  workspace: WorkspaceRecord,
): boolean {
  const role = getMemberRole(user, workspace);
  return role === "owner" || role === "admin";
}

export function canCreateClient(
  user: WorkspaceActor | null | undefined,
  workspace: WorkspaceRecord,
): boolean {
  const role = getMemberRole(user, workspace);
  return role === "owner" || role === "admin";
}

export function canEditClient(
  user: WorkspaceActor | null | undefined,
  client: ClientRecord,
  workspace?: WorkspaceRecord,
): boolean {
  if (workspace && client.workspaceId !== workspace.id) return false;
  if (!workspace) return false;
  const role = getMemberRole(user, workspace);
  return role === "owner" || role === "admin";
}

export function canArchiveClient(
  user: WorkspaceActor | null | undefined,
  client: ClientRecord,
  workspace?: WorkspaceRecord,
): boolean {
  if (workspace && client.workspaceId !== workspace.id) return false;
  if (!workspace) return false;
  const role = getMemberRole(user, workspace);
  return role === "owner" || role === "admin";
}

export function canCreateWorkspaceTemplate(
  user: WorkspaceActor | null | undefined,
  workspace: WorkspaceRecord,
): boolean {
  const role = getMemberRole(user, workspace);
  return role === "owner" || role === "admin" || role === "designer";
}

export function canApproveWorkspaceTemplate(
  user: WorkspaceActor | null | undefined,
  workspace: WorkspaceRecord,
): boolean {
  const role = getMemberRole(user, workspace);
  return role === "owner" || role === "admin";
}

export function canUseWorkspaceTemplate(
  user: WorkspaceActor | null | undefined,
  workspace: WorkspaceRecord,
  template: TemplateFamilyRecord,
  targetClientId?: string,
): boolean {
  const role = getMemberRole(user, workspace);
  if (!role || role === "viewer") return false;

  // Template must be approved
  if (template.status !== "approved" || !template.approval?.approved) {
    return false;
  }

  // If template is client-scoped, it can only be used for that client
  if (template.clientId) {
    if (template.clientId !== targetClientId) {
      return false;
    }
  }

  // Template must belong to this workspace or be public/forked
  if (template.workspaceId && template.workspaceId !== workspace.id) {
    return false;
  }

  return true;
}

export function canCreateClientProject(
  user: WorkspaceActor | null | undefined,
  client: ClientRecord,
  workspace?: WorkspaceRecord,
): boolean {
  if (workspace && client.workspaceId !== workspace.id) return false;
  if (!workspace) return false;
  if (client.status === "archived") return false;
  const role = getMemberRole(user, workspace);
  return role === "owner" || role === "admin" || role === "designer";
}

export function canViewClientProject(
  user: WorkspaceActor | null | undefined,
  project: Project,
  workspace?: WorkspaceRecord,
): boolean {
  if (
    workspace &&
    project.workspaceId &&
    project.workspaceId !== workspace.id
  ) {
    return false;
  }
  if (!workspace) {
    // If not a workspace project, check owner
    return !project.workspaceId;
  }
  const role = getMemberRole(user, workspace);
  return role !== null;
}

export function canShareWorkspaceTemplate(
  user: WorkspaceActor | null | undefined,
  template: TemplateFamilyRecord,
  workspace?: WorkspaceRecord,
): boolean {
  if (
    workspace &&
    template.workspaceId &&
    template.workspaceId !== workspace.id
  ) {
    return false;
  }
  if (workspace) {
    if (workspace.settings.allowTemplateSharing === false) return false;
    const role = getMemberRole(user, workspace);
    if (role !== "owner" && role !== "admin") return false;
  }
  return template.status === "approved" && !!template.approval?.approved;
}

export type ExportPermissionResult = {
  allowed: boolean;
  reason?: string;
  role?: WorkspaceMemberRole | null;
  archived: boolean;
};

/**
 * Export is a privileged action: viewers and non-members cannot download
 * workspace/client projects. Personal projects (no workspaceId) export for
 * the signed-in or guest owner who already has the record. Archived
 * clients/projects still export so finished work can be delivered, but the
 * caller should surface a warning.
 */
export function canExportProject(
  user: WorkspaceActor | null | undefined,
  project: Project,
  workspace?: WorkspaceRecord | null,
  client?: ClientRecord | null,
): ExportPermissionResult {
  const archived =
    client?.status === "archived" ||
    project.metadata?.archived === true ||
    project.metadata?.status === "archived";

  if (!project.workspaceId) {
    return { allowed: true, role: null, archived };
  }

  if (!workspace) {
    return {
      allowed: false,
      reason: "Workspace context is required to export this project.",
      role: null,
      archived,
    };
  }

  if (project.workspaceId !== workspace.id) {
    return {
      allowed: false,
      reason: "This project belongs to another workspace.",
      role: null,
      archived,
    };
  }

  if (client && client.workspaceId !== workspace.id) {
    return {
      allowed: false,
      reason: "This client belongs to another workspace.",
      role: null,
      archived,
    };
  }

  if (client && project.clientId && client.id !== project.clientId) {
    return {
      allowed: false,
      reason: "This project belongs to another client.",
      role: null,
      archived,
    };
  }

  const role = getMemberRole(user, workspace);
  if (!role) {
    return {
      allowed: false,
      reason: "Only workspace members can export this project.",
      role: null,
      archived,
    };
  }
  if (role === "viewer") {
    return {
      allowed: false,
      reason: "View only access cannot export.",
      role,
      archived,
    };
  }
  return { allowed: true, role, archived };
}
