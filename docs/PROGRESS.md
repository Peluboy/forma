# Delivery progress

## October 5, 2026: Phase 2B — DesignSpec-to-Editor Fidelity, Continuation Pagination, and Human Calibration

- **Adapter Fidelity & Structured Projection Pipeline**: Implemented formal `toFlowDocument.ts` projection pipeline with comprehensive fidelity model (`EditorProjectionFidelityReport`). Preserves shapes, rules, dividers, images with fit modes, structured chart blocks, and page background colors into the editable `FlowDocument` editor canvas.
- **Export Consistency Validation**: Added `checkEditorExportConsistency` to detect missing text, table cells, or visual decorations before export preview.
- **Quality Score Trust Gating**: Decoupled raw DesignSpec score from deliverable score via `assessDeliverableQuality`. Output is explicitly gated (`quality_trusted`, `quality_approximated`, `quality_unverified_after_projection`, `editor_projection_loss_detected`). The Editor Quality Panel and Dev Lab distinguish DesignSpec quality, editable document quality, projection fidelity, unresolved fit, and unsupported features.
- **Continuation Pagination v1**: Added `applyContinuationPagination` in `layout-fit`. Safely splits oversized paragraphs, lists, and tables by row across continuation pages without splitting words or mid-cell. Maintains 100% Exact Copy conformance and sequential SourceSpan order.
- **Human Calibration Workflow**: Added `--write-review-package` to benchmark runner and `scripts/summarize-human-reviews.ts`. Computes Pearson correlation, false positives (high score / low human rating), and complaint category distributions.
- **AI Visual Critic Integration**: Opt-in integration (`--with-ai-critic`) validates AI suggestions against the controlled issue taxonomy without allowing AI to mutate copy or bypass deterministic geometry bounds.
- **Documentation & Test Verification**: Created `docs/DESIGNSPEC_EDITOR_FIDELITY.md`, `docs/CONTINUATION_PAGINATION_V1.md`, and `docs/HUMAN_QUALITY_CALIBRATION.md`. Updated `docs/DESIGN_QUALITY_ENGINE_V2.md`. 105 tests passing, TypeScript strict typecheck passing, benchmark updated.

## October 4, 2026: AI direction prototype across three design families

- Added `/create`, reached from the public homepage and dashboard, for approved manuscript paste/upload, optional reference image and saved brand, and graphics/document/slide selection. Sign-in gates the paid provider request and preserves a guest's draft through login. Gemini receives the brief server-side and returns three bounded art-direction proposals. Forma constructs editable projects without allowing model output to rewrite source copy.
- Graphics proposals now apply composition, fonts and colors to mapped copy, including unlabelled text. The first free block becomes a visible headline. Document and slide proposals retain the source and open in their respective editors, though they currently vary much less in layout. All three formats remain editable after selection. The route and result previews use semantic Tailwind utilities and are split from the domain and provider code.
- Extracted editor library, toolbar, page header, context menu, I/O, start handoffs, graphics starts and issue mapping into focused modules. `EditorPage.tsx` fell from about 1,786 to **995 lines**. Added a [Tailwind migration map](tailwind-migration.md); the dashboard start grid moved to utilities and matching CSS was removed. Another 8,257 CSS lines remain, including semantic tokens and fonts.
- Build, lint, 61 unit tests and three local API tests pass. After extraction, 26 focused built-app browser tests passed across creation, dashboard, canvas actions, layout, typography, slides, layers and workspace. An earlier full 39-test browser run passed 34; four account tests hit the local email rate limit and one PDF test passed on isolated rerun. One short live Gemini document brief returned three valid concepts; transient transport failures prompted one bounded retry in the new adapter. Representative output quality, full reference fidelity, automatic fit repair and production design quality are not yet verified.

## October 4, 2026: First repeat-template job flow

- Dashboard now lists a user's saved graphic templates under **Your templates**. Selecting one opens a short creation dialog for approved manuscript text or TXT/Markdown/DOCX/text-based PDF upload, **Match closely** or **Fit the content**, and optional application of the currently saved brand's text/background colors and fonts.
- A repeat job clones the saved project, replaces mapped manuscript copy without paraphrasing, keeps the original template intact, and opens the new design with Issues visible. **Fit the content** can extend text boxes only within available vertical space; remaining fit failures stay reviewable and continue to block visual export. It does not reflow arbitrary artwork, resolve all overlap or produce multi-page variations.
- Added domain checks for exact-copy cloning, brand application and bounded fit, plus a browser journey that saves a template, starts a branded job and verifies the new copy and preserved template. Visual screenshots of the dialog and result were inspected. Lint and build pass, 58 unit tests and all 38 built-app browser tests pass with one worker. Hosted account/agency journeys remain unverified.
- Design-PDF upload as a reusable editable template, multiple client brand kits, agency-hosted template publishing and reference-option generation are still pending. See [template/reference workflow](template-to-design-workflow.md).

## October 3, 2026: Editorial workbench UI overhaul

