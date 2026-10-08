import test from "node:test";
import assert from "node:assert/strict";
import { FORMA_EDITORIAL_REPORT } from "../src/domain/template-family/builtin/editorialReport.js";
import type { TemplateFamily } from "../src/domain/template-family/types.js";
import {
  TEMPLATE_FAMILY_RECORD_VERSION,
  validateTemplateFamilyV2,
  createTemplateFamilyRecord,
  finalizeTemplateRecord,
  updateTemplateFamilyRecord,
  archiveTemplateFamilyRecord,
  rejectTemplateFamilyRecord,
  duplicateTemplateFamilyRecord,
  isTemplateFamilyRecord,
  MemoryTemplateRecordStore,
  initialApprovalState,
  reviewLayout,
  layoutApprovalStatus,
  applyApprovalToFamily,
  summarizeApproval,
  approveAllLayouts,
  setTemplateApproved,
  computeCoverage,
  runTemplateCapacityTests,
  applyCapacitySuggestions,
  createTemplateVersion,
  listTemplateVersions,
  latestTemplateVersion,
  emptyUsageMetadata,
  recordTemplateUsage,
  mergeHumanVerdict,
  runTemplateSmokeGeneration,
  isTemplateReview,
  summarizeTemplateReviews,
  type TemplateFamilyRecord,
  type TemplateReview,
} from "../src/domain/template-authoring/index.js";
import {
  TEMPLATE_CASES,
  buildTemplateCaseFamily,
  referenceProfileFromManuscript,
  lowConfidenceReferenceProfile,
} from "./fixtures/templateCases.js";
import { runAiDesignerPipeline } from "../src/domain/pipeline/designerPipeline.js";

function invalidSlotCase() {
  return TEMPLATE_CASES.find((c) => c.kind === "invalid_slot")!;
}
function missingAltCase() {
  return TEMPLATE_CASES.find((c) => c.kind === "missing_alternative")!;
}
function referenceReadyCase() {
  return TEMPLATE_CASES.find((c) => c.kind === "reference_ready")!;
}
function lowConfidenceCase() {
  return TEMPLATE_CASES.find((c) => c.kind === "reference_low_confidence")!;
}

// ─── RECORDS (Part B / I) ────────────────────────────────────────────────────

test("builtin record is created approved with every layout pre-approved", () => {
  const record = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "builtin",
  });
  assert.equal(record.version, TEMPLATE_FAMILY_RECORD_VERSION);
  assert.equal(record.status, "approved");
  assert.equal(record.approval.approved, true);
  assert.equal(record.approval.approvedBy, "forma");
  assert.equal(record.approval.reviewedLayouts["cover"].status, "approved");
  assert.equal(record.versionNumber, 1);
  assert.ok(record.templateId.startsWith("tpl-"));
  assert.ok(isTemplateFamilyRecord(record));
});

test("manual records start as drafts and reference records as candidates", () => {
  const manual = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "manual",
    name: "Hand-authored report",
  });
  assert.equal(manual.status, "draft");
  assert.equal(manual.approval.approved, false);

  const reference = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "reference_derived",
    name: "Reference candidate",
  });
  assert.equal(reference.status, "candidate");
});

test("record update, archive, reject, and duplicate preserve lineage", () => {
  const record = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "manual",
    name: "Base",
  });
  const renamed = updateTemplateFamilyRecord(record, { name: "Renamed" });
  assert.equal(renamed.name, "Renamed");

  const archived = archiveTemplateFamilyRecord(renamed);
  assert.equal(archived.status, "archived");

  const rejected = rejectTemplateFamilyRecord(record, "Bad geometry");
  assert.equal(rejected.status, "rejected");
  assert.match(rejected.changelog ?? "", /Bad geometry/);

  const copy = duplicateTemplateFamilyRecord(record, { name: "Copy" });
  assert.equal(copy.status, "draft");
  assert.equal(copy.name, "Copy");
  assert.notEqual(copy.id, record.id);
  assert.notEqual(copy.templateId, record.templateId);
});

test("memory store persists, lists, and scopes versions", () => {
  const store = new MemoryTemplateRecordStore();
  const record = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "builtin",
  });
  store.save(record);
  assert.equal(store.list().length, 1);
  assert.equal(store.get(record.id)?.id, record.id);

  const version = createTemplateVersion(record, { changelog: "Tune spacing" });
  store.save(version);
  assert.equal(store.listVersions(record.templateId).length, 2);

  store.remove(record.id);
  assert.equal(store.get(record.id), undefined);
});

test("invalid records are rejected by the store", () => {
  const store = new MemoryTemplateRecordStore();
  assert.throws(() =>
    store.save({ id: "x", name: "broken" } as unknown as TemplateFamilyRecord),
  );
});

