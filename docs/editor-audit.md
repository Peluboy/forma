# Forma editor audit

**Date:** October 1, 2026  
**Methods:** Live inspection of `/editor` (light theme, signed-in project), code review of `App.tsx` and related modules, layer/export subsystem review, unit tests (`canvas-interact`, model, exports).  
**Not verified this pass:** Guest-only save limits on a clean browser profile; real OCR provider failure against live cloud keys; physical tablet/phone touch; nontechnical usability sessions.

---

## 1. Current journey map

```
Dashboard / Onboarding
        │
        ▼
   Editor load (guest localStorage or account /projects)
        │
        ├─► Design panel: choose template  ──┐
        ├─► Upload panel: reference image ──┼─► Canvas preview
        │                                   │
        ├─► Content (manuscript) paste/upload
        │         │
        │         ├─► Review changes (dialog) optional
        │         └─► Apply → layouts / text layers
        │
        ├─► Select object → floating toolbar (+ side Text/Elements)
        ├─► Adjust / lock / order / undo
        ├─► Checks tab → fix overflow / unmapped
        └─► Share review link · Export download
```

**Core journey health:** Start → content → adjust → export works. Friction is density, duplicate controls, and unclear next step when Design + Content are both open.

---

## 2. Prioritized usability findings

| P | Finding | Classification |
|---|---|---|
| P0 | Design panel + Content panel often both open; canvas is squeezed | Simplify / one panel |
| P0 | Object properties duplicated (floating toolbar + Text/Elements expanded forms) | Combine / contextual |
| P0 | Long Content panel essays and “protection” blocks delay Apply | Simplify / rename |
| P1 | Header mixes File, truncated name, theme, Share, avatar, Download without “Back” label | Move / rename |
| P1 | Toolbar packs Resize, History, Brand, Compare beside undo without hierarchy | Move secondary to menu |
| P1 | “Manuscript” and “Upload” jargon; preferred: Content / design example | Rename |
| P1 | Export blockers only appear as throw/toast; checks not linked from Export | Show in context |
| P1 | Breadcrumb + permanent “artwork protected” caption add noise | Remove redundant UI |
| P2 | No Delete key; duplicate only ⌘D; no tooltip component beyond `title` | Fix / add |
| P2 | More menu holds Document/Slides/Workflows/Team (working but advanced) | Keep under More |
| P2 | Starter guide is useful once; marketing tone | Simplify |
| P3 | Theme toggle in header is correct placement; works light/dark/system | Keep |

---

## 3. Feature inventory (summary)

Full field set abbreviated. Treatment uses audit classifications.

### 3.1 Header

| Control | Location | Purpose | Who / frequency | Entry | Action / state | Data | Treatment |
|---|---|---|---|---|---|---|---|
| Brand | Header left | Return to projects | All / often | Click | `leaveEditor("/dashboard")` | Pending draft guard | **Rename** affordance to Back + keep mark |
| File menu | Header | New, open, save file, quick start | All / sometimes | Click | Sets dialogs / navigation | Project file | **Keep** as secondary project menu |
| Project name | Header | Rename | All / often | Type | `update({ name })` | `project.name` | **Keep** |
| Save status | Header | Trust autosave | All / continuous | Display + Retry | `persistence.saveNow` | Storage | **Keep** quiet |
| Theme toggle | Header | UI theme | All / rare | Radios | `forma-theme` localStorage | Chrome only | **Keep** secondary |
| Sign in | Header | Auth | Guests | Dialog account | Session | **Keep** |
| Share | Header | Review link | Signed-in / sometimes | Dialog share | Review token | **Keep** |
| Avatar | Header | Account | All | Dialog account | — | **Keep** secondary |
| Download | Header primary | Export | All / often | Dialog export | Files | **Rename** → Export |

### 3.2 Tool rail and task panels

| Control | Location | Purpose | Treatment |
|---|---|---|---|
| Design | Rail + panel | Templates | **Keep**; default closed after first visit |
| Text | Rail + panel | Field + text layers | **Simplify**: list + inspector |
| Elements | Rail + panel | Images/shapes | **Simplify**: list + inspector |
| Upload | Rail + panel | Reference example | **Rename** label “Reference”; clarify “design example” |
| More | Rail menu | Document, Slides, Workflows, Team, Projects, Help | **Keep** advanced |
| Account avatar | Rail bottom | Account | **Combine** with header avatar long-term; keep for now |

### 3.3 Content workflow (right panel)

