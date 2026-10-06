# Forma delivery checklist

Updated October 4, 2026. Read [current project status](STATUS.md) for reconciled implementation and verification evidence. Checked historical subitems below record implementation work, not hosted release acceptance.

## Immediate checkpoint actions

- [ ] Complete [AI-first design creation across graphics, documents and slides](ai-first-design-direction.md): the `/create` manuscript/reference/brand → three editable directions → editor path is implemented and locally tested. Add truly distinct content-aware layouts and imagery, rendered copy/fit/contrast checks, bounded repair, and a measured benchmark against general AI tools before claiming finished designs in minutes. The existing template replacement path remains a supporting workflow.
- [ ] Finish [Tailwind migration](tailwind-migration.md) by feature. New creation UI and dashboard start layout use Tailwind utilities; 8,257 CSS lines remain, including retained semantic tokens and fonts. Remove each old selector only after its owning feature passes browser and visual checks.

- [ ] Complete the first [template/reference-to-design workflow](template-to-design-workflow.md): agency-owned structured flyer template with named copy/image slots and brand roles; multiple client brands; before/after review; exact-copy and overlap checks; four varied repeat jobs with a second agency user. October 4 first slice is implemented: saved personal graphics templates appear on the dashboard, with manuscript paste/file upload, one saved brand, close-match/bounded-fit choice and editor Issues review. The complete agency flow remains open.
- [ ] Add design-PDF ingestion and one-time template preparation, starting with faithful page backgrounds plus mapped editable slots. Measure editable coverage and font/fidelity limits; do not treat manuscript-PDF import as design-PDF support.

- [x] Apply the frontend design skill to the editor and dashboard: named Editorial workbench direction, local type hierarchy, dark tool spine, warm canvas stage, grouped editor rail, clearer starts, and compact mobile dashboard navigation. October 3; see [design direction](frontend-overhaul-2026-10-03.md).
- [ ] Finish a full route-by-route visual and accessibility audit in light/dark modes, including public, auth, account, review, documents and slides. The editor/dashboard pass is implemented; user testing is still needed before claiming Canva-standard polish.
- [x] Add a curated self-hosted font catalog, weight/decorations/spacing controls, graphics SVG font embedding and Forma-specific Elements categories. October 3; see [typography and asset browsing](typography-and-assets.md).
- [x] Add direct canvas text editing, a closeable Layers panel, page/object context actions, saved brand palette and exact-match color replacement, plus crop-to-fill photo frames with uploaded-image snapping. October 3; see [canvas actions](editor-canvas-actions.md).
- [ ] Finish Canva-standard interaction polish: keyboard access to context actions, complete toolbar/spacing/type-scale review in both themes and mobile, asset-library-to-frame dragging, photo focal-point adjustment, and nontechnical usability sessions. Every visible control must be understandable and functional.
- [ ] Inspect updated text-toolbar and Elements layouts across desktop/mobile and light/dark modes, then close any visual or keyboard findings.

- [x] Reorganize client source into domain, feature, shared and style folders; extract editor view/actions/hooks and manuscript/schema modules; document change locations. The current [codebase guide](codebase-guide.md) records the remaining large-module boundaries. October 2.
- [x] Bring `EditorPage.tsx` below 1,000 lines through focused extraction of library, chrome, context, I/O and handoff logic. October 4; final file is 995 formatted lines, and 26 focused built-app browser regressions pass. The source-layout lint check now rejects React modules above 1,000 lines.
- [ ] Continue targeted decomposition of presentation exports, design-system storage, account/public pages and server route modules with focused tests; add import-boundary/cycle checks when those boundaries stabilize.

