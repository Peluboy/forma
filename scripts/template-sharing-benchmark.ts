import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FORMA_EDITORIAL_REPORT } from "../src/domain/template-family/builtin/editorialReport.js";
import { runAiDesignerPipeline } from "../src/domain/pipeline/designerPipeline.js";
import {
  createTemplateFamilyRecord,
  archiveTemplateFamilyRecord,
  applyApprovalToFamily,
  summarizeApproval,
  MemoryTemplateRecordStore,
  type TemplateFamilyRecord,
} from "../src/domain/template-authoring/index.js";
import {
  shareTemplateRecord,
  revokeTemplateShare,
  resolveSharedTemplate,
  listPublicGallery,
  forkTemplateRecord,
  sanitizeTemplateForPublicView,
  canShareTemplate,
  canMakeTemplatePublic,
  canForkTemplate,
  sharingBlockReason,
  forkingBlockReason,
  isShareRevoked,
  type TemplateActor,
} from "../src/domain/template-sharing/index.js";
import { CORPORATE_REPORT_MANUSCRIPT } from "../tests/fixtures/corporateReportManuscript.js";

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const outputDirectory = flags.has("--artifacts")
  ? resolve("test-results/template-sharing-benchmark")
  : null;
if (outputDirectory) await mkdir(outputDirectory, { recursive: true });

const OWNER: TemplateActor = { ownerId: "user-owner", signedIn: true };
const VIEWER: TemplateActor = { ownerId: "user-viewer", signedIn: true };
const ANON: TemplateActor = { ownerId: null, signedIn: false };

interface Check {
  id: string;
  category: "share" | "permission" | "fork" | "generation" | "sanitization";
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

function approvedRecord(ownerId?: string): TemplateFamilyRecord {
  return createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "builtin",
    ...(ownerId ? { ownerId } : {}),
  });
}

// ─── 1. Approved private template can be shared unlisted ─────────────────────
const shared = approvedRecord(OWNER.ownerId);
const unlistedShare = shareTemplateRecord(shared, OWNER, {
  visibility: "unlisted",
  allowForking: true,
  license: "free_to_fork",
  creatorName: "Forma Studio",
});
check({
  id: "share-unlisted-approved",
  category: "share",
  name: "Approved private template can be shared unlisted",
  passed:
    unlistedShare.record.sharing?.visibility === "unlisted" &&
    !!unlistedShare.shareToken &&
    unlistedShare.shareToken.length === 48,
  detail: `token length ${unlistedShare.shareToken.length}`,
});

// ─── 2. Draft template cannot be shared ──────────────────────────────────────
const draft = createTemplateFamilyRecord({
  family: FORMA_EDITORIAL_REPORT,
  source: "manual",
  ownerId: OWNER.ownerId,
});
let draftShareThrew = false;
try {
  shareTemplateRecord(draft, OWNER, { visibility: "unlisted" });
} catch {
  draftShareThrew = true;
}
check({
  id: "share-draft-blocked",
  category: "permission",
  name: "Draft template cannot be shared",
  passed: draftShareThrew && !canShareTemplate(draft, OWNER),
  detail: sharingBlockReason(draft, OWNER) ?? "allowed (unexpected)",
});

// ─── 3. Candidate template cannot be public ──────────────────────────────────
const candidate = createTemplateFamilyRecord({
  family: FORMA_EDITORIAL_REPORT,
  source: "reference_derived",
  ownerId: OWNER.ownerId,
});
check({
  id: "share-candidate-not-public",
  category: "permission",
  name: "Candidate template cannot be public",
  passed: !canMakeTemplatePublic(candidate, OWNER),
  detail: sharingBlockReason(candidate, OWNER) ?? "allowed (unexpected)",
});

// ─── 4. Unlisted share token resolves ────────────────────────────────────────
const resolved = resolveSharedTemplate(
  [unlistedShare.record],
  unlistedShare.shareToken,
);
check({
  id: "share-token-resolves",
  category: "share",
  name: "Unlisted share token resolves",
  passed: resolved?.id === unlistedShare.record.id,
  detail: resolved ? `resolved ${resolved.name}` : "not resolved",
});