- Applied the [frontend design direction](frontend-overhaul-2026-10-03.md): a dark pine tool spine, warm neutral artboard stage, locally hosted Space Grotesk headings and DM Sans controls, one restrained accent, and stronger selection/hover/focus states. The editor header now carries a compact Forma landmark; the rail groups Design, Elements and Text ahead of input and output modes. The canvas remains the main visual surface in light and dark themes.
- Put **Use a template** and **Use a reference** at the top of the dashboard so a new user sees the two primary starts immediately. On phones, the old tall sidebar is replaced by a compact header and horizontal navigation. A browser assertion keeps the mobile navigation under 180 px and confirms the reference start is visible.
- Moved Text panel insertion controls above the manuscript field list, made **Add text** the clear primary action, and widened the Elements search field. Corrected the shared React button's semantic styles so action buttons render as real buttons in all routes. Removed the stale Google Fonts import; the interface uses the bundled font files.
- Replaced the previous purple chrome in sign-in, onboarding, account settings and the public hero/FAQ/footer with the shared semantic palette. The template preview artwork retains its own colors. Public route and account screenshots were inspected against the current build.
- Visual inspection exposed missing borders and spacing around sign-in inputs and account fields. Added explicit, theme-aware input surfaces and positioned the password visibility control inside its field. Public route checks include light and dark account screenshots.
- Replaced remaining violet canvas selection handles, region previews and inline-edit borders with the dedicated canvas-selection token; palette focus uses the interface accent. This keeps selection visible without making exported artwork theme-dependent.
- Inspected rendered desktop dashboard/editor and narrow mobile dashboard/editor screenshots. Lint, production build, 56 unit tests and all 37 built-app browser tests pass with one worker. Hosted service behavior and a full route-by-route accessibility/usability review remain open; see [status](STATUS.md).

## October 3, 2026: Canvas interaction and visual hierarchy

- Compared Forma with the user's Canva screenshots and Canva's public editor, text, layers and Brand Kit guidance. Enlarged the desktop artboard, kept the tool rail/library closable, and made the first-use guide a compact strip so the design stays central. This is an interaction improvement, not a Canva parity claim.
- Added direct double-click text editing with manuscript synchronization; a floating Layers panel for selection, order, visibility and locking; contextual object/page actions; document/brand color swatches with exact-match replacement; saved brand palette/fonts; and rectangular, rounded and ellipse photo frames with drag-to-fill placement and centered fill cropping. See [canvas actions and limits](editor-canvas-actions.md).
- Verified the current production build and static lint, 56 unit tests, and all 37 built-app browser tests with one worker. The new browser checks exercise direct text editing, color replacement, context copy/paste, Layers visibility, image-to-frame snapping with reload, and slide page actions. Desktop screenshots were inspected. Hosted integration, full accessibility/visual matrix, nontechnical usability, and fine image crop controls remain open.

## October 3, 2026: Typography and asset browsing

- Added eight version-locked, self-hosted Fontsource families alongside five existing system fonts. Selected graphics text now supports explicit weights, underline, strikethrough, letter spacing, line height and opacity in the toolbar and inspector. Styling remains separate from manuscript wording; export embeds selected font files into graphics SVG before rasterizing.
- Reworked the Elements browse section around Forma's working tools: Shapes and Images in graphics, Text boxes, Tables in Document and Charts in Slides. The Design panel now exposes Graphics, Reports and Slides entry points. No nonfunctional stock media or animation categories were added.
- Added [typography and asset documentation](typography-and-assets.md) and browser checks for font output, category navigation and narrow-screen toolbar behavior. Lint, build, 52 unit tests, 6 local API tests, 3 database-policy tests and the full 34-test built-app browser suite pass. The full suite initially had four local load/download timeouts with parallel workers; all 13 affected-file tests and then the full suite passed with one worker. Inspected desktop light and narrow mobile dark toolbar screenshots. The complete visual, keyboard and accessibility matrix remains open.

## October 2, 2026: Source restructuring

- Reorganized the client by domain, feature, shared code and styles. Moved editor pieces into canvas, components, dialogs, hooks, libraries and panels; moved project schema/manuscript rules into dedicated domain files. Updated imports across client, server, API, scripts and tests without changing stored project fields.
- Reduced the formatted editor page from about 2,761 lines to 1,121. It now composes extracted header, tool rail, Content panel, selection toolbar, artboard, footer, file inputs, status, quick start and modal host. History, keyboard shortcuts, file reading, project operations and selection mutations have separate modules.
- Added the [codebase guide](codebase-guide.md) with ownership, change locations, guardrails and checks for new developers. `presentation.ts`, `designSystem.ts`, account/public pages and server route composition remain substantial follow-up boundaries; the folder move is not a claim that all modules are small.
- Added a source-layout check to `npm run lint` so new root-level feature files and domain-to-UI imports are rejected. Static lint, client/server build, 51 unit tests, 6 local API tests, 3 database-policy tests and 15 focused built-app browser tests pass after the restructuring. Hosted behavior is not verified by this refactor.

## October 2, 2026: Editor project safety and codebase structure

