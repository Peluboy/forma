# Client Records v1 Specification

This document specifies the data model, storage layers, and relationships for client accounts beneath an agency workspace.

---

## 1. Overview

In creative agency and studio production workflows, an agency produces work for multiple clients. Each client has:
- Their own brand identity (brand tokens, palettes, typography).
- Bespoke approved template families tailored to their reporting style.
- Client-scoped generated design projects.
- Reference designs used to extract client visual languages.

A client is an organizational container, **not a CRM entity**. No billing, pipeline stages, or invoice automation is implemented in Phase 7.

---

## 2. Client Record Schema

```ts
export type ClientStatus = "active" | "archived";

export interface ClientRecord {
  id: string;
  version: "1.0";
  workspaceId: string;
  name: string;
  description?: string;
  status: ClientStatus;
  brandIds: string[];
  templateFamilyRecordIds: string[];
  projectIds: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Scoping & Association Rules

1. **Workspace Boundary**:
   - `client.workspaceId` is immutable after creation.
   - A client always belongs to one workspace. Cross-workspace client access is strictly forbidden.

2. **Template Assignment**:
   - Templates assigned to a client must carry `workspaceId === client.workspaceId` and `clientId === client.id`.
   - Client templates appear first in the `/create` flow when that client is selected.
   - Client templates are never leaked to sibling clients in the same workspace.

3. **Project Assignment**:
   - Projects generated under a client carry `workspaceId === client.workspaceId` and `clientId === client.id`.
   - The project dashboard allows filtering by client.

4. **Archiving**:
   - Archiving a client sets `status: "archived"`.
   - Archived clients are hidden by default from the `/create` flow and active client pickers.
   - Existing projects and templates remain linked and intact.

---

## 4. API Endpoints

- `GET /api/workspaces/:workspaceId/clients`
- `POST /api/workspaces/:workspaceId/clients`
- `GET /api/clients/:id`
- `PUT /api/clients/:id`
- `POST /api/clients/:id/archive`
- `DELETE /api/clients/:id`
