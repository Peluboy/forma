# Template Family Authoring + Approval System v1 (Phase 5)

Status: implemented. Default-on behind `VITE_FORMA_TEMPLATE_AUTHORING`.

This phase turns a built-in family, a reference-derived candidate, a DesignSpec,
or a hand-authored family into a **reviewable, approvable, versioned, reusable
`TemplateFamilyRecord`** that can be selected in future generation. It is not a
marketplace, not an agency workspace, and does not reconstruct PDF/PPTX files.

---

## Part A — Existing template systems (audit)

Read directly from source, not from docs. There are four distinct "template"
ideas in the repository. They must not be conflated.

| # | System | Where | What it is |
| - | ------ | ----- | ---------- |
| 1 | `TemplateFamily` (runtime) | `src/domain/template-family/types.ts` | The live layout grammar used by the AI Designer pipeline. `layouts[]`, `slots[]`, `baseElements[]`, `designTokens`. Validated by the legacy `validateTemplateFamily` in `template-family/validation.ts`. |
| 2 | Built-in family | `src/domain/template-family/builtin/editorialReport.ts` | `FORMA_EDITORIAL_REPORT` — 13 layouts, 612×792pt, registered in `template-family/index.ts`. |
| 3 | Project-as-template | `src/domain/design/templateJob.ts` | Clones a saved graphics `Project` marked `isTemplate` and repopulates managed fields/extra text layers. Dashboard repeat path. |
| 4 | `VersionedTemplate` | `src/domain/design/designSystem.ts:268` | `templateFromProject`/`isVersionedTemplate`/`projectFromTemplate`, persisted under `kind:"template"` via `/api/templates` and guest localStorage `forma.templates.v1`. |

Two different template families already coexist in the resolver: a reference
profile can produce a **reference-derived** family
(`reference-design/profileToTemplateFamily.ts`) or re-skin the base family with
**reference-guided tokens**. The derived family is validated with the legacy
`validateTemplateFamily`, not with the Phase 5 validation.

Phase 5 adds a fifth concept — the **record** — without touching any of the four
above. The runtime `TemplateFamily` is unchanged.

### Findings that shaped the design

- The deterministic planner (`design-plan/artDirector.ts`) hard-codes layout ids
  (`cover`, `table-page`, `three-stat`/`four-stat`, `quote-feature`, `closing`,
  `heading-body`) and silently degrades to `heading-body` or `layouts[0]` when a
  layout is missing. **Therefore approval cannot be a runtime filter inside the
  planner** — non-usable layouts must be physically removed from the family
  passed to the pipeline, or the planner will still pick them.
- The fit engine (`layout-fit/measure.ts`) is deterministic and exposes
  `computeLineWraps`/`measureStringWidth`, so capacity can be *measured* rather
  than guessed.
- Reference-derived families that drop layouts still carried
  `compatibleAlternatives`/`fallbackLayouts` pointing at dropped layouts, and
  stale `varietyRules`. Phase 5 validation flags this, so
  `profileToTemplateFamily` now prunes those references when it selects layouts.
- The quality/trust gates (`design-quality/`, `deliverableQuality.trusted`) are
  the acceptance bar for smoke generation.

---

## Part B — Record model

`src/domain/template-authoring/types.ts`

```ts
TemplateFamilyRecord {
  id, ownerId?, version: "1.0",
  name, description?, status, source, family,
  approval, quality, usage?, reference?,
  templateId, versionNumber, parentVersionId?, changelog?,
  createdAt, updatedAt
}
```

- `status`: `draft | candidate | approved | archived | rejected`.
- `source`: `builtin | reference_derived | designspec_derived | project_derived | manual`.
- `templateId` is the **lineage root**; `id` is the specific record. A new
  version gets `id = ${templateId}@v${n}`.
- `defaultStatusForSource`: `builtin → approved` (all layouts pre-approved by
  `"forma"`), `manual → draft`, everything else → `candidate`.

Persistence: `records.ts` provides `MemoryTemplateRecordStore` and
`LocalStorageTemplateRecordStore` (`forma.templateFamilies.v1`) behind a shared
`TemplateFamilyRecordStore` interface (`list/get/save/remove/listVersions`).

## Part C — Approval state