- Replaced the Projects JSX in `App.tsx` with `ProjectsPanel.tsx` and the export modal with `EditorExportDialog.tsx`, added actual report/slide previews and separate Open/Delete controls, and documented the next module boundaries in [the source architecture audit](source-architecture-audit-2026-10-02.md). Export and mobile editor browser journeys passed after the dialog extraction.
- Pages and slides now create new projects after saving the source. Project switching saves the current design first, keeps the original accessible, blocks unapplied Content changes, and updates the URL to the open project.
- Added in-place image replacement that preserves layer position and size; its focused browser test passed before the project refactor.
- Added `npm run lint` for formatting and strict client/server TypeScript unused-code checks, removed unused declarations, and normalized source formatting. Fresh lint, build, 51 unit tests, 6 local API integration tests, and 9 focused editor browser tests pass. The automatic approval service initially delayed browser/API reruns, which completed after its stated retry time.

## October 2, 2026: Signed-in editor audit and craft pass

- Inspected every rail panel in a local signed-in account, selected text and shape, and the first Document, Slides and Team actions. Compared interaction patterns with Canva's public editor, text and uploads guidance; no Canva account session was accessed. Findings and saved screenshots: [editor usability audit](editor-canva-audit-2026-10-02.md).
- Added five-font typography, bold/italic, a heading preset, rounded and triangle shapes, and visual shape choices. Style changes persist through editable backup and SVG export. Guest edits now flush on page exit so immediate reload does not lose them.
- Fixed ordinary manuscript-to-slide conversion: headline becomes title, body lines wrap, long copy produces a blocking fit issue, and blank slides add no placeholder copy. Added direct slide title/text/notes editing and a confirmation before rebuilding from Content. Simplified Document and Slides copy and cleared stale graphic selection/page labels on format changes.
- Fresh production build and 50 unit tests pass. Eight focused current editor/layer browser checks pass; local signed-in visual audit passed. Full browser suite, live provider/cloud checks, document/PPTX appearance, image-editing depth and usability sessions remain open.

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

## October 2: Theme cleanup and browser-test migration

- Replaced toast surface/text/icon/shadow and zoom slider hardcoded purple colors with semantic tokens. No document styling changed.
- Migrated dashboard, editable-file and safe-navigation browser specs to current accessible names and role-based project links. Preserved save, reload, missing-project protection, errors, content guards and mobile overflow assertions. Replaced a removed explanatory disclosure check with a keyboard-focus tooltip check.
- The migrated dashboard test caught a real mobile horizontal overflow: heading/search/sort shared an inflexible row. Stacked the project heading on phones and allowed search to shrink without hiding overflow.
- Production build passes. All six focused tests across editor-current, editor-layout, design-files and dashboard pass. Refreshed dark editor and mobile dashboard screenshots visually inspected.
- Full-suite probe stopped after four failures; other old journeys still need migration. This is not a full browser acceptance pass. Runtime changes this pass are CSS only; previous 49 unit, 3 backend and 3 database results were not rerun.

## October 2: Build restored and current-editor checks

- Fixed NodeNext model import paths in designSystem, flowDocument and presentation. Typed template, workflow, publication and audit result lists with the existing RecordRow contract rather than weakening compiler settings.
- Production build and 49 unit tests pass. All 3 backend tests and 3 local PostgreSQL-compatible database policy tests pass, including workspace access boundaries.
- Added `tests/editor-current.spec.ts` for the current interface: apply content, save/reload, reopen backup, theme persistence, system-theme changes, identical SVG across Light/Dark, and mobile Content/Elements/canvas navigation. Both tests pass against the freshly built app and isolated local server.
- Found and fixed a real regression: export dismissed its dialog but retained `dialog=export` in the URL, causing it to reopen after reload. All explicit dialog dismissal paths now clear dialog URL state; Help tool deep links are cleared when dismissed as well.
- Inspected dark desktop and light mobile screenshots. Purple toast/zoom remnants still need theme cleanup. Full historical browser-suite migration, all-theme visual matrix, hosted checks and participant usability sessions remain pending.

## October 2, 2026: Project checkpoint reconciliation

- Reviewed current source, scripts, tests and the expansion/redesign documentation. Added `docs/STATUS.md` as the current capability and release-status ledger, linked from the documentation index.
- Confirmed substantial newer implementation: custom dimensions/content blocks, brand/workflows, documents, presentations, local teams, live canvas manipulation and Studio Ink editor/theme work.
- Fresh `npm test`: 49 passed. Fresh `npm run build`: failed on server TypeScript checking (NodeNext import extensions and implicit-any callbacks). Git status confirms this folder is not a repository.
- Corrected top-level backlog completion claims where hosted support or acceptance evidence is missing. Team features remain local-only; generated PPTX ZIP checks do not prove target-viewer fidelity; the latest editor redesign has no fresh full browser acceptance result.
- No runtime code, secrets, hosted configuration or customer data changed in this review. No live provider calls, browser suite, backend suite or hosted smoke tests run. Historical passes remain dated evidence, not current certification.

Update this log when each feature is verified. The [delivery checklist](TODO.md) remains the ordered backlog. “Verified locally” does not mean deployed or verified against live providers.

## October 1, 2026 — Editor task panel Studio Ink pass

- Shared `src/panel.css`: spacing scale 4/8/12/16/24, underline tabs, list rows, forms, upload zone, empty states, Help dialog.
- Restyled Design, Text, Elements, Reference, Document, Slides, Workflows, Team, Projects panels + Help.
- Copy tightened to playbook voice; Capabilities preserved.
- Tests: 49 pass.

