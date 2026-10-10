# Forma Product UI, Flow, and Visual System Audit (Phase 7.5)

## 1. Current App Structure
Forma is an AI design production platform for structured, brand-consistent business documents (reports, presentations, whitepapers, social graphics, flyers). The codebase runs as a React SPA powered by Vite on the client and an Express/SQLite/Supabase backend.

Top-level routing in `src/main.tsx` manages:
- **Public & Marketing**: `/` (Home), `/pricing`, `/templates`, `/help`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/onboarding`
- **Personal & Studio**: `/dashboard` (My designs & project list), `/create` (Creation wizard), `/editor` (Canvas editor), `/account`
- **Collaboration & Review**: `/review/:token` (Reviewer snapshot), `/template/:token` (Public template preview), `/workspaces` (Agency workspaces & client hubs)
- **Developer / Engineering Panels**: `/dev/pipeline`, `/dev/reference`, `/dev/templates`, `/dev/template-gallery`

## 2. Current Navigation Model
The navigation model is currently fragmented:
- **Dashboard**: Uses a fixed 240px sidebar with links to My designs, Templates anchor, Account, and Help. It embeds an ad-hoc scope filter (All, Personal, Workspace, Client) inside the search/filter toolbar.
- **Create Page**: Standalone full-width layout with an ArrowLeft back button to `/dashboard`. Context selection (Workspace and Client) is rendered in an isolated upper card.
- **Workspaces Page**: Standalone page with its own custom header, back link, and tab switcher (`clients`, `templates`, `members`). Client dashboards open in-place by setting `selectedClientId`.
- **Editor**: Completely separate bespoke chrome with a custom tool rail, canvas toolbar, collapsible left content panel, and right inspector.
- **Dev Panels**: Custom back buttons and dark-slate panels that leak into public/user routes (`/dev/template-gallery`, `/dev/reference`).

## 3. Main Personal User Journeys
1. **Landing & Account**: User lands on `/`, logs in or continues as guest, redirected to `/dashboard`.
2. **Start a Design**: User clicks "Create with AI" or "New design" from `/dashboard`, navigates to `/create`.
3. **Manuscript & Style Input**: User inputs text/manuscript, chooses format (graphics, document, slides), optionally chooses a template or uploads a reference, and clicks "Create design".
4. **Editor Editing & Polishing**: Generated design opens in `/editor`. User edits text inline on the canvas, inspects layout warnings, adjusts fonts/colors, exports, or shares.
5. **Managing Designs**: User returns to `/dashboard` to view saved projects, duplicate them, or delete them.

## 4. Main Agency / Workspace Journeys
1. **Workspace Setup**: Agency owner navigates to `/workspaces`, creates an agency workspace (e.g. "Acme Creative").
2. **Client Onboarding**: Under the workspace, agency owner creates clients (e.g. "Bloom Health", "TechCorp") with notes/briefs.
3. **Team Management**: Owner/Admin invites designers and viewers via email with assigned roles (`admin`, `designer`, `viewer`).
4. **Library Scoping**: Owner assigns shared agency templates to specific clients or keeps them agency-wide.

## 5. Main Client-Scoped Journeys
1. **Client Hub**: User selects a client in `/workspaces` to view dedicated client templates, active projects, and brand guidelines.
2. **Client Project Creation**: User clicks "New project for [Client]", launching `/create?workspace=:wsId&client=:clientId`.
3. **Contextual Generation**: `/create` automatically prioritizes client-dedicated templates and locks the generated project to that workspace and client.
4. **Project Organization**: Client deliverables appear grouped on `/dashboard` and in the Client Dashboard.

## 6. Screens that Feel Confusing
- **Dashboard**: Merges project management, creation banners ("YOUR STUDIO"), quick template pickers, and workspace scope filters into one dense page.
- **Create Page**: Overwhelms users with simultaneous options (Document Family, Format, Creative Freedom, AI directions, Manuscript, Reference upload, Template dropdown, Provider picker, Quality gates) before generation even starts.
- **Workspaces Page**: Jumps between Workspace creation, Client listing, Client Dashboard, Member invitations, and Template assignment without persistent breadcrumbs.
- **Editor Quality Panel**: Floods users with engineering terminology ("projection fidelity", "Exact Copy validation", "deliverable quality rubric").

## 7. Screens That Are Too Text-Heavy
- **Create Page**: Heavy instructional paragraphs above every field explaining what manuscripts are, how freedom modes behave, and what providers do.
- **Editor Quality Panel**: Displays extensive audit paragraphs explaining internal bounding heuristics and font sizing thresholds.
- **Workspace Dashboard**: Long descriptions of membership roles and invite behaviors.
- **Reference Dev Panel & Dev Panels**: Walls of unformatted JSON and technical debug text.

## 8. Screens With Repeated Explanations
- "Saved on this device / browser storage" is explained in the sidebar, in notice banners, in error modals, and in tooltip footers.
- "Exact copy is preserved" is restated in Create, in Editor toolbars, and in the Quality Panel.
- "Approved templates only" is stated in the dropdown label, in the helper text below, and in the validation tooltip.

## 9. Inconsistent Components
- **Buttons**: Different pages mix `<Button>` from `src/shared/components/ui/Button.tsx`, raw `<button className="button ...">`, and Tailwind inline buttons (`px-4 py-2 bg-accent ...`).
- **Cards**: Project cards use hover transforms with custom CSS in `dashboard.css`, template cards in the gallery use dark slate Tailwind cards, and workspace cards use bespoke borders.
- **Badges**: Statuses use varying pill styles: some with rounded-full, some with rounded-sm; some uppercase font-mono, others lowercase medium.
- **Modals / Dialogs**: Differ between native dialog elements, custom absolute popovers, and `Modal.tsx`.

## 10. Inconsistent Spacing
- Dashboard uses 32px padding on desktop, 16px on mobile.
- Create page uses 24px and 16px.
- Workspaces page uses `px-6 py-8` with irregular `gap-6` and `gap-8` grids.
- Editor toolbars use bespoke 2px, 4px, 6px gaps mixed with arbitrary rems.

## 11. Inconsistent Typography
- Font sizes alternate between Tailwind utilities (`text-xs`, `text-sm`, `text-base`), CSS vars (`var(--text-md)`), and arbitrary px values (`text-[10px]`, `text-[13px]`).
- Line heights and font weights lack standardization (e.g., `font-medium`, `font-semibold`, `font-[550]`, `font-[650]`).

## 12. Inconsistent Buttons
- Varied border radii: `rounded-sm` (2px), `rounded-md` (6px), `rounded-xl` (12px), and `rounded-2xl` (16px).
- Mixed focus states: some buttons have standard focus rings, others have none or use browser defaults.

## 13. Inconsistent Cards
- Project cards have white backgrounds with border-border; Gallery cards have `bg-slate-950` with `border-slate-800`; Workspace cards use `bg-bg-panel` with shadow-sm.

## 14. Inconsistent Badges and Status Labels
- Same status has multiple representations:
  - "Approved" appears as green pill, green border, checkmark icon, or plain text `approved`.
  - "Draft" appears as yellow pill, gray tag, or `(draft)`.
  - Quality score appears as `q95`, `95/100`, `95%`, or `Trusted`.

## 15. Inconsistent Navigation
- Header and sidebar layouts vary across `/dashboard`, `/create`, `/workspaces`, and `/editor`.
- Back navigation uses inconsistent links: `/dashboard`, browser back, or modal dismissals.

## 16. Missing Empty States
- Empty projects list on Dashboard lacks an inspiring, visual illustration or clear secondary guides.
- Empty templates list in Workspaces has only raw text: "No templates assigned yet."
- Empty clients list has a raw button with no guiding explanation.

## 17. Missing Loading States
- Generation pipeline uses raw spinner circles with dense logs.
- Project loading uses a simple "Opening Forma…" text without skeleton cards.
- Template gallery switches without smooth transition or skeleton previews.

## 18. Missing Error States
- Errors are frequently shown in red alert banners or raw `alert(error)` popups without recovery actions or retry buttons.

## 19. Areas Where Dev Tools Leak Into User-Facing UX
- Template Gallery was located at `/dev/template-gallery`.
- Reference analysis panel was located at `/dev/reference`.
- Create page exposes technical "Analysis provider" (OpenAI vs Gemini vs Local OCR) and "Vision Critic" debug toggles.

## 20. Workspace / Client Context Clarity Issues
- When creating a project from the main dashboard, users cannot easily tell whether the project will be personal or workspace-bound until after generation.
- Client Dashboard has no top breadcrumb indicating parent workspace hierarchy.

## 21. Recommended New Information Architecture
- **Personal Studio**:
  - `/dashboard` — My designs & start studio
  - `/create` — Unified, stepped creation flow
  - `/templates` — Curated template library & public gallery
  - `/editor` — Document editor
  - `/account` — Profile & settings
- **Workspace & Agency Hub**:
  - `/workspaces` — Workspace switcher & overview
  - `/workspaces/:id` — Workspace hub (Clients, Shared Templates, Members, Settings)
  - `/workspaces/:id/clients/:clientId` — Dedicated client dashboard
- **Developer Suite (clearly quarantined under `/dev`)**:
  - `/dev/ui` — UI System Playground
  - `/dev/pipeline` — Pipeline debugger
  - `/dev/reference` — Reference extraction lab
  - `/dev/templates` — Template authoring lab

## 22. Recommended Visual System Foundation
- **Foundation**: Calm, airy, modern, clean canvas feel. Off-white/slate backgrounds (`#f8faf9` light, `#121916` dark).
- **Accents**: Deep forest emerald (`#126d5f`) and crisp mint (`#8ae0bf`), with warm sand/slate neutrals.
- **Shapes & Radii**: Generous rounded curves (`rounded-xl` / `rounded-2xl`) for primary containers; crisp `rounded-lg` for interactive controls.
- **Depth**: Subtle layered elevation shadows, fine hairline borders (`border-[#e4e9e5]`), soft ambient gradients.

