# DesignSpec Sync State v1

`DesignSpecSyncState` records whether the stored DesignSpec still matches the editable FlowDocument.

| Status | Meaning | Native PDF |
| --- | --- | --- |
| `in_sync` | Linked edits are on the stored spec | Export normally |
| `sync_with_approximations` | Synced, with copy or chrome notes | Export with warning |
| `stale` | A linked element or page cannot be found | Block native; offer flattened PDF or resync |
| `unsupported_edit_detected` | An edit has no safe DesignSpec mapping | Block native unless the user chooses flattened PDF |
| `missing_design_spec` | Old project, no linked spec | Native unavailable; flattened PDF remains |

User-facing labels: Up to date, Needs review, Needs sync, Export may not match, Selectable PDF unavailable, Sync failed.

The state is stored on `project.metadata.designSpecSync` next to `metadata.designSpec`.