## October 1, 2026 — Editor deep links, Content simplify, tooltips

- Deep links: `?tool=` (design/text/elements/reference/document/slides/workflows/team/projects/help), `?panel=` (content/issues), `?select=`, `?dialog=` (`src/editorNav.ts`).
- Export and Issues lists deep-link to the affected field/layer and select it.
- Content panel simplified (upload + textarea + apply; Issues list only).
- Accessible `Tooltip` on icon buttons (hover + focus).
- Tests: `tests/editor-nav.test.ts` (49 total pass).

## October 1, 2026 — Editor audit and core workspace redesign

- Complete audit: `docs/editor-audit.md` (inventory, journeys, IA, function mapping).
- Working redesign (not mock): Projects back control; File menu for secondary actions; Export primary; Content drawer; selection inspector; list-only Text/Elements; Delete key; checks chip; canvas-first defaults.
- Verification: `docs/editor-verification.md`. Usability sessions not run.

## October 1, 2026 — Full redesign Stages 1–4 (+ partial 5)

- Interface audit: `docs/interface-audit.md`.
- Playbook expanded for light/dark/system, voice, semantic roles: `docs/design-playbook.md`.
- Semantic tokens + dark theme + system default with FOUC-safe bootstrap (`index.html`, `src/tokens.css`, `src/theme.ts`).
- ThemeToggle on dashboard, editor, public header; Account → Appearance.
- Dashboard redesigned: create first, no marketing hero, search/projects/templates.
- Editor: Download primary, Workflows label, theme toggle; competing Review header button removed.
- Shared `src/ui.css` primitives. Theme unit tests pass (47 total).
- Verification: `docs/redesign-verification.md` (usability sessions not run; site.css leftovers remain).

## October 1, 2026 — Studio Ink Phase A+B (editor)

- Wired `src/tokens.css` globally; removed purple `:root` primaries from `styles.css`.
- Restyled editor chrome (`editor.css`): light header, stone canvas, teal accent, Lucide stroke 1.75.
- Rail IA: Design / Text / Elements / Upload + More (Document, Slides, Skills, Team, Projects, Help); Plans removed from peer tools.
- One-panel rule: opening library closes manuscript and vice versa.
- Copy diet on Design, Text, Reference, Manuscript, Export, and secondary panels.
- Playbook canvas: `forma-design-playbook.canvas.tsx`. Next: Phase D surfaces (dashboard/auth/marketing), then craft fonts.

## October 1, 2026 — Studio Ink design playbook

- Authored `docs/design-playbook.md`: brand thesis (“quiet studio, loud canvas”), cool-stone + teal accent system (replaces purple chrome), Geist/Instrument Serif roles, Lucide-only icon rules, Canva/Linear/OpenAI/Stripe/21st.dev reference mapping, editor IA (one panel, manuscript as drawer), copy diet, phased A–E rollout.
- Added `src/tokens.css` with Studio Ink variables and temporary legacy aliases (`--purple` → accent) for migration.
- Next: Phase A+B editor shell restyle before continuing font/shape craft.

## October 1, 2026 — Canvas selection, live drag and resize

- Added `canvasInteract.ts` + `SelectionChrome` with eight working resize handles and live move preview (commit on pointerup — single undo step).
- Manuscript fields, added text and graphic layers support live drag/resize; Escape and empty-canvas click clear both field and layer selection.
- Floating toolbar now styles selected added text/shapes (not only the six manuscript fields). ⌘/Ctrl+D duplicates the selected added layer.
- Selecting a layer no longer auto-opens the left library (toolbar has an explicit panel button).
- Verification: canvas-interact unit tests; TypeScript build clean. Browser suite not re-run for this slice.

## October 1, 2026 — Pre–Stage 6 editor craft audit

- Compared graphics editor surfaces to Canva-class expectations. Critical gaps: 2 fonts only, rect/ellipse only, no image placeholders, thin canvas manipulators.
- Code smells confirmed: cosmetic resize handles on manuscript fields; Escape/canvas click do not clear `selectedLayer`; drag commits on pointerup only; layers clamped to 720×900 design space on custom pages.
- User guide corrected: custom page sizes are supported; cropping/rotation/replacement remain unavailable.
- Craft track recorded in TODO ahead of Stage 6. Recommended order: canvas selection/resize → font library → shapes → image placeholders.

## October 1, 2026 — Stage 5 presentations and adapters

- Added `src/presentation.ts`: 16:9 deck model, manuscript `---` slide splits, layouts (title/section/content/two-column/chart), speaker notes, tables and numeric bar charts.
- UI: Slides rail panel (thumbnails, add/remove, rebuild) and `SlideView` canvas; export dialog offers PDF and editable PPTX.
- Verified adapters `forma-pptx` (OOXML via JSZip) and `forma-presentation-pdf` with explicit fidelity limits (fonts, no animations, charts as bars/tables, notes in PPTX only).
- Stage 4 follow-ups: review page shows a name field when unsigned-in on auth reviews; Team publish saves the project before creating an authenticated review link.
- Verification: 4 presentation unit tests (parse/chart, fixture, PPTX zip adapter, JSON round-trip); full suite 41 tests; TypeScript build clean. Opening PPTX in PowerPoint/LibreOffice/Slides not claimed in this session.