- [x] Fix the production build: corrected NodeNext import paths and typed API result lists. October 2 build, 50 unit tests, 3 backend tests and 3 database tests pass.
- [ ] Verify the redesigned editor with refreshed full browser journeys, both themes and mobile layouts. Earlier browser passes predate the latest redesign.
  - [x] Extract Projects panel, add separate page/slide projects and project-aware links, and add `npm run lint` with clean client/server static checks. See [source architecture audit](source-architecture-audit-2026-10-02.md).
  - [x] Rerun focused browser project navigation and local API suites after the October 2 extraction: 9 editor browser tests and 6 API integration tests pass.
  - [x] Two focused current-interface journeys pass October 2: theme/export invariance, content/save/backup/reload, dialog dismissal and mobile panel recovery.
  - [x] Migrate dashboard, editable-file and editor safe-navigation tests; six focused journeys pass, including current-editor checks. Fixed mobile dashboard horizontal overflow exposed by the retained assertion.
  - [x] Replace legacy toast/zoom colors with semantic tokens; inspect dark editor and mobile dashboard screenshots.
  - [x] Migrate four layer journeys; fix locked-layer removal by buttons and keyboard. Six tests pass with current-editor checks on a fresh build.
  - [x] Migrate provider/product journeys: five tests pass, including simulated AI outage recovery, real local OCR, local account/review/conflict flows and inspected campaign ZIP contents. No live provider/cloud verification.
  - [x] Audit every signed-in editor rail panel and first creation flow. Add contextual typography, shape gallery, direct slide editing, safe rebuild confirmation and guest exit save. Eight focused editor/layer browser checks and 50 unit checks pass. See [editor usability audit](editor-canva-audit-2026-10-02.md).
  - [x] Migrate remaining workspace/public-onboarding browser journeys. The complete 34-test built-app suite passes with one worker on October 3.
  - [ ] Complete the screenshot matrix and keyboard/accessibility checks across routes, themes and mobile sizes.
- [ ] Inspect real document PDFs and open exported PPTX files in target applications; fixture/file-signature tests are insufficient for fidelity claims.
- [ ] Complete hosted team schema/RLS and identity verification; current team implementation is local-only.

The expanded roadmap still governs feature scope; the current status ledger governs delivery order and release claims.

## Expanded product work — agreed direction, pending implementation

- [ ] Stabilize the existing reference workflow and verify real-image quality.
- [x] Introduce the versioned document schema and lossless legacy migration.
  - [x] Connect a versioned editable-file bridge to standalone/ZIP exports and editor reopening; preserve legacy files and reject unsupported changes. Unit tests and browser download/reopen/save/dashboard journey passed October 1.
  - [x] Feature-flagged DesignDocument storage authority for guest browser saves (`documentRuntimeEnabled`, disable with `VITE_FORMA_DOCUMENT_RUNTIME=0`); load accepts both legacy Project JSON and `forma-design` envelopes; projection round-trip checks cover copy, page size, layers and content blocks. Cloud API still receives the Project projection. Verified with document unit tests October 1.
- [x] Deliver arbitrary elements, layers and custom-size flyer/banner editing end to end.
  - [x] Additional text layers: author, style, move, lock, remove, undo, save/reopen, review and export; overflow blocks visual export. Verified October 1.
  - [x] Image/shape elements and stacking among added layers, connected to history, persistence, review snapshots and exports. Original artwork remains underneath.
  - [x] Custom page dimensions: portrait/square/story/banner presets plus bounded custom W×H; canvas, export, PDF and versioned backups use the resolved page size. Campaign ZIP keeps three aspect ratios for presets and exports the actual page for custom sizes. Layouts remain in the 720×900 design space and scale to the page. Verified with model/document unit tests October 1.
  - [x] Flexible manuscript mapping: ordered content blocks; known labels fill the six fields; unknown labels after a blank line become managed text layers; revision review covers field and extra sections. Verified with model unit tests October 1.
  - [x] Stage 1 graphics foundation wired end to end for custom sizes, flexible manuscript blocks, and document-backed guest storage. Live canvas editing still uses the Project projection; multi-page documents and skills remain later stages.
- [x] Build brand systems, components and versioned templates.
  - [x] Versioned BrandSystem (colors, fonts, spacing notes) with legacy `{primary,secondary}` migration, guest/account save, `brandRef` pinning and upgrade checks. Verified October 1.
  - [x] Declarative built-in components and versioned templates; save/open pins `templateRef` and bumps version on overwrite. Verified October 1.