// ─── 5. Revoked share token fails ────────────────────────────────────────────
const revoked = revokeTemplateShare(unlistedShare.record, OWNER);
check({
  id: "share-revoked-fails",
  category: "share",
  name: "Revoked share token fails",
  passed:
    isShareRevoked(revoked) &&
    resolveSharedTemplate([revoked], unlistedShare.shareToken) === undefined,
  detail: `revokedAt ${revoked.sharing?.revokedAt ?? "unset"}`,
});

// ─── 6. Public gallery lists approved public template ────────────────────────
const publicShare = shareTemplateRecord(approvedRecord(OWNER.ownerId), OWNER, {
  visibility: "public",
  allowForking: true,
  galleryListed: true,
});
const gallery = listPublicGallery([
  publicShare.record,
  draft,
  candidate,
  revoked,
]);
check({
  id: "gallery-lists-public",
  category: "share",
  name: "Public gallery lists approved public template",
  passed: gallery.length === 1 && gallery[0].id === publicShare.record.id,
  detail: `listed ${gallery.length} template(s)`,
});

// ─── 7. Fork creates independent copy ────────────────────────────────────────
const forkable = shareTemplateRecord(approvedRecord(OWNER.ownerId), OWNER, {
  visibility: "unlisted",
  allowForking: true,
});
const forked = forkTemplateRecord(forkable.record, VIEWER, {
  ownerId: VIEWER.ownerId,
});
forked.family.name = "Mutated fork name";
check({
  id: "fork-independent-copy",
  category: "fork",
  name: "Fork creates independent copy",
  passed:
    forked.id !== forkable.record.id &&
    forked.ownerId === VIEWER.ownerId &&
    forkable.record.family.name !== "Mutated fork name" &&
    forked.family.name === "Mutated fork name",
  detail: `fork ${forked.id} vs source ${forkable.record.id}`,
});

// ─── 8. Fork preserves lineage ───────────────────────────────────────────────
check({
  id: "fork-preserves-lineage",
  category: "fork",
  name: "Fork preserves lineage",
  passed:
    forked.forkedFrom?.forkedFromTemplateId === forkable.record.templateId &&
    forked.forkedFrom?.forkedFromVersionId === forkable.record.id &&
    forked.forkedFrom?.originalTemplateId === forkable.record.templateId &&
    forked.forkedFrom?.lineageRootId === forkable.record.templateId,
  detail: `original ${forked.forkedFrom?.originalTemplateId}`,
});

// Forking disabled when allowForking is false.
const notForkable = approvedRecord(OWNER.ownerId);
check({
  id: "fork-disallowed",
  category: "permission",
  name: "Fork denied when allowForking is false",
  passed:
    !canForkTemplate(notForkable, ANON) &&
    (forkingBlockReason(notForkable, ANON) ?? "").length > 0,
  detail: forkingBlockReason(notForkable, ANON) ?? "allowed (unexpected)",
});

// ─── 9. Forked template can generate report ──────────────────────────────────
let forkGeneration = false;
let forkQuality = 0;
let forkError = "";
try {
  const usable = applyApprovalToFamily(forked.family, forked.approval, {
    requireApprovedLayouts: true,
    includeUnreviewed: false,
  });
  const result = await runAiDesignerPipeline(CORPORATE_REPORT_MANUSCRIPT, {
    family: usable,
    templateRecord: {
      recordId: forked.id,
      templateId: forked.templateId,
      versionNumber: forked.versionNumber,
      source: forked.source,
      status: forked.status,
      ...(forked.sharing?.visibility
        ? { visibility: forked.sharing.visibility }
        : {}),
      ...(forked.forkedFrom
        ? {
            forkedFromTemplateId: forked.forkedFrom.forkedFromTemplateId,
            originalTemplateId: forked.forkedFrom.originalTemplateId,
          }
        : {}),
    },
  });
  forkGeneration = result.success && result.copyCoverage.valid;
  forkQuality = result.quality.final.overallScore;
  const record = summarizeApproval(forked.approval, forked.family);
  check({
    id: "fork-generation-provenance",
    category: "generation",
    name: "Forked generation records lineage metadata",
    passed:
      result.finalSpec.metadata?.templateFamilyRecordId === forked.id &&
      result.finalSpec.metadata?.templateFamilyForkedFromTemplateId ===
        forked.forkedFrom?.forkedFromTemplateId,
    detail: `record ${record.approvedLayoutCount}/${record.layoutCount} layouts approved`,
  });
} catch (error) {
  forkError = error instanceof Error ? error.message : "unknown failure";
}
check({
  id: "fork-generates",
  category: "generation",
  name: "Forked template can generate report",
  passed: forkGeneration,
  detail: forkGeneration
    ? `quality ${forkQuality}`
    : forkError || "generation did not complete",
});

