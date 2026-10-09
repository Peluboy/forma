import test from "node:test";
import assert from "node:assert/strict";
import {
  createPersonalWorkspace,
  createAgencyWorkspace,
  createClientRecord,
  validateWorkspace,
  validateClient,
  addMemberToWorkspace,
  removeMemberFromWorkspace,
  updateMemberRole,
  findWorkspaceMember,
  findWorkspaceMemberByEmail,
  canViewWorkspace,
  canEditWorkspace,
  canManageMembers,
  canCreateClient,
  canEditClient,
  canArchiveClient,
  canCreateWorkspaceTemplate,
  canApproveWorkspaceTemplate,
  canUseWorkspaceTemplate,
  canCreateClientProject,
  canViewClientProject,
  canShareWorkspaceTemplate,
  resolveCurrentWorkspaceContext,
  MemoryWorkspaceStore,
  MemoryClientStore,
  type WorkspaceRecord,
  type ClientRecord,
} from "../src/domain/workspace/index.js";
import {
  createTemplateFamilyRecord,
  type TemplateFamilyRecord,
} from "../src/domain/template-authoring/index.js";
import { FORMA_EDITORIAL_REPORT } from "../src/domain/template-family/builtin/editorialReport.js";
import {
  forkTemplateRecord,
  shareTemplateRecord,
} from "../src/domain/template-sharing/index.js";
import {
  isProject,
  createProject,
  type Project,
} from "../src/domain/design/model.js";

test("Workspace Model: create and validate personal and agency workspaces", () => {
  const personal = createPersonalWorkspace("user-1", "Alice");
  assert.equal(personal.type, "personal");
  assert.equal(personal.ownerId, "user-1");
  assert.equal(personal.members.length, 1);
  assert.equal(personal.members[0].role, "owner");
  assert.equal(personal.members[0].status, "active");

  const personalValid = validateWorkspace(personal);
  assert.equal(personalValid.valid, true);

  const agency = createAgencyWorkspace("Design Co", "user-2", "Bob");
  assert.equal(agency.type, "agency");
  assert.equal(agency.name, "Design Co");
  assert.equal(agency.ownerId, "user-2");
  assert.equal(agency.members.length, 1);
  assert.equal(agency.members[0].role, "owner");

  const agencyValid = validateWorkspace(agency);
  assert.equal(agencyValid.valid, true);
});

test("Workspace Model: membership operations", () => {
  let ws = createAgencyWorkspace("Acme Agency", "user-owner", "Owner");

  // Add admin
  ws = addMemberToWorkspace(ws, {
    userId: "user-admin",
    email: "admin@acme.com",
    name: "Admin Alice",
    role: "admin",
    status: "active",
  });
  assert.equal(ws.members.length, 2);
  assert.ok(findWorkspaceMember(ws, "user-admin"));
  assert.ok(findWorkspaceMemberByEmail(ws, "admin@acme.com"));

  // Add invited member without userId
  ws = addMemberToWorkspace(ws, {
    userId: "",
    email: "newdesigner@acme.com",
    role: "designer",
    status: "invited",
  });
  assert.equal(ws.members.length, 3);
  assert.ok(findWorkspaceMemberByEmail(ws, "newdesigner@acme.com"));

  // Update role
  ws = updateMemberRole(ws, "user-admin", "viewer");
  assert.equal(findWorkspaceMember(ws, "user-admin")?.role, "viewer");

  // Remove member
  ws = removeMemberFromWorkspace(ws, "user-admin");
  assert.equal(findWorkspaceMember(ws, "user-admin"), null);
});

test("Client Model: create, archive, and validate client workspace match", () => {
  const ws = createAgencyWorkspace("Alpha Agency", "user-1");
  const otherWs = createAgencyWorkspace("Beta Agency", "user-2");

  const client = createClientRecord({
    workspaceId: ws.id,
    name: "Client Alpha",
    notes: "Top client",
  });

  assert.equal(client.workspaceId, ws.id);
  assert.equal(client.name, "Client Alpha");
  assert.equal(client.status, "active");

  const validMatch = validateClient(client, ws);
  assert.equal(validMatch.valid, true);

  // Mismatch workspace check
  const mismatch = validateClient(client, otherWs);
  assert.equal(mismatch.valid, false);
  assert.match(mismatch.errors[0], /does not match expected workspace/);

  // Archive client
  const archived: ClientRecord = {
    ...client,
    status: "archived",
  };
  assert.equal(archived.status, "archived");
});

