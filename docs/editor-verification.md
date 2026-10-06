# Editor redesign verification

## October 2: Signed-in panel and slide pass

[Editor usability audit](editor-canva-audit-2026-10-02.md) records all nine rail panels, selected text/shape and post-creation Document, Slides and Team views. The production build, 50 unit tests and eight focused editor/layer browser checks pass. The browser checks include new typography/shapes, immediate guest reload, ordinary manuscript slide layout, direct slide edits, safe rebuild cancellation, persistence and export. This is local evidence; full browser, visual-device and hosted acceptance remain open.


## October 2, 2026: Reference and account journey verification

- Updated provider and product browser journeys for Content, exclusive panels, File history, More > Projects and accessible template tabs. Retained the underlying behavior assertions.
- Added simulated provider-outage recovery: a 503 keeps manuscript copy intact, enables another attempt and manual mapping, and allows a successful switch to another provider. Every mocked analysis request is checked to contain only image and provider, never manuscript copy.
- Real local OCR recognizes the synthetic reference and presents regions for approval without replacing the manuscript. Local account signup/save/reload/history, review comments/approval/revocation/logout, and two-tab save-conflict recovery pass.
- Campaign ZIP inspection now verifies exact approved-copy text, the editable backup manuscript, and portrait/square/story image dimensions. PDF input and PDF export signature pass; this does not certify PDF typography or multi-page document rendering.
- Verification: `npx playwright test tests/providers.spec.ts tests/product.spec.ts --config=playwright.built.config.ts --workers=2`: **5 passed** against the isolated local server and existing production build. This slice changes tests and documentation only. Gemini/OpenAI responses are mocked; no hosted Supabase or live AI calls were made.
- Remaining browser migration: public/onboarding and workspace journeys. Full suite, full visual matrix, hosted identity/team acceptance and representative document/presentation output review remain open.


## October 2, 2026: Layer inspector verification and lock protection

- Migrated text and graphic layer browser journeys to the selection inspector, Content panel and editable-file actions, retaining content preservation, overflow recovery, movement/undo, persistence, backup reopening, stacking and export assertions.
- Fixed locked-layer removal in the inspector, floating toolbar and Delete/Backspace shortcuts. Both removal buttons are disabled while locked, and all removal paths share the handler guard. Regression checks cover text and shape locks, then successful removal and undo after unlocking.
- Fresh `npm run build` passes. `npx playwright test tests/text-layers.spec.ts tests/graphic-layers.spec.ts tests/editor-current.spec.ts --config=playwright.built.config.ts --workers=2`: **6 passed**, using the isolated local server with no live AI requests.
- Verified SVG content/image embedding and stacking, PNG dimensions, editable backup round trips, unsupported-image recovery, mobile panel width, and existing theme/output invariance. Inspected the mobile Elements screenshot. Full browser migration, cross-route visual review and hosted acceptance remain pending.


## October 2 follow-up: six focused journeys

Build and all six tests in editor-current, editor-layout, design-files and dashboard pass. Added current-UI safe-navigation and keyboard-tooltip coverage; retained backup/save/reload/missing-project checks. Dashboard mobile overflow was reproduced and fixed. Toast and zoom use semantic theme tokens; dark editor and mobile dashboard screenshots inspected. Full-suite migration remains pending after a fail-fast probe exposed obsolete selectors and labels in other journeys.

## October 2 focused acceptance

Fresh production build passes. `tests/editor-current.spec.ts` passes both current-interface journeys, including content application, save/reload, backup reopening, persisted theme choice, system-theme changes, identical SVG exports in light/dark and mobile panel recovery. Fixed stale dialog deep links found by this test: completed downloads and dismissed dialogs no longer reopen after reload. Dark desktop and light mobile screenshots inspected. This is focused verification, not a full browser-suite or WCAG certification.

**October 2 checkpoint:** implementation below is historical evidence. Fresh unit suite: 49 passed. Production build: now passes after the October 2 repair. Current browser/mobile/theme acceptance remains pending. See [STATUS.md](STATUS.md).

**Date:** October 1, 2026  
**Audit:** [editor-audit.md](editor-audit.md)

## Completed

| Item | Evidence |
|---|---|
| Full editor audit + function mapping | `docs/editor-audit.md` |
| Header: Projects back, name, save, File menu, Share, Export | Live editor |
| File menu absorbs page size, history, brand, help | App.tsx |
| Rail: Design · Text · Elements · Reference · More | App.tsx |
| Default: task panel closed; canvas-first | `showLibrary` default false |
| Content drawer (renamed from Manuscript) | Right panel |
| Selection inspector + list-only layer panels | `SelectionInspector.tsx` |
| Delete/Backspace remove selected layer | Keyboard handler |
| Floating toolbar Remove | App.tsx |
| Checks chip in toolbar; opens Issues | Toolbar |
| Removed breadcrumb + permanent caption | App.tsx |
| Light/dark theme unchanged for artboard | Tokens chrome-only |
| Unit tests | 47 pass; `tsc` clean |

## Not done / limited

| Export dialog deep-link selecting the exact overflowing object | Done October 1 (`focusIssue` + Export issue cards) |
| Accessible tooltip component | Done October 1 (`Tooltip.tsx`, icon buttons) |
| Content panel density | Simplified October 1 |
| Task panels (Design…Help) | Studio Ink `panel.css` October 1 |
| Rail deep links (design…help) | Done October 1 (`editorNav.ts`) |
| Nontechnical usability sessions | Not run |
| Full mobile device matrix screenshots | Not run |
| Guest + signed-in journey automation for every brief journey | Not run |
## Preservation

Handlers for apply content, reference analysis, undo/redo, persistence, export validation, and review share remain wired. No capabilities removed; access moved (History/Brand/Resize → File).
