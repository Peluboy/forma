# ReferenceDesignProfile Schema (v1)

The `ReferenceDesignProfile` is the canonical output of Reference Design
Intelligence. It describes the **visual language** of a reference design and is
never an editable reconstruction.

Source: `src/domain/reference-design/types.ts`. Validation:
`src/domain/reference-design/schema.ts` (`validateReferenceDesignProfile`).

```ts
interface ReferenceDesignProfile {
  version: "1.0";
  id: string;
  name?: string;
  source: ReferenceSource;
  pages: ReferencePageAnalysis[];
  extractedTokens: ExtractedDesignTokens;
  layoutPatterns: ReferenceLayoutPattern[];
  visualLanguage: ReferenceVisualLanguage;
  confidence: ReferenceConfidence;
  warnings: ReferenceWarning[];
  metadata?: Record<string, unknown>;
}
```

## ReferenceSource

| `type` | Fields | Path | Confidence |
| --- | --- | --- | --- |
| `design_spec` | `designSpecId` | `buildReferenceProfileFromDesignSpec` | High (deterministic) |
| `forma_project` | `projectId` | same extractor once resolved | High |
| `image` | `assetId?`, `dataHash`, `width`, `height` | `buildReferenceProfileFromImage` | Low–medium (inferred) |
| `unknown` | — | — | Unusable |

The image source stores a `dataHash`, not a base64 blob.

## ReferencePageAnalysis and ReferenceRegion

Each page captures `detectedRegions`, `typographyObservations`,
`colorObservations`, `spacingObservations`, `imageObservations`, and optional
`tableObservations` / `chartObservations`, plus `confidence` and `warnings`.

`ReferenceRegion.type` is one of: `heading`, `subheading`, `body`, `caption`,
`image`, `shape`, `card`, `stat`, `quote`, `table`, `chart`, `logo`, `footer`,
`unknown`. Regions are **analysis metadata**, not editable objects.

Validation rejects: non-finite/negative/off-page bounds, unknown region types,
invalid confidence (outside `[0, 1]`), oversized region text (> 4000 chars), and
more than 120 regions per page or 40 pages.

## ExtractedDesignTokens

```ts
interface ExtractedDesignTokens {
  colors: ExtractedColorToken[];
  typography: ExtractedTypographyToken[];
  spacing: ExtractedSpacingToken[];
  radii?: ExtractedRadiusToken[];
  strokes?: ExtractedStrokeToken[];
  shadows?: ExtractedShadowToken[];
  grid?: ExtractedGridToken;
  imageTreatment?: ExtractedImageTreatment;
}
```

Every token carries `value`, `role`, `frequency`, `confidence`, `kind`, and
`evidence`. `kind` is `"observed"` (read directly from a DesignSpec) or
`"inferred"` (guessed from an image). Tokens are **inferred candidates**, never
official brand rules.

## ReferenceVisualLanguage

```ts
interface ReferenceVisualLanguage {
  tone: "corporate" | "editorial" | "premium" | "minimal" | "bold"
      | "data_forward" | "image_led" | "playful" | "unknown";
  density: "sparse" | "balanced" | "dense";
  composition: "grid_based" | "asymmetric" | "centered" | "modular"
      | "editorial" | "unknown";
  imageUsage: "none" | "supporting" | "hero" | "background" | "heavy" | "unknown";
  dataUsage: "none" | "light" | "moderate" | "heavy";
  notes?: string[];
  confidence: number;
  kind: "observed" | "inferred";
}
```

## ReferenceConfidence and warnings

```ts
interface ReferenceConfidence {
  overall: number; colors: number; typography: number;
  layout: number; imagery: number; data: number;
}
```

`overall` is a weighted blend (layout and typography weigh most). Warning codes:
`low_resolution_reference`, `insufficient_text_detected`, `typography_uncertain`,
`layout_regions_uncertain`, `no_reusable_patterns_detected`,
`image_only_reference`, `multi_page_reference_not_available`,
`extraction_provider_unavailable`, `unsupported_reference_format`,
`too_many_regions_truncated`, `invalid_region_dropped`, `unknown_region_type`,
`unsupported_color_value`, `partial_extraction`.

Uncertainty is always surfaced; it is never hidden.