test("Permissions: role hierarchy and boundaries (owner, admin, designer, viewer)", () => {
  let ws = createAgencyWorkspace("Studio X", "user-owner");
  ws = addMemberToWorkspace(ws, {
    userId: "user-admin",
    role: "admin",
    status: "active",
  });
  ws = addMemberToWorkspace(ws, {
    userId: "user-designer",
    role: "designer",
    status: "active",
  });
  ws = addMemberToWorkspace(ws, {
    userId: "user-viewer",
    role: "viewer",
    status: "active",
  });
  ws = addMemberToWorkspace(ws, {
    userId: "user-invited",
    role: "designer",
    status: "invited",
  });

  const owner = { userId: "user-owner", signedIn: true };
  const admin = { userId: "user-admin", signedIn: true };
  const designer = { userId: "user-designer", signedIn: true };
  const viewer = { userId: "user-viewer", signedIn: true };
  const invited = { userId: "user-invited", signedIn: true };
  const stranger = { userId: "user-stranger", signedIn: true };
  const anon = { userId: null, signedIn: false };

  const client = createClientRecord({ workspaceId: ws.id, name: "MegaCorp" });

  // Workspace View
  assert.equal(canViewWorkspace(owner, ws), true);
  assert.equal(canViewWorkspace(admin, ws), true);
  assert.equal(canViewWorkspace(designer, ws), true);
  assert.equal(canViewWorkspace(viewer, ws), true);
  assert.equal(canViewWorkspace(invited, ws), false); // invited is not active
  assert.equal(canViewWorkspace(stranger, ws), false);
  assert.equal(canViewWorkspace(anon, ws), false);

  // Workspace Edit & Member Management
  assert.equal(canEditWorkspace(owner, ws), true);
  assert.equal(canEditWorkspace(admin, ws), true);
  assert.equal(canEditWorkspace(designer, ws), false);
  assert.equal(canEditWorkspace(viewer, ws), false);

  assert.equal(canManageMembers(owner, ws), true);
  assert.equal(canManageMembers(admin, ws), true);
  assert.equal(canManageMembers(designer, ws), false);
  assert.equal(canManageMembers(viewer, ws), false);

  // Client Management
  assert.equal(canCreateClient(owner, ws), true);
  assert.equal(canCreateClient(admin, ws), true);
  assert.equal(canCreateClient(designer, ws), false);
  assert.equal(canCreateClient(viewer, ws), false);

  assert.equal(canEditClient(owner, client, ws), true);
  assert.equal(canEditClient(admin, client, ws), true);
  assert.equal(canEditClient(designer, client, ws), false);
  assert.equal(canEditClient(viewer, client, ws), false);

  assert.equal(canArchiveClient(owner, client, ws), true);
  assert.equal(canArchiveClient(admin, client, ws), true);
  assert.equal(canArchiveClient(designer, client, ws), false);

  // Templates
  const approvedTemplate: TemplateFamilyRecord = {
    ...createTemplateFamilyRecord({
      family: FORMA_EDITORIAL_REPORT,
      source: "builtin",
      workspaceId: ws.id,
    }),
    status: "approved",
  };
  const draftTemplate: TemplateFamilyRecord = {
    ...approvedTemplate,
    status: "draft",
  };

  assert.equal(canCreateWorkspaceTemplate(owner, ws), true);
  assert.equal(canCreateWorkspaceTemplate(admin, ws), true);
  assert.equal(canCreateWorkspaceTemplate(designer, ws), true);
  assert.equal(canCreateWorkspaceTemplate(viewer, ws), false);

  assert.equal(canApproveWorkspaceTemplate(owner, ws), true);
  assert.equal(canApproveWorkspaceTemplate(admin, ws), true);
  assert.equal(canApproveWorkspaceTemplate(designer, ws), false);
  assert.equal(canApproveWorkspaceTemplate(viewer, ws), false);

  // Usage: designer can use approved templates; viewer cannot generate/edit
  assert.equal(canUseWorkspaceTemplate(designer, ws, approvedTemplate), true);
  assert.equal(canUseWorkspaceTemplate(viewer, ws, approvedTemplate), false);
  // Designer cannot use unapproved drafts for generation
  assert.equal(canUseWorkspaceTemplate(designer, ws, draftTemplate), false);

  // Projects
  assert.equal(canCreateClientProject(designer, client, ws), true);
  assert.equal(canCreateClientProject(viewer, client, ws), false);
  assert.equal(canCreateClientProject(stranger, client, ws), false);
});

test("Permissions: cross-workspace leakage prevention", () => {
  const ws1 = createAgencyWorkspace("Workspace 1", "user-1");
  const ws2 = createAgencyWorkspace("Workspace 2", "user-2");
  const memberWs1 = { userId: "user-1", signedIn: true };

  const clientWs2 = createClientRecord({
    workspaceId: ws2.id,
    name: "Secret Client",
  });

  // Member of ws1 cannot view or create projects in ws2's client
  assert.equal(canViewWorkspace(memberWs1, ws2), false);
  assert.equal(canEditClient(memberWs1, clientWs2, ws2), false);
  assert.equal(canCreateClientProject(memberWs1, clientWs2, ws2), false);
});

