# Forma design playbook

**Status:** Active brand + interaction system for the customer redesign.  
**Updated:** October 3, 2026.  
**Companion:** [Editorial workbench direction](frontend-overhaul-2026-10-03.md) · [Interface audit](interface-audit.md) · Tokens: `src/styles/tokens.css` · Theme: `src/shared/theme.ts`

References inform qualities only—do not copy another product’s UI. Linear (restraint), OpenAI (calm focus), Stripe (hierarchy), Canva (approachable creation).

---

## Brand purpose

Help people confidently produce **consistent designs from their own approved content**.

## Personality

Clear · composed · useful · approachable. No exaggerated AI language, no jargon.

## Voice

Short and direct:

| Prefer | Avoid |
|---|---|
| Add text | Enhance your creative narrative |
| Upload image | Drop your inspiration here to begin the magic |
| Use this template | Make it yours — curated for you |
| Review changes | Ready for the world |
| Download | Export your masterpiece |

Errors include an action: “Couldn’t save. Check your connection and try again.”

---

## Visual identity — Studio Ink / Editorial workbench

### Logo / wordmark
- Mark: three-bar `brand-mark` on the public site and dashboard; compact `f` tile plus `forma.` wordmark in the editor header.
- Accent on the trailing dot uses `--accent`.
- Do not place the wordmark over busy artboard photography in chrome.

### Color (semantic)

| Role | Light | Dark | Use |
|---|---|---|---|
| Page background | `#F0F1EE` | `#111916` | App chrome |
| Panel | `#FFFFFF` | `#1A2320` | Sidebars, cards |
| Elevated | `#FFFFFF` | `#24302A` | Menus, dialogs |
| Text primary | `#17201D` | `#F1F3EE` | Titles, body |
| Text secondary | `#58645F` | `#ADB9B0` | Meta |
| Border | `#DFE4DE` | `#334139` | Dividers |
| Accent | `#126D5F` | `#8AE0BF` | Primary action, selection chrome (UI) |
| Tool spine | `#17342E` | `#0E1814` | Editor rail |
| Canvas stage | `#E7E9E5` | `#111A16` | Surrounds artwork; never exported |
| Success / warning / danger | semantic greens/ambers/reds | lighter for dark | Status only |
| Canvas selection | `#2563EB` / `#60A5FA` | Handles only — not brand chrome |

**Rule:** Theme tokens never alter artboard fills, reference pixels, or export colors.

### Typography
- **UI:** self-hosted DM Sans. Scale: 12 / 13 / 14 / 16 / 20.
- **Display:** self-hosted Space Grotesk for product landmarks and top-level headings.
- **Document fonts:** Separate catalog on the artboard (Arial, Georgia, …).

Avoid all-caps section labels; prefer sentence case. Minimum UI text 12px.

### Spacing
4 · 8 · 12 · 16 · 24 · 32 · 48. Group related controls with space before adding boxes.

### Radius / elevation / icons
- Radius 6 / 10 / 14.
- Two elevations: flat, modal shadow.
- Lucide only, stroke **1.75**, sizes 14 / 16 / 20.

### Motion
120–180ms ease-out. Honor `prefers-reduced-motion`. No bounce.

### Themes
- **Light · Dark · System** (default).
- Persist `localStorage.forma-theme`.
- Apply in `index.html` before paint (no flash).
- Toggle in header + Account → Appearance.

---

## Product structure

| Surface | Primary task | Primary action |
|---|---|---|
| Marketing | Decide to try | Get started |
| Dashboard | Choose a template or reference, then find projects | Use a template / Use a reference |
| Editor | Make design | Export |
| Review | Approve | Approve / request changes |
| Account | Manage self | Save |

Customer-facing name: **Workflows** for saved brand+template packages. Team and saved projects live under **More**; Document and Slides are visible creation modes.

Editor rail: Design · Elements · Text · Reference · Content · Document · Slides · More. Design tools lead; manuscript input and format modes are separated visually. The rail uses readable labels and keyboard-visible focus.

One side panel at a time. Manuscript is a drawer, not a permanent wall.

---

## Components

Buttons (primary / secondary / ghost / danger), icon buttons, inputs, tabs (underline), menus, dialogs, toasts, empty states, theme toggle — see `src/styles/ui.css`, `src/styles/editor-overhaul.css` and `src/features/projects/dashboard.css`.

---

## Rollout

| Stage | Deliverable | Status |
|---|---|---|
| 1 Audit | [interface-audit.md](interface-audit.md) | Done |
| 2 Playbook + tokens | This doc + `tokens.css` light/dark | Done |
| 3 Theme + UI primitives | `theme.ts`, `ThemeToggle`, `ui.css` | Done |
| 4 Dashboard + editor | Semantic chrome, quieter IA, task panel Studio Ink pass | Done (chrome + panels; usability sessions open) |
| 5 Public / auth / account / review | Token migration | In progress |
| 6 Verify | Tests + [verification report](redesign-verification.md) | Pending |

---

## Acceptance (product)

See the redesign brief §12. This playbook is met when tokens, themes, and voice are consistent across routes and artboard colors remain theme-independent.
