# Agency Workspace v1 — Phase 7

This document establishes the **ownership, record-scoping audit** (Part A) and the **architectural design** for Phase 7 (Agency Workspace v1).

---

## Part A — Current Ownership and Record Scoping Audit

### 1. What is currently personal / user-scoped
- **Projects**: Stored under `kind: "project"` with `owner_id = user.id`. In local guest mode, stored in `localStorage["forma.projects.v1"]` without an account id.
- **Brand System**: Stored under `kind: "brand"` with record id `res.locals.user.id` (one brand system per user account). Guest brand stored in `localStorage["forma.brand.v1"]`.
- **User Preferences**: Stored in `forma_preferences` keyed by `owner_id`.
- **Create Drafts**: Session-stored in `sessionStorage["forma.createDraft.v1"]`.

### 2. What is already owner-scoped
- **Template Family Records (Phase 5/6)**: Stored under `kind: "template_family"` with `ownerId: string`. Local guest storage uses `localStorage["forma.templateFamilies.v1"]`. Hosted API enforces `owner_id = res.locals.user.id` on write.
- **Revisions**: Stored under `kind: "revision"` with `owner_id = user.id` linking to `projectId`.
- **Reviews**: Created by project owner (`owner_id = user.id`) under `kind: "review"`.
- **Team Ops Stage 4**: Earlier team workspace prototype in `src/domain/team/teamOps.ts` stored `kind: "workspace"` and `kind: "workspace_membership"` in local SQLite mode only.

### 3. What records need `workspaceId`
- **Projects (`Project`)**: Optional `workspaceId?: string`. When set, the project belongs to that workspace and is visible to workspace members according to their roles.
- **Template Family Records (`TemplateFamilyRecord`)**: Optional `workspaceId?: string`. Allows a template family to be shared across an entire agency workspace for all client projects.
- **Brand Systems (`BrandSystem`)**: Optional `workspaceId?: string`. Allows an agency-wide default brand.
- **Clients (`ClientRecord`)**: Mandatory `workspaceId: string`. A client always belongs to a single workspace.
- **Generated DesignSpec metadata**: `metadata.workspaceId?: string`.
- **Reviews**: Optional `workspaceId?: string` so workspace members can review or approve.
- **Reference Profiles (`ReferenceDesignProfile`)**: Optional `workspaceId?: string`.

### 4. What records need `clientId`
- **Projects (`Project`)**: Optional `clientId?: string`. Scopes the project to a specific client under a workspace.
- **Template Family Records (`TemplateFamilyRecord`)**: Optional `clientId?: string`. Dedicated client-specific templates (e.g. bespoke client quarterly report template). Must match client's `workspaceId`.
- **Brand Systems (`BrandSystem`)**: Optional `clientId?: string`. Distinct client brand styling (colors, display/body fonts).
- **Generated DesignSpec metadata**: `metadata.clientId?: string`.
- **Reference Profiles**: Optional `clientId?: string`.

### 5. What local mode can support
- Local storage for workspaces (`forma.workspaces.v1`) and clients (`forma.clients.v1`).
- Deterministic simulation of roles (`owner`, `admin`, `designer`, `viewer`) for testing and local operation.
- In-memory stores for unit and benchmark tests (`MemoryWorkspaceStore`, `MemoryClientStore`).
- Full client-aware template selection and create flow offline.
- Backward compatibility: records without `workspaceId` or `clientId` remain personal and accessible.

### 6. What hosted mode can support
- Hosted API endpoints:
  - `GET /api/workspaces`, `POST /api/workspaces`, `GET /api/workspaces/:id`, `PUT /api/workspaces/:id`, `DELETE /api/workspaces/:id`
  - `GET /api/workspaces/:workspaceId/clients`, `POST /api/workspaces/:workspaceId/clients`, `GET /api/clients/:id`, `PUT /api/clients/:id`, `POST /api/clients/:id/archive`
  - Member management: `POST /api/workspaces/:id/members`, `DELETE /api/workspaces/:id/members/:userId`
- Database migration `202610090001_workspace_and_client_kinds.sql` expanding `forma_records_kind_check` and `forma_save`/`forma_remove` to support `workspace` and `client` kinds.
- Access enforcement: server-side verification that caller belongs to the workspace with appropriate role before reading or mutating workspace/client records.

### 7. What must be deferred (Strictly Non-Goals for Phase 7)
- Billing / paid seats / seat tiers.
- Public marketplace monetization.
- Real-time collaborative multi-cursor canvas editing.
- Slack / Google Drive / Figma live integrations.
- External client login portal (clients having direct login accounts to Forma).
- Full CRM features (deals, invoices, sales pipeline).
- Automated invoicing and white-label custom domains.
- Complex audit log query engine (we implement lightweight activity tracking v1).

---

## Part B — Workspace Model

A workspace is the root organization unit for an agency, team, or personal workspace.

```ts
interface WorkspaceRecord {
  id: string;
  version: "1.0";
  name: string;
  description?: string;
  ownerId?: string;
  type: "personal" | "agency" | "team";
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceMember {
  userId: string;
  email?: string;
  name?: string;
  role: "owner" | "admin" | "designer" | "viewer";
  status: "active" | "invited" | "removed";
  invitedAt?: string;
  joinedAt?: string;
}

interface WorkspaceSettings {
  defaultProjectVisibility?: "workspace" | "private";
  allowTemplateSharing?: boolean;
  allowPublicTemplatePublishing?: boolean;
}
```

---

## Part C — Client Model

A client is an account or brand container beneath an agency workspace.

```ts
interface ClientRecord {
  id: string;
  version: "1.0";
  workspaceId: string;
  name: string;
  description?: string;
  status: "active" | "archived";
  brandIds: string[];
  templateFamilyRecordIds: string[];
  projectIds: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Part D — Deterministic Permissions

Pure functions of actor + target record:

- `canViewWorkspace(user, workspace)`
- `canEditWorkspace(user, workspace)`
- `canManageMembers(user, workspace)`
- `canCreateClient(user, workspace)`
- `canEditClient(user, client, workspace)`
- `canArchiveClient(user, client, workspace)`
- `canCreateWorkspaceTemplate(user, workspace)`
- `canApproveWorkspaceTemplate(user, workspace)`
- `canUseWorkspaceTemplate(user, workspace, template)`
- `canCreateClientProject(user, client, workspace)`
- `canViewClientProject(user, project, workspace)`
- `canShareWorkspaceTemplate(user, template, workspace)`

Role hierarchy:
- `owner`: full control.
- `admin`: manage clients, templates, projects, invite/remove non-owner members.
- `designer`: create/edit projects, create draft templates, use approved templates.
- `viewer`: view-only access.
