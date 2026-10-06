# Forma product and technical audit

> **Implementation update, 4 October 2026:** This audit records the pre-milestone state. Phase 0 and the Phase 1 foundation subsequently added document visibility/export blocking, an Exact Copy validator with source spans, opt-in ContentGraph v1 and DesignSpec v1 with graphics/flow adapters, and a new hosted template/skill/review migration. Existing projects remain on the legacy persistence model. See [DesignSpec v1](DESIGNSPEC_V1.md) for the implemented contracts and limits. The historical findings below have not been rewritten as claims about the new models.

**Scope and method.** This is a static audit of the checked-in application as of 4 October 2026. I traced routes, UI handlers, domain functions, API handlers, persistence adapters, migrations, and export code. Documentation, labels, fixtures, and tests were used as leads, not proof that a feature works in production. I did not execute the app, provider calls, migrations, Paystack transactions, or visual acceptance tests. Accordingly, “implemented” means an executable path exists; it does not certify deployed configuration or output quality. **Fact** describes current code; **recommendation** describes proposed work. Paths below are repository-relative.

## 1. Executive Summary

**Fact.** Forma is a working, browser-based design prototype with account and guest flows, editable single-page graphics, separate document and presentation modes, manuscript import, optional image reference, one saved brand, Gemini art-direction concepts, project persistence, reviews/revisions, and several exports. The new `/create` AI path returns **three style concepts**, then deterministic client code builds projects from fixed templates and layouts. It does **not** ask AI to produce a structured page/element plan or reconstruct an uploaded reference. The existing reference-on-canvas mode places editable text over a **raster reference image** with covers. Document and slide modes are separately modeled and rendered; they are not one unified editable canvas (`server/creative.ts`, `src/domain/design/creativeDesign.ts`, `src/features/editor/components/Poster.tsx`, `src/domain/design/flowDocument.ts`, `src/domain/design/presentation.ts`).

**Critical distinction.** Keeping `project.manuscript` does not prove exact copy is visible in a design or export. The document renderer clips lines and table cells, and document PDF exports rasterize that renderer. Likewise, a saved graphics project reused as a template is useful but is not an intelligent template family. Hosted Supabase persistence also differs materially from local SQLite: the migration permits project/revision/review/brand records but rejects template/skill records, while team workspaces explicitly return 501 outside local mode (`src/features/editor/canvas/DocumentCanvas.tsx`, `src/features/editor/lib/exports.tsx`, `supabase/migrations/202609240001_forma.sql`, `server/app.ts`).

## 2. Current Architecture

| Layer | Current implementation | Boundary/implication |
| --- | --- | --- |
| Web shell | Vite/React/TypeScript; pathname switch and lazy screens in `src/main.tsx`; CSS tokens plus large handwritten styles and some utility classes | No centralized router, but routes are explicit. |
| Product UI | `src/features/{site,account,projects,create,editor,review,team,billing,workflows}` | Most editor orchestration remains in `src/features/editor/EditorPage.tsx`. |
| Domain | `src/domain/design/*` holds graphics `Project`, documents `FlowDocument`, slides `PresentationDeck`, parsing, templates, brand, exports | Different output families have different primitives and rendering assumptions. |
| API | Express app in `server/app.ts`, local entry `server/index.ts`, Vercel entry `api/index.ts`; `vercel.json` rewrites `/api` and sets function timeout | AI is synchronous HTTP, not a durable job. |
| Storage/auth | Guest browser localStorage/sessionStorage; local SQLite through `server/store.ts`; hosted Supabase Auth and `forma_*` tables/RPC through `server/store.ts` | Feature parity between local and hosted modes is incomplete. |
| AI | Gemini concept generation in `server/creative.ts`; reference text-region analysis via Gemini or OpenAI in `server/analysis/index.mjs` | Two AI paths serve different UI journeys; neither is the target design generator. |
| Billing | Optional Paystack integration `server/billing/*`, UI in `src/features/billing/Billing.tsx` | Disabled unless configured; no proof of live end-to-end transaction acceptance. |

