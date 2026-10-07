import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { contentGraphFromManuscript } from "../src/domain/content/contentGraph.js";
import { planDesignDeterministically } from "../src/domain/design-plan/artDirector.js";
import { instantiateDesignSpec } from "../src/domain/template-family/resolver.js";
import { FORMA_EDITORIAL_REPORT } from "../src/domain/template-family/builtin/editorialReport.js";
import {
  buildReferenceProfileFromDesignSpec,
  buildReferenceProfileFromImage,
  buildFallbackImageProfile,
  type ReferenceDesignProfile,
} from "../src/domain/reference-design/index.js";
import { runAiDesignerPipeline } from "../src/domain/pipeline/designerPipeline.js";
import {
  REFERENCE_CASES,
  type ReferenceBenchmarkCase,
} from "../tests/fixtures/referenceCases.js";

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const outputDirectory = flags.has("--artifacts")
  ? resolve("test-results/reference-benchmark")
  : null;
const reviewDirectory = resolve("test-results/reference-benchmark/reviews");

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
if (outputDirectory) await mkdir(reviewDirectory, { recursive: true });

interface RawRegion {
  id: string;
  text: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
  fontSize: number;
  fontFamily: string;
  textColor: string;
  coverColor: string;
  field?: string | null;
}

function region(
  id: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: Partial<RawRegion> = {},
): RawRegion {
  return {
    id,
    text,
    confidence: options.confidence ?? 0.7,
    box: { x, y, width, height },
    fontSize: options.fontSize ?? 12,
    fontFamily: options.fontFamily ?? "Inter",
    textColor: options.textColor ?? "#334155",
    coverColor: options.coverColor ?? "#ffffff",
    field: options.field ?? null,
  };
}

function imageRegions(
  source: ReferenceBenchmarkCase["reference"],
): RawRegion[] {
  switch (source) {
    case "image_simple":
      return [
        region("r1", "Quarterly Operations", 54, 72, 504, 44, {
          fontSize: 30,
          textColor: "#0f172a",
          field: "title",
        }),
        region(
          "r2",
          "A short approved summary of the quarter.",
          54,
          140,
          504,
          60,
          {
            fontSize: 13,
            field: "description",
          },
        ),
      ];
    case "image_palette":
      return [
        region("r1", "BOLD REPORT", 60, 60, 300, 24, {
          fontSize: 12,
          textColor: "#d946ef",
          field: "kicker",
        }),
        region("r2", "Market Outlook 2027", 60, 100, 600, 70, {
          fontSize: 40,
          textColor: "#0f172a",
          field: "title",
        }),
        region("r3", "Confident editorial summary line.", 60, 200, 600, 50, {
          fontSize: 14,
          textColor: "#334155",
          field: "description",
        }),
        region("r4", "Growth: 24%", 60, 300, 260, 60, {
          fontSize: 32,
          textColor: "#d946ef",
          confidence: 0.6,
        }),
        region("r5", "Reliability: 99%", 360, 300, 260, 60, {
          fontSize: 32,
          textColor: "#d946ef",
          confidence: 0.6,
        }),
        region(
          "r6",
          "Body copy block describing performance in detail.",
          60,
          400,
          600,
          120,
          {
            fontSize: 12,
          },
        ),
      ];
    case "image_sparse":
      return [
        region("r1", "Field Note", 80, 320, 400, 40, {
          fontSize: 26,
          textColor: "#111827",
          field: "title",
        }),
        region("r2", "A single line of approved copy.", 80, 400, 400, 40, {
          fontSize: 13,
        }),
      ];
    case "image_dense":
      return [
        region("r1", "Operational Metrics", 48, 48, 624, 40, {
          fontSize: 26,
          textColor: "#0b1220",
          field: "title",
        }),
        ...Array.from({ length: 8 }, (_, index) => {
          const row = index % 4;
          const col = Math.floor(index / 4);
          return region(
            `d${index}`,
            `Cell ${index + 1} value`,
            48 + col * 320,
            120 + row * 44,
            300,
            36,
            { fontSize: 11, confidence: 0.65 },
          );
        }),
        ...Array.from({ length: 6 }, (_, index) =>
          region(
            `p${index}`,
            "Dense approved paragraph line.",
            48,
            320 + index * 30,
            624,
            24,
            {
              fontSize: 11,
              confidence: 0.6,
            },
          ),
        ),
      ];
    case "image_low_confidence":
      return [
        region("r1", "Blurry title", 120, 200, 300, 30, {
          fontSize: 18,
          confidence: 0.2,
        }),
      ];
    default:
      return [];
  }
}

