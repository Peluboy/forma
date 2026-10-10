# UI Rescue: Screenshot Critique (Phase 7.6)

Basis: the screenshots supplied with the Phase 7.6 brief, plus fresh captures of the
running app at 1440px in both themes (`/dashboard`, `/create`, `/editor`,
`/workspaces`, `/login`, `/`, `/templates`, `/dev/template-gallery`).

## Root causes (apply to every screen)

1. **Theme defaulted to the OS.** `readThemePreference()` returned `system`, so any
   machine in dark mode got the dark palette everywhere, including marketing pages.
2. **The dark palette is green-black.** `--bg-page: #111916`, `--bg-panel: #1a2320`,
   borders `#334139`. Every surface carries a green cast, so nothing feels neutral or
   premium, and the accent green has nothing to contrast against.
3. **One token does too much.** `--chrome-rail` (`#17342e`) paints the dashboard hero,
   the editor tool spine, and the brand mark. Dark green ends up as the main colour
   of the product instead of an accent.
4. **`dark:` utilities used the OS media query**, not `data-theme`. Status badges could
   be dark while the page was light, and the other way round.
5. **Previews are missing where they matter most.** Project cards render the word
   "DOCUMENT" instead of the first page. The product is about documents, and it
   never shows them.
6. **Components exist but screens do not use them.** Phase 7.5 created `src/ui`, yet
   Dashboard, Create, Workspaces, and Gallery each still hand-roll their own inputs,
   tabs, selects, and badges with different radii and heights.

## 1. Dashboard (`/dashboard`)

- **Works:** clear sidebar order; "New design" is visible; three start options exist.
- **Looks weak:** project cards are grey boxes labelled "DOCUMENT"; the quality text
  ("Good com... Ready 90/100") is truncated; a sparse second row floats alone.
- **Too technical:** "All Scopes", "Workspace: X", "Client: Y" option prefixes; a score
  out of 100 on every card.
- **Too heavy:** a full-width dark-green hero block; in dark theme the whole page is
  a single green-black slab.
- **Spacing:** 240px sidebar with a 92px tall avatar tile; filters are 8px tall controls
  next to a 23px heading; cards are 200px minimum, which is too small for previews.
- **Simplify:** four filter controls into one search plus a scope segmented control.
- **Redesign:** light hero with a warm greeting and artwork; three action cards; large
  preview-first project cards.
- **Reuse:** `ProjectCard`, `EmptyState`, `SkeletonCard`, `Preview`/`Poster`.
- **New components:** `AppShell` + `ProductSidebar` + `Topbar`, `HeroPanel`,
  `ActionCard`, `SearchInput`, `SegmentedControl`, `PreviewCard`.

## 2. Editor: Content panel

- **Works:** left rail, centre canvas, and right panel are in the right places; the
  canvas is centred with a dimension label.
- **Looks weak:** the right panel is a vertical stack of seven identical input boxes,
  then a second copy of the same text in "Advanced: edit the full manuscript".