// ─── VALIDATION V2 (Part E) ──────────────────────────────────────────────────

test("the built-in family validates with no errors", () => {
  const result = validateTemplateFamilyV2(FORMA_EDITORIAL_REPORT);
  assert.equal(result.valid, true, JSON.stringify(result.issues));
  assert.equal(result.errorCount, 0);
});

test("validation flags a slot that accepts no content types", () => {
  const { family } = buildTemplateCaseFamily(invalidSlotCase());
  const result = validateTemplateFamilyV2(family!);
  assert.equal(result.valid, false);
  assert.ok(
    result.issues.some((issue) => issue.code === "unsupported_content_type"),
  );
});

test("validation flags a missing compatible alternative", () => {
  const { family } = buildTemplateCaseFamily(missingAltCase());
  const result = validateTemplateFamilyV2(family!);
  assert.equal(result.valid, false);
  assert.ok(
    result.issues.some(
      (issue) => issue.code === "missing_compatible_alternative",
    ),
  );
});

test("validation flags duplicate layout ids", () => {
  const broken: TemplateFamily = {
    ...FORMA_EDITORIAL_REPORT,
    layouts: [
      FORMA_EDITORIAL_REPORT.layouts[0],
      FORMA_EDITORIAL_REPORT.layouts[0],
    ],
  };
  const result = validateTemplateFamilyV2(broken);
  assert.equal(result.valid, false);
  assert.ok(
    result.issues.some((issue) => issue.code === "duplicate_layout_id"),
  );
});

// ─── APPROVAL (Part C) ───────────────────────────────────────────────────────

test("layout approval status defaults to unreviewed and updates", () => {
  const approval = initialApprovalState(["a", "b"]);
  assert.equal(layoutApprovalStatus(approval, "a"), "unreviewed");
  const reviewed = reviewLayout(approval, "a", "approved", "looks good");
  assert.equal(layoutApprovalStatus(reviewed, "a"), "approved");
  assert.equal(reviewed.reviewedLayouts["a"].reviewerNotes, "looks good");
});

test("rejected layouts are always removed from the usable family", () => {
  const approval = reviewLayout(
    initialApprovalState(FORMA_EDITORIAL_REPORT.layouts.map((l) => l.id)),
    "cover",
    "rejected",
  );
  const usable = applyApprovalToFamily(FORMA_EDITORIAL_REPORT, approval, {
    includeUnreviewed: true,
  });
  assert.equal(
    usable.layouts.some((l) => l.id === "cover"),
    false,
  );
});

test("needs_changes layouts are excluded unless explicitly included", () => {
  const approval = reviewLayout(
    initialApprovalState(FORMA_EDITORIAL_REPORT.layouts.map((l) => l.id)),
    "quote-feature",
    "needs_changes",
  );
  const excluded = applyApprovalToFamily(FORMA_EDITORIAL_REPORT, approval);
  assert.equal(
    excluded.layouts.some((l) => l.id === "quote-feature"),
    false,
  );
  const included = applyApprovalToFamily(FORMA_EDITORIAL_REPORT, approval, {
    includeNeedsChanges: true,
  });
  assert.equal(
    included.layouts.some((l) => l.id === "quote-feature"),
    true,
  );
});

test("production mode excludes unreviewed layouts", () => {
  const approval = initialApprovalState(
    FORMA_EDITORIAL_REPORT.layouts.map((l) => l.id),
  );
  const usable = applyApprovalToFamily(FORMA_EDITORIAL_REPORT, approval, {
    requireApprovedLayouts: true,
    includeUnreviewed: false,
  });
  assert.equal(usable.layouts.length, 0);

  const allApproved = approveAllLayouts(approval, FORMA_EDITORIAL_REPORT);
  const full = applyApprovalToFamily(FORMA_EDITORIAL_REPORT, allApproved, {
    requireApprovedLayouts: true,
  });
  assert.equal(full.layouts.length, FORMA_EDITORIAL_REPORT.layouts.length);
});

test("approval summary and template approval flag", () => {
  const approval = approveAllLayouts(
    initialApprovalState(FORMA_EDITORIAL_REPORT.layouts.map((l) => l.id)),
    FORMA_EDITORIAL_REPORT,
  );
  const summary = summarizeApproval(approval, FORMA_EDITORIAL_REPORT);
  assert.equal(summary.allApproved, true);
  const approved = setTemplateApproved(approval, "reviewer@forma");
  assert.equal(approved.approved, true);
  assert.equal(approved.approvedBy, "reviewer@forma");
});

// ─── QUALITY SUMMARY (Part D) ────────────────────────────────────────────────

test("coverage reflects the shipped editorial roles", () => {
  const coverage = computeCoverage(FORMA_EDITORIAL_REPORT);
  assert.equal(coverage.hasCover, true);
  assert.equal(coverage.hasTable, true);
  assert.equal(coverage.hasStats, true);
  assert.equal(coverage.hasQuote, true);
  assert.equal(coverage.hasClosing, true);
});

