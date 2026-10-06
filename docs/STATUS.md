# Forma current project status

Last reconciled: October 4, 2026. This is the current checkpoint. Historical entries in PROGRESS.md retain their original dates and do not override this snapshot.

October 4 template-job slice: saved graphics templates now appear on the dashboard with a repeat-job dialog for manuscript paste/file upload, close-match or bounded-fit mode, and optional application of the one current saved brand. A new project opens with Issues visible; the source template remains intact. This is a working local repeat path, not design-PDF template ingestion, multi-brand agency management or automatic reflow of arbitrary artwork. See [workflow specification](template-to-design-workflow.md) and [progress](PROGRESS.md).

October 4 AI creation slice: `/create` now accepts approved copy and an optional image reference/brand, requests three bounded Gemini art-direction proposals, and opens editable graphics, documents or slides while retaining the exact source manuscript. A mocked-provider browser journey verified all three formats. This does **not** yet deliver autonomous finished designs: graphics still use curated artwork, and document/slide layouts have limited variation. Real provider quality, reference fidelity, fit repair and time-to-approved-export remain unverified. See the [AI-first direction](ai-first-design-direction.md).

October 3 typography update: the graphics editor now offers 13 curated fonts (eight self-hosted), weights and spacing/decorations with embedded font data in graphics SVG export. Elements categories connect to implemented Shapes, Images, Text, Document tables and Slides charts. See [typography and assets](typography-and-assets.md). The 34-test built-app browser suite passes with one worker; desktop light and narrow mobile dark toolbar screenshots were inspected. A complete visual, keyboard and accessibility matrix remains open.

October 3 canvas update: direct double-click text editing, a closeable Layers panel, contextual page/object menus, saved brand palettes and exact-match color replacement, and crop-to-fill photo frames are implemented. The artboard occupies more of the desktop viewport and the first-use guide is compact. See [canvas actions](editor-canvas-actions.md) for exact behavior and limits. This improves the Canva-inspired interaction model but does not establish Canva-level visual polish or feature parity.

October 3 frontend design pass: the editor and dashboard now follow the [Editorial workbench direction](frontend-overhaul-2026-10-03.md). The editor has a distinct tool spine, clearer rail order, stronger product landmark, more legible panel hierarchy and warm canvas stage; the dashboard surfaces template/reference starts and uses compact phone navigation. Public, sign-in, onboarding and account chrome now use the same semantic palette; sign-in and account fields have explicit borders and spacing. Desktop and mobile rendered screenshots were inspected, including light/dark account settings. A complete review/document/slide visual matrix and nontechnical usability testing remain open.

## Overall position

Forma has expanded from a single-page graphics beta into an implemented graphics, document and presentation prototype with reusable brand/workflow foundations. The Studio Ink redesign is implemented in significant parts of the editor and dashboard. The product is not production-ready, and the redesign is not fully verified.

**Current local baseline.** Production build and static lint pass after the October 4 creation slice. All 61 unit tests and three local API integration tests pass. After the editor extraction, 26 focused built-app browser tests passed across creation, dashboard, canvas actions, layout, typography, slides, layers and workspace. The earlier full 39-test browser run passed 34: four account journeys hit the local email rate limit, and one PDF export assertion was flaky but passed when rerun alone. One live Gemini smoke request for a short document brief returned three valid concepts after transient network failures; representative output quality and hosted acceptance remain open.

**Source structure updated October 4.** The client has domain, feature, shared and style directories. Extracted editor panels, chrome and actions reduced `EditorPage.tsx` from about 1,786 to **995 formatted lines**; source-layout lint rejects React modules above 1,000 lines. The new creation feature is split between route, preview component, domain conversion and server provider adapter. Tailwind is used for new creation UI and the dashboard start layout; the [legacy CSS migration](tailwind-migration.md) is still open. See the [codebase guide](codebase-guide.md).

## Status definitions

- Implemented: code and an entry point exist.
- Locally verified: named local checks passed on the stated date.
- Hosted verified: a real hosted operation passed on the stated date.
- Partial: implementation or required verification is incomplete.
- Pending: no completed implementation or evidence found.

No completion percentage is assigned. Feature breadth and production readiness are different measures.

## Capability ledger

