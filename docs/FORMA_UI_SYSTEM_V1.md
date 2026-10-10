# Forma UI System Specification (v1.0)

Superseded for visual tokens by `docs/FORMA_VISUAL_SYSTEM_V2.md` (Phase 7.6).
The component inventory below still applies. Theme is light-first. Green is
an accent, not a page fill.

## 1. Visual Identity Foundation

Forma is an AI design production platform for high-craft business documents. The visual identity embodies:
- **Calm, Focused, and Creative**: Generous whitespace, clean surface contrast, and soft elevation.
- **Premium Craftsmanship**: Deep emerald accents, warm slate neutrals, subtle ambient gradients, and crisp rounded geometry.
- **Design-Led, Not Technical**: Looks like a modern creative suite (like Figma or Canva), avoiding raw admin-dashboard grids or developer consoles.

---

## 2. Core Token Architecture

### Color Palette

| Token | Light Mode Value | Dark Mode Value | Usage |
|---|---|---|---|
| `--color-bg-page` | `#f8faf8` | `#111815` | Default canvas & page background |
| `--color-bg-panel` | `#ffffff` | `#1a231f` | Cards, sidebars, modals, panels |
| `--color-bg-elevated` | `#ffffff` | `#24312b` | Dropdowns, tooltips, popovers |
| `--color-bg-muted` | `#edf2ee` | `#26322b` | Hover states, tab tracks, chip fills |
| `--color-text-primary` | `#131f1a` | `#f2f6f3` | Main headings, primary copy |
| `--color-text-secondary` | `#4b5c53` | `#a5b5ac` | Subheadings, card descriptions, labels |
| `--color-text-tertiary` | `#7a8c82` | `#728479` | Metadata, timestamps, helper hints |
| `--color-border` | `#e2e8e3` | `#2d3d34` | Hairline card & panel borders |
| `--color-border-strong` | `#cad5cc` | `#42574b` | Active inputs, selected cards |
| `--color-accent` | `#126d5f` | `#8ae0bf` | Primary action buttons, active tabs |
| `--color-accent-hover` | `#0b5b4f` | `#aef3d5` | Hover state for accent buttons |
| `--color-accent-muted` | `#d8ede4` | `rgba(138,224,191,0.14)` | Badges, focus glows, subtle accents |

### Semantic Status Tokens

| Semantic Role | Foreground (Light) | Background (Light) | Dark Foreground | Dark Background |
|---|---|---|---|---|
| **Ready / Success** | `#0f6f46` | `#e1f6ec` | `#4ade80` | `rgba(74,222,128,0.15)` |
| **Needs Review / Warning** | `#92400e` | `#fef3c7` | `#fbbf24` | `rgba(251,191,36,0.15)` |
| **Danger / Error** | `#b91c1c` | `#fee2e2` | `#f87171` | `rgba(248,113,113,0.15)` |
| **Info / Neutral** | `#334155` | `#f1f5f9` | `#94a3b8` | `rgba(148,163,184,0.15)` |

### Radii & Spacing

- **Radius**:
  - `rounded-sm`: 4px (small buttons, tags)
  - `rounded-md`: 8px (inputs, standard buttons, tabs)
  - `rounded-lg`: 12px (cards, dropdowns)
  - `rounded-xl`: 16px (major cards, dialogs)
  - `rounded-2xl`: 24px (feature banners, modals)
  - `rounded-full`: 9999px (avatar, pill badges)
- **Spacing Scale**:
  - `gap-1` / `p-1`: 4px
  - `gap-2` / `p-2`: 8px
  - `gap-3` / `p-3`: 12px
  - `gap-4` / `p-4`: 16px
  - `gap-6` / `p-6`: 24px
  - `gap-8` / `p-8`: 32px
  - `gap-12` / `p-12`: 48px

### Shadows & Depth

- `--shadow-sm`: `0 1px 2px rgba(15, 23, 42, 0.05)`
- `--shadow-md`: `0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)`
- `--shadow-lg`: `0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.06)`
- `--shadow-modal`: `0 20px 48px -8px rgba(15, 23, 42, 0.18)`

---

## 3. UI Component Primitives

The Forma UI system (`src/ui/`) provides unified building blocks:

1. **Layout & Shell**:
   - `AppShell`: Persistent navigation frame, responsive sidebar, topbar, and main content area.
   - `PageHeader`: Structured page title, subtitle, breadcrumb, and primary action slot.
   - `SectionHeader`: Section title, optional counter badge, and secondary actions.
   - `PageGrid`: Responsive card layout with auto-fit minmax columns.
2. **Interactive Controls**:
   - `Button`: Primary, secondary, outline, ghost, danger variants with loading spinner and icon support.
   - `IconButton`: Accessible square icon button with tooltip support.
   - `Input`, `Select`, `TextArea`: Calm form inputs with clear focus rings.
   - `Toggle`: Accessible switch control.
   - `Tabs`: Fluid tab switcher with active indicator.
   - `Stepper`: Visual multi-step progress indicator for complex flows like `/create`.
3. **Data Display & Cards**:
   - `Card`: Base panel container with hover elevation and border options.
   - `ProjectCard`: Document card with visual cover thumbnail, format badge, scope label, status chip, and dropdown menu.
   - `TemplateCard`: Visual template showcase with layout count, approved status badge, and quick use/fork action.
   - `ReferenceCard`: Reference style summary with extracted palette chips, typography tags, and confidence badge.
   - `ClientCard` & `WorkspaceCard`: Organization containers with member count and client status.
   - `MetricCard`: Compact KPI card with label, value, and trend indicator.
4. **Feedback & States**:
   - `EmptyState`: Friendly title, short explanation, custom SVG artwork, and primary CTA.
   - `LoadingState`: Calm spinner or skeleton cards with friendly status message.
   - `ErrorState`: Friendly explanation, troubleshooting action, and optional collapsible technical details.
   - `StatusBadge`: Unified status pill mapping domain states into clear, plain English labels.