## October 1, 2026 — Stage 4 team operations

- Added `src/teamOps.ts` with workspaces, roles (owner/editor/reviewer/viewer), permission checks, pinned publications, audit events and membership recovery helpers.
- Local API: `/api/workspaces` CRUD-ish flows, member invite/remove by email, publish pinned snapshot, list publications, audit + recovery. Cross-workspace access returns 403.
- Authenticated approvals: review links may set `requireAuthenticatedApproval`; public `/status` is rejected; `/api/reviews/:token/decision` records signed-in user id/email/name and optional workspace-scoped approve permission.
- Team rail panel for create/invite/publish/audit; Share dialog checkbox for signed-in approvals; review page uses session identity for decisions.
- Verification: 3 team-ops unit tests + API integration covering denial, pinned publish, auth approval and audit recovery; full unit suite 37 tests; backend suite 3 tests. TypeScript build clean. Browser suite and Supabase team RLS not claimed.
- Limits: team APIs are local-account mode only (`501` in Supabase mode until RLS/membership RPCs land). No realtime co-editing, no invite email delivery, no platform-admin operator tooling in this stage.

## October 1, 2026 — Stage 3 multi-page documents

- Added `src/flowDocument.ts` for document-family projects: parse headings/paragraphs/pipe tables/citations, paginate into letter-size pages, link overflow frames, split long tables with repeated headers, masters with header/footer/page numbers.
- `Project.family: "document"` plus `flow` layout; graphics projects unchanged. Document panel (thumbnails, add/remove page, repaginate) and canvas page renderer (`DocumentCanvas.tsx`).
- Export: multi-page PDF from page SVGs; editable JSON backup; PNG/SVG/ZIP rejected for documents. Unmapped content blocks export; overflow is flagged in-page without dropping source blocks.
- Fixtures: one-pager, 10-page report, 20-page whitepaper — all content blocks placed; round-trip through versioned design files.
- Verification: 5 flow-document unit tests; full suite 34 tests pass; TypeScript build clean. Browser suite not re-run for this stage.
- Limits: no columned layouts, no live rich-text caret editing inside frames, no footnotes UI beyond citation blocks, no CMYK/PDF/X. Columns and advanced editorial tools remain later work.

## October 1, 2026 — Stage 2 reusable design systems

- Added `src/designSystem.ts` with versioned `BrandSystem` (text/background/accent colors, display/body fonts, spacing notes). Legacy `{name,primary,secondary}` payloads normalize on read; saves write the new shape and bump `version`.
- Brand apply pins `brandRef` on the project and updates colors/fonts without changing manuscript wording. Outdated pins surface an upgrade affordance in brand settings. Guest browser storage and `/api/brand` both supported.
- Declarative built-in components (`eyebrow-headline`, `body`, `datetime-location`, `footer-cta`) feed versioned templates. Saving a template creates/bumps a `VersionedTemplate` with `templateRef`; opening instantiates a new design from that pin.
- Published **Event campaign** skill: exact-copy policy, required Headline, sample manuscripts, apply/preview in a Skills library panel, portable JSON package export/import (no executable tools). Projects pin `skillRef`; newer versions require an explicit upgrade review.
- APIs: `/api/templates`, `/api/skills` (account-scoped records) plus guest localStorage mirrors.
- Verification: 5 design-system unit tests (legacy brand migration, brand apply, template versioning, two-manuscript skill acceptance, upgrade/import rules). Full model/document/analysis suite still passes (29 tests). Backend auth suite still passes. Browser suite not re-run for this stage.
- Limits: no multi-page documents, no external LLM skill adapters, no visual component builder, no team-scoped brand libraries yet.

## October 1, 2026 — DesignDocument storage authority

- Added `documentRuntime.ts` with `documentRuntimeEnabled()` (on by default; set `VITE_FORMA_DOCUMENT_RUNTIME=0` or `FORMA_DOCUMENT_RUNTIME=0` to store raw Project JSON).
- Guest browser saves encode each design as a `forma-design` document; loads accept both legacy Project arrays and document envelopes through `readDesignFile`.
- Projection helper verifies copy, page size, content blocks and layers survive encode → decode. Editable file export already used the same bridge.
- Cloud project APIs still send/receive the Project projection from the client. Canvas editing remains on Project until a later renderer migration.
- Verification: document unit tests cover runtime encode/decode and projection preservation; full model/analysis suite passes (24 tests). Browser suite not re-run for this slice.

## October 1, 2026 — Flexible manuscript content blocks

- Manuscript parsing now yields ordered `ContentBlock`s with stable IDs. The six recognized labels still fill `copy`; unknown labels that start after a blank line become extra blocks.
- Applying a manuscript stores `contentBlocks` and binds extra sections to managed text layers (`layer-block-*`) while leaving user-authored layers alone. Removing an extra section drops its managed layer on the next apply.
- Revision review lists field and extra-section diffs before apply. Mid-line labels such as `Tickets: $25` stay inside the active section so exact copy is preserved.
- Versioned backups include content blocks when present. Overflow checks still cover managed layers through the shared text-layer path.
- Verification: model tests cover parsing, apply/remove of extra sections, and legacy exact-copy cases. Document and analysis suites still pass. Browser suite not re-run for this slice.

