import test from "node:test";
import assert from "node:assert/strict";
import {
  addWorkspaceMember,
  assertWorkspaceAccess,
  canPerform,
  createAuditEvent,
  createPublication,
  createWorkspace,
  memberRole,
  recoverMemberships,
  removeWorkspaceMember,
} from "../src/domain/team/teamOps.js";

test("workspace roles enforce view/publish/approve/manage boundaries", () => {
  const ws = createWorkspace({
    id: "ws-1",
    name: "Studio",
    owner: { userId: "o1", email: "o@ex.test", name: "Owner" },
    now: "2026-10-01T00:00:00.000Z",
  });
  const withEditor = addWorkspaceMember(
    ws,
    {
      userId: "e1",
      email: "e@ex.test",
      name: "Editor",
      role: "editor",
    },
    "o1",
  );
  const withReviewer = addWorkspaceMember(
    withEditor,
    {
      userId: "r1",
      email: "r@ex.test",
      name: "Reviewer",
      role: "reviewer",
    },
    "o1",
  );
  assert.equal(memberRole(withReviewer, "outsider"), null);
  assert.equal(canPerform(null, "view"), false);
  assert.equal(canPerform("viewer", "publish"), false);
  assert.equal(canPerform("reviewer", "approve"), true);
  assert.equal(canPerform("editor", "publish"), true);
  assert.equal(canPerform("editor", "manage_members"), false);
  assert.throws(
    () => assertWorkspaceAccess(withReviewer, "outsider", "view"),
    /not a member/,
  );
  assert.throws(
    () => assertWorkspaceAccess(withReviewer, "r1", "publish"),
    /cannot perform/,
  );
  assert.equal(assertWorkspaceAccess(withReviewer, "e1", "publish"), "editor");
});

test("cross-workspace denial and scoped pinned publishing", () => {
  const a = createWorkspace({
    id: "ws-a",
    name: "A",
    owner: { userId: "a1", email: "a@ex.test", name: "A" },
  });
  const b = createWorkspace({
    id: "ws-b",
    name: "B",
    owner: { userId: "b1", email: "b@ex.test", name: "B" },
  });
  assert.throws(() => assertWorkspaceAccess(a, "b1", "view"), /not a member/);
  assert.throws(() => assertWorkspaceAccess(b, "a1", "view"), /not a member/);
  const pub = createPublication({
    id: "pub-1",
    workspace: a,
    actor: { userId: "a1", email: "a@ex.test", name: "A" },
    kind: "template",
    sourceId: "tpl-1",
    pinnedVersion: 3,
    name: "Event flyer",
    snapshot: { id: "tpl-1", version: 3 },
  });
  assert.equal(pub.workspaceId, "ws-a");
  assert.equal(pub.pinnedVersion, 3);
  assert.deepEqual(pub.snapshot, { id: "tpl-1", version: 3 });
  assert.throws(
    () =>
      createPublication({
        id: "pub-x",
        workspace: a,
        actor: { userId: "b1", email: "b@ex.test", name: "B" },
        kind: "template",
        sourceId: "tpl-1",
        pinnedVersion: 1,
        name: "Steal",
        snapshot: {},
      }),
    /not a member|cannot perform/,
  );
});

test("audit events and membership recovery", () => {
  let ws = createWorkspace({
    id: "ws-r",
    name: "Recover",
    owner: { userId: "o1", email: "o@ex.test", name: "Owner" },
  });
  ws = addWorkspaceMember(
    ws,
    {
      userId: "m1",
      email: "m@ex.test",
      name: "Member",
      role: "viewer",
    },
    "o1",
  );
  const event = createAuditEvent({
    id: "aud-1",
    workspaceId: ws.id,
    actor: { userId: "o1", email: "o@ex.test", name: "Owner" },
    action: "workspace.member.add",
    target: "m1",
    detail: { role: "viewer" },
  });
  assert.equal(event.action, "workspace.member.add");
  const recovered = recoverMemberships(ws);
  assert.equal(recovered.length, 2);
  assert.deepEqual(recovered.map((m) => m.role).sort(), ["owner", "viewer"]);
  ws = removeWorkspaceMember(ws, "m1", "o1");
  assert.equal(recoverMemberships(ws).length, 1);
  assert.throws(() => removeWorkspaceMember(ws, "o1", "o1"), /owner/);
});
