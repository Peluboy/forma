# Editor UI/UX audit — corrected against the code (October 3, 2026)

**Scope.** A point-in-time reconciliation of the "Forma — Full UI/UX Audit" issue list
against the current source. The original list drifted from the code: several items had
already been fixed or partially fixed in earlier passes. This document records the true
status of each item and what Phase 1 changed.

**Method.** Every claim was checked against the referenced files at the line level, then
Phase 1 was implemented and verified with the built-app browser suite and the unit/API
suites. No hosted Supabase, live AI provider, or external renderer was exercised.

## Reconciliation

Status legend: **Fixed** (done in this pass), **Already done** (was already true in code),
**Partial**, **Open**.

| # | Original claim | Verified status | Evidence |
|---|---|---|---|
| 1 | QuickStart only appears with `?tour=1` | **Partial → Fixed** | It already also opened via the onboarding start intent (`EditorPage.tsx` `setShowGuide(true)`). Now the checklist also shows by default for an untouched first-visit project on wide screens, and stays dismissed. |
| 2 | Content panel invisible; no obvious entry | **Partial → Fixed** | A `PanelRightOpen` toolbar toggle already existed. A first-class **Content** entry was added to the tool rail (`EditorToolRail.tsx`); wide screens still default the panel open. |
| 3 | "More" hides five major features | **Fixed** | `EditorToolRail.tsx`: **Document** and **Slides** moved into the primary rail. "More" now holds Workflows, Team, Projects and Help only. |
| 4 | Rail labels tiny (10px), items 52×56, rail 64px | **Open** | `editor.css` `.app-shell .rail-item{font-size:10px;height:56px;width:52px}`, `.tool-rail{width:64px}`. Larger targets remain Phase 2. |
| 5 | Library scrollbar nearly invisible | **Open** | `panel.css:22 scrollbar-color:var(--border-strong) transparent`; `styles.css` `.library-panel` still uses literal `#e0dfe8`. |
| 6 | Selection toolbar too dense | **Open** | `EditorSelectionToolbar.tsx` / `EditorTextToolbar.tsx` unchanged. |
| 7 | Inspector renders 15+ controls at once | **Partial** | Geometry is already collapsed into `<details>Position and size</details>` (`SelectionInspector.tsx`). Still dense; progressive disclosure remains Phase 2. |
| 8 | Panel-description walls of text | **Fixed** | Removed from Design, Reference, Elements, Text, Content, and the inspector empty state. |
| 9 | Manuscript is a raw textarea | **Partial → Fixed (guided)** | Added a structured six-field form (Eyebrow, Headline, Body copy, Date & time, Location, Footer) that edits the manuscript in place. The raw editor is kept under an **Advanced** disclosure. |
| 10 | "Apply changes" easy to miss | **Open** | Still a bottom-of-panel primary button; auto-apply/sticky is Phase 3. |
| 11 | Header bar cluttered | **Open** | `EditorHeader.tsx` unchanged. |
| 12 | No visual difference between modes | **Open** | Mode indicator/chrome is not implemented. |
| 13 | Only six templates | **Open** | `model.ts` `templates` has six entries. |
| 14 | Reference workflow confusing | **Open** | Existing panel still multi-step; wizard is Phase 3. |
| 15 | `quiet-note` everywhere | **Partial** | Panel descriptions removed, but the Reference panel's `quiet-note` lines and info-card remain. |
| 16 | Palette can't reach brand colors | **Already done** | `EditorColorPalette.tsx` already shows a "Brand colors" group plus "Edit brand colors and fonts". The claim was stale. |
| 17 | Zoom controls desktop-only | **Open** | `EditorCanvasFooter.tsx` unchanged. |
| 18 | No template preview/confirm | **Open** | Template click still applies immediately. |
| 19 | Export dialog text-heavy | **Partial** | Already migrated to Tailwind and trimmed; still shows a description line, metadata rows and a footnote. |
| 20 | Layers popover floats | **Open** | `EditorLayersPopover.tsx` unchanged. |
| 21 | No shortcut discovery | **Partial** | A `Tooltip` component and Help dialog exist (a focused browser check asserts the Undo tooltip); a `?` reference is not implemented. |
| 22 | Context menu lacks keyboard/ARIA | **Partial** | `EditorContextMenu.tsx` already has `role="menu"`, `role="menuitem"` and Escape-to-close. Arrow-key navigation and focus return are missing. |
| 23 | Toasts never auto-dismiss | **Already done** | `EditorPage.tsx` clears the toast after 4500 ms. Only a progress indicator is missing. |
| 24 | Mobile layout needs work | **Open** | No bottom nav; panels overlay the canvas. |
| 25 | Inconsistent empty states | **Partial** | Design has a proper `empty-state`; Elements/Text do not. |
| 26 | Upload zones text-only | **Open** | No animated dropzone. |
| 27 | Workflows/Team feel like admin panels | **Open** | `SkillsPanel.tsx`, `TeamPanel.tsx` unchanged. |
| 28 | Dark mode hardcoded colors | **Partial** | Export dialog and tokens migrated, but `EditorModalHost.tsx` still uses `bg-[#fcf0f1]`, `bg-[#eef7f0]`; `styles.css` has literal `#e0dfe8`, `#f9f8fc`. |