## October 1, 2026 — Custom page dimensions

- Added page-size resolution for portrait, square, story, banner and bounded custom sizes (`360`–`2400` design units). Optional `pageSize` is required for `format: "custom"`; named presets ignore a stale custom size when resolving the canvas.
- Canvas, SVG/PNG/PDF export, dimension pills and versioned `forma-design` pages use `canvasWidth` / `canvasHeight`. Layouts stay in the 720×900 design space and scale on both axes to the page.
- Resize dialog offers banner plus custom width/height. Campaign ZIP still renders portrait/square/story for presets; custom pages export the actual design PNG and a page-size note instead of three aspect-ratio variants.
- Verification: model and document unit tests cover banner/custom validation, legacy projects without `pageSize`, and backup round-trips. Full analysis suite still passes. Browser suite not re-run for this slice.
- Limits: reference mode remains 720-wide; stacking and layer geometry validation still use the 720×900 design bounds. Runtime is still the legacy `Project` model.

## October 1, 2026 — Images, shapes and stacking

- Added Elements panel with local image upload, rectangles and ellipses. Selection exposes naming, shape color, locking, removal and collapsed position/size controls. Canvas drag and keyboard movement connect to history.
- Added shared stacking order for added text/image/shape objects, with Bring forward and Send backward. Original artwork and manuscript fields remain below added elements.
- Images normalize to bounded WebP, preserve proportions, and remain embedded in saved/review/exported designs. Server validation bounds object counts, geometry and asset data and rejects remote image URLs. Async upload uses the latest project state and does not apply to an unmounted project panel.
- Version-3 editable files preserve graphic assets and stack order; old files remain readable. Existing persistence/history/review/export paths use the shared renderer and optional project collections.
- Verification: build, 21 model/analysis/document tests, 2 backend tests and the full 26-test browser suite passed. Extended image tests then separately passed SVG plus PNG export and mobile element control checks. Desktop/mobile screenshots reviewed. One added test initially failed because it did not reopen the export dialog after download; corrected test passed.
- Limits: image optimization reduces resolution; embedded-image budgets remain intentionally small until private Storage is implemented. No cropping, rotation, replacement, custom dimensions or stacking beneath original artwork. No hosted deployment verification claimed.

## October 1, 2026 — Additional text layers

- Added an optional validated text-layer collection, up to 50 boxes with bounded text/style/geometry and unique IDs. Existing projects remain compatible.
- Text → Add text opens contextual wording/style controls; precise geometry is collapsed. Canvas selection, drag, keyboard movement, locks, removal and undo use existing project history.
- Shared rendering includes layers in dashboard previews, saved projects, immutable reviews and PNG/SVG/PDF/campaign outputs. Layer overflow blocks visual export. Campaign ZIP includes separately entered text as an additional file.
- Version-2 editable backups preserve layers and their projected document elements. V1 and legacy files still open. Applying a manuscript leaves separately entered layers intact.
- Verification: build passed; 20 model/analysis/document tests, 2 backend tests and all 24 browser tests passed. Backend tests cover persisted layer data, invalid geometry and review snapshots. Browser tests exercise editing, keyboard positioning, undo, lock, reload, backup import, SVG output, removal, overflow recovery and manuscript preservation. Desktop/mobile screenshots reviewed.
- Limits: no arbitrary manuscript mapping, image/shape layers, stacking controls, custom dimensions or multi-page layout yet. No automatic overlap detection. Hosted deployment of this change has not been verified.

## September 25, 2026

### Onboarding preference database isolation — verified locally

- All three database tests pass using PostgreSQL-compatible PGlite.
- Preference rows enforce owner access, accepted values, anonymous denial and account-deletion cleanup.
- Existing atomic project/version and private billing checks also pass.
- Supabase project migrations and two-account hosted verification remain pending.

### Project dashboard — verified locally

- New `/dashboard` workspace shows account projects or this browser’s guest projects, with actual design previews, name search and recent/name sorting.
- Includes honest empty/error/loading states and retry, reference starting points and template creation.
- `/editor?project=…` opens the selected project. Missing IDs fail without saving a replacement over existing work.
- Completed-onboarding sign-in now leads to the dashboard. Editor File → Back to my designs saves before leaving and preserves the unapplied-manuscript guard.
- A responsive sidebar, neutral workspace and larger design previews begin the customer visual redesign. The editor redesign is recorded below; public/account visual unification remains pending.
- TypeScript/Vite production build passed. All 19 browser tests passed, including real guest project selection, search, template creation, missing-ID protection, account error/retry rendering, and existing account/editor/OCR/export journeys.
- Desktop (1440px) and mobile (390px) dashboard screenshots reviewed; mobile overflow check passed.
- Dashboard account error/retry uses mocked responses; existing account editor journeys use real local HTTP/SQLite. Hosted Supabase dashboard behavior is not yet verified.

### Onboarding and account transition regressions — verified locally

- Template selection has an explicit accessible name, and guest workspace initialization cannot overwrite edits made before loading finishes.
- Fixed an additional regression found by the full browser suite: account transitions now preserve the mounted registration dialog and its one-time recovery code.
- Guest draft handoff, unapplied manuscript navigation protection, local signup/profile/password/session/export/deletion, and account history/review/conflicts all passed.

