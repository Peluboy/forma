# FlowDocument to DesignSpec sync

## Why

Native PDF reads DesignSpec. The editor edits FlowDocument. After canvas edits, a stored spec can lie.

## What syncs

- Text content and typography
- Position and size
- Shape fill, stroke, opacity
- Image fit, focal point, alt text
- Table cells and header flag
- Chart title, labels, values, type
- Page background and hide
- Linked page add/remove

## What marks stale or unsupported

- Unlinked element add
- Missing linked DesignSpec element
- Manuscript repagination
- Header/footer treated as native elements
- Unsafe table structure change
- Validation failure after a patch

## Exact Copy after edits

- Style-only and position-only edits keep Exact Copy intact.
- Source-locked text or table cell edits set `copyChanged` and show “Copy changed after generation.”
- User-created text without source spans does not create a false copy failure.

## Recovery

`fromFlowDocumentToDesignSpec` rebuilds a spec from the current flow while keeping existing IDs when `designLink` is present. It is for resync and recovery, not automatic migration of every old project.