## Phase 1 changes (this pass)

First-impression fixes: make a new user understand what to do, remove text walls, and
surface the manuscript input.

- **Issue 1 — first-run onboarding.** `EditorPage.tsx` adds `shouldAutoShowGuide`: the
  quick-start checklist now shows by default for an untouched sample project on screens
  ≥ 900 px until it is dismissed (persisted in `localStorage` under
  `forma.editor.guide.dismissed.v1`). Narrow screens keep the rail/Content guidance and
  still receive the checklist through the onboarding flow.
- **Issue 2 — Content entry.** `EditorToolRail.tsx` gained a **Content** rail button
  (`contentOpen` / `onOpenContent`) that opens the manuscript panel from any screen size.
  The existing toolbar toggle and wide-screen default-open behaviour are unchanged.
- **Issue 3 — format discoverability.** **Document** and **Slides** are now primary rail
  tools; "More" holds only Workflows, Team, Projects and Help.
- **Issue 8 — less documentation.** Panel-description paragraphs were removed across the
  Design, Reference, Elements, Text and Content panels and the inspector empty state.
- **Issue 9 — guided content form.** `EditorContentPanel.tsx` renders a labelled field per
  standard manuscript field, backed by new `fieldText` / `setFieldText` helpers in
  `manuscript.ts`. Editing a field rewrites only that block and preserves every other
  section, including custom blocks. The raw manuscript stays available under an
  **Advanced** disclosure (open by default; see the note below). New CSS lives in
  `editor.css` (`.content-fields`, `.content-field`, `.content-advanced`, `.rail-divider`).

### Deliberate deferral

The raw textarea is kept **open by default** inside the Advanced disclosure rather than
collapsed. About 30 browser assertions fill a textbox named `Content`, so collapsing it
would require migrating eight spec files at once. Keeping it expanded preserves the whole
suite while the structured fields become the primary path. Collapsing it (and migrating
those specs) is a follow-up.

## Verification record

Against a fresh `npm run build` and `playwright.built.config.ts` (isolated local server,
system Chrome), on October 3, 2026:

- `npm run lint` — formatting, source-layout check, and strict client/server TypeScript pass.
- `npm test` — **56 unit tests pass** (one new: "structured field edits preserve every other
  manuscript section").
- Built-app browser suite — **37/37 pass** across all 15 spec files with one worker,
  including content/apply, desktop no-overflow, mobile panel, Elements/Document/Slides,
  onboarding quick-start dismissal, providers, product/account, and reference journeys.
- `npm run test:backend` (3), `test:account` (1), `test:billing` (2), `test:db` (3) pass.

### Test updates

- `tests/editor-slide-flow.spec.ts` — click **Slides** in the rail
  (`navigation "Design tools"`) instead of opening "More".
- `tests/editor-canvas-actions.spec.ts` — scope the design-panel **Slides** format button
  to `.design-formats` now that the rail also exposes "Slides".
- `tests/model.test.ts` — added coverage for the new field helpers.

## Corrected roadmap

1. **Editor chrome.** Issues 4, 6, 7 — larger targets and a grouped, collapsible toolbar
   and inspector.
2. **Polish.** Issues 10, 13, 14, 19, 23 — sticky/auto-apply, more templates, reference
   wizard, simpler export, toast progress.
3. **Mobile + accessibility.** Issues 17, 22, 24 — bottom nav / pinch zoom, context-menu
   keyboard navigation and focus return, responsive layout.
4. **Consistency.** Issues 5, 15, 25, 26, 28 — scrollbar affordance, quiet-note policy,
   unified empty states, richer dropzones, and the remaining hardcoded colors to tokens.