test("Persistence: in-memory workspace and client stores", () => {
  const wsStore = new MemoryWorkspaceStore();
  const clStore = new MemoryClientStore();

  const ws = createAgencyWorkspace("Test Studio", "user-x");
  wsStore.save(ws);

  assert.equal(wsStore.get(ws.id)?.name, "Test Studio");
  assert.equal(wsStore.list().length, 1);

  const client = createClientRecord({
    workspaceId: ws.id,
    name: "Acme Client",
  });
  clStore.save(client);

  assert.equal(clStore.get(client.id)?.name, "Acme Client");
  assert.equal(clStore.listForWorkspace(ws.id).length, 1);
  assert.equal(clStore.listForWorkspace("unknown-ws").length, 0);

  // Archive
  const archived = clStore.archive(client.id);
  assert.equal(archived?.status, "archived");
  assert.equal(clStore.get(client.id)?.status, "archived");
});

test("Template Scoping: hierarchy (client-level -> workspace-level -> personal)", () => {
  const wsId = "ws-100";
  const clientAId = "client-a";
  const clientBId = "client-b";

  const clientATemplate = {
    ...createTemplateFamilyRecord({
      family: { ...FORMA_EDITORIAL_REPORT, id: "t-a", name: "Client A Custom" },
      source: "builtin",
      workspaceId: wsId,
      clientId: clientAId,
    }),
    status: "approved" as const,
  };

  const wsTemplate = {
    ...createTemplateFamilyRecord({
      family: {
        ...FORMA_EDITORIAL_REPORT,
        id: "t-ws",
        name: "Workspace Universal",
      },
      source: "builtin",
      workspaceId: wsId,
    }),
    status: "approved" as const,
  };

  const clientBTemplate = {
    ...createTemplateFamilyRecord({
      family: { ...FORMA_EDITORIAL_REPORT, id: "t-b", name: "Client B Custom" },
      source: "builtin",
      workspaceId: wsId,
      clientId: clientBId,
    }),
    status: "approved" as const,
  };

  const all = [wsTemplate, clientBTemplate, clientATemplate];

  // For Client A:
  // Should see Client A template first, then workspace template, never Client B
  const scopedForA = all
    .filter((t) => {
      if (t.clientId) return t.clientId === clientAId;
      if (t.workspaceId) return t.workspaceId === wsId;
      return true;
    })
    .sort((a, b) => {
      const aScore =
        a.clientId === clientAId ? 2 : a.workspaceId === wsId ? 1 : 0;
      const bScore =
        b.clientId === clientAId ? 2 : b.workspaceId === wsId ? 1 : 0;
      return bScore - aScore;
    });

  assert.equal(scopedForA.length, 2);
  assert.equal(scopedForA[0].id, clientATemplate.id);
  assert.equal(scopedForA[1].id, wsTemplate.id);
  assert.equal(
    scopedForA.some((t) => t.id === clientBTemplate.id),
    false,
  );
});

test("Forking: public template can be forked directly into a workspace", () => {
  const publicRecord = {
    ...createTemplateFamilyRecord({
      family: FORMA_EDITORIAL_REPORT,
      source: "builtin",
      ownerId: "creator-99",
    }),
    status: "approved" as const,
  };

  const shareResult = shareTemplateRecord(
    publicRecord,
    { ownerId: "creator-99", signedIn: true },
    { visibility: "public", allowForking: true, license: "free_to_fork" },
  );

  const forked = forkTemplateRecord(
    shareResult.record,
    { ownerId: "agency-user", signedIn: true },
    "Agency Branded Fork",
    undefined,
    "agency-ws-55",
  );

  assert.equal(forked.workspaceId, "agency-ws-55");
  assert.equal(forked.clientId, undefined);
  assert.equal(forked.source, "forked");
  assert.equal(forked.status, "approved");
});

test("Personal Workspace Fallback: resolution and legacy project validation", () => {
  const guestCtx = resolveCurrentWorkspaceContext(null);
  assert.equal(guestCtx.isPersonal, true);
  assert.equal(guestCtx.workspaceId, undefined);

  const userCtx = resolveCurrentWorkspaceContext({
    id: "legacy-user",
    email: "legacy@user.com",
  });
  assert.equal(userCtx.isPersonal, true);
  assert.equal(userCtx.workspaceId, undefined);

  // A legacy project without workspaceId/clientId conforms to isProject()
  const legacyProject = createProject();
  assert.equal(isProject(legacyProject), true);
  assert.equal(legacyProject.workspaceId, undefined);
  assert.equal(legacyProject.clientId, undefined);

  // A scoped project also conforms
  const scopedProject: Project = {
    ...legacyProject,
    id: "proj-scoped",
    workspaceId: "ws-99",
    clientId: "cl-99",
  };
  assert.equal(isProject(scopedProject), true);
  assert.equal(scopedProject.workspaceId, "ws-99");
  assert.equal(scopedProject.clientId, "cl-99");
});