`approval.ts` — statuses `unreviewed | approved | needs_changes | rejected`.
`applyApprovalToFamily(family, approval, options)` returns the family with
non-usable layouts **removed** so the planner can never select them:

- `rejected` — always removed.
- `needs_changes` — removed unless `includeNeedsChanges`.
- `unreviewed` — removed when `requireApprovedLayouts && !includeUnreviewed`.

Production generation (`/create`) calls with `requireApprovedLayouts: true,
includeUnreviewed: false`. The authoring lab previews with unreviewed layouts
included.

## Part D — Quality summary

`qualitySummary.ts` — `computeCoverage` + `buildTemplateQualitySummary`.
Blockers: `validation_invalid`, `smoke_failed`, `no_approved_layouts`.

## Part E — Validation v2

`validationV2.ts` — `validateTemplateFamilyV2`. Errors: missing id/name/family,
bad page size, invalid color/typography tokens, unknown fonts (warning),
duplicate layout/slot/element ids, invalid slot roles, unsupported content
types, bad item/capacity ranges, required slot with no element, element
geometry/out-of-bounds (error if the element starts off-page; warning if it
extends past the edge), **missing compatible alternative**, **missing fallback
layout**. Warnings/info: stray element overflow, incompatible alternative, stale
`varietyRules`, empty color tokens.

Continuation layouts (`text-continuation`, `table-continuation`) legitimately
have `slots: []`; validation does not flag empty `slots`.

## Part F — Capacity testing

`capacity.ts` — `runTemplateCapacityTests` measures how much text fits in each
bound element with `computeLineWraps` (binary search over synthetic text) and
records declared vs measured vs recommended characters, overflow behaviour
(`fits/shrinks/overflow`), continuation behaviour, table rows, and density.
`applyCapacitySuggestions` returns a new family **and an explicit changelog**;
it only ever *tightens* `maxCharacters`, never raises it. Suggestions are not
applied automatically.

## Part G/H — Authoring lab + layout review UI

`src/features/dev/TemplateAuthoringPanel.tsx` at `/dev/templates`.

- Create records from the built-in family, a blank draft, or a reference-derived
  candidate built from the pasted manuscript.
- Tabs: Overview (status language, blockers, warnings, human verdicts), Layout
  Review (per-layout `approved/needs_changes/rejected/unreviewed`), Capacity,
  Smoke & preview (runs the real pipeline), Versions.
- Approve all layouts, save a version, generate a preview against only approved
  layouts, apply capacity tightenings, and record a human verdict.
- Signed-in reviewers read/write a hosted copy (`/api/template-families`);
  guests use localStorage.

## Part I — Persistence

- Local store: any kind string; SQLite `records` table.
- Hosted: `server/app.ts` adds `GET/PUT/DELETE /api/template-families`,
  storing `kind:"template_family"` with owner scoping and optimistic versioning.
- New migration `supabase/migrations/202610080001_template_family_kind.sql`
  extends the `forma_records` kind constraint and the `forma_save`/`forma_remove`
  allow-lists to include `template_family`. Existing kinds/records unchanged.

## Part J — Versioning

`versioning.ts` — `createTemplateVersion` bumps `versionNumber`, sets
`parentVersionId`, records a changelog, and resets `approval.approved` to false
(approval *states per layout* are preserved so unchanged layouts are not
re-reviewed). `listTemplateVersions`/`latestTemplateVersion`.

## Part K — Create-flow selection

`src/features/create/CreatePage.tsx` report mode shows a **Template** picker
listing hosted/local `approved` records. Selecting one computes
`applyApprovalToFamily(..., { requireApprovedLayouts: true, includeUnreviewed: false })`
and passes that family to `runAiDesignerPipeline`. If the record has no approved
layouts, generation is blocked with an explicit message. Generation passes a
`templateRecord` so `finalSpec.metadata` records
`templateFamilyRecordId`, `templateFamilyTemplateId`, `templateFamilyVersion`,
`templateFamilySource`, `templateFamilyStatus`, and the result exposes a
`TemplateUsageReport`.

## Part L — Reference-candidate flow

`ReferenceDevPanel` gets a **Send candidate to Template Authoring** action. When
the gate produces a derived family it is saved as a `candidate` record; when it
does not, the panel shows *why not ready* instead of silently doing nothing.