- **Too technical:** the starter strip ("1. Choose your starting point 2. Apply your
  manuscript 3. Check and export") repeats what the panels already say.
- **Too heavy:** dark green-black spine, dark panel, dark canvas stage. The artboard is
  the only light thing on screen.
- **Spacing:** fields have 8px gaps with no grouping; labels and inputs compete.
- **Simplify:** group fields under one section header; collapse the full manuscript.
- **Redesign:** light panels, soft dotted canvas stage, quieter starter strip.
- **Reuse:** existing panel structure and copy field components.
- **New components:** `InspectorPanel` / `InspectorSection`.

## 3. Editor: Design panel

- **Works:** template thumbnails give real previews.
- **Looks weak:** thumbnails sit on a dark panel with low contrast; category tabs look
  like plain text.
- **Too heavy:** panel colour matches the rail, so the active panel and tool nav merge.
- **Spacing:** 20px panel padding but 8px grid gaps; heading 21px display next to 12px
  labels.
- **Redesign:** clear separation between rail (icon nav) and panel (content surface).
- **New components:** `EditorToolButton` for the rail.

## 4. Editor: Elements panel

- **Works:** category tiles are large and clickable.
- **Looks weak:** tiles are flat boxes with the same border as inputs.
- **Too heavy:** same rail/panel merge as above.
- **Simplify:** fewer borders; use tinted tiles with hover lift.
- **Reuse:** `element-category` markup, restyled through tokens.

## 5. Create flow (`/create`)

- **Works:** two-column layout; "Start with your words." is a strong headline.
- **Looks weak:** the right column is a huge empty dark box with one sparkle icon.
- **Too technical:** "Multi-page Branded Report (Forma AI Designer)", "Template
  Authoring Lab", "Reference design intelligence v1 · not reconstruction", provider
  names (Gemini vision, Local OCR, OpenAI vision), "[Client]" / "[Workspace]" option
  prefixes, "Inspect Lab" link and raw layout IDs in the result.
- **Too heavy:** everything is a bordered box on a dark page.
- **Spacing:** the headline paragraph has 2x line height; form groups use 24px but the
  type-choice cards use 8px.
- **Simplify:** three explanatory sentences about exact copy become one badge.
- **Redesign:** a stepper (Words, Style, Review), visual type cards, a drop zone for
  the manuscript, a "Save to" context card, and a live preview area with artwork.
- **Reuse:** `CreateWorkspaceSelector` logic, `CreativeDirections`, pipeline views.
- **New components:** `Stepper` (refined), `SegmentedControl`, `ChoiceCard`, `DropZone`,
  `ContextChip`.

## 6. Reference editor flow (Editor > Reference)

- **Works:** a dedicated rail entry; comparison mode exists.
- **Looks weak:** upload area is a dashed box with small text on dark.
- **Too technical:** provider and confidence language in places.
- **Redesign:** use the shared reference artwork and plain labels ("Ready to use",
  "Style only", "Needs review").
- **Reuse:** `ReferenceStatusBadge`, `ReferenceCard`.

## 7. Workspace empty state (`/workspaces`)

- **Works:** a "New Workspace" button exists.
- **Looks weak:** when the account has no workspace, the page renders only a header
  and a select. There is a huge empty dark area with no explanation or artwork.
- **Too technical:** "WORKSPACE:" uppercase label; "Role: owner" pill; "(agency)" in
  option text.
- **Too heavy:** the header is a different design from the dashboard header.
- **Redesign:** product shell with sidebar; a clear "Set up your studio" empty state
  with artwork and one action.
- **New components:** `IllustrationPanel`, `WorkspaceCard` (upgraded).

## 8. Workspace create / member screens

- **Works:** the forms are functional; invite has role selection.
- **Looks weak:** forms are 12px text in 28px inputs inside a bordered box that
  appears inline and pushes the page down.
- **Too technical:** "Agency (Multi-client, team collaboration)" option text; role
  names shown lowercase ("viewer").
- **Spacing:** label 12px, input 12px, 4px between them; no grouping.
- **Redesign:** a modal with `Input`, `Select`, and `SegmentedControl` for type; member
  rows with avatars and `WorkspaceRoleBadge` ("View only" instead of "viewer").
- **Reuse:** `Modal`, `Input`, `Select`, `WorkspaceRoleBadge`.

## 9. Auth screen (`/login`, `/signup`)

- **Works:** the split layout and copy tone are good.
- **Looks weak:** the left story panel is a flat mint block; the preview card floats
  without depth.
- **Spacing:** 56px headline is crowded at 1280px; card max width is fine.
- **Redesign:** gradient story panel with layered page mockups; softer inputs; one
  clear primary button.
- **Reuse:** existing `Account` form logic, `Preview`.
- **New components:** `GradientArtwork` (auth variant).

## 10. Landing page (`/`)

- **Works:** the strongest screen. Clear headline, real poster preview, warm copy.
- **Looks weak:** in dark theme it inherits the green-black page.
- **Copy:** three em dashes in user copy ("together—without", "like you—and",
  "design—and").
- **Redesign:** none needed beyond theme and copy. It sets the direction for the app.

## 11. Template gallery (`/templates`, `/dev/template-gallery`)

- **Works:** `/templates` shows real previews in a clean grid; category filters exist.
- **Looks weak:** `/dev/template-gallery` hard-codes `bg-slate-900`, ignores tokens,
  and shows a "Phase 6 v1" badge and a policy paragraph.
- **Too technical:** "Filter approved public templates", "All sources" with raw source
  IDs, "Forked into your library, a private copy with lineage preserved."
- **Spacing:** preview frames differ between public and app galleries.
- **Redesign:** shared `TemplateCard` with a framed preview, category chips, light hero
  with accent artwork, and "Use template" as the main CTA.
- **Reuse:** `TemplateCard`, `SearchInput`, `SegmentedControl`.

## Summary of components to create or upgrade

| Need | Component |
| --- | --- |
| Product navigation | `AppShell`, `ProductSidebar`, `Topbar` |
| Page tops | `PageHeader`, `HeroPanel` |
| Starting points | `ActionCard`, `ChoiceCard` |
| Browsing | `SearchInput`, `FilterBar`, `SegmentedControl` |
| Content cards | `PreviewCard`, `ProjectCard`, `TemplateCard`, `WorkspaceCard`, `ClientCard`, `ReferenceCard` |
| Editor | `EditorToolButton`, `InspectorPanel`, `InspectorSection`, `CanvasToolbar` |
| Art | `GradientArtwork`, `IllustrationPanel` |
| States | `EmptyState`, `LoadingState`, `ErrorState` (restyled) |