### Editor layout and manuscript workflow — verified locally

- Dark header, clearer type and panel hierarchy, neutral canvas surface, refined selection controls and responsive panels.
- Apply/review actions now sit immediately under the manuscript. Always-on protection details remain available in a keyboard-accessible disclosure.
- The Forma logo returns to the dashboard through the save/unfinished-manuscript guard. Tool-rail buttons expose their active state to assistive technology.
- Desktop (1440px) and mobile (390px) rendered screens inspected. The focused keyboard/navigation/mobile test passed.
- Production build and all 20 browser tests passed. The suite uses the compiled frontend with a local test runtime and an isolated in-memory database, avoiding the development workspace and shared rate limits. This is not hosted production verification.

- Fixed two existing races exposed by built-app verification: guest and account save status now checks the current project against the persisted snapshot, and successful deletion suppresses the competing sign-in redirect.

## External setup still pending

Supabase credential rotation and configuration, schema inspection/migrations, SMTP, live OpenAI verification, Paystack test setup and Vercel deployment are not complete. Privileged credentials must not be recorded in documentation.

## Next features

1. Unify public, authentication, onboarding and account screens with the dashboard/editor visual system.
2. Build the server-authorized platform-admin foundation and audit trail.
3. Continue through the remaining ordered production checklist.

## September 26, 2026

### Supabase connection — in progress, not activated

- Project: `wmnafbjtibairaelyzsi`. A private, ignored `.env` contains its URL and supplied publishable key. No privileged credentials were copied from chat.
- Live public-key preflight: Auth settings returned HTTP 200; email signup enabled; email confirmation required.
- `forma_records` and `forma_preferences` returned HTTP 404 / `PGRST205`. The Data API cannot find these relations in its schema cache. This does not prove the database is empty.
- Database inspection and migration have not run. Environment purpose, rotated credentials and database connection access are still required. `.env` currently has neither a database URL nor server key.
- The app remains in local mode to avoid switching users onto incomplete cloud storage. Local designs have not been migrated.
- Added `npm run check:supabase` for repeatable read-only endpoint checks and `supabase/inspect.sql` for catalog inspection before migrations.
- Previous approval-review usage-limit block cleared; the read-only network check ran successfully today.

### Supabase credential check — server access verified, database network blocked

- Newly populated server credential returned HTTP 200 from the Auth admin endpoint; no user records or credentials are recorded here.
- Database URL targets the expected project. Direct hostname has an IPv6 address and no IPv4 address; the connection fails with “No route to host” from this machine.
- Requested the Session pooler connection URI instead. Environment classification (staging/production) remains unconfirmed.
- No schema changes, test users or cloud activation performed. Forma remains in local mode.
- Added `npm run inspect:supabase`: read-only catalog inspection with database credentials passed through environment variables and sanitized failure output.

### Supabase activation — verified and enabled locally

- Session-pooler connection succeeded. Inspection found no existing public relations or Forma functions.
- Applied `202609240001_forma.sql`, `202609240002_billing.sql`, and `202609240003_preferences.sql` together in one transaction; committed successfully and notified PostgREST to reload its schema.
- Two temporary, confirmed test accounts passed real hosted password login and Forma API project save/reload. Cross-account project reads and writes were denied; preferences remained isolated. Both test accounts were deleted afterward.
- Set local `FORMA_MODE=supabase` and restarted the API. Existing SQLite data remains untouched; local users are not automatically Supabase users.
- Real signup confirmation email delivery, redirect allowlists, recovery email and Vercel deployment are still unverified. Staging/production designation has not been supplied; no production domain/auth settings were changed.

### OpenAI model selection — configured, blocked by API credits

- Selected `gpt-6-sol` for reference-image analysis as an initial balance of capability and cost, based on official OpenAI model documentation. It supports image input and structured output. Exact-copy rendering remains deterministic application code.
- OpenAI model-list access succeeded and included the selected model.
- A synthetic-image analysis request failed with HTTP 429. Minimal follow-up confirmed `credit_balance_exhausted` / `insufficient_quota`.
- Live analysis quality, latency and cost are NOT verified. Add OpenAI API credits before testing representative reference/manuscript pairs. No automatic fallback or repeated paid retries were enabled.
- Source: https://developers.openai.com/api/docs/models/gpt-6-sol

### Gemini provider — implemented and live analysis verified

- Added Gemini alongside OpenAI and local OCR. Configured Gemini is the initial selection; users switch explicitly in Reference → Analysis provider. Unconfigured providers are disabled. There is no silent cross-provider fallback.
- Server-only `GEMINI_API_KEY` and `GEMINI_VISION_MODEL=gemini-3.8-flash`; image-only requests use structured JSON output, shared region validation, timeouts and sanitized errors.
- Live synthetic-image test succeeded in 11.8 seconds: two regions returned and the expected headline recognized. This is a smoke test, not a representative quality benchmark or guarantee of free production quota.
- The UI discloses that the reference is sent to Google and free-tier content may be used for product improvement. Manuscript text is not sent as a separate input; text already visible in the uploaded image is necessarily sent.
- Production build and all 13 model/analysis tests passed, including Gemini response validation, incomplete output and sanitized provider failures. The existing 20 browser regressions passed.
- OpenAI remains configured but its last live attempt was blocked by exhausted credits. Gemini allows analysis to continue independently.
- Additional provider browser test passed: Gemini default, explicit switch to OpenAI, image-only request payload and approved-copy preservation. Total browser coverage is now 21 tests.

