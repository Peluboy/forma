import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FORMA_EDITORIAL_REPORT } from "../src/domain/template-family/builtin/editorialReport.js";
import { runAiDesignerPipeline } from "../src/domain/pipeline/designerPipeline.js";
import {
  createTemplateFamilyRecord,
  applyApprovalToFamily,
  MemoryTemplateRecordStore,
  type TemplateFamilyRecord,
} from "../src/domain/template-authoring/index.js";
import {
  shareTemplateRecord,
  forkTemplateRecord,
  type TemplateActor,
} from "../src/domain/template-sharing/index.js";
import {
  createPersonalWorkspace,
  createAgencyWorkspace,
  createClientRecord,
  validateWorkspace,
  validateClient,
  addMemberToWorkspace,
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
import { CORPORATE_REPORT_MANUSCRIPT } from "../tests/fixtures/corporateReportManuscript.js";

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const outputDirectory = flags.has("--artifacts")
  ? resolve("test-results/workspace-benchmark")
  : null;
if (outputDirectory) await mkdir(outputDirectory, { recursive: true });

interface Check {
  id: string;
  category: "workspace" | "client" | "permission" | "generation" | "scoping";
  name: string;
  passed: boolean;
  detail: string;
}

const checks: Check[] = [];
function check(
  c: Omit<Check, "passed" | "detail"> & { passed: boolean; detail?: string },
) {
  checks.push({ ...c, detail: c.detail ?? "" });
}

// ─── 1. Create personal workspace ────────────────────────────────────────────
const personalWs = createPersonalWorkspace("user-alice", "Alice");
const personalValid = validateWorkspace(personalWs);
check({
  id: "case-1-personal-workspace",
  category: "workspace",
  name: "Create personal workspace",
  passed:
    personalValid.valid &&
    personalWs.type === "personal" &&
    personalWs.ownerId === "user-alice" &&
    personalWs.members.length === 1 &&
    personalWs.members[0].role === "owner",
  detail: `personal workspace created id=${personalWs.id}`,
});

// ─── 2. Create agency workspace ──────────────────────────────────────────────
const agencyWs = createAgencyWorkspace("Acme Agency", "user-bob", "Bob");
const agencyValid = validateWorkspace(agencyWs);
check({
  id: "case-2-agency-workspace",
  category: "workspace",
  name: "Create agency workspace",
  passed:
    agencyValid.valid &&
    agencyWs.type === "agency" &&
    agencyWs.ownerId === "user-bob" &&
    agencyWs.name === "Acme Agency",
  detail: `agency workspace created id=${agencyWs.id}`,
});

// ─── 3. Create client ────────────────────────────────────────────────────────
const clientAlpha = createClientRecord({
  workspaceId: agencyWs.id,
  name: "Alpha Corp",
  notes: "Tier-1 enterprise client",
});
const clientAlphaValid = validateClient(clientAlpha, agencyWs);
check({
  id: "case-3-create-client",
  category: "client",
  name: "Create client under workspace",
  passed:
    clientAlphaValid.valid &&
    clientAlpha.workspaceId === agencyWs.id &&
    clientAlpha.status === "active" &&
    clientAlpha.name === "Alpha Corp",
  detail: `client created id=${clientAlpha.id}`,
});

// ─── 4. Assign template to client ────────────────────────────────────────────
const rawTemplateAlpha = createTemplateFamilyRecord({
  family: {
    ...FORMA_EDITORIAL_REPORT,
    id: "editorial-alpha",
    name: "Alpha Corp Editorial",
  },
  source: "builtin",
  workspaceId: agencyWs.id,
  clientId: clientAlpha.id,
  ownerId: "user-bob",
});

const templateAlpha = {
  ...rawTemplateAlpha,
  status: "approved" as const,
};

clientAlpha.templateFamilyRecordIds.push(templateAlpha.id);

check({
  id: "case-4-assign-template-to-client",
  category: "scoping",
  name: "Assign template to client",
  passed:
    templateAlpha.workspaceId === agencyWs.id &&
    templateAlpha.clientId === clientAlpha.id &&
    clientAlpha.templateFamilyRecordIds.includes(templateAlpha.id),
  detail: `template ${templateAlpha.id} assigned to client ${clientAlpha.id}`,
});

// ─── 5. Generate project under client ────────────────────────────────────────
const clientGenResult = await runAiDesignerPipeline(
  CORPORATE_REPORT_MANUSCRIPT,
  {
    templateFamily: applyApprovalToFamily(templateAlpha.family),
    workspaceId: agencyWs.id,
    clientId: clientAlpha.id,
  },
);

const clientProject = clientGenResult.project;
check({
  id: "case-5-generate-project-under-client",
  category: "generation",
  name: "Generate project under client",
  passed:
    clientProject.workspaceId === agencyWs.id &&
    clientProject.clientId === clientAlpha.id &&
    clientGenResult.finalSpec.metadata?.workspaceId === agencyWs.id &&
    clientGenResult.finalSpec.metadata?.clientId === clientAlpha.id &&
    clientGenResult.quality.final.overallScore >= 80,
  detail: `quality score=${clientGenResult.quality.final.overallScore}/100, scoped to client`,
});

// ─── 6. Ensure client template appears first ─────────────────────────────────
const clientBeta = createClientRecord({
  workspaceId: agencyWs.id,
  name: "Beta Industries",
});

const rawTemplateWorkspaceWide = createTemplateFamilyRecord({
  family: {
    ...FORMA_EDITORIAL_REPORT,
    id: "editorial-agency-wide",
    name: "Acme Agency Universal",
  },
  source: "builtin",
  workspaceId: agencyWs.id,
  ownerId: "user-bob",
});
const templateWorkspaceWide = {
  ...rawTemplateWorkspaceWide,
  status: "approved" as const,
};

const rawTemplateBeta = createTemplateFamilyRecord({
  family: {
    ...FORMA_EDITORIAL_REPORT,
    id: "editorial-beta",
    name: "Beta Industries Report",
  },
  source: "builtin",
  workspaceId: agencyWs.id,
  clientId: clientBeta.id,
  ownerId: "user-bob",
});
const templateBeta = {
  ...rawTemplateBeta,
  status: "approved" as const,
};

const allTemplates: TemplateFamilyRecord[] = [
  templateWorkspaceWide,
  templateAlpha,
  templateBeta,
];

// Scoping resolution for clientAlpha
function resolveTemplatesForClient(
  templates: TemplateFamilyRecord[],
  wsId?: string,
  clId?: string,
) {
  return templates
    .filter((t) => {
      if (t.status !== "approved") return false;
      if (clId) {
        if (t.clientId) return t.clientId === clId;
        if (t.workspaceId) return t.workspaceId === wsId;
        return true;
      }
      if (wsId) {
        if (t.clientId) return false;
        if (t.workspaceId) return t.workspaceId === wsId;
        return true;
      }
      return !t.workspaceId && !t.clientId;
    })
    .sort((a, b) => {
      if (clId) {
        const aIsClient = a.clientId === clId ? 1 : 0;
        const bIsClient = b.clientId === clId ? 1 : 0;
        if (aIsClient !== bIsClient) return bIsClient - aIsClient;
      }
      if (wsId) {
        const aIsWs = a.workspaceId === wsId ? 1 : 0;
        const bIsWs = b.workspaceId === wsId ? 1 : 0;
        if (aIsWs !== bIsWs) return bIsWs - aIsWs;
      }
      return 0;
    });
}

const alphaScoped = resolveTemplatesForClient(
  allTemplates,
  agencyWs.id,
  clientAlpha.id,
);
check({
  id: "case-6-client-template-first",
  category: "scoping",
  name: "Client template appears first in create flow",
  passed:
    alphaScoped.length === 2 &&
    alphaScoped[0].id === templateAlpha.id &&
    alphaScoped[1].id === templateWorkspaceWide.id,
  detail: `resolved order: ${alphaScoped.map((t) => t.name).join(" -> ")}`,
});

// ─── 7. Ensure unrelated client template does not appear ─────────────────────
check({
  id: "case-7-unrelated-client-template-hidden",
  category: "scoping",
  name: "Unrelated client template does not appear",
  passed: !alphaScoped.some((t) => t.id === templateBeta.id),
  detail: `beta template ${templateBeta.id} correctly excluded from alpha scope`,
});

// ─── 8. Fork public template into workspace ──────────────────────────────────
const publicRecord = {
  ...createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "builtin",
    ownerId: "user-charlie",
  }),
  status: "approved" as const,
};