- [ ] Complete provider-independent declarative skills: full authoring/publishing UI remains unverified; library/apply/import/export foundation is implemented.
  - [x] Event Campaign skill: apply to two sample manuscripts with all copy accounted for; library/preview/apply UI; export/import package; explicit skill-upgrade review; never silent upgrade. Verified with design-system unit tests October 1.
- [ ] Complete release verification for flowing multi-page documents, tables, masters and PDF export. Model/panel/export implementation exists; representative visual and browser acceptance remains pending.
  - [x] Document family model with pages, masters (header/footer/page numbers), flowing text frames, tables with header repeat, and citations. Verified with fixtures October 1.
  - [x] Document editor panel: thumbnails, add/remove pages, repaginate from manuscript; canvas renders the active page.
  - [x] Multi-page PDF export; PNG/SVG/ZIP blocked for documents; unmapped content blocks export. One-pager, 10-page and 20-page fixtures retain all content blocks. Verified with flow-document unit tests October 1.
- [ ] Complete hosted team permissions, shared publishing and authenticated approvals. Local implementation exists; Supabase team support remains pending.
  - [x] Workspaces with owner/editor/reviewer/viewer roles; cross-workspace denial on server checks. Verified October 1.
  - [x] Scoped publishing of pinned project/template/skill/brand snapshots into a workspace; members can list, outsiders cannot.
  - [x] Authenticated review decisions (`/api/reviews/:token/decision`) record signed-in identity; public status rejected when auth is required.
  - [x] Append-only workspace audit log with membership recovery payload; Team panel UI. Local account mode only this release (Supabase team RLS deferred). Verified with team-ops unit + API tests October 1.
- [ ] Complete presentation fidelity verification and any external adapters. Forma PDF/PPTX exporters exist; target-app testing and external AI integrations are not established.
  - [x] Presentation family with 16:9 slides (title/section/content/two-column/chart), speaker notes, categorical bar charts from numeric tables. Verified October 1.
  - [x] Slides rail panel + canvas; rebuild from manuscript; PDF and editable PPTX export; PNG/SVG/ZIP blocked.
  - [x] Verified adapters `forma-pptx` and `forma-presentation-pdf` with documented fidelity limits; PPTX OOXML exercised in unit tests. Verified October 1.

Acceptance evidence and the first implementation slice are specified in [product expansion](product-expansion.md). None of these boxes is complete merely because this plan exists.

## 0. Secure and verify the foundation

- [ ] Rotate the database password and privileged Supabase credentials shared in chat. Replace their deployed/local values and retire exposed credentials using the applicable Supabase controls.
- [x] Configure supplied Supabase project `wmnafbjtibairaelyzsi` in the ignored local environment. Database connection and hosted API access verified September 26. Vercel deployment remains separate.
- [ ] Confirm whether this project is staging or production and inspect its existing schema/data before applying migrations. Do not reset it or overwrite existing data.
- [x] Apply the three existing migrations after inspecting compatibility: base application, billing, and onboarding preferences. Empty public schema inspected; all three committed September 26.
- [ ] Verify hosted signup/login, user isolation, project persistence and account preferences. Configure app URLs and auth redirect allowlists.
- [x] Finish the pending onboarding regression checks: accessible template selection and browser-draft preservation during workspace initialization. Verified September 25; full 19-test browser suite passes.
- [ ] Put the project in a version-controlled repository with CI and a reproducible baseline.

**Done when:** credentials are stored appropriately, the intended Supabase environment is confirmed, two real accounts remain isolated, existing data is preserved, and the baseline checks pass. No credentials belong in this document.

## 1. Redesign the customer experience