Routes implemented in `src/main.tsx`: `/`, `/dashboard`, `/create`, `/editor`, `/pricing`, `/templates`, `/help`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/onboarding`, `/account`, and `/review/:token`; unknown paths show NotFound. There is no platform-admin route.

Server API families in `server/app.ts`: health/config; session and local auth/account/preferences; projects and revisions; brand/templates/skills; local-only workspaces/members and related team operations; review links/comments/approval; reference analysis; concept generation; billing plans/state/checkout/verification/management/webhook. The browser uses the API wrapper in `src/shared/api/api.ts` and Supabase client where configured. No server actions, worker process, scheduled queue, asset service, or export service was found.

## 3. Current Feature Inventory

| Area | What code actually implements | Material limit |
| --- | --- | --- |
| Public/account | Marketing/pricing/templates/help screens, auth and recovery, onboarding, account/preferences/theme, profile/password/email where supported (`src/features/site/PublicSite.tsx`, `src/features/account/*`) | Public templates page is not evidence of a full agency template marketplace. |
| Projects | Dashboard list/open/delete/duplicate paths, editor autosave, optimistic versions, revision snapshots, guest local projects (`src/features/projects/Dashboard.tsx`, `src/features/editor/hooks/usePersistence.ts`, `server/app.ts:488`) | Full project JSON saved on each change; no retention policy. |
| Graphics canvas | Six managed text fields, additional text layers, shape/image/frame layers, ordering, lock/hide, move/resize, inline text editing, fonts/colors, page format, reference overlay (`src/domain/design/schema.ts`, `src/domain/design/layers.ts`, `src/features/editor/components/*`) | Fixed artwork from templates is rendered SVG, not individual editable elements. No grouping/constraints. |
| Documents | Heuristic manuscript blocks, estimated pagination, text/table frames, page controls, master header/footer/page numbers (`src/domain/design/flowDocument.ts`, `src/features/editor/canvas/DocumentCanvas.tsx`) | Rendering truncates; no measured layout or rich import. |
| Presentations | Slide parser, several fixed layouts, notes, native-ish text/table export (`src/domain/design/presentation.ts`, `src/features/editor/canvas/PresentationCanvas.tsx`) | No general slide element canvas; PPTX visual fidelity differs from UI. |
| AI | Gemini proposes 3 concept records; image region analyzer offers suggested text boxes and manual field mapping (`server/creative.ts`, `server/analysis/index.mjs`) | No AI-created complete page graph or QA loop. |
| Assets/uploads | Manuscript file read in browser, reference image normalized for API, uploaded canvas images compressed to inline WebP (`src/features/create/CreatePage.tsx`, `src/features/editor/lib/fileImports.ts`, `src/features/editor/components/GraphicLayers.tsx`) | No bucket-backed asset library; size/data URI limits. |
| Collaboration | Review snapshot links with comments/decisions; local team workspace UI/API (`src/features/review/*`, `src/features/team/*`, `server/app.ts`) | Team API returns 501 on hosted mode; no real-time shared editing. |
| Exports | Graphics SVG/PNG/PDF/ZIP/Forma JSON; document PDF; slide PDF/PPTX (`src/features/editor/lib/exports.tsx`, `src/domain/design/presentation.ts`) | PDFs are image-based; PPTX is limited to fixed native shapes/text/table. |
| Admin/operations | Health endpoint, logs/errors, usage quotas, billing state | No platform-admin dashboard, job console, provider-cost ledger, or moderation/asset operations UI. |

## 4. Actual User Flows

1. **Identity.** A visitor reaches login/signup/recovery through `src/features/account/AuthPage.tsx`. In Supabase mode the browser uses Supabase Auth and bearer tokens; local mode uses `/api/auth/*` and an HttpOnly session cookie. Onboarding offers sample/template/reference starts (`src/features/account/Onboarding.tsx`). Account settings cover preferences, profile, password/email where supported, data export/delete, and billing (`src/features/account/AccountSettings.tsx`).
2. **New AI-guided project.** `/create` chooses graphics/document/presentation and graphics size; user pastes copy or imports text, DOCX, or PDF, optionally adds PNG/JPEG/WebP reference, selects freedom and saved brand. Guests are redirected to login with draft in session storage. Authenticated client POSTs `/api/design/concepts`, gets three concept metadata records, previews them, then locally builds a `Project` and passes it to `/editor` through session storage. Editor consumption/save is in `src/features/editor/lib/startIntent.ts` and `src/features/editor/hooks/usePersistence.ts`. The concept itself is not a durable generation job or saved design specification (`src/features/create/CreatePage.tsx`, `server/app.ts:1362`, `src/domain/design/creativeDesign.ts`).
3. **Manual graphics/reference.** Dashboard/editor can start a preset project. In editor, user uploads a reference, optionally calls `/api/reference/analyze`, reviews text regions, maps them to six fields, draws regions manually, and switches to raster-background reference mode. User edits overlay boxes/text/layers and saves; the original background remains one image (`src/features/editor/panels/EditorReferencePanel.tsx`, `src/features/editor/dialogs/AnalysisReview.tsx`, `src/features/editor/lib/editorIoActions.ts`, `src/features/editor/components/Poster.tsx`).
4. **Template repeat.** A graphics project can be marked/reused as a template. Repeat clones it, inserts new manuscript into managed fields/extra text layers, optionally applies brand and a simple fit strategy, then user reviews and edits (`src/domain/design/templateJob.ts`, `src/features/projects/Dashboard.tsx`). A separate versioned-template record UI/API exists, but it is not the same fidelity-preserving clone path (`src/domain/design/designSystem.ts:268`, `server/app.ts:621`).
5. **Documents/slides.** Import/paste manuscript, deterministic parser creates document pages or slides, user edits respective controls, autosave persists project JSON. There is no manuscript-to-layout AI at this stage (`src/domain/design/flowDocument.ts`, `src/domain/design/presentation.ts`).
6. **Review/export.** User can create a snapshot review link, collect comments/status, and download available formats after current validators run (`src/features/review/*`, `src/features/editor/lib/exports.tsx`, `server/app.ts`). Review is snapshot-based, not collaborative document editing.

## 5. Data Model

`Project` in `src/domain/design/schema.ts:94` is the persistence root: ID/name, six-field `copy`, raw `manuscript`, selected template, six `layouts`, optional reference data URI/region covers, text/graphic layers, layer order, family-specific `flow` or `presentation`, formatting/background, template flag, optional brand/template/skill version references, and timestamp. It mixes source material, rendered editor state, selected assets, and output-family state in one JSON record. IDs are strings generated by app code; version numbers live on storage records and selected brand/template/skill refs, not on each page/element. No relation table tracks which assets, pages, and components a project uses.

The graphics model has six built-in field IDs and `Layout` properties for x/y/width/font/size/weight/color/alignment etc. `TextLayer` is free text plus `Layout`; `GraphicLayer` is shape/image/frame plus geometry and visibility/lock flags (`src/domain/design/schema.ts`, `src/domain/design/layers.ts`). `FlowDocument` has content blocks, pages, text frames, table elements, and master/page settings. `PresentationDeck` has slides with fixed semantic slots (`title`, `body`, bullets, notes, chart/table) and a layout enum. These are three data models under one `Project`, not one normalized document model.

`DesignDocument` in `src/domain/design/document.ts` looks like a general page/element interchange format, but `toDesignDocument` builds a one-page graphics projection and embeds the whole legacy project in `compatibility.project`. `readDesignFile` verifies the projection and returns that embedded project. It is used for local/portable document runtime rather than as the canonical live editor model (`src/domain/design/documentRuntime.ts`). It is therefore **not** a working multi-page element graph.

## 6. Design Document Model

| Requested primitive | Current representation | Assessment |
| --- | --- | --- |
| Pages | Graphics: one implicit canvas. Documents: `FlowPage[]`. Slides: `Slide[]`. | No shared page semantics. |
| Text | Six fixed graphic fields and free layers; flow text frames referencing content blocks; slide slot strings | Editable, but no common text node or exact source-span provenance. |
| Images/shapes/frames | Graphics `GraphicLayer` image, four basic shapes, and crop-to-fill frame | No generic images/shapes in flow or slide models. |
| Tables/charts | Flow table elements and slide table/chart slots | Not common canvas elements; charts are fixed visuals/data, not a general chart model. |
| Geometry | Graphics coordinate boxes in a 720×900 design basis scaled to output size; flow fixed letter-page geometry; slides fixed 960×540 | No responsive constraints or layout relationships. |
| Typography/style | Per-graphics layout, flow defaults, slide theme; brand display/body roles | Styles are not a shared token cascade and are inconsistently applied. |
| Layering/grouping | Graphics `layerOrder`, hidden/locked state | No group tree, nested layout container, reusable component instances, or master relationship for graphics. |
| IDs/history | Project/layer/page/slide IDs and storage revisions | Full-document snapshots; no element-level provenance/diff. |

**Assessment.** This is sufficient for manual editing of current output types and deterministic generation within their narrow templates. It is **not yet flexible enough** for an AI-generated, multi-page, fully editable design spanning graphics/documents/slides. AI could emit a graphics project, but it would be constrained to six field slots, a finite layer count, static template artwork, and one implicit page. For documents/slides it would need separate output schemas and renderers. Introducing richer templates, semantic slot mapping, constraints, true reflow, or format-neutral export would multiply adapters and divergence unless a canonical page/element/style model is established incrementally.

## 7. AI Architecture

| Call/path | Provider/model | Inputs and prompt | Output/validation/failure | UI and persistence |
| --- | --- | --- | --- | --- |
| `/api/design/concepts` (`server/creative.ts`, `server/app.ts:1362`) | Gemini `GEMINI_VISION_MODEL` via `generateContent` | System: art director; source untrusted; return three distinct concepts, no copy edits. User JSON: family/format/freedom/manuscript and client-submitted brand name/colors/fonts; optional normalized reference image. | JSON schema asks for `{concepts:[{name,rationale,template,composition,colors,fonts}]}`; normalization checks values/count/duplicates. Two network/server-error attempts; invalid/incomplete output => 502; no alternative provider. Request timeout 45 s. | `/create` previews 3 and builds project locally. Only resulting project is eventually saved; no full prompt/response/job provenance. |
| `/api/reference/analyze` (`server/analysis/index.mjs`, `server/app.ts`) | OpenAI Responses with configured model or Gemini configured model; local-development Tesseract fallback | Reference image only; asks for candidate text regions, recognized text, rough font/color/cover and field suggestions. No new manuscript or saved brand. | Structured JSON and bounds normalization, max 60 regions. Gemini fallback model/cooldown on server errors; OpenAI path lacks equivalent retry. On error UI can map manually. | Editor review maps candidates to six fields, then reference raster plus text overlays is saved in `Project`. |

The prompts are inline code, not versioned prompt assets or eval-backed policies. The concept request consumes usage/quota before inference; provider failure can still spend an attempt (`server/app.ts`, `server/billing/*`). In-memory rate/concurrency limits apply per server process; Supabase hourly analysis usage and enabled billing usage are persisted. Malformed concept output is rejected, not repaired. Neither call returns a page tree, evaluates fit/brand/reference similarity, selects layout families from manuscript semantics, uses previous design projects, or iteratively fixes QA. The reference analyzer uses vision for text-region assistance, not a design-system extraction. A saved brand influences concept metadata only if the client submits it; server does not independently resolve the saved brand for this call.

## 8. Manuscript Pipeline

`src/features/editor/lib/fileImports.ts` reads up to 3 MB of `.txt`, `.md`, `.docx`, and `.pdf`. DOCX uses Mammoth raw-text extraction, so runs/styles, inline imagery, and table semantics are lost. PDF uses PDF.js text items joined into text/pages; it does not recover a reliable semantic hierarchy, table grid, or scanned-page OCR. Paste enters the same raw text path. No manuscript image extraction or author-approved page-break semantics are preserved across these formats.

Graphics parsing (`src/domain/design/manuscript.ts`) recognizes six labels such as eyebrow/headline/body/date/location/footer plus extra labeled blocks; unlabeled content gets a fallback title/body split. `applyContentBlocks` maps these to six text boxes and additional layers, with fixed placement for overflow blocks. Document parsing (`src/domain/design/flowDocument.ts:83`) recognizes simple heading labels, markdown-like tables/citations, and paragraphs; pagination estimates text lines. Slide parsing (`src/domain/design/presentation.ts:187`) relies on `---` delimiters and `Title:`, `Layout:`, `Notes:`, `Column:` style labels; otherwise it defaults to a layout/slide. These are deterministic heuristics, not deep content intelligence.

The raw manuscript remains in `Project.manuscript`, but the parsed/rendered copy is not byte-for-byte guaranteed: parsing trims/joins text, manual text edits reserialize manuscript, and document view clips displayed text (`src/features/editor/canvas/DocumentCanvas.tsx`). The AI concept call is instructed not to rewrite content and only returns design metadata, so there is currently no AI copy rewrite mode. There is also no formal Exact/Light/Rewrite setting, immutable approved source with spans, or pre-export source-to-visible-text audit.

## 9. Reference Design Support

`/create` accepts a PNG/JPEG/WebP image, sends it to Gemini with freedom choice, and receives style/template/composition metadata. It does not save a structured analysis of the image or its regions into the generated project. The editor reference path accepts an image, stores it inline, may ask AI to detect old text regions, and maps those regions to the six managed fields. `Poster.tsx` renders the uploaded image as a full-page raster, covers old text with rectangles, and overlays editable text; manual mapping is available. Input normalization/limits are in `server/analysis/index.mjs`.

There is **no design PDF/PPTX import**, image-to-element reconstruction, extraction of grids/spacing/shape systems/table or chart styles, reusable design tokens from the reference, or numerical/reference similarity QA. Reference influence in `/create` is prompt-level direction; influence in editor reference mode is direct reuse of the original raster, not recreation. This distinction matters for copyright, editability, and the product claim “new design in the same language.”

## 10. Brand System

`BrandSystem` (`src/domain/design/designSystem.ts:19`) stores ID/version/name; background/text/accent colors and optional palette; display/body font roles; spacing note; updated timestamp. The account has one brand record keyed by owner ID in `/api/brand`; guests can use local storage. There are no logo files, asset collection, imagery treatments, formal spacing/type scales, component rules, approval constraints, or client-brand hierarchy. The selected brand is sent from `/create` to Gemini as name/colors/fonts, and concept normalization overlays those colors/fonts on AI proposals. `applyBrandToProject` updates graphics background and managed text layouts; fixed template artwork and arbitrary graphic layers are not comprehensively recolored. Document and slide concept application uses limited format-specific theme changes (`src/domain/design/creativeDesign.ts`). Brand refs exist in `Project`, but brand updates do not automatically propagate to old designs. Consistent brand enforcement/QA is missing.

## 11. Template System

There are **two different template ideas**. A saved graphics `Project` marked `isTemplate` can be cloned and supplied new manuscript through `src/domain/design/templateJob.ts`; this preserves its current artwork/geometry. A `VersionedTemplate` record from `src/domain/design/designSystem.ts:268` captures selected layouts/theme/background/component IDs and can regenerate a project, but it does not serialize all source graphic layers/artwork/assets, so it is not a faithful reconstruction. The dashboard repeat path uses the clone approach. API endpoints for versioned template records exist in `server/app.ts:621`, but Supabase's `forma_records.kind` constraint excludes `template`, so persistence fails in hosted mode unless a migration exists outside this repository (none found).

New copy is mapped by the six recognized field labels plus extra blocks, not by semantic similarity between arbitrary source text and template slots. “Fit” preserves geometry or expands some boxes using character estimates and available vertical gap. It does not switch layouts or create pages. Templates have no page-family grammar, accepted content schema, conditional slots, required/optional assets, overflow rules, brand binding, or reusable multi-page patterns. `SkillManifest`/`applySkill` adds declarative field rules and one built-in campaign example; it is deterministic metadata rather than an autonomous design skill (`src/domain/design/designSystem.ts:348`). Hosted skill saving has the same `kind` migration mismatch.

## 12. Fit/Layout Intelligence

| Capability | Status | Evidence/limit |
| --- | --- | --- |
| Graphics text measurement/wrapping | **Partial** | `getFits` uses browser canvas measurement; can shrink to a floor/percentage and report overflow. It does not assess all visual collisions or solve page composition (`src/features/editor/components/Poster.tsx:21`). |
| Template repeat fit | **Partial** | Character estimate/box expansion within available gap (`src/domain/design/templateJob.ts`). No layout variant selection. |
| Document pagination | **Partial** | Heuristic estimated lines at fixed page dimensions (`src/domain/design/flowDocument.ts:196`), not actual font metrics. Renderer clips lines/cells. |
| Presentation warnings | **Partial** | Character-count and content checks (`src/domain/design/presentation.ts:334`). No auto-creation of extra slides. |
| Collision/contrast/image QA | **Missing** | No general spatial collision detection, color-contrast validator, resolution/preflight across page types. |
| Reflow/automatic page creation | **Partial** | Document parser initially paginates; manual pages/slides can be added. No iterative generation/reflow based on actual rendered fit. |
| Layout selection from semantics | **Placeholder/limited** | Slides may honor explicit `Layout:`; concepts choose one of three composition tags, but document/slide layouts are fixed by separate parsers. |

`validateExport` (`src/features/editor/lib/exports.tsx:30`) blocks graphics unmapped/overflow conditions; for documents it filters only “unmapped” issues, allowing other document problems. Slide checks are basic. `EditorExportDialog` mirrors only part of this logic. A warning is not an automated fit repair.

## 13. Export System

| Output | Current path | Editability/fidelity |
| --- | --- | --- |
| Graphic SVG/PNG | React `Poster` rendered to SVG; fonts embedded; PNG rasterized around 1.5× | SVG text/layers may be inspectable but fixed template art and raster reference remain artwork/image. PNG is flattened. |
| Graphic PDF | Poster image embedded into jsPDF | Flattened image, not editable/selectable text. |
| Campaign ZIP | Several PNG sizes plus copy text and `.forma.json` | Useful handoff, but not production multi-format layout adaptation. |
| Document PDF | `DocumentPageView` SVG → canvas PNG at about 2× → jsPDF | Image-only. Truncation in rendered view reaches export. |
| Slide PDF | `SlideView` from `src/features/editor/canvas/PresentationCanvas.tsx` rasterized into PDF | Image-only. |
| Slide PPTX | Hand-built OOXML in `src/domain/design/presentation.ts` | Text boxes/tables are native/editable, but fixed-layout subset only. UI bar charts export as **tables** (`chartAsTable`), font/theme handling differs from on-screen rendering, and images/general canvas layers do not carry through. |

There is no graphic PPTX path or PDF/PPTX import path. Multi-page PDF loops visible document pages/slides, but production typography, line-wrap equality, embedded-font licensing, image DPI, accessibility tags, and cross-app PPTX rendering are not validated by a visual golden suite. Code labels an adapter “verified”; the checked-in tests inspect generated structure more than PowerPoint/Keynote visual acceptance, so that label should not be treated as a fidelity guarantee (`src/domain/design/presentation.ts:46`, `tests/*`).

## 14. Database + Storage

| Mode | Tables/records | Ownership and relations |
| --- | --- | --- |
| Local SQLite | `users`, `sessions`, `records(id,owner_id,kind,data,version,created_at)`, `preferences`, `billing_states` (`server/store.ts:47`, `server/billing/store.ts`) | FK to users; generic JSON record kinds; project revisions/reviews carry full project snapshots. |
| Supabase | `forma_records` with kinds **project, revision, review, brand**; `forma_preferences`; `forma_analysis_usage`; private `forma_billing` (`supabase/migrations/202609240001_forma.sql`, `...002_billing.sql`, `...003_preferences.sql`) | Owner RLS for reads, owner-scoped RPC writes, service-role billing. Review token RPC is a separate capability path. |

No Supabase Storage bucket or asset table is defined. Images/references are base64 data URIs within project JSON; exports are client downloads, not stored records. Pages/elements/brands/templates are not relationally associated, and there is no server-side asset ownership graph. Supabase records have a kind check, optimistic version, and a JSON-size check but no deep SQL shape validation; direct authenticated RPC calls can bypass API `isProject` validation while remaining owner-scoped. The local generic record table has no `kind` constraint. `forma_save` creates a full revision on project save with no retention; the editor saves frequently. Review snapshots also duplicate project data. There is no project schema-version migration pipeline for stored JSON, no object-storage lifecycle, and no dedicated design job/cost/export record. These are scale and migration risks rather than proof of current data loss.

**Hosted mismatch:** API template/skill writes call the generic store but Supabase's checked-in enum-like check and RPC allow-list exclude those kinds. Local workspaces/audit/membership records have no hosted schema and their endpoints explicitly return 501. The running deployment's migration state is **unclear from current implementation**; the mismatch is a checked-in-code finding, not a claim that a particular live database has or lacks an out-of-band patch.

## 15. Authentication + Security

Local auth uses salted scrypt password hashes, HttpOnly/SameSite session cookie, CSRF token for mutations, session expiry, and recovery code (`server/app.ts:225`, `server/store.ts`). Hosted mode uses Supabase Auth, a browser access token, server `getUser` verification, and owner-scoped Supabase RLS/RPC. Project, brand, and records API handlers require authentication and scope by owner. Guest project data stays in the browser. Server-only AI/Paystack keys are read from environment variables; client config contains a publishable Supabase key. I did not print or validate any live secrets.

Security gaps requiring attention: (1) `forma_review` in the migration creates a review snapshot without the `requireAuthenticatedApproval`/workspace fields submitted by API; it supports anonymous token-based status mutation, so the hosted path does **not** enforce the UI's authenticated-approval option (`supabase/migrations/202609240001_forma.sql:14,43`; `server/app.ts` review handlers). (2) Anyone with a review token can access the snapshot and its embedded manuscript/assets by design; token expiry and sharing policy matter. (3) In-memory API limits/concurrency are per process on serverless, while only some usage counters are persistent. (4) No hosted workspace tenant boundary exists yet; the local team model should not be marketed as hosted multi-tenancy. (5) User-supplied brand data reaches the concept prompt from the client; source text/image prompt injection is addressed in instructions, but output validation is limited to concept schema. No evidence of exposed server keys in client imports was found; full penetration testing was outside this static audit.

## 16. Payment System

`server/billing/paystack.ts`, `server/billing/store.ts`, `src/features/billing/Billing.tsx`, and billing routes in `server/app.ts` implement a configurable Free/Pro catalog, Paystack plan lookup/validation, checkout transaction initialization, return verification, management link, signed webhook (`x-paystack-signature` HMAC SHA-512), event processing for charges/subscriptions/invoices/refunds/disputes, optimistic persisted billing state, period usage, and optional feature consumption. The service checks customer/reference, amount/currency/plan/domain/paid status before granting paid access; webhook processing has duplicate-payment safeguards. Billing is off unless environment/configuration enables it; hosted writes need a service-role key. Renewal/failure state is driven by provider events and refresh, and cancellation is delegated to the Paystack management link rather than an app-side cancellation endpoint. There is no evidence in this repository of live merchant acceptance tests, reconciliation monitoring, support tooling, or guaranteed webhook delivery/replay. Treat the lifecycle as **implemented but operationally unverified**, not complete production billing.

## 17. Technical Debt

- `server/app.ts` (~1.4k lines), `src/features/editor/EditorPage.tsx` (~1k), `src/domain/design/presentation.ts` (~850), and large CSS files concentrate unrelated responsibilities. The editor has extracted panels/hooks/actions, but orchestration still coordinates many family-specific branches.
- Graphics, flow documents, slides, and `DesignDocument` duplicate concepts without a canonical renderer/export model. State synchronization is fragile because `Project.manuscript`, `copy`, `contentBlocks`, `textLayers`, `flow`, and `presentation` can diverge.
- Static template artwork and component catalog metadata are not the same as editable component instances. Hardcoded six fields, preset art, fixed page sizes/layouts, and fixed text placements limit scaling to reports/brochures.
- Parser/fit logic is largely heuristic; type validation of nested flow/slide data and some generic server-store data is shallow. `server/analysis/index.mjs` is outside TypeScript checks. AI prompts/output contracts are inline and unversioned.
- Inline base64 images make records, revisions, reviews, API payloads, and browser storage large; editor compression caps individual uploaded WebP data around 220k characters (`src/features/editor/components/GraphicLayers.tsx:266`, `src/domain/design/layers.ts:62`). API JSON has a 4 MB ceiling.
- No durable generation queue, idempotent job record, audit of AI model/prompt/input/output, per-generation cost ledger, or resume path after a Vercel timeout. Rate/concurrency maps are per process.
- There are unit/integration tests and CI files, but no evidence of a representative hosted Supabase/Paystack end-to-end suite or visual golden export comparison. I did not run tests during this audit because the task required only one documentation file to be changed.

## 18. Feature Status Matrix

Definitions: **A** functional path in code; **B** functional but fragile/limited; **C** UI/API exists but backend incomplete in target hosted setup; **D** mock/placeholder; **E** planned only; **F** dead/unreferenced. Static inspection does not certify deployment.

| Feature | Status | Why |
| --- | --- | --- |
| Sign-up/sign-in/session/account/settings | A | Local and Supabase code paths exist; configuration-dependent. |
| Guest projects/account project persistence/autosave/revisions | B | Real paths; whole JSON snapshots, browser/storage limits. |
| Graphics text/shapes/images/frames/layers/direct text edit | B | Editable subset; fixed art and one-page model. |
| Paste/text/DOCX/PDF manuscript extraction | B | Text import works; document semantics and scans are lost. |
| Gemini visual directions | B | Real provider call but only art-direction metadata. |
| Reference region detection/manual mapping | B | Real analyzer and mapping; raster background, not reconstruction. |
| Saved brand palette/type application | B | Real record and partial style application; not full brand governance. |
| Project-as-template repeat | B | Clone/repopulate works for graphics; semantic fit is weak. |
| Versioned template and skill persistence on Supabase | C | Endpoints exist; migration excludes record kinds. |
| Hosted team workspace | C | UI/API exist; API explicitly 501 in hosted mode. |
| Document pages/tables | B | Distinct model/pagination; clipping and raster PDF. |
| Slides/PPTX | B | Distinct model and native text/table export; fidelity gaps. |
| Admin operations workspace | E | No route/API. |
| AI-generated editable page graph/reference reconstruction | E | No end-to-end call/schema/renderer. |
| `DesignDocument` as universal live model | D | Compatibility projection; actual project embedded. |
| Built-in component catalog as reusable instances | D | Metadata/skill configuration, not instantiated canvas tree. |
| Paystack billing | B | Substantial implementation; disabled/config-dependent and live acceptance unverified. |
| Truly dead/unreferenced systems | Unclear | No safe claim without exhaustive import/build reachability instrumentation; compatibility code is used and should not be labeled dead. |

## 19. Product Vision Gap Analysis

Classification: **EXISTS** means core requested capability has an actual execution path, **PARTIAL** means narrow implementation, **MISSING** means no substantive path, **BLOCKED BY ARCHITECTURE** means the current independent models cannot represent the intended output reliably without a new shared contract. A label is not a quality certification.

| Capability | Classification | Gap |
| --- | --- | --- |
| 1. Manuscript intelligence | PARTIAL | Regex/markdown-like parsing, no robust semantic graph/source spans. |
| 2. Reference design analysis | PARTIAL | Text-region/color hints; no visual grammar extraction. |
| 3. Editable design generation | BLOCKED BY ARCHITECTURE | AI returns metadata; no canonical multi-page element tree. |
| 4. Copy-lock system | PARTIAL | Raw source stored and AI told not to rewrite; no immutable policy or visible/export diff. |
| 5. Brand intelligence | PARTIAL | Palette/two fonts, partial application; no assets/rules. |
| 6. Template systems | PARTIAL | Clone/repopulate and reduced versioned record; no robust schema. |
| 7. Template families | MISSING | No multi-layout family/selection rules. |
| 8. Semantic content-to-layout mapping | MISSING | Six labels/slide directives, not semantic slot matching. |
| 9. Fit intelligence | PARTIAL | Estimates and warnings, no iterative measured repair. |
| 10. Automatic page generation | PARTIAL | Initial document pagination only; no generic layout-driven page creation. |
| 11. Layout selection | PARTIAL | Fixed layouts/concept labels/manual slide directive. |
| 12. Design QA | PARTIAL | Some overflow/unmapped warnings, no general preflight. |
| 13. Reference similarity QA | MISSING | No comparison. |
| 14. Brand consistency QA | MISSING | No token/rule validation over all elements. |
| 15. PDF template import | MISSING | Manuscript text extraction is not editable design import. |
| 16. PPTX template import | MISSING | Export only. |
| 17. Design reconstruction | MISSING | Reference raster plus overlays is not reconstruction. |
| 18. Agency workspace | PARTIAL | Local-only team model; hosted disabled. |
| 19. Client brand management | MISSING | One account brand, no client-brand library. |
| 20. Template library management | PARTIAL | Project flags/versioned records; hosted persistence mismatch. |
| 21. Asset management | MISSING | Inline media, no owned asset library/storage bucket. |
| 22. Collaboration | PARTIAL | Review links/comments; no shared edit/session. |
| 23. Version history | PARTIAL | Full project revisions, no restore/diff/retention governance. |
| 24. Production-quality PDF export | PARTIAL | Multi-page image PDFs, clipping risk, no native text/print QA. |
| 25. Production-quality PPTX export | PARTIAL | Editable subset, but chart/UI/theme mismatch and no general elements. |
| 26. AI cost management | PARTIAL | Quotas/rate limits; no generation ledger/budget/fallback economics. |
| 27. Background processing | MISSING | Synchronous API requests. |
| 28. Queue/job system | MISSING | No durable job records/workers. |
| 29. Admin dashboard | MISSING | No operations route/API. |
| 30. Subscription/payments | PARTIAL | Paystack implementation, live lifecycle unverified. |

## 20. Recommended Future Architecture

**Recommendation: evolve, do not rewrite.** Preserve current React editor, auth, persistence adapters, graphics interactions, and deterministic parsers as compatibility paths. Introduce a versioned **canonical `DesignSpec`** with `Page[]`, typed editable `Element[]` (text/image/shape/frame/table/chart/group), semantic `ContentNode` IDs/source spans, style/token refs, parent/constraint relations, asset refs, and provenance. Build adapters from current Project/Flow/Presentation and a migration reader; add a new renderer incrementally for generated projects. Do not make the AI's JSON directly authoritative for pixel placement without normalization and preflight.

| Stage | Role | Technique and boundary |
| --- | --- | --- |
| A. Manuscript Parser | Extract raw source, structural candidates, tables/images, immutable spans | Deterministic file decoders and provenance; OCR/vision only for scans; never silently rewrite. |
| B. Content Architect | Classify heading/stat/quote/table/CTA, section relationships and design density | LLM reasoning on normalized blocks with strict schema; deterministic span coverage and exact-copy checks. |
| C. Design Reference Analyzer | Detect page geometry, boxes, typography/colors, image treatments and repeated motifs | Vision model for interpretation plus image-processing/OCR; confidence and human correction. |
| D. Design System Extractor | Cluster reference observations into tokens, components, layout variants | Algorithms for measurements/clustering; LLM labels patterns; preserve observed values/confidence. |
| E. Brand Resolver | Choose authorized client brand/version and allowed tokens/assets | Deterministic ownership/version lookup and precedence rules; no client-supplied authority. |
| F. Template Resolver | Match content/page role to available approved layouts | Deterministic eligibility/slot constraints, ranked with learned/LLM semantic signals. |
| G. Art Director | Produce a bounded design brief/section plan and choose creative variants | LLM reasoning with constrained output, approved copy references, and brand/template limits. |
| H. Layout Generator | Emit typed element tree with constraints/content-node links | Mostly deterministic layout algorithms using library components; model may choose patterns, not raw unvalidated coordinates. |
| I. Fit Engine | Measure actual rendered text/images, reflow/repaginate/switch variants | Browser/server font metrics and geometric algorithms; deterministic, repeatable. |
| J. Canvas Renderer | Render/edit the same `DesignSpec` used by preflight/export | Deterministic rendering; adapters for legacy projects during migration. |
| K. Design QA | Validate source coverage, fit, token use, image DPI, accessibility, visual similarity | Deterministic rules and visual regression; vision model only for subjective comparison/diagnostics. |
| L. Export Engine | PDF/PPTX from same normalized spec with explicit feature mapping | Deterministic native text/shapes/tables wherever possible, font/asset handling, comparison fixtures. No LLM at export. |

Track `generation_job` stages, idempotency, prompt/model/version/cost, approved input hash, artifact version, and errors. Store assets in owned object storage with signed access. Keep AI calls behind server-side provider adapters, with schema validation and budget controls. Human approval should operate on a stable generated draft and QA report. The first production slice should target **one constrained output family and one template family**, rather than claiming all formats at once.

## 21. Incremental Implementation Phases

| Phase | Objective/features | Dependencies and affected modules | Risks and definition of done |
| --- | --- | --- | --- |
| **0 — Stabilize what exists** | Fix hosted template/skill migration; enforce review approval; eliminate document clipping; add exact-copy/export regression fixtures; instrument current flows. | `supabase/migrations/*`, `server/app.ts`, `server/store.ts`, `src/features/editor/canvas/DocumentCanvas.tsx`, `src/features/editor/lib/exports.tsx`, tests. | **Risk:** migration of existing records, output changes. **Done:** hosted parity smoke test, review auth test, fixtures show every source character in visible/exported content or an explicit block. |
| **1 — Make AI generate real editable designs** | Define versioned DesignSpec/content spans; build one constrained graphics/one-pager generator from structured manuscript; renderer/editor adapter and exact-copy gate. | `src/domain/design/*`, `src/features/create/*`, `src/features/editor/*`, `server/creative.ts`; Phase 0 validation. | **Risk:** dual-model drift. **Done:** AI selects a layout and returns a multi-element spec; all elements editable and source coverage checked. |
| **2 — Reference-based design generation** | Analyze image references into tokens/layout observations; let user correct extraction; generate a *new* design in that style. | New reference-analysis domain/server modules, owned assets, DesignSpec. | **Risk:** unreliable vision/pseudo-reconstruction. **Done:** editable output without raster-background dependency, confidence/QA shown. |
| **3 — Intelligent template systems** | Add template family/layout variants/slots/rules, semantic mapping, brand binding/versioning and library management. | Brand/template schema, storage migration, resolver, DesignSpec. | **Risk:** breaking current `isTemplate` repeat. **Done:** old templates still open; new family accepts varied manuscript sections and selects at least two page variants. |
| **4 — Fit + QA** | Measured text layout, collision/overflow repair, repagination, exact-copy/brand/reference checks, export preflight. | Canonical renderer/spec, fonts/assets, deterministic QA. | **Risk:** browser/PDF/PPTX metric differences. **Done:** fixture suite covers dense tables, long copy, bad images; no unreported clipping. |
| **5 — Agency workflows** | Hosted multi-tenant workspaces, client brands, approvals, assets, role-scoped template library and history. | RLS and ownership model, object storage, phases 0–4. | **Risk:** cross-tenant access. **Done:** hosted permission tests across clients/roles and shared brand/template workflows. |
| **6 — Production hardening / billing / scale** | Durable generation jobs, cost ledger, retries/cancel, export QA, Paystack reconciliation, admin console/alerts, retention. | Stable generation pipeline, hosted schema, provider operations. | **Risk:** asynchronous complexity and payment drift. **Done:** resumed/idempotent jobs, verified PDF/PPTX golden outputs, live billing/webhook/reconciliation tests, actionable admin telemetry. |

## 22. Highest-Risk Technical Problems

1. **No canonical editable page/element model.** This blocks one generator and one QA/export path across deliverables (`src/domain/design/schema.ts`, `flowDocument.ts`, `presentation.ts`, `document.ts`).
2. **Visible/exported copy can silently differ from manuscript.** Document renderer truncation, heuristic parsing, and limited export validation undermine the defining Exact Copy promise.
3. **Hosted/local feature divergence.** Checked-in Supabase schema rejects templates/skills; team flows are local-only; review approval differs between stores. This is both product reliability and security risk.
4. **Rasterized exports and PPTX divergence.** A design can look different or lose editability on handoff, particularly charts/tables/fonts.
5. **Large inline blobs plus synchronous AI.** Data URIs duplicated in snapshots and synchronous provider calls create size, cost, timeout, and recovery limits.

## 23. Quick Wins

**Recommendations, not current capabilities:** add the missing hosted record migration and endpoint smoke tests; repair hosted review approval; remove document view truncation or block export on it; add source-to-rendered-text coverage assertions for fixture manuscripts; persist concept/reference analysis metadata and provider/error codes without secrets; distinguish “reference overlay” from “reference-generated design” in UI; add a per-export fidelity checklist and golden fixture before claiming production PDF/PPTX. These improve trust without rebuilding the editor.

## 24. Features We Should NOT Build Yet

Do not prioritize a public marketplace, broad app integrations, autonomous collaboration, video/animation, arbitrary PDF/PPTX editable reconstruction, dozens of asset categories, or a generic image generator. Each expands surface area before the core promise—approved copy plus a reusable visual system producing an editable, fitted output—has one reliable end-to-end example. Full PDF/PPTX import can follow a narrow reference image/template family path; selling it before reconstruction and export fidelity exists would create unsupported expectations.

## 25. Shortest Path to the Target Experience

**Direct answer:** continue from current code, but constrain the first complete experience to one-page graphics and a small multi-page report/slide template family. First fix source/render/export copy integrity and hosted persistence, then introduce a versioned editable DesignSpec and adapters to current projects. Build a manuscript content graph with source spans. Build a template family from **curated, editable Forma projects** (page roles, slots, accepted content ranges, brand tokens), so the first iteration does not need arbitrary PDF/PPTX reconstruction. Have AI classify manuscript blocks and select among approved layouts, while deterministic code fills elements and measures text. Add repagination/layout switching and QA, then native PDF/PPTX exporters from the same spec. Only after that add uploaded design analysis to infer a candidate family, with explicit user correction and confidence; PDF/PPTX design import requires separate parsing/reconstruction work.

What is missing between today and the requested journey: (1) canonical content/source-span graph; (2) canonical multi-page editable element/constraint model; (3) design-reference or template-family extraction with editable components; (4) semantic slot/layout matching; (5) measured fit and automatic repair; (6) copy/brand/reference/export QA; (7) reliable native exports; (8) asset/job/version infrastructure and hosted tenant permissions. Today’s Gemini concepts and raster reference overlay solve only parts of steps 2–3 at the art-direction/manual-assist level. A realistic first milestone is **saved editable template family + new manuscript → editable, QA-passing one-pager/report**, not arbitrary uploaded PDF/PPTX → perfect editable reproduction.

## 26. Recommended Next 10 Engineering Tasks

1. Write golden fixtures for approved copy, dense tables, long headings, reference overlays, slide charts, and current PDF/PPTX output; record failures and expected visual/text outcomes.
2. Fix document rendering/export clipping and make source-to-visible/export copy coverage a blocking invariant.
3. Add checked-in Supabase migrations/hosted smoke tests for template and skill kinds, plus authenticated review-approval enforcement.
4. Specify `DesignSpec` v1 with typed pages/elements, content source spans, style refs, layout constraints, assets, and version migration rules.
5. Build loss-aware adapters for one existing graphics project and one flow document; preserve legacy reader/writer while testing round trips.
6. Implement normalized manuscript extraction with table/heading metadata, source spans, and an explicit Exact Copy policy.
7. Turn one approved Forma design into a two- or three-layout editable template family with typed slots and limits.
8. Extend AI from concept labels to a validated content/page/layout plan, then instantiate elements deterministically from that plan.
9. Add measured fit, pagination/layout alternative selection, and preflight QA on the shared renderer.
10. Produce native selectable-text PDF and editable PPTX for the constrained family, compare against canvas fixtures, then add durable generation jobs/cost records before increasing provider usage.
