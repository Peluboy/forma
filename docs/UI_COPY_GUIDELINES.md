# Forma UI Copy Guidelines

## 1. Core Principles
- **One idea per sentence**: Keep sentences short, active, and direct.
- **No em dashes**: Use periods, commas, or parentheses instead.
- **No technical jargon in user-facing UI**: Hide engine internals, model names, and math parameters.
- **Action-first verbs**: Start buttons and links with clear verbs (e.g., "Create design", "Open editor", "Download PDF").
- **Friendly, calm status copy**: Avoid scary warning banners or robotic error strings.
- **One primary action per screen**: Make the next step obvious at a glance.

---

## 2. Plain English Translation Dictionary

| Technical Domain Term | User-Facing Plain English |
|---|---|
| `runAiDesignerPipeline` | Create design |
| `DesignSpec` | Document layout |
| `TemplateFamily` | Template |
| `TemplateFamilyRecord` | Template |
| `ReferenceDesignProfile` | Reference style |
| `ContentGraph` | Document copy / Manuscript |
| `Exact Copy validation` | Copy check |
| `Fit validation` | Fit check |
| `Projection fidelity` | Editable output |
| `quality_trusted` | Ready |
| `quality_approximated` | Minor limits |
| `quality_unverified_after_projection` | Needs review |
| `editor_projection_loss_detected` | Editing may differ |
| `reference_template_ready` | Ready to use |
| `reference_guided_only` | Style only |
| `reference_low_confidence` | Needs review |
| `workspaceId` / `clientId` project | Saved to [Workspace / Client] |
| `Permission denied` | You do not have access to edit this |
| `Viewer role` | View only |

---

## 3. UI Copy Rules by Context

### Buttons & CTAs
- **Good**: "Create design", "Open in editor", "Add a template", "Save changes", "Invite member".
- **Avoid**: "Execute pipeline run", "Commit edits to persistent store", "Dispatch invitation payload".

### Helper Text & Tooltips
- Only add helper text if the user cannot understand the field from its label alone.
- Never repeat the label in the helper text.
  - Bad: `Label: Project name. Helper: Enter the name of your project.`
  - Good: `Label: Project name. Helper: (None needed)`.

### Error States
- State what happened and how to fix it in plain language.
  - Bad: `FATAL_STORAGE_QUOTA_EXCEEDED: DOMException code 22.`
  - Good: `Browser storage is full. Export or delete older designs to continue.`
