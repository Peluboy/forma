# Forma codebase guide

This guide describes the October 2, 2026 source layout. Start with `src/main.tsx` for routes, `src/features/editor/EditorPage.tsx` for the editor composition, and `server/app.ts` for HTTP behavior. The editor is still the largest client coordinator, but its rendering, dialogs, inputs, keyboard behavior, history, and project/layer actions now have named homes.

## Directory map

| Path | Responsibility |
|---|---|
| `src/domain/design/` | UI-independent project schema, manuscript parsing, fitting, layers, editable-file format, design systems, document and presentation logic. |
| `src/domain/team/` | Team role and publication rules shared by client and server. |
| `src/features/editor/` | Editor page and its `canvas/`, `components/`, `dialogs/`, `hooks/`, `lib/`, and `panels/`. |
| `src/features/account/`, `billing/`, `projects/`, `review/`, `site/`, `team/`, `workflows/` | Route and feature-specific UI. |
| `src/shared/api/` | Client API and session access. |
| `src/shared/components/` | UI controls used by more than one feature. |
| `src/shared/navigation.ts`, `theme.ts` | Cross-feature navigation and theme helpers. |
| `src/styles/` | Design tokens, shared primitives, and existing page/editor stylesheets. |
| `server/` | Express API, local and Supabase persistence, authentication, billing, and provider adapters. |
| `api/` | Vercel server entry point. |
| `supabase/migrations/` | Hosted schema and row-level security. |
| `tests/` | Unit, API, database, and Playwright browser checks. |

`src/main.tsx` is the only client route switch. New route pages belong in a feature folder; add their lazy import and path there. Keep `src/` itself limited to entry points and ambient types. `npm run lint` checks root placement, prevents domain imports from reaching UI folders, and rejects React modules above 1,000 lines. Split components by responsibility before they reach that threshold.

The shared `Button` component in `src/shared/components/ui/Button.tsx` emits semantic `ui-button` and variant classes backed by `src/styles/ui.css`. Keep these classes when changing the component: legacy unlayered global CSS otherwise overrides Tailwind utility backgrounds and can make primary actions appear as plain text. UI fonts come from `src/styles/fonts.css`; do not add a runtime Google Fonts import.

## Editor map

`EditorPage.tsx` owns the current project, UI state, and wiring between features. It should compose smaller pieces, not accumulate new panels or dialogs.

- `components/EditorHeader.tsx`, `EditorToolRail.tsx`, `EditorContentPanel.tsx`, `EditorSelectionToolbar.tsx`, `EditorQuickStart.tsx`, `EditorFileInputs.tsx`, and `EditorStorageStatus.tsx` present the main controls.
- `canvas/EditorArtboard.tsx` and `EditorCanvasFooter.tsx` contain the graphics viewport and zoom/status controls. Document and presentation canvases are in the same folder.
- `components/EditorTextToolbar.tsx` edits selected text using the catalog in `src/domain/design/fonts.ts`; `lib/fontAssets.ts` embeds the selected files into graphics exports. Keep the catalog, CSS font faces and export assets aligned.
- `components/InlineTextEditor.tsx` handles double-click canvas wording; `src/domain/design/manuscript.ts` synchronizes edits to managed fields. `components/EditorColorPalette.tsx`, `EditorLayersPopover.tsx`, and `EditorContextMenu.tsx` own the contextual popovers. Keep their state wiring in `EditorPage.tsx` aligned with undo, save and export.
- `src/domain/design/layers.ts` owns graphic/image/frame records; `components/GraphicLayers.tsx` renders their masks and crop-to-fill images. `lib/selectionActions.ts` handles image-to-frame placement and selected-layer actions. Check the file bridge and export renderer whenever a layer field changes.
- `panels/` contains Design, Reference, Text, Elements, Document, and Presentation views. Team, Skills, and Projects panels live with their own features.
- `dialogs/EditorModalHost.tsx` owns which dialog renders. The individual review, export, and workspace dialogs stay beside it.
- `hooks/usePersistence.ts` handles guest/account persistence and conflicts; `useEditorHistory.ts` handles undo/redo; `useEditorKeyboard.ts` handles keyboard shortcuts.
- `lib/fileImports.ts` validates and reads reference/manuscript files. `lib/projectActions.ts` handles open/duplicate/delete and export-related project actions. `lib/selectionActions.ts` handles selected text/graphic mutations. `lib/editorNav.ts` maps tools and URL state.
- `lib/canvasActions.ts` handles the object/page context menu, copy and paste styles, visibility, locking and page actions. Keep its dependency object narrow when adding an action.
- `lib/startIntent.ts` handles one-time dashboard and AI creation handoffs after project storage initializes.
- `lib/editorIoActions.ts`, `startGraphics.ts` and `editorIssues.ts` own uploads/provider requests/exports, graphics starts and issue labels. `components/EditorLibraryPanel.tsx`, `EditorCanvasToolbar.tsx`, `EditorContextMenuHost.tsx` and `canvas/EditorPageTopline.tsx` own the corresponding editor chrome. Keep new specialist UI in these components rather than rebuilding a monolithic page.