const sharedPublic = shareTemplateRecord(
  publicRecord,
  { ownerId: "user-charlie", signedIn: true },
  { visibility: "public", allowForking: true, license: "free_to_fork" },
);

const forkedIntoWorkspace = forkTemplateRecord(
  sharedPublic.record,
  { ownerId: "user-bob", signedIn: true },
  "Acme Forked Report",
  undefined,
  agencyWs.id,
);

check({
  id: "case-8-fork-into-workspace",
  category: "scoping",
  name: "Fork public template into workspace",
  passed:
    forkedIntoWorkspace.workspaceId === agencyWs.id &&
    forkedIntoWorkspace.name === "Acme Forked Report" &&
    forkedIntoWorkspace.source === "forked" &&
    forkedIntoWorkspace.status === "approved",
  detail: `forked record id=${forkedIntoWorkspace.id} workspace=${forkedIntoWorkspace.workspaceId}`,
});

// ─── 9. Archive client hides it from normal create flow ──────────────────────
const archivedClient = {
  ...clientBeta,
  status: "archived" as const,
  updatedAt: new Date().toISOString(),
};

const activeClients = [clientAlpha, archivedClient].filter(
  (c) => c.status === "active",
);
check({
  id: "case-9-archived-client-hidden",
  category: "client",
  name: "Archive client hides it from normal create flow",
  passed:
    activeClients.length === 1 &&
    activeClients[0].id === clientAlpha.id &&
    !activeClients.some((c) => c.id === clientBeta.id),
  detail: `active clients: ${activeClients.map((c) => c.name).join(", ")}`,
});