| Control | Purpose | Treatment |
|---|---|---|
| Manuscript tab | Source content | **Rename** → Content |
| Upload DOCX/PDF/TXT/MD | Import | **Keep** |
| Textarea draft | Edit pending copy | **Keep** |
| Apply | Map to design | **Rename** → Apply changes |
| Review changes | Diff dialog | **Keep** |
| Protection details | Always-on assurances | **Move** to Help; collapse |
| Design checks tab | Issues list | **Move** to compact status + sheet |

### 3.4 Canvas and selection

| Control | Purpose | Treatment |
|---|---|---|
| Select / drag / resize | Direct edit | **Keep** |
| Arrow nudge | Keyboard move | **Keep** |
| Floating toolbar | Size, color, align, lock | **Keep** as primary selection chrome; add Remove |
| Side panel full forms | Same properties again | **Show only** selected item details; collapse coordinates |
| Zoom / fit | View | **Keep** footer |
| Compare | Reference vs design | **Keep** toolbar when reference exists |
| Breadcrumb / caption | Decoration | **Remove** redundant interface |

### 3.5 Lifecycle and output

| Control | Purpose | Treatment |
|---|---|---|
| Undo / redo | History stack | **Keep** |
| Version history | Account versions | **Move** to File menu |
| Brand settings | Brand system | **Move** to File / More |
| Autosave / conflict banners | Integrity | **Keep** |
| Export dialog | Formats + validation | **Keep**; surface blockers with jump-to-issue |
| Analysis review dialog | OCR mapping | **Keep** |

---

## 4. Proposed information architecture

```
┌ Back │ Name │ Saved · │ ⋯ File │ Share │ Export ┐
├ Rail ┼ Task panel (optional) ┼──────── Canvas ────────┤
│Design│ Tool list OR          │  [selection toolbar]   │
│Text  │ Selection inspector   │                        │
│Elems │                       │                        │
│Ref   │                       │                        │
│More… │                       │                        │
├──────┴───────────────────────┴─ Status: Content · N issues · Zoom ─┤
                                      ▲ Content drawer (one panel)
```

**Rules confirmed by audit**
1. One task panel at a time (library XOR content XOR checks sheet).
2. Selection properties: floating toolbar (common) + inspector in task panel (detail). Do not expand every layer.
3. Content drawer for paste/upload/apply; closed by default on wide screens after load if content already applied (open if `?tour=1` or empty copy).
4. Checks as status chip; expand on demand or when export blocked.

---

## 5. Function → proposed location mapping

| Existing function | Proposed location |
|---|---|
| Return to dashboard | Header Back control |
| File: new / open / save JSON / quick start | File menu |
| Project name | Header |
| Save status / retry | Header quiet status |
| Theme | Header tertiary / Account Appearance |
| Share review | Header secondary |
| Account | Header avatar |
| Export | Header primary **Export** |
| Templates | Rail Design → task panel |
| Reference upload / analyze / map | Rail Reference → task panel |
| Add text / list text layers | Rail Text → compact list |
| Add image/shape / list | Rail Elements → compact list |
| Document / Slides / Workflows / Team | More menu |
| Projects list / save as template | More → Projects (or dashboard) |
| Manuscript draft / apply / review | Content drawer |
| Design checks | Status chip → Issues sheet |
| Resize page | File menu or canvas page menu |
| Undo / redo | Canvas toolbar |
| Version history / Brand | File menu |
| Compare reference | Canvas toolbar (if reference) |
| Floating size/color/align/lock | Selection toolbar (keep) |
| Geometry x/y/w/h | Selection inspector → Advanced |
| Stack order | Selection toolbar + inspector |
| Delete layer | Selection toolbar + inspector (+ Delete key) |
| Duplicate layer | ⌘D + selection toolbar |
| Zoom / fit | Canvas footer |
| Help | File / More |
| Billing | Account only (not rail) |
| Starter checklist | First-run only, short labels |
| Sync conflict / load error | Banners (keep) |

---

## 6. Language decisions (from audit)

| Current | Proposed user-facing |
|---|---|
| Manuscript | **Content** (source wording). Extra boxes remain “Added text”. |
| Apply manuscript | **Apply changes** |
| Upload (rail) | **Reference** with helper “Upload a design example” |
| Download | **Export** |
| Overflow | “This text needs more room…” |
| JSON | “Editable Forma file” |
| Provider | Keep under Reference advanced; not in default path |

No em dashes in new copy.

---

## 7. Implementation order (post-audit)

1. Structure header, default one-panel, Content rename, remove chrome noise.
2. Selection inspector + compact layer lists; Delete on selection; File menu absorbs History/Brand/Resize.
3. Status issues chip linked to export blockers.
4. Polish themes, mobile drawer, tooltips, docs, verification.

**Preservation:** All handlers and data paths stay; this is placement and density, not capability removal.
