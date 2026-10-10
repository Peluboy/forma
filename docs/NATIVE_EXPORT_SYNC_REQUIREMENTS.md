# Native export sync requirements

Before writing a selectable PDF:

1. Permission check
2. Linked DesignSpec exists
3. Sync state is `in_sync` or `sync_with_approximations`
4. Export preflight
5. Exact Copy / fit / fidelity reports

If sync is stale or unsupported, native export is blocked with:

“Selectable PDF may not match your latest edits.”

Options:

- Sync latest edits
- Export flattened PDF
- Continue only after a successful resync

Missing DesignSpec: “Selectable PDF is unavailable for this project.” Flattened PDF remains.

PPTX export from DesignSpec stays deferred until this sync path is trusted.
