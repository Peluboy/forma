# Forma Status Language System

## 1. Overview
The status language system translates internal algorithmic gates, review calibrations, and permission roles into consistent, user-friendly labels with standardized color semantics.

---

## 2. Standardized Status Taxonomy

### Document & Design Quality Statuses

| Internal Domain State | Display Label | Variant | Description |
|---|---|---|---|
| `quality_trusted` | Ready | `success` | Document layout is verified and fits properly |
| `quality_approximated` | Minor limits | `warning` | Small font or spacing adjustment applied |
| `quality_unverified_after_projection` | Needs review | `warning` | Output may differ from initial layout |
| `editor_projection_loss_detected` | Editing may differ | `danger` | Certain complex elements were simplified |
| `copy_valid` | Copy check passed | `success` | 100% exact copy preserved |
| `copy_invalid` | Copy needs review | `danger` | Text overflow or missing manuscript section |
| `fit_valid` | Fits page | `success` | Text and tables stay within page margins |
| `fit_invalid` | Layout needs review | `warning` | Content overflows available space |

### Reference Style Statuses

| Internal Domain State | Display Label | Variant | Description |
|---|---|---|---|
| `ready` / `reference_template_ready` | Ready to use | `success` | High confidence color, typography, and layout extraction |
| `style_only` / `reference_guided_only` | Style only | `info` | Colors and fonts extracted; layout adapted |
| `needs_review` / `reference_low_confidence` | Needs review | `warning` | Reference image is complex or low resolution |
| `unusable` | Not enough detail | `danger` | Unable to extract clear design tokens |

### Template Statuses

| Internal State | Display Label | Variant | Description |
|---|---|---|---|
| `approved` | Approved | `success` | Verified for production generation |
| `draft` | Draft | `neutral` | In progress; authoring review pending |
| `candidate` | Candidate | `info` | Generated from a reference; awaiting review |
| `needs_changes` | Needs changes | `warning` | Reviewer requested adjustments |
| `rejected` | Rejected | `danger` | Not suitable for production |
| `archived` | Archived | `neutral` | Hidden from normal picker |

### Workspace & Client Statuses

| State | Display Label | Variant | Description |
|---|---|---|---|
| `personal` | Personal | `neutral` | Stored in personal studio |
| `workspace` | [Workspace Name] | `info` | Stored in team workspace |
| `client` | [Client Name] | `accent` | Assigned to a specific client |
| `owner` | Owner | `accent` | Full workspace control |
| `admin` | Admin | `info` | Can manage clients and templates |
| `designer` | Designer | `neutral` | Can create designs and templates |
| `viewer` | View only | `neutral` | Read-only access |
| `active` | Active | `success` | Active client or workspace |
| `archived` | Archived | `neutral` | Archived client |

### Sharing & Visibility Statuses

| State | Display Label | Variant | Description |
|---|---|---|---|
| `private` | Private | `neutral` | Visible only to you or your workspace |
| `unlisted` | Shared link | `info` | Anyone with the secret link can view |
| `public` | Public in gallery | `success` | Visible to all Forma users |
| `forkable` | Can fork | `info` | Other users can create a copy |

---

## 3. Status Component Usage

```tsx
import { StatusBadge, TrustStatus, TemplateStatusBadge } from "@/ui";

// Generic status badge
<StatusBadge label="Ready" variant="success" dot />

// Specialized helper components
<TrustStatus qualityScore={95} fidelity="trusted" />
<TemplateStatusBadge status="approved" />
```
