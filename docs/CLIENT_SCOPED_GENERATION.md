# Client-Scoped Generation Specification

This document describes how the AI Designer pipeline, template resolution, and project creation flows operate under agency workspace and client scoping.

---

## 1. Flow Overview

When an agency designer creates a document:
1. Designer selects **Workspace** (e.g. "Apex Creative Agency").
2. Designer selects **Client** (e.g. "Nexus Health").
3. Forma prioritizes:
   - **Client-dedicated approved templates** first (e.g. `[Client] Nexus Quarterly Report`).
   - **Workspace-wide approved templates** next (e.g. `[Workspace] Acme Agency Report`).
   - **Personal / Public / Forked approved templates** after.
   - Sibling client templates are strictly omitted.
4. When generation runs (`runAiDesignerPipeline`):
   - `workspaceId` and `clientId` are passed in `DesignerPipelineOptions`.
   - The resulting `DesignSpec.metadata` captures `workspaceId` and `clientId`.
   - The projected `Project` record is tagged with `project.workspaceId` and `project.clientId`.
   - The client record's `projectIds` list is updated.

---

## 2. Template Resolution Hierarchy

```
┌────────────────────────────────────────────────────────┐
│           Client-Specific Approved Templates          │ (Highest priority)
├────────────────────────────────────────────────────────┤
│           Workspace-Wide Approved Templates            │
├────────────────────────────────────────────────────────┤
│           Personal / Forked Approved Templates         │
├────────────────────────────────────────────────────────┤
│           Built-in Editorial Report (Fallback)         │
└────────────────────────────────────────────────────────┘
```

Unapproved drafts and candidates remain hidden from normal generation flows.

---

## 3. Brand Resolution Hierarchy

1. **Client Brand System** (if configured for client).
2. **Workspace Brand System** (agency default brand).
3. **Personal / Guest Brand** (fallback).

---

## 4. Legacy Compatibility

If no workspace or client is selected:
- Flow behaves as standard personal generation.
- Generated project has `workspaceId: undefined` and `clientId: undefined`.
- Fully conforms to `isProject()` and existing persistence.