| Area | Current implementation | Evidence and limits |
|---|---|---|
| Graphics | Text/image/shape/frame layers, 13 curated fonts, direct canvas text editing, crop-to-fill images and frames, image replacement, stacking, locking, hidden layers, undo, custom sizes, backups and visual exports | Focused canvas/typography browser checks passed October 3; 58 unit checks passed October 4. Manual crop focal point, rotation, more advanced masks and aesthetic quality evaluation remain pending. |
| Content mapping | Six primary fields plus ordered additional content blocks mapped into managed text layers | Model tests pass October 2. Nontechnical comprehension and redesigned apply/review journey need browser/user verification. |
| Document storage | Versioned editable files and feature-flagged document-backed guest storage | Round-trip tests pass. Interactive editing and cloud API still use Project projections; this is not a complete replacement of the runtime model. |
| Brand systems/templates | Versioned brand tokens, components, template and brand references, explicit upgrade checks; dashboard repeat-job dialog for saved graphics templates and the one current brand | Local repeat journey passes within the 38-test built-app suite. Design-PDF ingestion, multiple client brand kits, semantic color roles, full authoring/publishing usability and hosted agency lifecycle are not established. |
| Workflows/skills | Event Campaign workflow, preview/apply, declarative package import/export and upgrade checks | Tests pass. SkillsPanel has library/application/package controls; full general-purpose authoring and publishing UI is not demonstrated. No verified Claude/Gemini/ChatGPT external skill integration. |
| Documents | Multi-page model, text flow, tables, citations, masters/page numbers, page panel and PDF export path | One-, ten- and twenty-page fixture tests pass. Actual export appearance, table typography and long-document usability still require representative visual/browser evaluation. |
| Presentations | Slide layouts, direct title/text/notes editing, table-based charts, PDF and editable PPTX generation | Ordinary labeled manuscripts now render a wrapped first slide; direct edits save/reopen in local browser checks. Current PPTX test checks metadata, size and ZIP signature; it does not validate rendering or editability in PowerPoint/Keynote. |
| Team workspaces | Roles, publications, authenticated decisions and audit features | Local-account-only implementation. Supabase team endpoints explicitly reject the feature in this release. Unit role tests pass; hosted membership/RLS and full team journeys pending. |
| Editor redesign | Canvas-first default, Content drawer, selection inspector, grouped dark tool rail, warm stage, contextual controls, closeable Layers panel, page actions, separate page/slide projects and panel restyling | All 37 built-app browser checks passed on the final styling build. Full keyboard/accessibility matrix and nontechnical usability sessions remain open. |
| Theme/brand | Studio Ink playbook, semantic tokens, Light/Dark/System, bootstrap, theme toggle, Appearance setting, saved color palettes and display/body fonts | Theme resolution and palette model unit tests pass. All-route contrast, system behavior and complete brand-style coverage still need review. |
| Accounts and Supabase | Authentication, preferences, project persistence, revisions, reviews and account management | September 26 hosted login/save/isolation/preferences checks recorded using temporary confirmed accounts. Current hosted email flows, redirects, SMTP and recent feature regression checks not reverified. |
| Reference analysis | Gemini/OpenAI/local OCR adapters, proposal review, bounded retry/fallback code | Mocked provider and real local OCR tests pass October 2. Earlier Gemini synthetic live tests do not establish current availability or real-reference quality. Last recorded OpenAI inference was credit-blocked. The October 4 live Gemini smoke was for new concept planning, not reference analysis. |
| Billing | Configurable Free/Pro Paystack integration | Code and historical test coverage exist. Pricing, real test-mode lifecycle and live activation remain unverified. No paid launch claim. |
| Platform admin | Specification exists | No implemented platform-admin workspace identified. Team workspace owners are not platform operators. |
| Storage/operations | Embedded assets, local/Supabase adapters, migrations, deployment configuration and runbooks | Private asset storage, retention/pagination, monitoring, recovery rehearsal, deployed release and operating procedures remain open. |

## Local verification on October 3

The frontend design checkpoint passed `npm run lint`, `npm run build`, and `npm test` (56 tests). The final `npx playwright test --config=playwright.built.config.ts --workers=1` run passed all 37 tests after the public/auth/account and canvas-selection styling; focused public (5 tests) and canvas/typography (6 tests) runs also passed during implementation. Dashboard/editor desktop and mobile, homepage, mobile sign-in/onboarding, and light/dark account screenshots were inspected. The dashboard mobile test asserts compact navigation and a visible reference start. This does not establish Canva visual parity or hosted behavior. The table below records the earlier typography checkpoint on the same date.

| Check | Result |
|---|---|
| `npm run lint` and `npm run build` | Passed after the typography and category changes |
| `npm test` | 52 passed |
| Local API integration and database-policy suites | 6 and 3 passed, respectively |
| `npx playwright test --config=playwright.built.config.ts --workers=1` | 34 passed against the latest production build, including font export, category navigation, mobile toolbar, account, reference, document and presentation journeys |
| Manual visual inspection | Desktop light and narrow mobile dark toolbar screenshots inspected; complete cross-route matrix pending |

The first parallel full-suite run had four load/download timeouts. All 13 tests in those affected files passed on a one-worker rerun, followed by the complete 34-test one-worker pass. This is local evidence, not a hosted provider, billing or Supabase acceptance test.

## Historical verification on October 2

| Check | Result |
|---|---|
| Source, routes, feature modules, package scripts and documentation reconciliation | Completed |
| `npm test` | 49 tests passed, 0 failed |
| `npm run build` | Passed after correcting NodeNext import paths and typing API result lists |
| Git status | Folder is not a Git repository; reproducible version-controlled baseline pending |
| Backend and database | 3 backend tests and 3 local PostgreSQL-compatible policy tests passed |
| Browser | Eight focused current editor/layer journeys pass on the latest build, plus five provider/product journeys and six earlier dashboard/file/navigation journeys. Signed-in panel screenshots were reviewed. Full suite and all-route visual matrix still pending. |
| Billing / hosted | Not rerun in this repair |
| Visual / usability | Dark desktop and light mobile screenshots inspected; full visual matrix and participant sessions pending |

