# Template Sharing Permissions

`src/domain/template-sharing/permissions.ts`

Permissions are **pure functions of the record and the actor** (no clock, no
I/O), so the UI, the server, and tests all agree. The UI never decides whether
a share is legal — it calls these.

```ts
interface TemplateActor {
  ownerId?: string | null;
  signedIn?: boolean;
}
const ANONYMOUS: TemplateActor = { ownerId: null, signedIn: false };
```

## Rules

| Function                     | Rule                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `isTemplateOwner`            | `actor.ownerId` is set and equals `record.ownerId`.                                      |
| `isShareRevoked`             | `record.sharing?.revokedAt` is set.                                                      |
| `canEditTemplate`            | Owner, and status is not `rejected`.                                                     |
| `canArchiveTemplate`         | Owner, and status is not already `archived`.                                             |
| `canShareTemplate`           | Owner **and** `status === "approved"` **and** `approval.approved`.                       |
| `canMakeTemplatePublic`      | Same as `canShareTemplate`.                                                              |
| `canViewSharedTemplate`      | See below.                                                                               |
| `canForkTemplate`            | `allowForking` **and** not revoked **and** approved; a non-owner must be able to see it. |
| `canUseTemplateInGeneration` | Owner **and** approved **and** not archived.                                             |

### `canViewSharedTemplate(record, actor, token?)`

- The owner can always view.
- Otherwise it must be non-revoked and `status === "approved"`.
  - `public` → anyone may view.
  - `unlisted` → the supplied token must equal `sharing.shareToken`.
  - `private` → no access.

### Reasons

`sharingBlockReason` and `forkingBlockReason` return a human-readable reason or
`null`. They are what the authoring lab shows for disabled controls:

```
Drafts cannot be shared. Approve this template first.
Candidates cannot be shared. Review and approve this template first.
Rejected templates can never be shared.
Archived templates cannot newly become public.
This template is not approved yet. Approve it before sharing.
The owner has not enabled forking for this template.
This share link has been revoked.
```

## Actor perspective summary

**OWNER** — can edit private templates, share approved templates, revoke
sharing, change visibility, and archive. Cannot share drafts/candidates/rejected.

**PUBLIC / UNLISTED VIEWER** — can preview. Can fork when `allowForking` is
true. Cannot edit, approve, or change the original's visibility.

**FORK OWNER** — owns the fork as a new lineage root, can edit it, and the fork
keeps lineage to the original. The fork never mutates the original.

## Phase 7 Agency Workspace Integration

In Phase 7 (Agency Workspace v1):
- A template can be scoped to a `workspaceId` (agency-wide) or `clientId` (client-specific).
- `canShareWorkspaceTemplate(user, template, workspace)` checks that the user is an `owner` or `admin` of the workspace.
- `forkTemplateRecord` accepts `workspaceId?: string; clientId?: string;`, allowing public or shared templates to be directly imported/forked into an agency workspace or client library.
- Client-scoped templates are strictly isolated and never leaked across sibling clients.

## Tests

`tests/template-sharing.test.ts` covers every rule above, including stranger
sharing denial, viewer edit denial, and fork-when-disabled denial.