- [ ] Establish a coherent visual system: readable typography, stronger contrast, consistent spacing, surfaces, controls, icons, focus states and responsive behavior.
  - [x] Write the [Studio Ink design playbook](design-playbook.md) (tokens, rail IA, copy diet, Lucide rules, phased rollout). October 1.
  - [x] [Interface audit](interface-audit.md) of all customer routes. October 1.
  - [x] Semantic light/dark/system tokens + FOUC-safe theme bootstrap + ThemeToggle. October 1.
  - [x] Phase A–B editor + dashboard chrome on Studio Ink. October 1.
  - [ ] Finish public/auth/review token migration; purge leftover purple in `site.css`.
  - [x] Contextual selection inspector and empty-selection behavior implemented; current browser acceptance pending.
  - [ ] WCAG AA verification and nontechnical usability sessions.
- [x] Build the project dashboard: real saved designs, search/sort, empty/error states, template starts and reference-upload entry into the editor. Verified locally September 25; hosted account verification remains in section 0. **Restyled October 1 (Studio Ink).**
- [x] Redesign the editor layout: stronger header/canvas/panel hierarchy, readable manuscript panel, immediate apply/review actions, refined contextual controls and retained checks/comparison. Desktop/mobile review and 20 browser tests passed September 25. Further text/layer interaction improvements remain below. **Superseded visually by the Studio Ink playbook — implement Phase B against that spec.**
- [x] Improve text/layer selection, positioning and editing without hiding the manuscript workflow. Live drag/resize + floating layer toolbar verified October 1; manuscript-as-drawer remains Phase B.
- [ ] Bring the public homepage, pricing, authentication, onboarding and account settings onto the same visual system.
- [ ] Make loading, saving, errors, retries, navigation and unsaved-change handling consistent.
- [ ] Review representative desktop and mobile screens visually and with keyboard navigation.

**Done when:** a new user can open the editor and identify canvas, tools, manuscript and export in under 10 seconds; marketing/dashboard/editor share Studio Ink tokens; playbook acceptance criteria pass. Review rendered screens, not just successful builds.

## 2. Build the secure platform-admin foundation

- [ ] Create a separate `/admin` workspace and deliberate first-owner bootstrap procedure.
- [ ] Implement server-enforced owner, support and billing permissions; ordinary signup/profile fields cannot grant privileges.
- [ ] Add stronger authentication for operators and an append-only audit trail.
- [ ] Build user search/detail and beta invitation/access management.
- [ ] Implement suspension/reactivation with enforcement in the actual customer APIs and a recorded reason.
- [ ] Add an overview backed by real account/usage/billing data, with honest empty states for unavailable metrics.
- [ ] Test ordinary-user denial, operator permission boundaries and audited mutations.

**Done when:** an authorized operator can manage access, every sensitive operation is recorded, and unauthorized requests fail even when called outside the UI. See [admin specification](platform-admin.md).

## 3. Strengthen the core design workflow

- [ ] Evaluate a representative collection of real reference/manuscript pairs and measure time, manual corrections, copy preservation and export quality.
- [ ] Improve text-region detection and mapping, typography controls, alignment and overflow handling.
- [ ] Make supported reference types and unavoidable manual work clear in the product.
- [ ] Verify live OpenAI analysis, failure behavior, latency and per-job cost.
- [ ] Persist analysis job state and provider usage so users and operators can diagnose failures.

**Done when:** supported design tasks reliably preserve supplied wording and produce acceptable exports. Arbitrary pixel-perfect reconstruction remains unproven; expanding background repair or font recovery requires explicit implementation and evaluation.

## 4. Move files and history onto scalable storage

- [ ] Store uploaded images in private Supabase Storage rather than duplicating embedded image data in every revision.
- [ ] Enforce asset ownership and authorized downloads; test cross-account access denial.
- [ ] Add storage limits, project/history pagination, upload validation and clear quota feedback.
- [ ] Define revision retention and clean up orphaned assets after deletion.
- [ ] Verify backup and restoration against an isolated environment.

**Done when:** repeated editing does not multiply large image snapshots, private files stay private, and deletion/restore behavior is tested.

## 5. Complete production identity and account flows

- [ ] Configure branded confirmation, reset and email-change messages through production SMTP.
- [ ] Verify real confirmation/resend/reset/email-change callbacks, expired links and session expiry.
- [ ] Verify password changes and other-session sign-out against hosted Supabase, not just the local adapter.
- [ ] Add signup/abuse protection and appropriate persistent rate limits.
- [ ] Verify workspace export, subscription-aware deletion and guest-to-account handoff in staging.
- [ ] Add Google sign-in only if selected; it is optional for this release.

