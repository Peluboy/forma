import test from "node:test";
import assert from "node:assert/strict";
import { FORMA_EDITORIAL_REPORT } from "../src/domain/template-family/builtin/editorialReport.js";
import {
  createTemplateFamilyRecord,
  archiveTemplateFamilyRecord,
  updateTemplateFamilyRecord,
  applyApprovalToFamily,
  MemoryTemplateRecordStore,
  type TemplateFamilyRecord,
} from "../src/domain/template-authoring/index.js";
import {
  SHARE_TOKEN_LENGTH,
  generateShareToken,
  isShareTokenShaped,
  generatePublicId,
  shareTemplateRecord,
  revokeTemplateShare,
  setTemplateVisibility,
  resolveSharedTemplate,
  listPublicGallery,
  isPublicGalleryListed,
  forkTemplateRecord,
  sanitizeTemplateForPublicView,
  templateGalleryCard,
  templatePreviewDescriptor,
  primaryTemplatePreview,
  isShareActive,
  isTemplateOwner,
  isShareRevoked,
  canEditTemplate,
  canArchiveTemplate,
  canShareTemplate,
  canMakeTemplatePublic,
  canViewSharedTemplate,
  canForkTemplate,
  canUseTemplateInGeneration,
  sharingBlockReason,
  forkingBlockReason,
  ANONYMOUS,
  type TemplateActor,
} from "../src/domain/template-sharing/index.js";
import { runAiDesignerPipeline } from "../src/domain/pipeline/designerPipeline.js";
import { CORPORATE_REPORT_MANUSCRIPT } from "./fixtures/corporateReportManuscript.js";

const OWNER: TemplateActor = { ownerId: "owner-1", signedIn: true };
const OTHER: TemplateActor = { ownerId: "owner-2", signedIn: true };

function approved(ownerId = OWNER.ownerId): TemplateFamilyRecord {
  return createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "builtin",
    ownerId,
  });
}

function sharedUnlisted(): TemplateFamilyRecord {
  return shareTemplateRecord(approved(), OWNER, {
    visibility: "unlisted",
    allowForking: true,
  }).record;
}

// ─── TOKENS ──────────────────────────────────────────────────────────────────

test("share tokens are long, random-looking, and shape-checked", () => {
  const token = generateShareToken();
  assert.equal(token.length, SHARE_TOKEN_LENGTH);
  assert.ok(isShareTokenShaped(token));
  assert.notEqual(generateShareToken(), generateShareToken());
  assert.ok(!isShareTokenShaped("short"));
  assert.ok(!isShareTokenShaped("Z".repeat(SHARE_TOKEN_LENGTH)));
});

test("public ids are slugs that never expose internal ids", () => {
  const id = generatePublicId("Regional Report", []);
  assert.match(id, /^regional-report-[0-9a-f]{8}$/);
  const collisionFree = generatePublicId("Regional Report", [id]);
  assert.notEqual(collisionFree, id);
});

// ─── VISIBILITY ──────────────────────────────────────────────────────────────

test("new records default to private and not forkable", () => {
  const record = approved();
  assert.equal(record.sharing, undefined);
  assert.equal(isShareActive(record), false);
  assert.equal(listPublicGallery([record]).length, 0);
});

test("private templates are hidden from the public gallery", () => {
  const record = approved();
  assert.equal(isPublicGalleryListed(record), false);
});

test("unlisted templates require the matching token to resolve", () => {
  const record = sharedUnlisted();
  assert.equal(record.sharing?.visibility, "unlisted");
  assert.ok(record.sharing?.shareToken);
  assert.equal(
    resolveSharedTemplate([record], record.sharing!.shareToken!)?.id,
    record.id,
  );
  assert.equal(resolveSharedTemplate([record], "0".repeat(48)), undefined);
  assert.equal(
    canViewSharedTemplate(record, ANONYMOUS, record.sharing!.shareToken!),
    true,
  );
  assert.equal(canViewSharedTemplate(record, ANONYMOUS, undefined), false);
});

