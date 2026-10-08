# Template Capacity Testing

`src/domain/template-authoring/capacity.ts`.

Templates must be tested with content, not only validated structurally.

## Method

For every slot bound to a text element, capacity is **measured** with the
deterministic fit engine:

- `computeLineWraps(text, width, fontFamily, fontSize)` from
  `src/domain/layout-fit/measure.ts`.
- Available lines = `floor((element.height + 2) / (fontSize * lineHeight))`.
- Binary search over synthetic text length finds the largest string that still
  fits in the available lines.

For non-text slots (table/chart/image) item density is reported instead, and
`maxTableRows` is estimated from the table element height.

## Reported per slot

`declaredMaxCharacters`, `measuredMaxCharacters`, `recommendedCharacters`,
sample lengths, `overflowBehavior` (`fits | shrinks | overflow | unknown`), and
`continuationBehavior`. Warnings: `slot_has_no_element`,
`declared_capacity_exceeds_measured`, `layout_capacity_overflow`.

## Applying suggestions

`applyCapacitySuggestions(family, report)` returns `{ family, changes }`. It
only ever **tightens** a declared `maxCharacters` (never raises one) and records
each change. Nothing is applied automatically — the caller persists the
changelog so approved templates are never silently modified.

## Limitations

Measurements use font metric ratios and character heuristics, not real text
shaping. They are a useful bound, not a guarantee, and are treated as
suggestions.