function buildProfile(fixture: ReferenceBenchmarkCase): ReferenceDesignProfile {
  if (fixture.reference === "designspec") {
    const graph = contentGraphFromManuscript(fixture.referenceManuscript!);
    const plan = planDesignDeterministically(graph, FORMA_EDITORIAL_REPORT);
    const spec = instantiateDesignSpec(FORMA_EDITORIAL_REPORT, plan, graph);
    return buildReferenceProfileFromDesignSpec(spec);
  }
  if (fixture.reference === "fallback")
    return buildFallbackImageProfile({
      imageDataUrl: "data:image/png;base64,AAAA",
      width: 1200,
      height: 900,
      reason: "Provider unavailable for benchmark case.",
    });
  const regions = imageRegions(fixture.reference);
  return buildReferenceProfileFromImage({
    imageDataUrl: `data:image/png;base64,${fixture.id}`,
    width: 1200,
    height: 900,
    provider: "synthetic",
    regions,
  }).profile;
}

const fixturesToRun = targetCaseId
  ? REFERENCE_CASES.filter((fixture) => fixture.id === targetCaseId)
  : REFERENCE_CASES;

if (targetCaseId && fixturesToRun.length === 0)
  process.stderr.write(
    `Warning: reference case "${targetCaseId}" not found.\n`,
  );

const records = [];
let readyCount = 0;
let guidedCount = 0;
let fallbackCount = 0;
let similarityTotal = 0;
let qualityTotal = 0;
let fidelityTotal = 0;

for (const fixture of fixturesToRun) {
  try {
    const profile = buildProfile(fixture);
    const result = await runAiDesignerPipeline(fixture.manuscript, {
      referenceProfile: profile,
    });
    if (result.reference.usageMode === "reference_derived_template")
      readyCount++;
    else if (result.reference.usageMode === "reference_guided_tokens")
      guidedCount++;
    else if (result.reference.usageMode === "reference_low_confidence_fallback")
      fallbackCount++;
    similarityTotal += result.reference.similarity?.overall ?? 0;
    qualityTotal += result.quality.final.overallScore;
    fidelityTotal += result.projectionFidelity.score;

    const record = {
      id: fixture.id,
      category: fixture.category,
      referenceSource: profile.source.type,
      extractionConfidence: profile.confidence.overall,
      extractionWarnings: profile.warnings.map((item) => item.code),
      referenceUsageMode: result.reference.usageMode,
      gateStatus: result.reference.gate?.status ?? null,
      generatedPages: result.finalSpec.pages.length,
      qualityScore: result.quality.final.overallScore,
      projectionFidelity: {
        overall: result.projectionFidelity.overall,
        score: result.projectionFidelity.score,
      },
      exactCopy: result.copyCoverage.valid ? "pass" : "fail",
      fit: result.fitReport.valid ? "pass" : "fail",
      referenceSimilarity: result.reference.similarity?.overall ?? null,
      deliverableQuality: result.deliverableQuality.status,
      trusted: result.deliverableQuality.trusted,
      success: result.success,
      humanReview: null as string | null,
      humanNotes: null as string | null,
      humanRating: null as number | null,
    };

    try {
      const rawReview = JSON.parse(
        await readFile(
          resolve(reviewDirectory, `${fixture.id}-review.json`),
          "utf8",
        ),
      );
      record.humanReview = rawReview.verdict ?? null;
      record.humanNotes = rawReview.notes ?? null;
      record.humanRating = rawReview.rating ?? null;
    } catch {
      /* no review recorded yet */
    }

    records.push(record);

    if (outputDirectory) {
      await writeFile(
        resolve(outputDirectory, `${fixture.id}.json`),
        JSON.stringify(
          {
            profile,
            reference: result.reference,
            finalSpecMetadata: result.finalSpec.metadata,
          },
          null,
          2,
        ),
      );
    }
  } catch (error) {
    records.push({
      id: fixture.id,
      category: fixture.category,
      error: error instanceof Error ? error.message : "unknown failure",
      success: false,
    });
  }
}

const summary = {
  totalCases: records.length,
  templateReady: readyCount,
  guidedTokens: guidedCount,
  lowConfidenceFallback: fallbackCount,
  averageQualityScore: records.length
    ? Math.round((qualityTotal / records.length) * 10) / 10
    : 0,
  averageProjectionFidelity: records.length
    ? Math.round((fidelityTotal / records.length) * 10) / 10
    : 0,
  averageReferenceSimilarity: records.length
    ? Math.round((similarityTotal / records.length) * 1000) / 1000
    : 0,
  note: "Reference similarity is a heuristic signal, not an objective quality or compliance score.",
};

if (outputDirectory) {
  await writeFile(
    resolve(outputDirectory, "summary.json"),
    JSON.stringify({ summary, records }, null, 2),
  );
}

process.stdout.write(
  `${JSON.stringify({ summary, records: records.map((r) => ({ id: r.id, usage: (r as { referenceUsageMode?: string }).referenceUsageMode, confidence: (r as { extractionConfidence?: number }).extractionConfidence, pages: (r as { generatedPages?: number }).generatedPages, quality: (r as { qualityScore?: number }).qualityScore, fit: (r as { fit?: string }).fit, copy: (r as { exactCopy?: string }).exactCopy, similarity: (r as { referenceSimilarity?: number }).referenceSimilarity })) }, null, 2)}\n`,
);