// ─── 10. Archived template hidden from normal create picker ──────────────────
const archived = archiveTemplateFamilyRecord(approvedRecord(OWNER.ownerId));
check({
  id: "archived-hidden",
  category: "permission",
  name: "Archived template hidden from normal create picker",
  passed: archived.status === "archived" && !canShareTemplate(archived, OWNER),
  detail: sharingBlockReason(archived, OWNER) ?? "allowed (unexpected)",
});

// ─── 11. Public payload sanitized ────────────────────────────────────────────
const payload = sanitizeTemplateForPublicView(publicShare.record, {
  publicId: publicShare.publicId ?? "public-id",
  visibility: "public",
});
const serialized = JSON.stringify(payload);
const forbidden = [
  '"ownerId"',
  '"usage"',
  '"reference"',
  '"approval"',
  '"reviewerNotes"',
  '"notes"',
];
const leaked = forbidden.filter((key) => serialized.includes(key));
check({
  id: "public-payload-sanitized",
  category: "sanitization",
  name: "Public payload omits private fields",
  passed:
    leaked.length === 0 && payload.id === (publicShare.publicId ?? "public-id"),
  detail: leaked.length
    ? `leaked ${leaked.join(", ")}`
    : "no private keys present",
});

// ─── In-memory store round trip ──────────────────────────────────────────────
const store = new MemoryTemplateRecordStore([
  publicShare.record,
  forked,
  revoked,
]);
check({
  id: "store-round-trip",
  category: "share",
  name: "Shared + forked records persist and reload",
  passed:
    store.get(publicShare.record.id) !== undefined &&
    store.get(forked.id) !== undefined &&
    store.listVersions(forked.templateId).length === 1,
  detail: `${store.list().length} record(s) persisted`,
});

const byCategory = (category: Check["category"]) =>
  checks.filter((c) => c.category === category);
const passed = (category: Check["category"]) =>
  byCategory(category).filter((c) => c.passed).length;

const report = {
  summary: {
    totalChecks: checks.length,
    passedChecks: checks.filter((c) => c.passed).length,
    shareCasesPassed: `${passed("share")}/${byCategory("share").length}`,
    forkCasesPassed: `${passed("fork")}/${byCategory("fork").length}`,
    permissionDenialsPassed: `${passed("permission")}/${byCategory("permission").length}`,
    generationFromForkPassed:
      passed("generation") === byCategory("generation").length,
    lineageMetadataPreserved:
      checks.find((c) => c.id === "fork-preserves-lineage")?.passed ?? false,
    publicPayloadSanitized:
      checks.find((c) => c.id === "public-payload-sanitized")?.passed ?? false,
    forkQualityScore: forkQuality,
    note: "Phase 6 sharing is a safe distribution foundation, not a marketplace. Draft/candidate/rejected templates are never shareable.",
  },
  checks,
};

if (outputDirectory)
  await writeFile(
    resolve(outputDirectory, "summary.json"),
    JSON.stringify(report, null, 2),
  );

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

const allPassed = report.summary.passedChecks === report.summary.totalChecks;
if (!allPassed) process.exitCode = 1;
