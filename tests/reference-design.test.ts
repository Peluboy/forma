import test from "node:test";
import assert from "node:assert/strict";
import { contentGraphFromManuscript } from "../src/domain/content/contentGraph.js";
import { planDesignDeterministically } from "../src/domain/design-plan/artDirector.js";
import { instantiateDesignSpec } from "../src/domain/template-family/resolver.js";
import { FORMA_EDITORIAL_REPORT } from "../src/domain/template-family/builtin/editorialReport.js";
import { validateTemplateFamily } from "../src/domain/template-family/validation.js";
import { buildReferenceProfileFromDesignSpec } from "../src/domain/reference-design/extractFromDesignSpec.js";
import {
  validateReferenceDesignProfile,
  isReferenceDesignProfile,
} from "../src/domain/reference-design/schema.js";
import {
  buildReferenceProfileFromImage,
  buildFallbackImageProfile,
  parseStructuredAnalysis,
  validateVisionRegions,
} from "../src/domain/reference-design/imageAnalysis.js";
import { sanitizeRegions } from "../src/domain/reference-design/validation.js";
import {
  profileToTemplateFamily,
  resolveReferenceFamily,
  applyReferenceTokensToFamily,
  evaluateReferenceTemplateGate,
} from "../src/domain/reference-design/profileToTemplateFamily.js";
import { computeReferenceSimilarity } from "../src/domain/reference-design/similarity.js";
import { applyReferenceOverrides } from "../src/domain/reference-design/overrides.js";
import { runAiDesignerPipeline } from "../src/domain/pipeline/designerPipeline.js";
import type { ReferenceDesignProfile } from "../src/domain/reference-design/types.js";
import type { DesignSpec } from "../src/domain/design-spec/types.js";
import { CORPORATE_REPORT_MANUSCRIPT } from "./fixtures/corporateReportManuscript.js";

const MANUSCRIPT = `# Regional Operations Review

Author: Forma Operations

# Performance Overview

Revenue: 18%

Retention: 92%

Adoption: 64%

The metrics reflect measured outcomes across every region.

# Detailed Analysis

First approved paragraph describing the operating plan in detail.

Second approved paragraph describing the next stage of rollout.

# Closing

Our teams recommended the next steps for the coming quarter.`;

function makeSpec(manuscript = MANUSCRIPT): DesignSpec {
  const graph = contentGraphFromManuscript(manuscript);
  const plan = planDesignDeterministically(graph, FORMA_EDITORIAL_REPORT);
  return instantiateDesignSpec(FORMA_EDITORIAL_REPORT, plan, graph);
}

function referenceProfile(): ReferenceDesignProfile {
  return buildReferenceProfileFromDesignSpec(
    makeSpec(CORPORATE_REPORT_MANUSCRIPT),
  );
}

// ─── REFERENCE PROFILE ───────────────────────────────────────────────────────

test("reference profile validates and carries source-derived confidence", () => {
  const profile = referenceProfile();
  const validation = validateReferenceDesignProfile(profile);
  assert.equal(validation.valid, true, JSON.stringify(validation.issues));
  assert.equal(isReferenceDesignProfile(profile), true);
  assert.ok(profile.confidence.overall >= 0.6);
  assert.ok(profile.confidence.colors > 0.5);
});

test("reference profile validation rejects invalid confidence", () => {
  const profile = referenceProfile();
  const broken = JSON.parse(JSON.stringify(profile));
  broken.confidence.overall = 4;
  const validation = validateReferenceDesignProfile(broken);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.issues.some((issue) => issue.code === "invalid_confidence"),
  );
});

test("reference profile validation rejects impossible bounds and unknown types", () => {
  const profile = referenceProfile();
  const broken = JSON.parse(JSON.stringify(profile));
  broken.pages[0].detectedRegions[0].bounds.width = 99999;
  const validation = validateReferenceDesignProfile(broken);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.issues.some((issue) => issue.code === "impossible_bounds"),
  );

  const unknownType = JSON.parse(JSON.stringify(profile));
  unknownType.pages[0].detectedRegions[0].type = "hologram";
  const second = validateReferenceDesignProfile(unknownType);
  assert.ok(
    second.issues.some((issue) => issue.code === "unknown_region_type"),
  );
});

test("reference profile preserves warnings", () => {
  const profile = buildFallbackImageProfile({
    imageDataUrl: "data:image/png;base64,AAAA",
    width: 320,
    height: 240,
    reason: "provider offline",
  });
  assert.ok(
    profile.warnings.some(
      (warning) => warning.code === "extraction_provider_unavailable",
    ),
  );
  assert.ok(validateReferenceDesignProfile(profile).valid);
});

