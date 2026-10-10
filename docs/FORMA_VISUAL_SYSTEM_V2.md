# Forma Visual System v2

Phase 7.6 rescue. This replaces the green-black prototype look with a
light-first creative studio.

## Theme decision

**Option A, with a focused editor canvas (Option C treatment).**

| Surface | Theme |
| --- | --- |
| Default | Light |
| Landing, auth, gallery | Light (public) |
| Dashboard, create, templates, workspaces | Light |
| Editor chrome | Light panels |
| Editor canvas | Warm dotted stage (`--canvas-stage`) |
| Dark | Opt-in, charcoal. Never green-black |

Green is an accent, not a background. Dark mode is charcoal (`#111214`) with
mint as a signal color only.

## Color

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg-page` | `#f7f6f3` | `#111214` | App canvas |
| `--bg-panel` | `#ffffff` | `#18191c` | Cards, sidebar, inspector |
| `--bg-elevated` | `#ffffff` | `#1f2024` | Menus, popovers |
| `--bg-muted` | `#f0eee9` | `#25262b` | Tracks, chips, hovers |
| `--bg-subtle` | `#fbfaf8` | `#151619` | Nested surfaces |
| `--text-primary` | `#16181d` | `#f3f3f1` | Titles |
| `--text-secondary` | `#585e68` | `#a9acb3` | Body |
| `--text-tertiary` | `#868b94` | `#7f838b` | Captions |
| `--border` | `#e7e4de` | `#2b2d32` | Hairlines |
| `--accent` | `#0c7e61` | `#4fd1a1` | Primary action |
| `--accent-hover` | `#096a51` | `#74dfb7` | Hover |
| `--accent-muted` | `#e2f3eb` | mint 13% | Soft fill |
| `--success` | `#0b7a4b` | `#45d08f` | Ready |
| `--warning` | `#a35a06` | `#f2b44c` | Needs review |
| `--danger` | `#b4321f` | `#f4806f` | Error |
| `--info` | `#2160b5` | `#7cb4ff` | Neutral info |

Art tints (mint, lilac, peach, sky, butter) are for graphics only. Do not
paint whole screens with them.

## Gradients

- `--gradient-hero`: lilac + mint + peach wash on white
- `--gradient-card-glow`: corner mint/lilac bloom
- `--gradient-empty`: empty-state wash
- `--gradient-preview`: warm paper
- `--gradient-accent`: mint button sheen

## Typography

| Role | Size | Family |
| --- | --- | --- |
| Display | 52px | Space Grotesk |
| Page title | 32px | Space Grotesk |
| Section title | 20px | Space Grotesk |
| Card title | 15px | DM Sans |
| Body | 14px | DM Sans |
| Small | 13px | DM Sans |
| Caption / label | 12px | DM Sans |

## Spacing

4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96. Prefer these. Do not invent 7px or 18px.

## Radius

- small 6 · medium 10 · large 14 · xl 20 · 2xl 28 · pill 999

## Shadows

- soft (`--shadow-sm`) for cards at rest
- medium (`--shadow-md`) for hover lift
- floating (`--shadow-lg`) for modals and artboards

## Component rules

1. One primary action per screen.
2. Cards rest on white, not nested inside other cards.
3. Green is for buttons, selected states, and status. Not heroes.
4. Previews show the document, never a "DOCUMENT" label.
5. Empty states use product art, a short title, and one action.
6. User copy never includes model names, em dashes, or scores out of 100 as
   the main status.
