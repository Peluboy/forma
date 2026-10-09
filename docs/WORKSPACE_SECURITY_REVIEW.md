# Workspace Security and Privacy Review (Phase 7)

This document provides the security, privacy, and data isolation audit for Phase 7 (Agency Workspace v1).

---

## 1. Threat Modeling & Isolation Boundaries

### Threat 1: Cross-Workspace Record Leakage
- **Risk**: A member of Workspace A accesses or mutates clients, templates, or projects in Workspace B.
- **Mitigation**:
  - All workspace and client API endpoints (`/api/workspaces/...`, `/api/clients/...`) check that the authenticated caller has an `active` membership in the workspace associated with the target record.
  - In `localStore` and Supabase SQL queries, queries verify `owner_id` and workspace membership.
  - Verified by tests in `tests/workspace.test.ts` and `tests/workspace-api.test.ts`.

### Threat 2: Cross-Client Template Leakage
- **Risk**: Client Alpha's confidential report templates appear in Client Beta's design creation flow.
- **Mitigation**:
  - Template filtering in `/create` explicitly checks `record.clientId`. If `targetClientId` is Client Alpha, templates where `record.clientId === "client-beta"` are omitted.
  - Verified in `scripts/workspace-benchmark.ts` (Case 7).

### Threat 3: Non-Member Access
- **Risk**: An unauthenticated user or unrelated user browses internal workspace resources.
- **Mitigation**:
  - Non-members receive `403 Forbidden` on all private workspace endpoints.
  - In local storage mode, guest users can only access their simulated local workspace.

### Threat 4: Public / Forked Template Private Data Exposure
- **Risk**: Forking or sharing a template leaks workspace metadata (e.g. client names, workspace members).
- **Mitigation**:
  - `sanitizeTemplateForPublicView()` strips all internal metadata, review notes, and member IDs.
  - When a template is forked into a workspace, it becomes a new private record owned by the forking actor and tagged with the target workspace ID.

### Threat 5: Review Link Isolation
- **Risk**: Sending a project review link exposes private workspace data.
- **Mitigation**:
  - Review links resolve only the immutable review snapshot (`review.project`).
  - No workspace membership list, sibling client records, or workspace settings are attached to the review endpoint response.

### Threat 6: Role Privilege Escalation
- **Risk**: A `viewer` generates costly designs or alters templates; a `designer` removes members or deletes workspaces.
- **Mitigation**:
  - Role capabilities are strictly bounded:
    - `viewer`: View only. Cannot create projects, cannot generate designs, cannot approve or edit templates.
    - `designer`: Can create projects and draft templates; cannot approve templates, manage members, or delete workspaces.
    - `admin`: Can manage members and approve templates; cannot delete the workspace or remove the owner.
    - `owner`: Full control.

---

## 2. Benchmark Verification Results

- Total checks: 12 / 12 passed.
- Cross-workspace denial: Verified.
- Cross-client template quarantine: Verified.
- Viewer generation denial: Verified.
- Designer privilege containment: Verified.
- Legacy backward compatibility: Verified.