// ─── DESIGNSPEC EXTRACTION ───────────────────────────────────────────────────

test("designspec extraction reads colors, typography, spacing, patterns and roles", () => {
  const profile = referenceProfile();
  assert.ok(profile.extractedTokens.colors.length >= 2);
  assert.ok(
    profile.extractedTokens.colors.every((token) => token.kind === "observed"),
  );
  assert.ok(profile.extractedTokens.typography.length >= 2);
  assert.ok(profile.extractedTokens.spacing.length >= 1);
  assert.ok(profile.layoutPatterns.length >= 4);
  assert.ok(
    profile.pages.some((page) => page.role === "cover"),
    "cover role must be read from the DesignSpec",
  );
  assert.ok(profile.layoutPatterns.some((p) => p.type === "stat_layout"));
  assert.ok(profile.layoutPatterns.some((p) => p.type === "table_layout"));
});

// ─── IMAGE ANALYSIS VALIDATION ───────────────────────────────────────────────

test("image analysis rejects invalid JSON output", () => {
  assert.equal(parseStructuredAnalysis("{not json").ok, false);
  assert.equal(parseStructuredAnalysis({}).ok, false);
  const ok = parseStructuredAnalysis(JSON.stringify({ regions: [] }));
  assert.equal(ok.ok, true);
});

test("image analysis rejects out-of-bounds regions and normalizes colors", () => {
  const { regions, warnings } = validateVisionRegions([
    {
      id: "good",
      text: "Headline",
      confidence: 0.7,
      box: { x: 40, y: 40, width: 300, height: 40 },
      fontSize: 28,
      textColor: "#0f172a",
      coverColor: "#ffffff",
      field: "title",
    },
    {
      id: "off-page",
      text: "Off page",
      confidence: 0.9,
      box: { x: 9000, y: 9000, width: 500, height: 500 },
      fontSize: 12,
      textColor: "#000000",
      coverColor: "#ffffff",
    },
    {
      id: "bad-color",
      text: "Body line",
      confidence: 0.5,
      box: { x: 10, y: 200, width: 100, height: 40 },
      fontSize: 12,
      textColor: "not-a-color",
      coverColor: "#ffffff",
    },
  ]);
  // The off-page region is dropped by the shared sanitizer.
  assert.equal(regions.length, 2);
  assert.ok(regions.some((region) => region.type === "heading"));
  const badColor = regions.find((region) => region.id === "bad-color");
  assert.equal(badColor?.style?.color, undefined);
  assert.ok(
    warnings.some((warning) => warning.code === "invalid_region_dropped"),
  );
});

test("region sanitization rejects unknown region types", () => {
  const { regions, warnings } = sanitizeRegions(
    [
      {
        id: "x",
        type: "hologram",
        bounds: { x: 0, y: 0, width: 10, height: 10 },
        confidence: 0.9,
      },
    ],
    720,
    900,
  );
  assert.equal(regions.length, 0);
  assert.ok(warnings.some((warning) => warning.code === "unknown_region_type"));
});

test("image analysis handles provider failure with a safe fallback profile", () => {
  const { regions } = validateVisionRegions(undefined);
  assert.equal(regions.length, 0);

  const { profile } = buildReferenceProfileFromImage({
    imageDataUrl: "data:image/png;base64,AAAA",
    width: 1200,
    height: 900,
    regions: [],
  });
  assert.equal(profile.visualLanguage.tone, "unknown");
  assert.ok(profile.warnings.some((w) => w.code === "image_only_reference"));

  const fallback = buildFallbackImageProfile({
    imageDataUrl: "data:image/png;base64,AAAA",
    width: 1200,
    height: 900,
    reason: "no provider",
  });
  assert.equal(
    resolveReferenceFamily(fallback, FORMA_EDITORIAL_REPORT).mode,
    "reference_low_confidence_fallback",
  );
});

// ─── REFERENCE TO TEMPLATE ───────────────────────────────────────────────────

test("reference to template creates a valid TemplateFamily candidate", () => {
  const profile = referenceProfile();
  const { family, gate } = profileToTemplateFamily(
    profile,
    FORMA_EDITORIAL_REPORT,
  );
  assert.equal(gate.status, "reference_template_ready");
  assert.ok(family);
  assert.ok(gate.layoutIds.length >= 3);
  assert.equal(validateTemplateFamily(family!).valid, true);
  assert.equal(family!.metadata?.referenceDerived, true);
});