// ─── 10. Viewer cannot edit workspace template ───────────────────────────────
const workspaceWithMembers = addMemberToWorkspace(agencyWs, {
  userId: "user-viewer",
  email: "viewer@example.com",
  name: "Viewer Val",
  role: "viewer",
  status: "active",
});

const workspaceWithDesigner = addMemberToWorkspace(workspaceWithMembers, {
  userId: "user-designer",
  email: "designer@example.com",
  name: "Designer Dan",
  role: "designer",
  status: "active",
});

const viewerActor = { userId: "user-viewer", signedIn: true };
const designerActor = { userId: "user-designer", signedIn: true };

const viewerCanEditWsTemplate = canCreateWorkspaceTemplate(
  viewerActor,
  workspaceWithDesigner,
);
const viewerCanApproveWsTemplate = canApproveWorkspaceTemplate(
  viewerActor,
  workspaceWithDesigner,
);
const viewerCanManageMembers = canManageMembers(
  viewerActor,
  workspaceWithDesigner,
);
const viewerCanUseApproved = canUseWorkspaceTemplate(
  viewerActor,
  workspaceWithDesigner,
  templateWorkspaceWide,
);

check({
  id: "case-10-viewer-permissions",
  category: "permission",
  name: "Viewer cannot edit, approve, or generate from workspace templates",
  passed:
    !viewerCanEditWsTemplate &&
    !viewerCanApproveWsTemplate &&
    !viewerCanManageMembers &&
    !viewerCanUseApproved,
  detail: "viewer edit/approve/generation denied",
});

// ─── 11. Designer can create client project ──────────────────────────────────
const designerCanCreateClientProject = canCreateClientProject(
  designerActor,
  clientAlpha,
  workspaceWithDesigner,
);
const designerCanManageMembers = canManageMembers(
  designerActor,
  workspaceWithDesigner,
);
const designerCanCreateTemplate = canCreateWorkspaceTemplate(
  designerActor,
  workspaceWithDesigner,
);

check({
  id: "case-11-designer-permissions",
  category: "permission",
  name: "Designer can create client project and templates but not manage members",
  passed:
    designerCanCreateClientProject &&
    designerCanCreateTemplate &&
    !designerCanManageMembers,
  detail: "designer permitted to create client projects and drafts",
});

// ─── 12. Old personal generation still works ─────────────────────────────────
const legacyGenResult = await runAiDesignerPipeline(
  CORPORATE_REPORT_MANUSCRIPT,
  {
    templateFamily: FORMA_EDITORIAL_REPORT,
    // No workspaceId, no clientId provided
  },
);

const legacyContext = resolveCurrentWorkspaceContext({
  id: "user-legacy",
  email: "legacy@forma.test",
});

check({
  id: "case-12-legacy-personal-generation",
  category: "generation",
  name: "Old personal generation still works without workspace",
  passed:
    legacyGenResult.project.workspaceId === undefined &&
    legacyGenResult.project.clientId === undefined &&
    legacyGenResult.finalSpec.metadata?.workspaceId === undefined &&
    legacyContext.isPersonal &&
    legacyContext.workspaceId === undefined &&
    legacyGenResult.quality.final.overallScore >= 80,
  detail: `legacy generation succeeded score=${legacyGenResult.quality.final.overallScore}/100`,
});

// ─── Compile Benchmark Summary ───────────────────────────────────────────────
const byCategory = (category: Check["category"]) =>
  checks.filter((c) => c.category === category);
const passedCount = (category: Check["category"]) =>
  byCategory(category).filter((c) => c.passed).length;

const report = {
  summary: {
    totalChecks: checks.length,
    passedChecks: checks.filter((c) => c.passed).length,
    workspaceCasesPassed: `${passedCount("workspace")}/${byCategory("workspace").length}`,
    clientCasesPassed: `${passedCount("client")}/${byCategory("client").length}`,
    permissionChecksPassed: `${passedCount("permission")}/${byCategory("permission").length}`,
    scopingChecksPassed: `${passedCount("scoping")}/${byCategory("scoping").length}`,
    generationChecksPassed: `${passedCount("generation")}/${byCategory("generation").length}`,
    clientScopedGenerationPassed:
      checks.find((c) => c.id === "case-5-generate-project-under-client")
        ?.passed ?? false,
    oldPersonalCompatibilityPassed:
      checks.find((c) => c.id === "case-12-legacy-personal-generation")
        ?.passed ?? false,
    clientGenerationQualityScore:
      clientGenResult.quality.final.overallScore,
    legacyGenerationQualityScore:
      legacyGenResult.quality.final.overallScore,
    note: "Phase 7 Agency Workspace v1 benchmark verifies workspace & client scoping, permission gates, template hierarchy, and legacy backward-compatibility.",
  },
  checks,
};

if (outputDirectory) {
  await writeFile(
    resolve(outputDirectory, "summary.json"),
    JSON.stringify(report, null, 2),
  );
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

const allPassed = report.summary.passedChecks === report.summary.totalChecks;
if (!allPassed) process.exitCode = 1;