The AI creation route lives in `features/create/`. Its route component owns request state and editor handoff, while `components/CreativeDirections.tsx` owns previews. `domain/design/creativeDesign.ts` validates the bounded plan and converts it to editable graphics, document or presentation projects. `server/creative.ts` owns the Gemini request. The current [Tailwind migration](tailwind-migration.md) is staged; the creation UI uses Tailwind, while older routes still import legacy CSS.

To add a tool, first decide whether it is a panel, canvas control, or dialog. Build that piece in its corresponding folder, then connect it in `EditorPage.tsx`. Preserve the save-before-navigation and unapplied-manuscript guards when switching projects. Keep copy changes deterministic; analysis output must never replace approved manuscript text.

## Domain and API boundaries

`schema.ts` defines `Project`, fields, bounds, and validation. `manuscript.ts` parses and applies source wording. `model.ts` keeps project creation, defaults, and fitting and reexports the earlier model API for compatibility. New domain consumers should import the specific module when practical; existing callers can continue through `model.ts` until they are migrated. The serialized project keys and browser storage keys were not renamed in this restructuring.

UI features may import `domain` and `shared`; domain code must not import React components or browser page state. Cross-feature imports are currently allowed where a panel is reused, but a growing dependency should move into `shared` or a domain module rather than forming a cycle. Server handlers validate project data at the boundary and enforce ownership independently of client controls. Use `.js` extensions for relative imports compiled by the server's NodeNext configuration; client-only imports follow the current Vite convention.

The source of truth for hosted records and permissions is the SQL migration, not a client type. Supabase credentials and provider keys belong in ignored environment files or deployment secrets, never in source or documentation.

## Where to change common behavior

| Change | Start here | Check afterward |
|---|---|---|
| Project field or validation | `src/domain/design/schema.ts`, then `model.ts`, persistence adapters, file compatibility | Model/document unit and API tests |
| Manuscript mapping or exact-copy rule | `src/domain/design/manuscript.ts` | Model tests, editor copy/export browser journey |
| Editor panel or selected-object control | `src/features/editor/panels/` or `components/`, then `EditorPage.tsx` | Relevant editor/layer browser journey |
| File import or backup | `src/features/editor/lib/fileImports.ts`, `src/domain/design/document.ts` | Editable-file and product browser journeys |
| Saving, conflicts, project switching | `src/features/editor/hooks/usePersistence.ts`, `lib/projectActions.ts` | Dashboard, navigation, account, and conflict journeys |
| Visual tokens | `src/styles/tokens.css` | Light/dark, desktop/mobile browser review |
| API authorization | `server/app.ts`, adapters, migration policies | API and database isolation tests |

## Verification

Use Node 24 and install from `package-lock.json`. Before handing off a behavior change, run:

```sh
npm run lint
npm run build
npm test
npm run test:backend
npm run test:account
npm run test:billing
npm run test:db
```

The built-app browser configuration starts an isolated local runtime:

```sh
npx playwright test --config=playwright.built.config.ts --workers=1
```

Run the relevant focused specs during implementation, then the full suite before claiming release acceptance. `npm run lint` currently checks Prettier and strict unused-code TypeScript diagnostics; it is not an ESLint ruleset. The build also checks both client and server TypeScript. Browser and hosted verification are separate; a local pass does not prove Supabase, billing, or live AI behavior.

## Remaining structural work

This pass organizes the source and cuts the editor page from roughly 2,761 to 1,121 formatted lines. The page still coordinates many stateful flows. `src/domain/design/presentation.ts`, `designSystem.ts`, `src/features/account/AccountSettings.tsx`, `src/features/site/PublicSite.tsx`, and `server/app.ts` remain large. Further extraction should follow actual change areas with focused tests, especially presentation export adapters, design-system storage, account sections, and API route modules. CSS is centralized in `src/styles/` but not yet split by every component. There is a basic root/domain import-boundary check; a full dependency-cycle check is still pending. See [the source audit](source-architecture-audit-2026-10-02.md) for the earlier baseline.
