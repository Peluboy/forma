# Workspace Permissions v1 Specification

This document details the deterministic role hierarchy, permission rules, and security enforcement implemented in Phase 7.

---

## 1. Principles

1. **Deterministic Pure Functions**: Permissions are computed by pure functions taking the actor and target entities (`WorkspaceActor`, `WorkspaceRecord`, `ClientRecord`, `TemplateFamilyRecord`, `Project`).
2. **Explicit Membership**: An actor must have an `active` membership record in the workspace. Invited or removed members have no access.
3. **No Cross-Workspace Leakage**: Attempting to read or mutate records from another workspace returns `false` / `403 Forbidden`.
4. **No Cross-Client Leakage**: Dedicated client templates are strictly quarantined to that client.

---

## 2. Role Hierarchy

| Capability | Owner | Admin | Designer | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| **View Workspace** | Yes | Yes | Yes | Yes |
| **Edit Workspace Settings/Name** | Yes | Yes | No | No |
| **Delete Workspace** | Yes | No | No | No |
| **Manage Members (Invite/Remove)** | Yes | Yes | No | No |
| **Create Clients** | Yes | Yes | No | No |
| **Edit / Archive Clients** | Yes | Yes | No | No |
| **Create Template Drafts** | Yes | Yes | Yes | No |
| **Approve Templates** | Yes | Yes | No | No |
| **Use Approved Templates in /create** | Yes | Yes | Yes | No |
| **Create Client Projects** | Yes | Yes | Yes | No |
| **View Client Projects** | Yes | Yes | Yes | Yes |
| **Export project PDF** | Yes | Yes | Yes | No |
| **Share Workspace Templates** | Yes | Yes | No | No |

---

## 3. Function Signatures (`src/domain/workspace/permissions.ts`)

```ts
export function canViewWorkspace(user: WorkspaceActor | null | undefined, workspace: WorkspaceRecord): boolean;
export function canEditWorkspace(user: WorkspaceActor | null | undefined, workspace: WorkspaceRecord): boolean;
export function canManageMembers(user: WorkspaceActor | null | undefined, workspace: WorkspaceRecord): boolean;
export function canCreateClient(user: WorkspaceActor | null | undefined, workspace: WorkspaceRecord): boolean;
export function canEditClient(user: WorkspaceActor | null | undefined, client: ClientRecord, workspace?: WorkspaceRecord): boolean;
export function canArchiveClient(user: WorkspaceActor | null | undefined, client: ClientRecord, workspace?: WorkspaceRecord): boolean;
export function canCreateWorkspaceTemplate(user: WorkspaceActor | null | undefined, workspace: WorkspaceRecord): boolean;
export function canApproveWorkspaceTemplate(user: WorkspaceActor | null | undefined, workspace: WorkspaceRecord): boolean;
export function canUseWorkspaceTemplate(user: WorkspaceActor | null | undefined, workspace: WorkspaceRecord, template: TemplateFamilyRecord, targetClientId?: string): boolean;
export function canCreateClientProject(user: WorkspaceActor | null | undefined, client: ClientRecord, workspace?: WorkspaceRecord): boolean;
export function canViewClientProject(user: WorkspaceActor | null | undefined, project: Project, workspace?: WorkspaceRecord): boolean;
export function canShareWorkspaceTemplate(user: WorkspaceActor | null | undefined, template: TemplateFamilyRecord, workspace?: WorkspaceRecord): boolean;
export function canExportProject(user: WorkspaceActor | null | undefined, project: Project, workspace?: WorkspaceRecord | null, client?: ClientRecord | null): ExportPermissionResult;
```
