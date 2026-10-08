# Template Approval Workflow

`src/domain/template-authoring/approval.ts`.

## Statuses

`unreviewed → approved | needs_changes | rejected`.

A whole template has `approval.approved` plus `approvedAt`/`approvedBy`, and a
`reviewedLayouts` map keyed by layout id.

## Rules (enforced in the domain, never in the UI)

- `rejected` layouts are **always** removed from the family passed to the
  pipeline.
- `needs_changes` layouts are removed unless the caller explicitly passes
  `includeNeedsChanges` (experimental/review previews only).
- `unreviewed` layouts are removed when `requireApprovedLayouts: true` and
  `includeUnreviewed: false` — this is the production path used by `/create`.

Because the deterministic planner degrades to `heading-body`/first layout when a
needed layout is missing, filtering happens by **removing layouts from the
family**, not by post-filtering planner output.

## Blocks

`setTemplateApproved` is only meaningful when there are no blockers. Blockers
come from the quality summary: `validation_invalid`, `smoke_failed`,
`no_approved_layouts`.

## Why "production-blocked" is not a failure

A freshly created candidate has zero approved layouts. Generating with it is
refused with an explicit message. The benchmark reports that state as
`productionBlocked: true` to make the gate visible.
