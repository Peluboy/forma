# Forma interface audit

**Date:** October 1, 2026  
**Method:** Code review of all customer routes + live inspection of homepage and dashboard at `127.0.0.1:5173`. Editor inspected via existing Studio Ink chrome pass.  
**Status:** Stage 1 complete — findings drive Stages 2–6.

## Implemented routes (do not link to empty features)

| Route | Status | Notes |
|---|---|---|
| `/` | Live | Marketing homepage |
| `/templates` | Live | Template gallery |
| `/pricing` | Live | Plans + Billing component |
| `/help` | Live | FAQ / help |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback` | Live | Auth |
| `/onboarding` | Live | 2-step quick start |
| `/dashboard` | Live | Projects + create |
| `/editor` | Live | Full design workspace |
| `/account` | Live | Profile, security, billing, data |
| `/review/:token` | Live | Comment / approve |
| Brand / Skills / Team / Document / Slides | Live in editor panels | Working; rename Skills → Workflows in chrome |

## Screen findings

### Homepage `/`
- **Task:** Decide to try Forma / open workspace.
- **Primary action:** Get started / Open workspace (signed in).
- **Issues:** Multiple competing CTAs (hero + header); purple accent leftovers in hero illustration vs teal chrome; marketing copy is long; no theme toggle; loading state still purple-tinted.
- **Keep:** Clear value prop (exact words); template discovery strip; FAQ.

### Templates `/templates`, Pricing `/pricing`, Help `/help`
- **Task:** Browse starts / choose plan / get answers.
- **Issues:** Share purple-era site.css; excessive eyebrow ALL-CAPS; dual primary buttons on some CTAs.
- **Planned:** Same semantic tokens; quieter type; single primary CTA.

### Auth (`/login` …)
- **Task:** Sign in / create account / recover password.
- **Primary:** Submit form.
- **Issues:** Warm marketing language (“Make yourself at home”); Preview art distracts from form; no theme; focus rings were purple.
- **Keep:** Working OAuth/callback, CSRF session, preferences redirect.

### Onboarding `/onboarding`
- **Task:** Reach first useful design quickly.
- **Primary:** Start with template or reference.
- **Issues:** 2 steps with purpose question may be skippable; ALL-CAPS “YOUR QUICK START”; long welcome copy.
- **Keep:** Skip path; template/reference start intents.

### Dashboard `/dashboard`
- **Task:** Find or create a design.
- **Primary:** Create a design / Start with a reference.
- **Immediate need:** Recent projects, search, templates.
- **Issues:** Hero marketing block competes with “My designs”; ALL-CAPS kickers; duplicate create CTAs (sidebar + hero); sidebar tagline essay; purple-tinted dashboard.css.
- **Move:** Marketing hero → optional empty state only.
- **Keep:** Real project list, guest/account persistence, template section.

### Editor `/editor`
- **Task:** Template/reference → manuscript → adjust → export.
- **Primary:** Export (header); Apply manuscript (panel).
- **Immediate:** Canvas, save status, selection tools.
- **Issues (pre–Studio Ink):** Dark purple header, crowded rail (9 tools + Plans/Help), dual sidebars open, long panel essays, Skills jargon.
- **Partially fixed:** Light header, teal tokens, 4-tool rail + More, copy diet, one-panel rule.
- **Remaining:** Full dark mode; contextual selection panel (not every form at once); rename Skills → Workflows; quieter header (fewer secondary buttons); empty-selection state; export blocked reasons; theme must not touch artboard colors.

### Account `/account`
- **Task:** Profile, security, billing, data export/delete.
- **Primary:** Save profile / manage plan.
- **Issues:** No appearance/theme setting; site chrome purple leftovers; “Plans & billing” OK.
- **Add:** Appearance: Light / Dark / System.

### Review `/review/:token`
- **Task:** Comment / approve / request changes.
- **Primary:** Approve or Request changes.
- **Issues:** Not on Studio Ink tokens; purple site inheritance; must stay readable in dark mode without changing design snapshot colors.

## Cross-cutting problems
1. **No product theme system** — light-only; purple legacy `#6654e8` theme-color meta.
2. **Scattered CSS** — `styles.css`, `editor.css`, `dashboard.css`, `site.css` override each other.
3. **Terminology** — “Skills” unclear; prefer “Workflows”.
4. **Hierarchy** — too many ALL-CAPS labels and explanatory paragraphs.
5. **Accessibility** — focus rings inconsistent; tiny muted text in places; need AA in both themes.
6. **Mobile** — panels overlay; needs one-panel + return-to-canvas (partially present).

## What stays functional (non-negotiable)
Auth, persistence/autosave/conflicts, manuscript exactness, reference analysis, layers/locks, undo/redo, backups, review snapshots, export validation, billing.

## Stage plan (from this audit)
1. ~~Audit~~ (this doc)
2. Brand playbook + semantic light/dark tokens
3. Theme provider + shared UI primitives
4. Dashboard + editor redesign pass
5. Public / auth / account / review
6. Cleanup, tests, verification report