test("public templates are listed in the gallery", () => {
  const { record } = shareTemplateRecord(approved(), OWNER, {
    visibility: "public",
    galleryListed: true,
  });
  assert.equal(record.sharing?.visibility, "public");
  assert.ok(record.sharing?.publicId);
  const gallery = listPublicGallery([record]);
  assert.equal(gallery.length, 1);
  assert.equal(gallery[0].id, record.id);
  assert.equal(canViewSharedTemplate(record, ANONYMOUS, undefined), true);
});

test("revoked share token fails to resolve and is delisted", () => {
  const record = sharedUnlisted();
  const revoked = revokeTemplateShare(record, OWNER);
  assert.equal(isShareRevoked(revoked), true);
  assert.equal(revoked.sharing?.shareToken, undefined);
  assert.equal(
    resolveSharedTemplate([revoked], record.sharing!.shareToken!),
    undefined,
  );
  assert.equal(isPublicGalleryListed(revoked), false);
  assert.equal(canViewSharedTemplate(revoked, ANONYMOUS, undefined), false);
});

test("archived templates are hidden and cannot newly become public", () => {
  const archived = archiveTemplateFamilyRecord(approved());
  assert.equal(archived.status, "archived");
  assert.equal(isPublicGalleryListed(archived), false);
  assert.equal(canShareTemplate(archived, OWNER), false);
  assert.match(sharingBlockReason(archived, OWNER) ?? "", /Archived/);
});

test("downgrading to private un-lists but keeps the record usable", () => {
  const { record } = shareTemplateRecord(approved(), OWNER, {
    visibility: "public",
  });
  const priv = setTemplateVisibility(record, OWNER, "private");
  assert.equal(priv.sharing?.visibility, "private");
  assert.equal(priv.sharing?.galleryListed, false);
  assert.equal(priv.status, "approved");
});

// ─── PERMISSIONS ─────────────────────────────────────────────────────────────

test("owner can share an approved template; a stranger cannot", () => {
  const record = approved();
  assert.equal(canShareTemplate(record, OWNER), true);
  assert.equal(isTemplateOwner(record, OWNER), true);
  assert.equal(canShareTemplate(record, OTHER), false);
  assert.throws(() =>
    shareTemplateRecord(record, OTHER, { visibility: "unlisted" }),
  );
});

test("draft and candidate templates cannot be shared", () => {
  const draft = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "manual",
    ownerId: OWNER.ownerId,
  });
  const candidate = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "reference_derived",
    ownerId: OWNER.ownerId,
  });
  assert.equal(canShareTemplate(draft, OWNER), false);
  assert.match(sharingBlockReason(draft, OWNER) ?? "", /Drafts cannot/);
  assert.equal(canMakeTemplatePublic(candidate, OWNER), false);
  assert.match(sharingBlockReason(candidate, OWNER) ?? "", /Candidates cannot/);
});

test("a viewer cannot edit, archive, or mutate the original", () => {
  const record = sharedUnlisted();
  assert.equal(canEditTemplate(record, ANONYMOUS), false);
  assert.equal(canEditTemplate(record, OTHER), false);
  assert.equal(canArchiveTemplate(record, OTHER), false);
  assert.equal(canEditTemplate(record, OWNER), true);
});

test("a viewer can fork only when forking is enabled", () => {
  const forkable = sharedUnlisted();
  assert.equal(canForkTemplate(forkable, ANONYMOUS), true);
  assert.equal(forkingBlockReason(forkable, ANONYMOUS), null);
  const locked = approved();
  assert.equal(canForkTemplate(locked, ANONYMOUS), false);
  assert.match(forkingBlockReason(locked, ANONYMOUS) ?? "", /not enabled/);
});

test("generation requires owning an approved template", () => {
  const record = approved();
  assert.equal(canUseTemplateInGeneration(record, OWNER), true);
  assert.equal(canUseTemplateInGeneration(record, OTHER), false);
  const archived = archiveTemplateFamilyRecord(record);
  assert.equal(canUseTemplateInGeneration(archived, OWNER), false);
  const candidate = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "reference_derived",
    ownerId: OWNER.ownerId,
  });
  assert.equal(canUseTemplateInGeneration(candidate, OWNER), false);
});

