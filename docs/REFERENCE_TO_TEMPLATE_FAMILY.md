# Reference → TemplateFamily (v1)

`src/domain/reference-design/profileToTemplateFamily.ts`

This converter turns a `ReferenceDesignProfile` into either a **limited
reference-derived `TemplateFamily`** or a **reference-guided re-skin** of the
standard family. It never produces a reconstruction of the source.

## Pipeline

```
ReferenceDesignProfile
  → supportedLayoutIdsForPatterns()   (observed patterns → candidate layout ids)
  → applyReferenceTokensToFamily()    (colors + fonts only; geometry untouched)
  → validateTemplateFamily()          (must be valid)
  → ReferenceTemplateGateResult
```

## Reference-derived families

Only layouts the reference **confidently** shows are included (`pattern.confidence
>= 0.4`), mapped through per-pattern candidate ids:

| Pattern | Candidate layouts |
| --- | --- |
| `cover_like` | `cover` |
| `heading_body` | `heading-body`, `section-opener` |
| `two_column_body` | `two-column-body` |
| `image_body` | `heading-image-body` |
| `stat_layout` | `three-stat`, `four-stat` |
| `quote_layout` | `quote-feature` |
| `table_layout` | `table-page` |
| `chart_layout` | `chart-commentary` |
| `closing_like` | `closing` |

A derived family is created only when at least **3** layout ids are supported and
the resulting family passes `validateTemplateFamily`. The family is labelled
`metadata.referenceDerived = true` with `referenceSourceType` and
`referenceConfidence`. No catalogue of 30 layouts is ever created.

## Reference-guided styling

`applyReferenceTokensToFamily` overrides `designTokens.colors` by matching token
roles, then remaps matching element fills, strokes, and text colors. Fonts are
remapped by role **only when typography confidence ≥ 0.4**. Slot grammar and all
geometry are preserved, so Exact Copy, fit, and projection behave exactly as
before.

## Confidence gate (Part L)

`ReferenceTemplateStatus`:

| Status | Meaning |
| --- | --- |
| `reference_template_ready` | A valid derived family with ≥ 3 layouts was created. |
| `reference_guided_only` | Not enough confident layouts; tokens are applied to the standard family. |
| `reference_low_confidence` | Overall confidence < 0.3; do not apply tokens. |
| `reference_unusable` | No reusable intelligence (unknown source, no tokens, no patterns). |

`resolveReferenceFamily(profile, base)` returns the family to use and a
`ReferenceUsageMode`: `none`, `reference_derived_template`,
`reference_guided_tokens`, or `reference_low_confidence_fallback`. A derived
family that fails the gate is **never** returned.

## Safety

- The derived family reuses the exact slot grammar of a validated built-in
  family, so the DesignPlan validator, resolver, fit engine, and copy coverage
  all keep working.
- If a manuscript needs a layout the reference does not support, generation may
  fall back or fail visibly — it never silently invents layouts.