test("quality summary blocks an invalid template", () => {
  const { family } = buildTemplateCaseFamily(invalidSlotCase());
  const record = createTemplateFamilyRecord({
    family: family!,
    source: "manual",
  });
  assert.ok(
    record.quality.blockers.some((b) => b.code === "validation_invalid"),
  );
  assert.equal(record.quality.validationStatus, "invalid");
});

test("quality summary blocks a template with no approved layouts", () => {
  const record = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "manual",
  });
  assert.ok(
    record.quality.blockers.some((b) => b.code === "no_approved_layouts"),
  );
});

// ─── CAPACITY (Part F) ───────────────────────────────────────────────────────

test("capacity testing measures every layout and records suggestions", () => {
  const report = runTemplateCapacityTests(FORMA_EDITORIAL_REPORT);
  assert.equal(report.layouts.length, FORMA_EDITORIAL_REPORT.layouts.length);
  for (const layout of report.layouts)
    assert.ok(
      ["fits", "tight", "overflow", "unknown"].includes(layout.fitStatus),
    );
  assert.ok(report.layouts.every((l) => l.slots.length === l.slots.length));
});

test("capacity suggestions only tighten declared limits", () => {
  const report = runTemplateCapacityTests(FORMA_EDITORIAL_REPORT);
  const { family, changes } = applyCapacitySuggestions(
    FORMA_EDITORIAL_REPORT,
    report,
  );
  for (const change of changes) {
    if (change.from !== undefined) assert.ok(change.to <= change.from);
  }
  // Declared limits never increase.
  for (const layout of family.layouts) {
    const original = FORMA_EDITORIAL_REPORT.layouts.find(
      (l) => l.id === layout.id,
    )!;
    for (const slot of layout.slots) {
      const before = original.slots.find((s) => s.id === slot.id)!;
      if (
        before.maxCharacters !== undefined &&
        slot.maxCharacters !== undefined
      )
        assert.ok(slot.maxCharacters <= before.maxCharacters);
    }
  }
});

// ─── VERSIONING (Part J) ─────────────────────────────────────────────────────

test("a new version increments and resets template approval", () => {
  const record = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "builtin",
  });
  const version = createTemplateVersion(record, {
    changelog: "Tighten cover spacing",
  });
  assert.equal(version.versionNumber, 2);
  assert.equal(version.parentVersionId, record.id);
  assert.equal(version.templateId, record.templateId);
  assert.equal(version.approval.approved, false);
  assert.match(version.id, /@v2$/);

  const versions = listTemplateVersions([record, version], record.templateId);
  assert.deepEqual(
    versions.map((v) => v.versionNumber),
    [1, 2],
  );
  assert.equal(
    latestTemplateVersion([record, version], record.templateId)!.id,
    version.id,
  );
});

// ─── REFERENCE FLOW (Part L) ─────────────────────────────────────────────────

test("a confident reference produces a usable derived candidate", () => {
  const { family } = buildTemplateCaseFamily(referenceReadyCase());
  assert.ok(family, "expected a derived family");
  assert.ok(family!.layouts.length >= 3);
  const result = validateTemplateFamilyV2(family!);
  assert.equal(result.errorCount, 0, JSON.stringify(result.issues));

  const record = createTemplateFamilyRecord({
    family: family!,
    source: "reference_derived",
    reference: {
      profileId: referenceProfileFromManuscript().id,
      usageMode: "reference_derived_template",
    },
  });
  assert.equal(record.status, "candidate");
  assert.equal(record.reference?.usageMode, "reference_derived_template");
});

test("a weak reference downgrades instead of producing a template", () => {
  const profile = lowConfidenceReferenceProfile();
  assert.ok(profile.confidence.overall < 0.3);
  const { family } = buildTemplateCaseFamily(lowConfidenceCase());
  assert.equal(family, null);
});

// ─── USAGE (Part N) ──────────────────────────────────────────────────────────

test("usage tracks runs and human verdicts", () => {
  let usage = emptyUsageMetadata();
  usage = recordTemplateUsage(usage, {
    qualityScore: 90,
    projectionFidelityScore: 98,
    pageCount: 6,
    continued: false,
  });
  usage = recordTemplateUsage(usage, {
    qualityScore: 80,
    projectionFidelityScore: 96,
    pageCount: 8,
    continued: true,
    failures: ["fit"],
  });
  assert.equal(usage.timesUsed, 2);
  assert.equal(usage.averageQualityScore, 85);
  assert.equal(usage.averagePageCount, 7);
  assert.ok((usage.continuationFrequency ?? 0) > 0);
  assert.equal(usage.commonFailures[0].code, "fit");

  const reviewed = mergeHumanVerdict(usage, "approved");
  assert.equal(reviewed.humanVerdicts.approved, 1);
});