## 23. Pages to Redesign First
1. **Design System & Primitives (`src/ui/`)**: Core buttons, cards, badges, inputs, states, layout shells.
2. **UI Playground (`/dev/ui`)**: Visual catalog of all tokens and components.
3. **App Shell & Navigation (`AppShell`, `Sidebar`, `Topbar`, `Breadcrumbs`)**: Cohesive navigation frame.
4. **Dashboard (`Dashboard.tsx`)**: Reusable `ProjectCard`, clean headers, clear primary CTA.
5. **Create Flow (`CreatePage.tsx`)**: Visual 4-step wizard with progressive disclosure and context picker.
6. **Workspace & Client Hub (`WorkspacePage.tsx`, `ClientDashboard.tsx`)**: Contextual breadcrumbs and cards.
7. **Template & Gallery Surfaces**: Unified `TemplateCard` across gallery and picker.
8. **Editor Chrome Polish**: Plain English quality panel, cleaner tool rail, unified badges.

## 24. Components to Create
- `AppShell`, `Sidebar`, `Topbar`, `Breadcrumbs`, `WorkspaceSwitcher`
- `PageHeader`, `SectionHeader`, `PageGrid`
- `Button`, `IconButton`, `ButtonGroup`
- `Badge`, `StatusBadge`, `WorkspaceRoleBadge`
- `Card`, `ProjectCard`, `TemplateCard`, `ReferenceCard`, `ClientCard`, `WorkspaceCard`, `MetricCard`
- `EmptyState`, `LoadingState`, `ErrorState`, `SkeletonCard`
- `Stepper`, `Tabs`
- `Input`, `Select`, `TextArea`, `Toggle`, `Notice`
- Custom art primitives: `FormaLogo`, `FormaGradientBlob`, `DocumentIllustration`, `EmptyProjectIllustration`

## 25. What Should Be Deferred
- Real-time multi-cursor collaborative canvas editing
- Stripe billing integration & paid seat checkout
- Native Rust/WASM PDF compiler & PPTX direct binary writer
- Full CRM invoicing and agency white-label portals
