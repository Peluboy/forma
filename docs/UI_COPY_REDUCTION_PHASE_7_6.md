# UI Copy Reduction Phase 7.6

Rule: if layout, a label, a badge, or a preview can carry the meaning, do not
add a paragraph.

## Dashboard

Before: dark hero with kicker, headline, paragraph, then three more captions.
Four filters each labelled with technical prefixes (`Workspace:`, `Client:`).
Quality as `90/100` on every card.

After: greeting, one sentence, three action cards. Search plus All / Personal /
Workspace. Project cards show a preview, name, template, and Ready / Needs review.

Remaining helper text: empty state only.

## Create

Before: "Explore three editable design directions…" plus a template explanation
box plus "Your words are preserved exactly…" plus provider names.

After: "Saved to {place}." Choice cards. One create button. Reference style
collapsed to colors and "Use this style."

Remaining helper text: save destination, drop zone hints.

## Editor

Before: starter strip repeated the same three steps already in the rail.
Content panel duplicated fields and "Advanced: edit the full manuscript."
Quality panel said "DesignSpec vs. Editable Editor Document."

After: starter is Style / Content / Export. Manuscript details closed by default.
Quality chip is Ready / Minor limits / Needs review.

## Workspace

Before: "WORKSPACE:" uppercase, "Role: owner", "(agency)" in options,
"Agency (Multi-client, team collaboration)", empty dark void.

After: workspace select, role badge, "New workspace" / "New client" in modals.
Empty state: "Add your first client."

## Gallery

Before: "Phase 6 v1", policy paragraph, "Filter approved public templates",
"Forked into your library, a private copy with lineage preserved."

After: hero title, search, chips, "Copied into your library."

## Auth / landing

Before: three em dashes in marketing copy. Flat mint auth panel.

After: commas instead of em dashes. Auth story uses the hero gradient.

## Technical names removed from user UI

| Internal | User-facing |
| --- | --- |
| AI Designer Pipeline | Create design |
| TemplateFamily | Template |
| ReferenceDesignProfile | Reference style |
| DesignSpec quality | Design quality |
| Projection fidelity | Editable output |
| viewer | View only |
| quality_trusted | Ready |
