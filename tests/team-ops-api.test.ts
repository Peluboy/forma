import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { createProject } from "../src/domain/design/model.js";

test("team workspaces: cross-workspace denial, pinned publish, authenticated approval, audit recovery", async () => {
  const app = await createApp({ dbPath: ":memory:", mode: "local" });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  let cookie = "",
    csrf = "";
  const call = async (
    path: string,
    method = "GET",
    body?: any,
    session?: { cookie: string; csrf: string },
  ) => {
    const s = session || { cookie, csrf };
    const r = await fetch(base + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Cookie: s.cookie,
        "X-CSRF-Token": s.csrf,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0] || "",
    };
  };
  try {
    const ownerReg = await call("/auth/register", "POST", {
      name: "Owner",
      email: "team-owner@example.test",
      password: "long-password-123",
    });
    assert.equal(ownerReg.status, 201);
    cookie = ownerReg.cookie;
    csrf = ownerReg.data.csrfToken;
    const owner = { cookie, csrf };

    const editorReg = await call("/auth/register", "POST", {
      name: "Editor",
      email: "team-editor@example.test",
      password: "long-password-123",
    });
    assert.equal(editorReg.status, 201);
    const editor = {
      cookie: editorReg.cookie,
      csrf: editorReg.data.csrfToken,
    };

    const outsiderReg = await call("/auth/register", "POST", {
      name: "Outsider",
      email: "team-out@example.test",
      password: "long-password-123",
    });
    assert.equal(outsiderReg.status, 201);
    const outsider = {
      cookie: outsiderReg.cookie,
      csrf: outsiderReg.data.csrfToken,
    };

    const ws = await call(
      "/workspaces",
      "POST",
      { name: "Launch team" },
      owner,
    );
    assert.equal(ws.status, 201);
    const workspaceId = ws.data.workspace.id;

    assert.equal(
      (await call(`/workspaces/${workspaceId}`, "GET", undefined, outsider))
        .status,
      403,
    );

    const invite = await call(
      `/workspaces/${workspaceId}/members`,
      "POST",
      { email: "team-editor@example.test", role: "editor" },
      owner,
    );
    assert.equal(invite.status, 201);
    assert.equal(
      (await call(`/workspaces/${workspaceId}`, "GET", undefined, editor))
        .status,
      200,
    );

    const project = createProject();
    project.name = "Pinned campaign";
    assert.equal(
      (
        await call(
          `/projects/${project.id}`,
          "PUT",
          { project, expectedVersion: 0 },
          editor,
        )
      ).status,
      200,
    );

    const pub = await call(
      `/workspaces/${workspaceId}/publish`,
      "POST",
      {
        kind: "project",
        sourceId: project.id,
        pinnedVersion: 1,
        name: project.name,
        snapshot: project,
      },
      editor,
    );
    assert.equal(pub.status, 201);
    assert.equal(pub.data.publication.pinnedVersion, 1);

    assert.equal(
      (
        await call(
          `/workspaces/${workspaceId}/publications`,
          "GET",
          undefined,
          outsider,
        )
      ).status,
      403,
    );
    const pubs = await call(
      `/workspaces/${workspaceId}/publications`,
      "GET",
      undefined,
      editor,
    );
    assert.equal(pubs.status, 200);
    assert.equal(pubs.data.publications.length, 1);

    const review = await call(
      `/projects/${project.id}/reviews`,
      "POST",
      {
        expiresInDays: 7,
        requireAuthenticatedApproval: true,
        workspaceId,
      },
      editor,
    );
    assert.equal(review.status, 201);
    assert.equal(review.data.requireAuthenticatedApproval, true);

    assert.equal(
      (
        await call(`/reviews/${review.data.token}/status`, "POST", {
          author: "Fake Name",
          status: "approved",
        })
      ).status,
      401,
    );

    const decision = await call(
      `/reviews/${review.data.token}/decision`,
      "POST",
      { status: "approved" },
      editor,
    );
    assert.equal(decision.status, 200);
    assert.equal(decision.data.status, "approved");
    assert.equal(
      decision.data.decision.decidedBy.email,
      "team-editor@example.test",
    );

    const deniedDecision = await call(
      `/reviews/${review.data.token}/decision`,
      "POST",
      { status: "changes_requested" },
      outsider,
    );
    assert.equal(deniedDecision.status, 403);

    const audit = await call(
      `/workspaces/${workspaceId}/audit`,
      "GET",
      undefined,
      editor,
    );
    assert.equal(audit.status, 200);
    assert.ok(
      audit.data.audit.some((e: any) => e.action === "workspace.publish"),
    );
    assert.ok(
      audit.data.audit.some((e: any) => e.action === "review.decision"),
    );
    assert.equal(audit.data.recovery.memberships.length, 2);
  } finally {
    server.close();
  }
});