// ─── PUBLIC PAYLOAD ──────────────────────────────────────────────────────────

test("sanitized public payload removes private fields", () => {
  const { record } = shareTemplateRecord(approved(), OWNER, {
    visibility: "public",
    allowForking: true,
    creatorName: "Forma Studio",
    license: "free_to_fork",
  });
  const withNotes = updateTemplateFamilyRecord(record, {
    usage: {
      ...record.usage!,
      timesUsed: 42,
      commonFailures: [{ code: "OVERFLOW", count: 3 }],
    },
  });
  const payload = sanitizeTemplateForPublicView(withNotes, {
    publicId: record.sharing!.publicId!,
    visibility: "public",
  });
  const serialized = JSON.stringify(payload);
  for (const forbidden of [
    "ownerId",
    "usage",
    "reference",
    "approval",
    "reviewedLayouts",
    "reviewerNotes",
    "approvedBy",
    "timesUsed",
  ])
    assert.ok(!serialized.includes(forbidden), `leaked ${forbidden}`);

  assert.equal(payload.id, record.sharing!.publicId);
  assert.equal(payload.templateId, record.templateId);
  assert.equal(payload.attribution?.creatorName, "Forma Studio");
  assert.equal(payload.license, "free_to_fork");
  assert.equal(payload.allowForking, true);
  assert.equal(payload.visibility, "public");
  assert.ok(payload.layoutCount > 0);
  assert.ok(payload.pageRoles.length > 0);
});

test("sanitizing a non-approved template throws", () => {
  const draft = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "manual",
    ownerId: OWNER.ownerId,
  });
  assert.throws(() =>
    sanitizeTemplateForPublicView(draft, {
      publicId: "x",
      visibility: "unlisted",
    }),
  );
});

test("gallery card is a thin projection of the public payload", () => {
  const { record } = shareTemplateRecord(approved(), OWNER, {
    visibility: "public",
    creatorName: "Ada",
  });
  const card = templateGalleryCard(
    sanitizeTemplateForPublicView(record, {
      publicId: record.sharing!.publicId!,
      visibility: "public",
    }),
  );
  assert.equal(card.name, record.name);
  assert.equal(card.creatorName, "Ada");
  assert.ok(!JSON.stringify(card).includes("ownerId"));
});

test("preview descriptors fall back safely when no asset exists", () => {
  const record = approved();
  const previews = templatePreviewDescriptor(record);
  assert.equal(previews.length, record.family.layouts.length);
  for (const preview of previews)
    assert.ok(["layout_preview", "placeholder"].includes(preview.kind));
  const primary = primaryTemplatePreview(record);
  assert.ok(primary);
  assert.equal(primary!.role, "cover");
});

// ─── FORKING ─────────────────────────────────────────────────────────────────

test("forking deep-copies the family and never mutates the original", () => {
  const source = sharedUnlisted();
  const originalName = source.family.name;
  const fork = forkTemplateRecord(source, OTHER, { ownerId: OTHER.ownerId });
  fork.family.name = "Changed";
  fork.family.layouts[0].id = "changed";
  assert.equal(source.family.name, originalName);
  assert.notEqual(source.family.layouts[0].id, "changed");
  assert.notEqual(fork.family.layouts, source.family.layouts);
});

test("fork is a new lineage-rooted record owned by the forking user", () => {
  const source = sharedUnlisted();
  const fork = forkTemplateRecord(source, OTHER, { ownerId: OTHER.ownerId });
  assert.notEqual(fork.id, source.id);
  assert.notEqual(fork.templateId, source.templateId);
  assert.equal(fork.ownerId, OTHER.ownerId);
  assert.equal(fork.source, "forked");
  assert.equal(isTemplateOwner(fork, OTHER), true);
  assert.equal(isTemplateOwner(fork, OWNER), false);
});

