# Workspace Records v1 Specification

This document specifies the data model, storage layers, and lifecycle for workspaces in Forma Phase 7 (Agency Workspace v1).

---

## 1. Scope & Purpose

Workspaces organize Forma around how creative agencies, enterprises, and individual designers operate:
`Workspace (Agency) -> Clients -> Client Brands & Templates -> Client Projects -> Team Members -> Review/Generation Workflow`

Workspaces provide:
1. Boundary isolation between organizations.
2. Member role management (`owner`, `admin`, `designer`, `viewer`).
3. Shared workspace-level template families.
4. Default visibility settings.
5. Non-breaking compatibility for personal users (default personal workspaces).

---

## 2. Workspace Record Schema

```ts
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
  version: "1.0";
  name: string;
  description?: string;
  ownerId?: string;
  type: WorkspaceType;
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Storage & Persistence

### Local Persistence
- Key: `forma.workspaces.v1` in `localStorage`.
- Handled by `LocalStorageWorkspaceStore`.
- Automatically initializes a default personal workspace for guest users when empty.

### Hosted Persistence
- Supabase SQL schema: `forma_records` table with `kind = 'workspace'`.
- Allowed by migration `202610090001_workspace_and_client_kinds.sql`.
- Supported by `server/store.ts` (`listAny`, `getAny`, `save`, `remove`).
- HTTP API:
  - `GET /api/workspaces`
  - `POST /api/workspaces`
  - `GET /api/workspaces/:id`
  - `PUT /api/workspaces/:id`
  - `DELETE /api/workspaces/:id`
  - `POST /api/workspaces/:id/members`
  - `DELETE /api/workspaces/:id/members/:userId`

---

## 4. Default Personal Workspace Compatibility

To prevent breaking existing single-user accounts and local guest projects:
- Users without a selected agency workspace operate in a personal workspace context.
- Existing records without `workspaceId` remain personal and fully accessible.
- Personal workspaces default `settings.defaultProjectVisibility` to `"private"`.
- `resolveCurrentWorkspaceContext(user, options)` transparently resolves whether the active context is personal or an agency workspace.