Resolved build errors: NodeNext-compatible import extensions in `src/domain/design/designSystem.ts`, `flowDocument.ts` and `presentation.ts`, plus typed API result lists in `server/app.ts`. A fresh Vite production bundle now builds successfully.

The legacy browser journeys were updated to current navigation and labels while retaining their behavioral assertions. The complete suite passed against a fresh built app with one worker on October 3.

## Ordered next work

1. **Maintain the release baseline.** Build and local API/database checks now pass. Establish Git and CI without committing secrets.
2. **Close the editor redesign acceptance gap.** Complete the visual, keyboard and accessibility matrix across routes, themes and mobile sizes; run nontechnical usability sessions. The automated built-app browser suite is green.
3. **Validate expanded outputs.** Review actual long-document PDFs, tables and slide outputs. Open PPTX files in target applications. Test with representative manuscripts and nontechnical participants.
4. **Complete hosted identity and team foundations.** Finish email/redirect/session checks. Implement Supabase team schema/RLS before advertising hosted teams. Confirm environment designation and credential rotation.
5. **Build platform administration and scalable operations.** Operator roles/audit, support, jobs, private assets, limits/retention, monitoring and backup recovery.
6. **Verify billing and release.** Paystack test lifecycle, commercial decisions, policies and Vercel staging/production gates, followed by a bounded customer pilot.

## Tracking rules from now on

- Update this ledger when a feature's status or a release blocker changes.
- Keep TODO.md for actionable remaining work and PROGRESS.md for dated delivery history.
- Record the command, date, environment and result for verification. Do not carry an old test pass forward across unrelated changes.
- Keep local-only, hosted, mocked and manually inspected evidence distinct.
- Mark implementation and release acceptance separately. A checked code task does not certify a production feature.
- Store no keys, passwords, tokens or customer content in these documents.

## October 2 repair follow-up

Fixed stale dialog URL state discovered by the new browser checks: closing a dialog or completing export clears its deep link so reload does not reopen a dismissed dialog. The focused checks pass, but the old full browser suite still needs reconciliation with the new navigation. Toast and zoom now use semantic tokens; refreshed dark-editor and mobile-dashboard screenshots were inspected. Full cross-route theme review remains open.

## Historical browser migration checkpoint (October 2)

An initial full-suite run stopped at four failures (three passed, four interrupted, seventeen not run). Failures included old dashboard selectors/empty-state copy and old text-inspector/content labels. After updating dashboard expectations, the preserved mobile overflow assertion exposed a real layout defect, now fixed. Focused browser journeys for dashboard/files, layers, provider/product and current editor now pass. Remaining workspace and public-onboarding journeys still need migration and execution; no full-suite pass is claimed.

## October 2, 2026: Layer inspector verification and lock protection

- Migrated text and graphic layer browser journeys to the selection inspector, Content panel and editable-file actions, retaining content preservation, overflow recovery, movement/undo, persistence, backup reopening, stacking and export assertions.
- Fixed locked-layer removal in the inspector, floating toolbar and Delete/Backspace shortcuts. Both removal buttons are disabled while locked, and all removal paths share the handler guard. Regression checks cover text and shape locks, then successful removal and undo after unlocking.
- Fresh `npm run build` passes. `npx playwright test tests/text-layers.spec.ts tests/graphic-layers.spec.ts tests/editor-current.spec.ts --config=playwright.built.config.ts --workers=2`: **6 passed**, using the isolated local server with no live AI requests.
- Verified SVG content/image embedding and stacking, PNG dimensions, editable backup round trips, unsupported-image recovery, mobile panel width, and existing theme/output invariance. Inspected the mobile Elements screenshot. Full browser migration, cross-route visual review and hosted acceptance remain pending.


## October 2, 2026: Reference and account journey verification

- Updated provider and product browser journeys for Content, exclusive panels, File history, More > Projects and accessible template tabs. Retained the underlying behavior assertions.
- Added simulated provider-outage recovery: a 503 keeps manuscript copy intact, enables another attempt and manual mapping, and allows a successful switch to another provider. Every mocked analysis request is checked to contain only image and provider, never manuscript copy.
- Real local OCR recognizes the synthetic reference and presents regions for approval without replacing the manuscript. Local account signup/save/reload/history, review comments/approval/revocation/logout, and two-tab save-conflict recovery pass.
- Campaign ZIP inspection now verifies exact approved-copy text, the editable backup manuscript, and portrait/square/story image dimensions. PDF input and PDF export signature pass; this does not certify PDF typography or multi-page document rendering.
- Verification: `npx playwright test tests/providers.spec.ts tests/product.spec.ts --config=playwright.built.config.ts --workers=2`: **5 passed** against the isolated local server and existing production build. This slice changes tests and documentation only. Gemini/OpenAI responses are mocked; no hosted Supabase or live AI calls were made.
- Remaining browser migration: public/onboarding and workspace journeys. Full suite, full visual matrix, hosted identity/team acceptance and representative document/presentation output review remain open.
