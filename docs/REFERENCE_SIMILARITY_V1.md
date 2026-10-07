# Reference Similarity v1

`src/domain/reference-design/similarity.ts` →
`computeReferenceSimilarity(profile, spec)`

```ts
interface ReferenceSimilarityReport {
  overall: number;     // 0..1
  palette: number;
  typography: number;
  layout: number;
  density: number;
  imagery: number;
  warnings: ReferenceWarning[];
}
```

## What it compares

The report compares the **profile** against the **generated DesignSpec**, not the
reference pixels against the output pixels.

| Signal | Method |
| --- | --- |
| `palette` | Frequency-weighted share of reference colors that appear in the spec within an RGB tolerance (40). |
| `typography` | Family-name overlap (60%) plus maximum-size scale closeness (40%). |
| `layout` | Share of observed patterns whose expected page role or candidate layout appears in the spec. |
| `density` | Profile density vs. spec element-coverage density. |
| `imagery` | Profile image usage vs. the spec's image area ratio. |

`overall` is a fixed weighted blend (palette 0.25, typography 0.25, layout 0.25,
density 0.15, imagery 0.10).

## What it is not

- **Not** proof of legal or brand compliance.
- **Not** an objective quality score. A high similarity does not mean a good
  document; a low similarity does not mean a bad one.
- **Not** a pixel or object comparison.

## Warnings

- `partial_extraction` when profile confidence < 0.4.
- `typography_uncertain` when typography similarity < 0.5 (fonts are estimates).
- `unsupported_color_value` when palette similarity < 0.5.

Similarity is reported in the `/dev/reference` lab, the reference benchmark, and
`DesignerPipelineResult.reference.similarity`.