### Gemini temporary-overload fix

- Reproduced the reported error with a synthetic reference: Gemini returned HTTP 503 / UNAVAILABLE due to high demand. A separate minimal request succeeded, confirming current key/model access.
- Corrected misleading key/model guidance. Temporary 5xx failures now retry once after 750 ms within the existing cancellation/deadline; persistent failures explain service unavailability. Quota/access/client errors are not retried. No provider switching occurs automatically.
- Production build and 14 model/analysis tests passed, including transient success, persistent overload, and no retry for quota exhaustion. API restarted. This improves handling; it cannot guarantee Google's service availability.

### Gemini model routing reliability update

- Gemini 3.7 Flash also returned persistent overload; 2.5 Flash rejected generation access. Gemini 3.1 Flash-Lite succeeded on the same synthetic reference in 9.9 seconds, returning two regions and recognizing the expected heading.
- Changed local primary to `gemini-3.1-flash-lite`, with `gemini-3.8-flash` as an optional backup. This is a smoke-tested operational choice, not proof of equivalent design accuracy or guaranteed availability.
- On temporary 500/502/503/504 responses, use the configured backup within the existing two-attempt/55-second limit. A primary overload starts a 60-second in-process cooldown. Results disclose use of a backup model. Requests never silently cross to OpenAI.
- Access errors, invalid requests and quota errors do not trigger fallback. Cancellation remains enforced. Cooldown is per process, not shared across serverless instances.
- Production build and 15 model/analysis tests passed, including fallback routing, cooldown, and no quota retry. Representative customer-reference evaluation remains pending.

### Development outage recovery

- Repeated cloud errors persisted for the user's reference despite successful synthetic Flash-Lite requests (latest synthetic request: HTTP 200 in 6.7 seconds). Availability on a sample does not establish success on the user's image; that exact image has not been inspected.
- Added and enabled `FORMA_LOCAL_ANALYSIS_FALLBACK=true` locally. After transient Gemini 5xx failures exhaust attempts, installed local OCR processes the same normalized image. Result provider is `local` and a visible warning explains the fallback. Review-before-apply remains required.
- This fallback does not run for access/quota errors, cancellation or when local OCR is unavailable. Production/Vercel still disables local OCR; a hosted worker is needed for equivalent production resilience. Slow requests that exhaust the overall deadline can still fail.
- Build passed. An automated test forces Gemini 503 responses and verifies actual OCR recognition, fallback disclosure and no fallback for 403 access denial.

## October 1, 2026 — Expanded product planning

### First implementation slice: versioned editable-file bridge

- Added a versioned document representation with stable content/element identifiers and page dimensions, retaining the full legacy project for rendering compatibility.
- Connected standalone editable backups and campaign ZIP source files to the new serializer; editor reopening accepts both old and new backups without a new screen or conversion wizard.
- Reject unsupported versions and unrepresentable document edits instead of dropping content. File import failures have actionable messages and do not replace the open design.
- Build and all 19 model/analysis/document tests passed. A real browser test passed the download → import → save → reload → dashboard journey and verified future-version rejection preserves the open design.
- Current scope: portability foundation only. Existing cloud persistence and rendering still use the legacy project model; arbitrary layers, custom dimensions, skills and multi-page layout remain unimplemented. This is not the completed flexible graphics workflow.

- Added `product-expansion.md`: graphics, documents and presentations share content provenance, brand systems, reusable components, versioned templates and provider-independent declarative skills.
- Defined customer navigation, copy/layout permissions, skill authoring and publishing, document schema migration, delivery order and measurable acceptance gates.
- Updated product, architecture, documentation index and backlog to distinguish the expanded direction from current single-page functionality.
- Next implementation slice: versioned schema and safe legacy migration followed by custom-size graphics with arbitrary elements and a complete save/reopen/export journey.
- Documentation-only change; inspected the current project model and documentation. No new runtime capability or external integration is claimed; no runtime tests required for this update.
- Prior reliability work still needs runtime activation verification: the API restart was blocked by automatic approval review at the end of that session. The local OCR fallback's passing tests do not confirm it is active in the running editor server.

# 2026-10-04: Design Quality Engine v2 (experimental)

Added a twelve-dimension deterministic rubric, document rhythm analysis, bounded correction planner/executor, best-valid-version loop, on-demand Gemini visual review in the pipeline lab, an editor quality panel behind `VITE_FORMA_QUALITY_PANEL=true`, and a 22-case SVG/PNG benchmark. All 22 cases pass copy and fit checks after fixing the cover subtitle capacity check. See [DESIGN_QUALITY_ENGINE_V2.md](DESIGN_QUALITY_ENGINE_V2.md) for implementation and measured limits. Phase 2 remains partial: human review and structural corrections are pending, and the editor's FlowDocument adapter drops some DesignSpec visual elements.