## Part M — Smoke generation

`smoke.ts` — four fixtures (`smoke-short`, `smoke-text-heavy`,
`smoke-stats-heavy`, `smoke-table`) run through the real pipeline. A case is
**critical** when `!success || !copyCoverage.valid || !fitReport.valid ||
fidelity === "unsafe"`. A template is never approved if smoke fails a critical
check.

## Part N — Usage analytics

`usage.ts` — `recordTemplateUsage` (running averages of quality, fidelity, page
count, continuation frequency, common failures) and `mergeHumanVerdict`. Stored
on the record's optional `usage`. No dashboard.

## Part O — Human review

`reviews.ts` — `TemplateReview` (rating, verdict, per-layout notes) with
`isTemplateReview` and `summarizeTemplateReviews`. The authoring lab records
verdicts; `scripts/template-review-insights.ts`
(`npm run review:template-insights`) summarizes review packages from a JSON file
or a directory of `*-review.json` files.

## Part P — Benchmark

`tests/fixtures/templateCases.ts` + `scripts/template-benchmark.ts`
(`npm run benchmark:templates`). Seven cases: built-in, reference-ready,
weak-reference, invalid-slot, missing-alternative, table-smoke, text-smoke.
Artifacts and `summary.json` are written under
`test-results/template-benchmark/`. A candidate with no approved layouts is
reported as **production-blocked** — the approval gate working, not a failure.

Last run (7 cases): 4 valid, 2 invalid, 3 production-blocked, 2 smoke cases run
and passed, average quality 96.3, average projection fidelity 99.3.

## Part Q — Dev lab integration

`/dev/templates` is linked from `/dev/reference` and `/dev/pipeline` navigation.
Reference candidates flow into it; the authoring lab generates previews through
the same pipeline.

## Part R — Status language

The lab explains each status in plain words — candidate/draft/rejected/archived
are **not selectable in generation**; only approved is. "Production-blocked" is
used for a candidate with no approved layouts.

## Part S — Tests

`tests/template-authoring.test.ts` (29 tests): record CRUD/store/owner scoping,
validation v2, approval filtering rules, capacity tightening, versioning,
reference flow, create-flow selection, template provenance metadata, usage,
human review, and smoke generation.

## Part T — This document

## Part U — Quality gate

See `docs/PROGRESS.md` for the Phase 5 gate results (tests, lint, build,
benchmarks).

---

## Honest limitations

- This is **not a marketplace**: no discovery, publishing, listings, ratings
  marketplace, or payments for templates.
- It is **not an agency workspace**: no multi-user roles beyond owner-scoped
  records.
- It does **not reconstruct** PDF/PPTX/source files. Reference-derived templates
  are a *limited* layout family in a similar visual language, not a reproduction.
- Versioning is a safe history, **not diffing/merging**.
- Capacity recommendations are heuristic measurements from the deterministic
  font metrics; they are suggestions, not guarantees.
- Hosted persistence requires running the new migration; until then, hosted
  saves of `template_family` will fail and the UI falls back to a clear error.

---

## Phase 6 update — distribution, sharing & forking

Phase 5 records were owner-private. Phase 6 adds a safe distribution layer on
top of them without changing the runtime `TemplateFamily` model:

- Record fields `sharing` (visibility, share token, public id, license,
  attribution) and `forkedFrom` (lineage).
- Deterministic permissions, a sanitized public payload, share tokens/public
  ids, share/fork endpoints, forking, a dev gallery, a public preview route, and
  share/revoke controls in this lab's **Sharing & lineage** tab.
- See [TEMPLATE_DISTRIBUTION_PHASE_6.md](TEMPLATE_DISTRIBUTION_PHASE_6.md).

Still **not** a marketplace: no payments, ratings, comments, team roles, or
public search ranking.

---

## Phase 7 update — agency workspace & client scoping

Phase 7 adds workspace and client scoping to `TemplateFamilyRecord`:
- `workspaceId?: string`: templates accessible across all clients in an agency workspace.
- `clientId?: string`: templates dedicated specifically to a single client.
- Create flow prioritization: client-scoped approved templates appear first.
- See [AGENCY_WORKSPACE_PHASE_7.md](AGENCY_WORKSPACE_PHASE_7.md).
