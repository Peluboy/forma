# Source architecture audit

**Update:** The extraction plan below was substantially implemented later on October 2. For the current folder map and remaining limits, read the [codebase guide](codebase-guide.md). The line counts below are the pre-restructure baseline.

**Date:** October 2, 2026. **Scope:** `src`, server entry points, and the checks used after editor changes.

## Findings

The client has 47 TypeScript files and about 14,758 source lines. `App.tsx` was 2,947 lines at the start of this pass. It owns project state, persistence handoffs, editor navigation, upload and AI actions, project management, canvas controls, and most dialogs. Changes to one flow therefore require reading unrelated UI and create a larger regression surface. `model.ts` (778 lines) mixes types, manuscript parsing, validation, templates and text fitting. `presentation.ts` (726 lines) mixes slide content generation, fit checks and export. `designSystem.ts` (558 lines) mixes brand data, templates, workflow packages and guest storage. These are the next module boundaries.

Styles are spread across `styles.css`, `editor.css`, `panel.css`, `ui.css`, `tokens.css`, and page-specific files. Semantic theme tokens exist, but several older selectors still live in the large shared sheets. A further stylesheet split should follow component extraction so behavior and visual regression can be checked together.

The editor already has useful seams: `usePersistence.ts` owns guest/account saves; `editorNav.ts` owns tool and URL mappings; `DocumentPanel.tsx`, `PresentationPanel.tsx`, `SelectionInspector.tsx`, and layer components own specialist controls. New code should follow these boundaries rather than add more JSX to `App.tsx`.

## Refactor completed

- Extracted the Projects rail into `ProjectsPanel.tsx` and the download modal into `EditorExportDialog.tsx`. `App.tsx` now passes narrow data and action callbacks while those components own their presentation. Report/slide cards render their own page previews, and Delete is a separate keyboard-accessible button instead of a control nested inside the Open button. `App.tsx` is 2,761 lines after these extractions, so the split is underway rather than finished.
- Creating pages or slides now creates a new project ID, saves the source first, and keeps the original design in Projects. Opening an existing project and starting a new design also save pending project state first. Unapplied Content changes block the switch with a plain-language message.
- The URL tracks the open project and clears an old object selection. A unit test covers the URL transition.
- Added `npm run lint`, which checks Prettier formatting plus strict client/server TypeScript diagnostics for unused code. Removed the unused declarations it exposed and normalized source formatting. This is a static check, not ESLint rule coverage; an ESLint configuration is still future work.

## Next safe extraction order

1. Split editor project actions and upload/analysis actions into hooks with small inputs and explicit save/error results. Avoid putting unrelated state into one large context.
2. Extract the canvas toolbar and status/header controls into focused components. Preserve keyboard, locked-layer and selection behavior with browser regression checks.
3. Split `model.ts` into project schema, manuscript parser, template defaults and fit calculation modules. Keep a compatibility barrel until existing imports and stored project round trips pass.
4. Split `presentation.ts` into parsing/layout and export adapters. Keep exact manuscript copy and overflow diagnostics covered by fixtures.
5. Separate `designSystem.ts` brand, template and workflow packages, then colocate their storage adapters with persistence.
6. Migrate tests with each extraction and inspect representative light/dark desktop/mobile screenshots. Do not rename stored keys or serialized fields as part of a cosmetic refactor.

## Verification

`npm run lint`, `npm run build`, and `npm test` pass after this pass; the unit suite has 51 tests. Six local API integration tests across account, backend, billing and team pass with localhost permission. Nine focused built-app browser tests pass across current editor, styles, text/graphic layers, image replacement and the separate-project slide journey. After extracting the export dialog, the two export journeys and mobile editor check were rerun and passed. The first rerun was delayed by an automatic approval-service usage limit and then completed successfully. Full browser migration and hosted acceptance remain separate release gates.