test("fork preserves lineage metadata back to the original", () => {
  const source = sharedUnlisted();
  const fork = forkTemplateRecord(source, OTHER, { ownerId: OTHER.ownerId });
  assert.equal(fork.forkedFrom?.forkedFromTemplateId, source.templateId);
  assert.equal(fork.forkedFrom?.forkedFromVersionId, source.id);
  assert.equal(fork.forkedFrom?.originalTemplateId, source.templateId);
  assert.equal(fork.forkedFrom?.lineageRootId, source.templateId);
  assert.equal(fork.forkedFrom?.forkedFromOwnerId, OWNER.ownerId);
});

test("fork approval policy: approved source forks private-approved; edits reset", () => {
  const source = sharedUnlisted();
  const fork = forkTemplateRecord(source, OTHER, { ownerId: OTHER.ownerId });
  assert.equal(fork.status, "approved");
  assert.equal(fork.sharing, undefined);

  // Editing a fork goes through the normal patch path, which can reset status.
  const edited = updateTemplateFamilyRecord(fork, {
    status: "draft",
    changelog: "Local modifications.",
  });
  assert.equal(edited.status, "draft");
  assert.equal(edited.forkedFrom?.forkedFromTemplateId, source.templateId);
});

test("forking a non-approved template throws", () => {
  const candidate = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "reference_derived",
    ownerId: OWNER.ownerId,
  });
  candidate.sharing = { visibility: "unlisted", allowForking: true };
  assert.throws(() => forkTemplateRecord(candidate, OTHER, {}));
});

test("a forked template can generate a report and records lineage", async () => {
  const source = sharedUnlisted();
  const fork = forkTemplateRecord(source, OTHER, { ownerId: OTHER.ownerId });
  const usable = applyApprovalToFamily(fork.family, fork.approval, {
    requireApprovedLayouts: true,
  });
  const result = await runAiDesignerPipeline(CORPORATE_REPORT_MANUSCRIPT, {
    family: usable,
    templateRecord: {
      recordId: fork.id,
      templateId: fork.templateId,
      versionNumber: fork.versionNumber,
      source: fork.source,
      status: fork.status,
      forkedFromTemplateId: fork.forkedFrom?.forkedFromTemplateId,
      originalTemplateId: fork.forkedFrom?.originalTemplateId,
    },
  });
  assert.equal(result.template.used, true);
  assert.equal(result.template.source, "forked");
  assert.equal(result.finalSpec.metadata?.templateFamilyRecordId, fork.id);
  assert.equal(
    result.finalSpec.metadata?.templateFamilyForkedFromTemplateId,
    source.templateId,
  );
});

// ─── CREATE FLOW / PERSISTENCE ───────────────────────────────────────────────

test("an approved template's visibility is recorded on generated output", async () => {
  const { record } = shareTemplateRecord(approved(), OWNER, {
    visibility: "public",
    allowForking: true,
  });
  const usable = applyApprovalToFamily(record.family, record.approval, {
    requireApprovedLayouts: true,
  });
  const result = await runAiDesignerPipeline(CORPORATE_REPORT_MANUSCRIPT, {
    family: usable,
    templateRecord: {
      recordId: record.id,
      templateId: record.templateId,
      versionNumber: record.versionNumber,
      source: record.source,
      status: record.status,
      visibility: record.sharing?.visibility,
    },
  });
  assert.equal(result.finalSpec.metadata?.templateFamilyVisibility, "public");
  assert.equal(result.finalSpec.metadata?.templateFamilyRecordId, record.id);
});

test("memory store persists shared and forked records", () => {
  const { record } = shareTemplateRecord(approved(), OWNER, {
    visibility: "public",
    allowForking: true,
  });
  const fork = forkTemplateRecord(record, OTHER, { ownerId: OTHER.ownerId });
  const store = new MemoryTemplateRecordStore([record, fork]);
  assert.equal(store.list().length, 2);
  assert.ok(store.get(fork.id));
  assert.equal(store.listVersions(fork.templateId).length, 1);
});
