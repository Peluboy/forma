# Forma Product Information Architecture & Flow Redesign (Phase 7.5)

## 1. High-Level Vision
Forma transitions from a developer-assembled tool suite into a unified, design-led AI production platform. The navigation structure clearly separates:
1. **Personal Studio**: Private documents, personal templates, and direct creation.
2. **Agency & Workspace Hub**: Multi-client spaces, client-dedicated brands, scoped template libraries, and team members.
3. **Developer Tools**: Internal labs, pipeline diagnostics, the UI playground (`/dev/ui`), and the visual direction proof (`/dev/ui-direction`) quarantined under `/dev/*`.

Phase 7.6 applies a light-first product shell (`AppShell`, `ProductSidebar`,
`HeroPanel`) to dashboard, create, workspaces, and gallery. Editor chrome is
light with a dotted canvas. See `docs/UI_DIRECTION_PHASE_7_6.md`.

---

## 2. Route & Navigation Map

```
/ (Landing Page & Marketing)
├── /pricing (Subscription & Plans overview)
├── /templates (Public Template Gallery)
├── /help (Documentation & Support)
│
├── /login (Sign in)
├── /signup (Account creation)
├── /forgot-password
├── /account (User profile, settings & preferences)
│
├── /dashboard (Personal Studio & Projects Hub)
│   ├── Quick create banner
│   ├── Scope filter (Personal / Workspace / Client)
│   ├── Projects list & grid
│   └── Template quick-pickers
│
├── /create (Stepped AI Design Production Wizard)
│   ├── Context bar (Personal vs Workspace vs Client)
│   ├── Step 1: Document Type (Report, Presentation, One-Pager, Graphic)
│   ├── Step 2: Content (Manuscript text or file upload)
│   ├── Step 3: Style (Template selection, Reference design, or Brand)
│   └── Step 4: Review & Open in Editor
│
├── /editor (Canvas & Document Editor)
│   ├── Topbar (Document title, scope badge, zoom, undo/redo, export, share)
│   ├── Left Tool Rail (Pages, Text, Media, Templates, Layers)
│   ├── Center Stage (Artboard canvas & pagination controls)
│   └── Right Inspector (Contextual layer properties & Quality Review)
│
├── /workspaces (Agency & Team Workspace Hub)
│   ├── Workspace Switcher
│   ├── Clients Tab (Client cards, status, quick actions)
│   ├── Templates Tab (Workspace-wide and client-assigned templates)
│   ├── Members Tab (Invite members, role management)
│   └── Client Detail View (Client brief, dedicated templates, client projects)
│
├── /review/:token (Public Reviewer View)
│   └── Snapshot preview with approval / feedback options
│
├── /template/:token (Public Shared Template Preview)
│   └── Layout showcase with "Use template" and "Fork template" actions
│
└── /dev/* (Quarantined Developer Suite)
    ├── /dev/ui (Forma UI System Playground)
    ├── /dev/pipeline (Raw pipeline inspector & run fixtures)
    ├── /dev/reference (Reference extraction lab)
    └── /dev/templates (Template authoring & capacity testing lab)
```

---

## 3. Persistent Context & Breadcrumb Model

Users must always know three things at a glance:
1. **Where am I?** (Personal space, Workspace name, Client name)
2. **Where will my work be saved?** (Automatically saved to personal library or assigned workspace/client)
3. **What is the primary action on this screen?** (A single dominant primary button)

### Context Display Format
- **Personal Scope**: `Personal Studio / My designs`
- **Workspace Scope**: `Acme Agency / Clients`
- **Client Scope**: `Acme Agency / Bloom Health / Projects`

---

## 4. Main Personal User Journeys

### Journey 1: Create a Branded Report
1. Open `/dashboard` → Click **"Create design"** primary button.
2. In `/create`:
   - Step 1: Select **"Document / Report"**.
   - Step 2: Paste executive summary or upload `.docx`/`.txt`.
   - Step 3: Select an approved template (e.g. *Forma Editorial Report*).
   - Step 4: Click **"Generate design"**.
3. Real-time visual progress animates through outline, layout selection, copy checking, and fitting.
4. Preview shows generated pages → Click **"Open in editor"**.
5. Project opens in `/editor` with copy intact and ready for fine-tuning.

---

## 5. Main Agency & Client User Journeys

### Journey 2: Produce Deliverables for a Client
1. From `/workspaces`, switch to **"Acme Studio"** → Select client **"Bloom Health"**.
2. Client Hub opens displaying Bloom Health's brief, dedicated templates, and existing projects.
3. Click **"New design for Bloom Health"**.
4. Creation wizard opens with context pre-set to `Acme Studio / Bloom Health`.
5. Step 3 (Style) highlights Bloom Health's dedicated templates first (`[Client] Bloom Health Annual Report`).
6. Click **"Generate design"** → Resulting project is automatically tagged with `workspaceId` and `clientId`.
7. Deliverable appears under Bloom Health's project list and in the team dashboard.

---

## 6. Progressive Disclosure Rules
- **No wall of text**: Secondary descriptions are hidden behind information badges or clean helper tooltips.
- **Advanced configuration collapsed**: AI model selectors, temperature, token limits, and debug flags are confined to an expandable "Advanced options" disclosure or developer pages.
- **Calm states**: If a document has no quality issues, the quality panel shows a simple green badge: `Ready · Score 95/100`. Deep layout diagnostics are only shown when actionable recommendations exist.
