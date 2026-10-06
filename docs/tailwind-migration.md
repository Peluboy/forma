# Tailwind migration and source boundaries

Updated October 4, 2026. Tailwind v4 and semantic light/dark tokens are already configured in `src/styles/tokens.css`. The `/create` route and the dashboard AI entry use Tailwind utilities. This is the starting point of a staged migration, not a completed conversion.

## Current CSS inventory

The current authoring CSS totals **8,257 lines**: `styles.css` 2,873; `site.css` 1,782; `editor.css` 1,226; `panel.css` 1,207; dashboard 396; editor overhaul 311; tokens 284; fonts 113; UI 65. The dashboard start layout and grid now use Tailwind; 29 matching CSS lines were removed. A global unlayered button reset in older styles can override Tailwind button backgrounds, so product actions should use the shared `Button` component until that reset is removed. Font faces and semantic tokens remain CSS by design; “Tailwind migration” concerns layout and component styling, not deleting tokens or font declarations.

## Migration order

1. New features use semantic Tailwind utilities and small, colocated components. The creation route follows this pattern. Avoid new general-purpose selectors in `styles.css`.
2. Migrate the public/account shell and dashboard by owning component. Remove obsolete selectors at the same time as the JSX conversion. Verify desktop/mobile and light/dark screens after each slice.
3. Migrate editor rail, header, panels, popovers, canvas chrome and dialogs in that order. Keep artboard SVG styling and export rendering separate from interface utilities; they represent the user's design.
4. Delete `editor-overhaul.css`, then shrink `panel.css`, `editor.css`, `site.css` and `styles.css` as ownership moves. Remove the global element selectors that make utility precedence unpredictable.
5. Add a lint rule or source check that prevents new imports of retired stylesheets, and keep a visual regression set for all major routes.

## Component boundaries

`src/features/create/CreatePage.tsx` owns request and handoff state; `components/CreativeDirections.tsx` renders results; `src/domain/design/creativeDesign.ts` validates plans and creates editable projects; `server/creative.ts` is the Gemini adapter. The editor has dedicated modules for context actions, start handoffs, I/O, graphics starts, issues, the library panel, toolbar, page header and context-menu state. `EditorPage.tsx` is now **995 lines**, down from 1,786 at the start of this work. It still owns broad state wiring; future tools should avoid growing it again.

Keep each extraction behavior-preserving, with typecheck, unit and browser tests. Do not move source copy transformations into AI or presentation components. A new design plan may choose presentation, hierarchy, color and assets, but the editable project must continue to store the approved manuscript byte-for-byte.
