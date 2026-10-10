# Export Preflight v1

Native PDF export runs preflight **before** writing bytes. User-facing export does not proceed when status is `blocked`.

## Report

```ts
interface ExportPreflightReport {
  status: "pass" | "pass_with_warnings" | "blocked";
  warnings: ExportWarning[];
  blockers: ExportBlocker[];
}
```

## Checks

| Check | Pass | Warn | Block |
| --- | --- | --- | --- |
| DesignSpec schema (`validateDesignSpec`) | valid | — | invalid spec or page size |
| Exact Copy | valid or not in exact mode | adapter provenance missing | copy failure / missing required text |
| Fit | no unresolved overflow | unresolved or tight fit (export still proceeds) | — |
| Images | resolvable, adequate resolution | decorative missing, low-res, unsupported crop | required image missing |
| Fonts | mapped to a known family | substitution / unknown family | — |
| Unsupported effects | none | shadow, polygon, experimental bleed | — |
| Element bounds | on page | partially outside page | — |
| Hidden required copy | none | — | hidden text that still carries required source spans |
| Unsupported element type | known types only | — | unknown type |
| Workspace permission | personal owner, or owner/admin/designer | archived client/project (still allowed) | viewer, non-member, or missing workspace context |
| Table overflow | cells fit | cells clip; rows are still drawn | — (rows are never dropped) |
| Chart data | labels/values aligned | empty or mismatched lengths | — |

## Rules

- Copy failure blocks export
- Missing required text blocks export
- Unresolved fit warns; the PDF still downloads
- Invalid DesignSpec blocks export
- Unauthorized user blocks export
- Missing non-critical decorative assets warn
- Font substitution warns
- Unsupported visual effects warn, or rasterize only when the option is on

## User-facing language

Do not show “DesignSpec” in product UI. Preflight maps to:

- Ready to export
- Some fonts will be replaced
- One image may look soft
- Some text is tight on the page
- Fix copy issues before export
- Export blocked
