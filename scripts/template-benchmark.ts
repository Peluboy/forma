import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FORMA_EDITORIAL_REPORT } from "../src/domain/template-family/builtin/editorialReport.js";
import { runAiDesignerPipeline } from "../src/domain/pipeline/designerPipeline.js";
import {
  validateTemplateFamilyV2,
  createTemplateFamilyRecord,
  finalizeTemplateRecord,
  applyApprovalToFamily,
  runTemplateCapacityTests,
  summarizeApproval,
  type TemplateFamilyRecord,
} from "../src/domain/template-authoring/index.js";
import {
  TEMPLATE_CASES,
  buildTemplateCaseFamily,
  type TemplateBenchmarkCase,
} from "../tests/fixtures/templateCases.js";

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const outputDirectory = flags.has("--artifacts")
  ? resolve("test-results/template-benchmark")
  : null;

let targetCaseId: string | null = null;
const caseIndex = args.indexOf("--case");
if (
  caseIndex !== -1 &&
  args[caseIndex + 1] &&
  !args[caseIndex + 1].startsWith("--")
)
  targetCaseId = args[caseIndex + 1];
else {
  const caseArg = args.find((a) => a.startsWith("--case="));
  if (caseArg) targetCaseId = caseArg.split("=")[1];
}

if (outputDirectory) await mkdir(outputDirectory, { recursive: true });

function sourceFor(testCase: TemplateBenchmarkCase) {
  switch (testCase.kind) {
    case "builtin":
    case "table_smoke":
    case "text_smoke":
      return "builtin" as const;
    case "reference_ready":
    case "reference_low_confidence":
      return "reference_derived" as const;
    default:
      return "manual" as const;
  }
}

const fixturesToRun = targetCaseId
  ? TEMPLATE_CASES.filter((fixture) => fixture.id === targetCaseId)
  : TEMPLATE_CASES;

if (targetCaseId && fixturesToRun.length === 0)
  process.stderr.write(`Warning: template case "${targetCaseId}" not found.\n`);

interface CaseRecord {
  id: string;
  category: string;
  kind: string;
  familyBuilt: boolean;
  validationStatus: string;
  validationErrors: number;
  validationWarnings: number;
  capacityLayouts: number;
  capacityWarnings: number;
  suggestedTightenings: number;
  approvalStatus: string;
  approvedLayouts: number;
  totalLayouts: number;
  usableLayouts: number;
  productionBlocked: boolean;
  pipelineRun: boolean;
  success?: boolean;
  qualityScore?: number;
  projectionFidelity?: number;
  exactCopy?: string;
  fit?: string;
  trusted?: boolean;
  error?: string;
}

const records: CaseRecord[] = [];
let validCount = 0;
let invalidCount = 0;
let productionBlockedCount = 0;
let smokePassed = 0;
let smokeRun = 0;
let qualityTotal = 0;
let fidelityTotal = 0;
let qualityRuns = 0;