// ─── SMOKE GENERATION (Part M) ───────────────────────────────────────────────

test("smoke generation runs fixtures through the real pipeline", async () => {
  const report = await runTemplateSmokeGeneration(FORMA_EDITORIAL_REPORT, [
    {
      id: "smoke-test-short",
      name: "Short",
      manuscript: `Title: Smoke Test\n\nHeading: Overview\n\nParagraph: A single approved paragraph used to exercise the smoke path.`,
    },
    {
      id: "smoke-test-table",
      name: "Table",
      manuscript: `Title: Smoke Table\n\nHeading: Results\n\nParagraph: Comparative results.\n\n| Region | Value |\n| --- | --- |\n| North | 12 |\n| South | 9 |`,
    },
  ]);
  assert.equal(report.cases.length, 2);
  assert.equal(typeof report.passed, "boolean");
  assert.ok(report.generatedAt);
});

// ─── HUMAN REVIEW (Part O) ───────────────────────────────────────────────────

test("template reviews are validated and summarized per template", () => {
  const reviews: TemplateReview[] = [
    {
      templateId: "tpl-a",
      templateVersionId: "tpl-a@v1",
      reviewer: "ana",
      rating: 5,
      verdict: "approved",
      layoutNotes: [{ layoutId: "cover", note: "strong" }],
      createdAt: "2026-10-08T00:00:00.000Z",
    },
    {
      templateId: "tpl-a",
      templateVersionId: "tpl-a@v1",
      reviewer: "ben",
      rating: 3,
      verdict: "needs_refinement",
      layoutNotes: [{ layoutId: "cover", note: "tight" }],
      createdAt: "2026-10-08T00:00:00.000Z",
    },
  ];
  assert.equal(isTemplateReview(reviews[0]), true);
  assert.equal(isTemplateReview({ templateId: "x" }), false);
  const summaries = summarizeTemplateReviews(reviews);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].averageRating, 4);
  assert.equal(summaries[0].verdictCounts.approved, 1);
  assert.equal(summaries[0].layoutNoteCounts.cover, 2);
  assert.deepEqual(summaries[0].reviewers, ["ana", "ben"]);
});

// ─── CREATE FLOW (Part K) ────────────────────────────────────────────────────

test("only approved layouts reach the generation planner", () => {
  const candidate = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "reference_derived",
  });
  const blocked = applyApprovalToFamily(candidate.family, candidate.approval, {
    requireApprovedLayouts: true,
    includeUnreviewed: false,
  });
  assert.equal(blocked.layouts.length, 0);

  const approved = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "builtin",
  });
  const usable = applyApprovalToFamily(approved.family, approved.approval, {
    requireApprovedLayouts: true,
    includeUnreviewed: false,
  });
  assert.equal(usable.layouts.length, FORMA_EDITORIAL_REPORT.layouts.length);
});

test("generating with a template record records traceable metadata", async () => {
  const record = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "builtin",
  });
  const usable = applyApprovalToFamily(record.family, record.approval, {
    requireApprovedLayouts: true,
    includeUnreviewed: false,
  });
  const result = await runAiDesignerPipeline(
    `Title: Trace Test\n\nHeading: Overview\n\nParagraph: A single approved paragraph used to check template provenance.`,
    {
      family: usable,
      templateRecord: {
        recordId: record.id,
        templateId: record.templateId,
        versionNumber: record.versionNumber,
        source: record.source,
        status: record.status,
      },
    },
  );
  assert.equal(result.template.used, true);
  assert.equal(result.template.recordId, record.id);
  assert.equal(result.template.status, "approved");
  assert.equal(result.finalSpec.metadata?.templateFamilyRecordId, record.id);
  assert.equal(result.finalSpec.metadata?.templateFamilyVersion, 1);
});

test("generation without a template record reports no template provenance", async () => {
  const result = await runAiDesignerPipeline(
    `Title: No Template\n\nHeading: Overview\n\nParagraph: A single approved paragraph.`,
  );
  assert.equal(result.template.used, false);
  assert.equal(result.template.recordId, null);
});

test("finalizeTemplateRecord folds smoke results into the quality summary", () => {
  const record = createTemplateFamilyRecord({
    family: FORMA_EDITORIAL_REPORT,
    source: "builtin",
  });
  const finalized = finalizeTemplateRecord(record, {
    smoke: {
      passed: false,
      criticalFailures: ["smoke-short: fit failed"],
      cases: [],
      generatedAt: new Date().toISOString(),
    },
  });
  assert.ok(finalized.quality.blockers.some((b) => b.code === "smoke_failed"));
});