test("reference to template falls back on low confidence", () => {
  const fallback = buildFallbackImageProfile({
    imageDataUrl: "data:image/png;base64,AAAA",
    width: 1200,
    height: 900,
    reason: "no provider",
  });
  const resolution = resolveReferenceFamily(fallback, FORMA_EDITORIAL_REPORT);
  assert.equal(resolution.mode, "reference_low_confidence_fallback");
  assert.equal(resolution.derivedFamily, null);
  assert.equal(resolution.family.id, FORMA_EDITORIAL_REPORT.id);
});

test("reference to template rejects an unusable reference", () => {
  const unusable: ReferenceDesignProfile = {
    ...buildFallbackImageProfile({
      imageDataUrl: "data:image/png;base64,AAAA",
      width: 1200,
      height: 900,
      reason: "no provider",
    }),
    source: { type: "unknown" },
    warnings: [],
  };
  const gate = evaluateReferenceTemplateGate(unusable, FORMA_EDITORIAL_REPORT);
  assert.equal(gate.status, "reference_unusable");
  assert.equal(gate.ready, false);
});

test("reference-guided token application preserves layout and slot grammar", () => {
  const profile = referenceProfile();
  const guided = applyReferenceTokensToFamily(FORMA_EDITORIAL_REPORT, profile);
  assert.equal(guided.layouts.length, FORMA_EDITORIAL_REPORT.layouts.length);
  assert.equal(validateTemplateFamily(guided).valid, true);
  for (let index = 0; index < guided.layouts.length; index++) {
    assert.deepEqual(
      guided.layouts[index].slots,
      FORMA_EDITORIAL_REPORT.layouts[index].slots,
    );
    assert.equal(
      guided.layouts[index].baseElements.length,
      FORMA_EDITORIAL_REPORT.layouts[index].baseElements.length,
    );
  }
});

// ─── REFERENCE GENERATION ────────────────────────────────────────────────────

test("generation with a reference survives all existing gates and records usage", async () => {
  const profile = referenceProfile();
  const result = await runAiDesignerPipeline(MANUSCRIPT, {
    referenceProfile: profile,
  });
  assert.equal(result.success, true, result.errors.join("; "));
  assert.equal(result.copyCoverage.valid, true);
  assert.equal(result.fitReport.valid, true);
  assert.notEqual(result.projectionFidelity.overall, "unsafe");
  assert.equal(result.reference.usageMode, "reference_derived_template");
  assert.equal(result.reference.profileId, profile.id);
  assert.equal(
    result.finalSpec.metadata?.referenceUsageMode,
    "reference_derived_template",
  );
  assert.ok(result.reference.similarity);
});

test("reference-free generation still works", async () => {
  const result = await runAiDesignerPipeline(MANUSCRIPT, {});
  assert.equal(result.success, true, result.errors.join("; "));
  assert.equal(result.reference.usageMode, "none");
  assert.equal(result.copyCoverage.valid, true);
});

// ─── SIMILARITY ──────────────────────────────────────────────────────────────

test("reference similarity reports palette and typography signals", () => {
  const profile = referenceProfile();
  const spec = makeSpec();
  const report = computeReferenceSimilarity(profile, spec);
  assert.ok(report.palette > 0.5, `palette ${report.palette}`);
  assert.ok(report.typography > 0.3, `typography ${report.typography}`);
  assert.ok(report.overall >= 0 && report.overall <= 1);
});

test("user corrections override inferred tokens without mutating the input", () => {
  const profile = referenceProfile();
  const corrected = applyReferenceOverrides(profile, {
    primaryColor: "#112233",
    accentColor: "#ff00aa",
    tone: "minimal",
  });
  assert.equal(
    corrected.extractedTokens.colors.find((token) => token.role === "primary")
      ?.value,
    "#112233",
  );
  assert.equal(
    corrected.extractedTokens.colors.find((token) => token.role === "accent")
      ?.value,
    "#ff00aa",
  );
  assert.equal(corrected.visualLanguage.tone, "minimal");
  assert.equal(corrected.metadata?.userCorrected, true);
  // Original profile is untouched.
  assert.notEqual(profile.visualLanguage.tone, "minimal");
});

test("reference similarity warns on low-confidence references", () => {
  const fallback = buildFallbackImageProfile({
    imageDataUrl: "data:image/png;base64,AAAA",
    width: 1200,
    height: 900,
    reason: "no provider",
  });
  const report = computeReferenceSimilarity(fallback, makeSpec());
  assert.ok(report.warnings.some((w) => w.code === "partial_extraction"));
});
