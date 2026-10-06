import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { createProject } from "../src/domain/design/model.js";
test("local API auth, ownership, atomic history, immutable reviews, recovery and account deletion", async () => {
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
    extra: any = {},
  ) => {
    const r = await fetch(base + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "X-CSRF-Token": csrf,
        ...extra,
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
    assert.equal((await call("/projects")).status, 401);
    const a = await call("/auth/register", "POST", {
      name: "Owner",
      email: "owner@example.test",
      password: "long-password-123",
    });
    assert.equal(a.status, 201);
    cookie = a.cookie;
    csrf = a.data.csrfToken;
    const ownerCookie = cookie,
      ownerCsrf = csrf;
    assert.equal(
      (await call("/session")).data.user.email,
      "owner@example.test",
    );
    const p = createProject();
    p.graphicLayers = [
      {
        id: "graphic-api",
        name: "Rectangle",
        type: "shape",
        shape: "rectangle",
        color: "#112233",
        layout: { x: 10, y: 10, width: 200, height: 100, locked: false },
      },
    ];
    p.textLayers = [
      {
        id: "layer-api",
        text: "Approved additional copy",
        layout: {
          x: 60,
          y: 60,
          width: 300,
          height: 100,
          size: 24,
          locked: false,
        },
      },
    ];
    assert.equal(
      (
        await call(
          "/projects/" + p.id,
          "PUT",
          { project: p, expectedVersion: 0 },
          { "X-CSRF-Token": "wrong" },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          "/projects/" + p.id,
          "PUT",
          { project: p, expectedVersion: 0 },
          { Origin: "https://evil.test" },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call("/projects/" + p.id, "PUT", {
          project: p,
          expectedVersion: 0,
        })
      ).data.version,
      1,
    );
    assert.equal(
      (
        await call("/projects/" + p.id, "PUT", {
          project: p,
          expectedVersion: 0,
        })
      ).status,
      409,
    );
    const link = await call("/projects/" + p.id + "/reviews", "POST", {
      expiresInDays: 7,
    });
    assert.equal(link.status, 201);
    assert.deepEqual(
      (await call("/projects/" + p.id)).data.project.graphicLayers,
      p.graphicLayers,
    );
    assert.equal(
      (
        await call("/projects/" + p.id, "PUT", {
          project: {
            ...p,
            graphicLayers: [
              {
                ...p.graphicLayers[0],
                type: "image",
                src: "https://example.test/a.png",
              },
            ],
          },
          expectedVersion: 1,
        })
      ).status,
      400,
    );
    assert.deepEqual(
      (await call("/projects/" + p.id)).data.project.textLayers,
      p.textLayers,
    );
    assert.equal(
      (
        await call("/projects/" + p.id, "PUT", {
          project: {
            ...p,
            textLayers: [
              {
                ...p.textLayers[0],
                layout: { ...p.textLayers[0].layout, size: -1 },
              },
            ],
          },
          expectedVersion: 1,
        })
      ).status,
      400,
    );
    const updated = { ...p, name: "Changed" };
    assert.equal(
      (
        await call("/projects/" + p.id, "PUT", {
          project: updated,
          expectedVersion: 1,
        })
      ).data.version,
      2,
    );
    const revisions = (await call("/projects/" + p.id + "/revisions")).data
      .revisions;
    assert.equal(revisions.length, 2);
    assert.equal(
      (await call("/projects/" + p.id + "/revisions/" + revisions[1].id)).data
        .project.name,
      p.name,
    );
    assert.equal(
      (
        await call("/brand", "PUT", {
          name: "Brand",
          primary: "#112233",
          secondary: "#abcdef",
        })
      ).status,
      200,
    );
    cookie = "";
    csrf = "";
    const b = await call("/auth/register", "POST", {
      name: "Other",
      email: "other@example.test",
      password: "long-password-123",
    });
    cookie = b.cookie;
    csrf = b.data.csrfToken;
    assert.equal((await call("/projects")).data.projects.length, 0);
    assert.equal(
      (
        await call("/projects/" + p.id, "PUT", {
          project: p,
          expectedVersion: 2,
        })
      ).status,
      404,
    );
    assert.equal(
      (await call("/projects/" + p.id + "/revisions/" + revisions[0].id))
        .status,
      404,
    );
    cookie = "";
    csrf = "";
    assert.equal(
      (await call("/reviews/" + link.data.token)).data.project.name,
      p.name,
    );
    assert.deepEqual(
      (await call("/reviews/" + link.data.token)).data.project.textLayers,
      p.textLayers,
    );
    assert.deepEqual(
      (await call("/reviews/" + link.data.token)).data.project.graphicLayers,
      p.graphicLayers,
    );
    assert.equal(
      (
        await call("/reviews/" + link.data.token + "/comments", "POST", {
          author: "Client",
          body: "Great design",
        })
      ).data.comments.length,
      1,
    );
    assert.equal(
      (
        await call("/reviews/" + link.data.token + "/status", "POST", {
          author: "Client",
          status: "approved",
        })
      ).data.status,
      "approved",
    );
    cookie = ownerCookie;
    csrf = ownerCsrf;
    assert.equal(
      (
        await call(
          "/projects/" + p.id + "/reviews/" + link.data.token,
          "DELETE",
        )
      ).status,
      200,
    );
    assert.equal((await call("/reviews/" + link.data.token)).status, 404);
    const recovered = await call("/auth/recover", "POST", {
      email: "owner@example.test",
      recoveryCode: a.data.recoveryCode,
      password: "new-password-123",
    });
    assert.equal(recovered.status, 200);
    assert.equal((await call("/projects")).status, 401);
    assert.equal(
      (
        await call("/auth/recover", "POST", {
          email: "owner@example.test",
          recoveryCode: a.data.recoveryCode,
          password: "new-password-123",
        })
      ).status,
      401,
    );
    const login = await call("/auth/login", "POST", {
      email: "owner@example.test",
      password: "new-password-123",
    });
    cookie = login.cookie;
    csrf = login.data.csrfToken;
    assert.equal((await call("/projects")).data.projects.length, 1);
    assert.equal((await call("/account", "DELETE")).status, 200);
    assert.equal((await call("/projects")).status, 401);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    app.locals.close();
  }
});
test("Vercel never starts a local SQLite fallback", async () => {
  const old = process.env.VERCEL;
  process.env.VERCEL = "1";
  try {
    await assert.rejects(
      createApp({ mode: "local", dbPath: ":memory:" }),
      /Vercel requires/,
    );
  } finally {
    if (old === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = old;
  }
});