**Done when:** the complete account lifecycle works through real emails and hosted authentication, including failure cases.

## 6. Activate and operate Paystack subscriptions

- [ ] Choose currency, final Free/Pro allowances and price after measuring provider costs. No price is currently approved.
- [ ] Configure a Paystack test plan and server-only credentials.
- [ ] Verify checkout, signed notifications, retries, duplicate/out-of-order events, renewal failures, cancellation, expiry and resubscription.
- [ ] Add durable webhook event visibility and reconciliation, including recovery from lost checkout responses.
- [ ] Build admin billing views and controlled, expiring, audited complimentary allowances; never overwrite verified payment history to grant access.
- [ ] Verify refund/dispute policy, events and operator recovery procedures.
- [ ] Configure live billing only after staging passes and commercial terms are ready.

**Done when:** payment records and access remain consistent across lifecycle failures, operators can resolve exceptions, and an authorized live smoke test succeeds. See [billing checklist](billing.md).

## 7. Complete daily operations

- [ ] Build platform-template draft/preview/publish/unpublish workflows backed by versioned records.
- [ ] Add support-report submission, operator cases, internal notes and resolutions.
- [ ] Add admin job inspection, usage/cost visibility and provider incident controls.
- [ ] Add validated configuration for beta access, support details and feature availability. Secrets remain in deployment secret storage.
- [ ] Configure error monitoring, uptime checks, actionable alerts and provider spending alerts.
- [ ] Establish support, incident response, account recovery and billing reconciliation procedures.

**Done when:** day-to-day customer and service issues can be handled without ad hoc database edits or unrestricted access to private manuscripts.

## 8. Release the production app

- [ ] Configure Vercel staging/production, domain, HTTPS and separate environment secrets.
- [ ] Publish operator-approved Terms, Privacy, cancellation/refund terms and support contact details.
- [ ] Run full browser, accessibility, mobile, load, authorization and data-isolation checks on the hosted app.
- [ ] Pilot with real users and resolve the release-blocking findings.
- [ ] Verify backups, rollback, monitoring and support ownership before opening signups/payments.

**Done when:** the hosted product passes its release gates and real users can complete the core journey with support and recovery in place.

## Later scope

Live co-editing, template marketplace, advanced inpainting and exact font recovery remain later scope. Do not label sketched UI as implemented.

## Pre–Stage 6 editor craft track

Expansion stages 1–5 have implementation foundations, with the limitations in STATUS.md. They are not fully accepted release milestones. Before public release, restore the build and verify editor craft (audit canvas: `forma-editor-audit`):

- [x] Canvas selection, live drag, real resize handles; clear Escape/canvas deselect for layers; floating toolbar for added layers.
- [x] Thirteen curated fonts, including eight self-hosted variable families, with weight, spacing and decoration controls. Selected fonts embed in graphics SVG export. Broader scripts, document/slide adapter fidelity and reusable brand styles remain open.
- [ ] Shape kit beyond the four current shapes (rectangle, rounded rectangle, ellipse, triangle): line, arrow, star, stroke and opacity remain open.
- [ ] Image placeholders, replace, and contain/cover fit modes.
- [ ] Typography extras beyond bold/italic, especially tracking and leading, and layers usable on full custom page sizes.
- [ ] Unified layers panel with to-front/to-back.
- [ ] Graphics visual polish (TODO §1) and representative reference quality loop (TODO §3).

## Current next task

The [signed-in editor audit](editor-canva-audit-2026-10-02.md) sets the next order: clear project-family journeys, image replace/crop, brand styles, document editing and slide layout polish. Continue remaining workspace/public browser migration and nontechnical usability sessions. See [STATUS.md](STATUS.md) for release limits.

Gemini alternative delivered September 26: live synthetic reference analysis passed; provider switching, copy preservation and sanitized failure tests passed. Representative image evaluation remains in section 3.