for (const fixture of fixturesToRun) {
  const built = buildTemplateCaseFamily(fixture);
  const record: CaseRecord = {
    id: fixture.id,
    category: fixture.category,
    kind: fixture.kind,
    familyBuilt: built.family !== null,
    validationStatus: "n/a",
    validationErrors: 0,
    validationWarnings: 0,
    capacityLayouts: 0,
    capacityWarnings: 0,
    suggestedTightenings: 0,
    approvalStatus: "n/a",
    approvedLayouts: 0,
    totalLayouts: 0,
    usableLayouts: 0,
    productionBlocked: false,
    pipelineRun: false,
  };

  if (!built.family) {
    records.push(record);
    if (outputDirectory)
      await writeFile(
        resolve(outputDirectory, `${fixture.id}.json`),
        JSON.stringify({ case: fixture, built }, null, 2),
      );
    continue;
  }

  const family = built.family;
  const validation = validateTemplateFamilyV2(family);
  record.validationStatus = validation.status;
  record.validationErrors = validation.errorCount;
  record.validationWarnings = validation.warningCount;
  if (validation.valid) validCount++;
  else invalidCount++;

  const capacity = runTemplateCapacityTests(family);
  record.capacityLayouts = capacity.layouts.length;
  record.capacityWarnings = capacity.warnings.length;
  record.suggestedTightenings = Object.values(
    capacity.suggestedSlotMaxCharacters,
  ).reduce((sum, slots) => sum + Object.keys(slots).length, 0);

  let templateRecord: TemplateFamilyRecord = createTemplateFamilyRecord({
    family,
    source: sourceFor(fixture),
    name: fixture.description,
    reference:
      fixture.kind === "reference_ready"
        ? { usageMode: "reference_derived_template" }
        : undefined,
  });
  if (fixture.kind === "builtin") {
    templateRecord = finalizeTemplateRecord(templateRecord, {
      validation,
      capacity,
    });
  }
  record.approvalStatus = templateRecord.status;
  const summary = summarizeApproval(templateRecord.approval, family);
  record.approvedLayouts = summary.approvedLayoutCount;
  record.totalLayouts = summary.layoutCount;

  const usable = applyApprovalToFamily(family, templateRecord.approval, {
    requireApprovedLayouts: true,
    includeUnreviewed: false,
  });
  record.usableLayouts = usable.layouts.length;
  record.productionBlocked = usable.layouts.length === 0;
  if (record.productionBlocked) productionBlockedCount++;

  if (usable.layouts.length > 0) {
    try {
      const result = await runAiDesignerPipeline(fixture.manuscript, {
        family: usable,
      });
      record.pipelineRun = true;
      record.success = result.success;
      record.qualityScore = result.quality.final.overallScore;
      record.projectionFidelity = result.projectionFidelity.score;
      record.exactCopy = result.copyCoverage.valid ? "pass" : "fail";
      record.fit = result.fitReport.valid ? "pass" : "fail";
      record.trusted = result.deliverableQuality.trusted;
      qualityTotal += result.quality.final.overallScore;
      fidelityTotal += result.projectionFidelity.score;
      qualityRuns++;
      if (fixture.category === "smoke") {
        smokeRun++;
        if (
          result.success &&
          result.copyCoverage.valid &&
          result.fitReport.valid &&
          result.projectionFidelity.overall !== "unsafe"
        )
          smokePassed++;
      }
    } catch (error) {
      record.error =
        error instanceof Error ? error.message : "unknown pipeline failure";
    }
  }

  records.push(record);

  if (outputDirectory)
    await writeFile(
      resolve(outputDirectory, `${fixture.id}.json`),
      JSON.stringify(
        {
          case: fixture,
          built: {
            note: built.note,
            layoutIds: family.layouts.map((l) => l.id),
          },
          validation,
          capacity,
          record: templateRecord,
        },
        null,
        2,
      ),
    );
}

const summary = {
  totalCases: records.length,
  valid: validCount,
  invalid: invalidCount,
  productionBlocked: productionBlockedCount,
  smokeCasesRun: smokeRun,
  smokeCasesPassed: smokePassed,
  averageQualityScore: qualityRuns
    ? Math.round((qualityTotal / qualityRuns) * 10) / 10
    : 0,
  averageProjectionFidelity: qualityRuns
    ? Math.round((fidelityTotal / qualityRuns) * 10) / 10
    : 0,
  note: "A candidate with no approved layouts is reported as production-blocked; this is the approval gate working, not a failure.",
  builtInLayouts: FORMA_EDITORIAL_REPORT.layouts.length,
};

if (outputDirectory)
  await writeFile(
    resolve(outputDirectory, "summary.json"),
    JSON.stringify({ summary, records }, null, 2),
  );

process.stdout.write(
  `${JSON.stringify(
    {
      summary,
      records: records.map((r) => ({
        id: r.id,
        validation: r.validationStatus,
        approved: `${r.approvedLayouts}/${r.totalLayouts}`,
        usable: r.usableLayouts,
        blocked: r.productionBlocked,
        quality: r.qualityScore ?? null,
        fit: r.fit ?? null,
        copy: r.exactCopy ?? null,
      })),
    },
    null,
    2,
  )}\n`,
);
