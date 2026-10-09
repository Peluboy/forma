import type { ClientRecord, ClientStatus } from "./client.js";
import {
  CLIENT_RECORD_VERSION,
  WORKSPACE_RECORD_VERSION,
  type WorkspaceMember,
  type WorkspaceMemberRole,
  type WorkspaceMemberStatus,
  type WorkspaceRecord,
  type WorkspaceType,
} from "./types.js";

const VALID_WORKSPACE_TYPES: WorkspaceType[] = ["personal", "agency", "team"];
const VALID_MEMBER_ROLES: WorkspaceMemberRole[] = [
  "owner",
  "admin",
  "designer",
  "viewer",
];
const VALID_MEMBER_STATUSES: WorkspaceMemberStatus[] = [
  "active",
  "invited",
  "removed",
];
const VALID_CLIENT_STATUSES: ClientStatus[] = ["active", "archived"];

export function isWorkspaceMember(value: unknown): value is WorkspaceMember {
  if (!value || typeof value !== "object") return false;
  const m = value as WorkspaceMember;
  return (
    typeof m.userId === "string" &&
    m.userId.length > 0 &&
    VALID_MEMBER_ROLES.includes(m.role) &&
    VALID_MEMBER_STATUSES.includes(m.status) &&
    (m.email === undefined || typeof m.email === "string") &&
    (m.name === undefined || typeof m.name === "string") &&
    (m.invitedAt === undefined || typeof m.invitedAt === "string") &&
    (m.joinedAt === undefined || typeof m.joinedAt === "string")
  );
}

export function isWorkspaceRecord(value: unknown): value is WorkspaceRecord {
  if (!value || typeof value !== "object") return false;
  const w = value as WorkspaceRecord;
  return (
    typeof w.id === "string" &&
    w.id.length > 0 &&
    w.version === WORKSPACE_RECORD_VERSION &&
    typeof w.name === "string" &&
    w.name.trim().length > 0 &&
    w.name.length <= 100 &&
    VALID_WORKSPACE_TYPES.includes(w.type) &&
    Array.isArray(w.members) &&
    w.members.every(isWorkspaceMember) &&
    typeof w.settings === "object" &&
    w.settings !== null &&
    typeof w.createdAt === "string" &&
    typeof w.updatedAt === "string" &&
    (w.ownerId === undefined || typeof w.ownerId === "string") &&
    (w.description === undefined || typeof w.description === "string")
  );
}

export function isClientRecord(value: unknown): value is ClientRecord {
  if (!value || typeof value !== "object") return false;
  const c = value as ClientRecord;
  return (
    typeof c.id === "string" &&
    c.id.length > 0 &&
    c.version === CLIENT_RECORD_VERSION &&
    typeof c.workspaceId === "string" &&
    c.workspaceId.length > 0 &&
    typeof c.name === "string" &&
    c.name.trim().length > 0 &&
    c.name.length <= 100 &&
    VALID_CLIENT_STATUSES.includes(c.status) &&
    Array.isArray(c.brandIds) &&
    c.brandIds.every((id) => typeof id === "string") &&
    Array.isArray(c.templateFamilyRecordIds) &&
    c.templateFamilyRecordIds.every((id) => typeof id === "string") &&
    Array.isArray(c.projectIds) &&
    c.projectIds.every((id) => typeof id === "string") &&
    typeof c.createdAt === "string" &&
    typeof c.updatedAt === "string" &&
    (c.description === undefined || typeof c.description === "string") &&
    (c.notes === undefined || typeof c.notes === "string")
  );
}

export function validateWorkspace(workspace: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!workspace || typeof workspace !== "object") {
    return { valid: false, errors: ["Workspace must be a non-null object"] };
  }
  const w = workspace as Partial<WorkspaceRecord>;
  if (!w.id || typeof w.id !== "string") {
    errors.push("Workspace id is required");
  }
  if (!w.name || typeof w.name !== "string" || !w.name.trim()) {
    errors.push("Workspace name is required");
  } else if (w.name.length > 100) {
    errors.push("Workspace name must not exceed 100 characters");
  }
  if (!w.type || !VALID_WORKSPACE_TYPES.includes(w.type)) {
    errors.push("Workspace type must be 'personal', 'agency', or 'team'");
  }
  if (!Array.isArray(w.members)) {
    errors.push("Workspace members must be an array");
  } else {
    w.members.forEach((m, idx) => {
      if (!isWorkspaceMember(m)) {
        errors.push(`Workspace member at index ${idx} is invalid`);
      }
    });
  }
  return { valid: errors.length === 0, errors };
}

export function validateClient(
  client: unknown,
  expectedWorkspace?: string | { id: string },
): { valid: boolean; errors: string[] } {
  const expectedWorkspaceId =
    typeof expectedWorkspace === "object" && expectedWorkspace !== null
      ? expectedWorkspace.id
      : expectedWorkspace;
  const errors: string[] = [];
  if (!client || typeof client !== "object") {
    return { valid: false, errors: ["Client must be a non-null object"] };
  }
  const c = client as Partial<ClientRecord>;
  if (!c.id || typeof c.id !== "string") {
    errors.push("Client id is required");
  }
  if (!c.workspaceId || typeof c.workspaceId !== "string") {
    errors.push("Client workspaceId is required");
  } else if (expectedWorkspaceId && c.workspaceId !== expectedWorkspaceId) {
    errors.push(
      `Client workspaceId '${c.workspaceId}' does not match expected workspace '${expectedWorkspaceId}'`,
    );
  }
  if (!c.name || typeof c.name !== "string" || !c.name.trim()) {
    errors.push("Client name is required");
  } else if (c.name.length > 100) {
    errors.push("Client name must not exceed 100 characters");
  }
  if (!c.status || !VALID_CLIENT_STATUSES.includes(c.status)) {
    errors.push("Client status must be 'active' or 'archived'");
  }
  return { valid: errors.length === 0, errors };
}
