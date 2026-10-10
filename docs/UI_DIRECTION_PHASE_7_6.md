# UI Direction Phase 7.6

Proof lives at `/dev/ui-direction`. Tokens live in `src/styles/tokens.css`.
Components live in `src/ui/`.

## Chosen direction

Light-first creative studio. Warm paper background. Dark text. Mint accent.
Custom document art. Editor keeps a quiet dotted canvas so the artboard is
the brightest object.

Inspired by Linear (density and motion), Framer (canvas calm), Pitch (card
previews), and Canva (path clarity). Visual identity is original to Forma.

## Six key screens

### 1. Landing

Keep the current composition. Fix copy (no em dashes). Keep the manuscript
to poster story. Public pages stay light even if the user prefers dark in
the product.

### 2. Dashboard

- Product sidebar, not a 240px admin rail.
- Light hero with greeting, one primary "Create design" action, and two
  secondary action cards (template, reference).
- Search + scope segmented control. No four stacked selects.
- Preview-first project cards, min 260px.
- Template row with framed paper previews.

### 3. Create

- Words → Style → Review stepper.
- Left: type cards, manuscript drop zone, save-to context, one CTA.
- Right: artwork until there are directions, then live page previews.
- No "AI Designer Pipeline", no provider names, no layout IDs.

### 4. Editor

- Light header and inspector.
- Icon rail separated from the active panel by a border, not by matching
  dark fills.
- Dotted warm canvas. Artboard has floating shadow.
- Inspector uses grouped sections, not a stack of identical inputs.
- Quality uses Ready / Needs review badges.

### 5. Workspace / client

- Same product shell as dashboard.
- Workspace header with name, role badge, and one "New client" action.
- Client cards with counts. No empty dark void.
- Create workspace and add client happen in modals.

### 6. Template gallery

- Light page, hero with accent art.
- Category chips, framed template cards, "Use template" as the CTA.
- `/dev/template-gallery` uses the same components. No slate-900.

## What this direction is not

- Not a dark green admin console.
- Not a Canva clone.
- Not a Figma clone.
- Not a new backend.
