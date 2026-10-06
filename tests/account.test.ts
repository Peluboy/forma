import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.ts";
import { createProject } from "../src/domain/design/model.ts";

test("account preferences, profile, password rotation, other-session revocation and private exports", async () => {
  const app = await createApp({ mode: "local", dbPath: ":memory:" });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
  let cookie = "",
    csrf = "";
  async function call(
    path: string,
    method = "GET",
    data?: unknown,
    headers = {},
  ) {
    const r = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "X-CSRF-Token": csrf,
        ...headers,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0] || "",
    };
  }
  try {
    assert.equal((await call("/account/export")).status, 401);
    assert.equal((await call("/account/preferences")).status, 401);
    const account = await call("/auth/register", "POST", {
      name: "Before",
      email: "settings@example.test",
      password: "original-password-123",
    });
    cookie = account.cookie;
    csrf = account.data.csrfToken;
    const firstCookie = cookie;
    assert.equal((await call("/account/preferences")).data.completed, false);
    assert.equal(
      (
        await call(
          "/account/profile",
          "PUT",
          { name: "After" },
          { "X-CSRF-Token": "wrong" },
        )
      ).status,
      403,
    );
    assert.equal(
      (await call("/account/profile", "PUT", { name: "After" })).data.user.name,
      "After",
    );
    assert.equal(
      (await call("/account/profile", "PUT", { name: " ", id: "another-user" }))
        .status,
      400,
    );
    assert.equal(
      (
        await call("/account/preferences", "PUT", {
          purpose: "evil",
          start: "sample",
          completed: true,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call("/account/preferences", "PUT", {
          purpose: "client",
          start: "template",
          completed: true,
        })
      ).status,
      200,
    );
    const project = createProject();
    await call(`/projects/${project.id}`, "PUT", {
      project,
      expectedVersion: 0,
    });
    const second = await call("/auth/login", "POST", {
      email: "settings@example.test",
      password: "original-password-123",
    });
    cookie = second.cookie;
    csrf = second.data.csrfToken;
    const secondCookie = cookie;
    await call("/auth/logout", "POST", { scope: "others" });
    assert.equal((await call("/session")).data.user.name, "After");
    assert.equal(
      (await call("/session", "GET", undefined, { Cookie: firstCookie })).data
        .user,
      null,
    );
    const third = await call("/auth/login", "POST", {
      email: "settings@example.test",
      password: "original-password-123",
    });
    cookie = third.cookie;
    csrf = third.data.csrfToken;
    assert.equal(
      (
        await call("/account/password", "PUT", {
          currentPassword: "wrong-password-123",
          password: "new-password-456",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call("/account/password", "PUT", {
          currentPassword: "original-password-123",
          password: "short",
        })
      ).status,
      400,
    );
    const rotated = await call("/account/password", "PUT", {
      currentPassword: "original-password-123",
      password: "new-password-456",
    });
    assert.equal(rotated.status, 200);
    cookie = rotated.cookie;
    csrf = rotated.data.csrfToken;
    assert.equal(
      (await call("/session", "GET", undefined, { Cookie: secondCookie })).data
        .user,
      null,
    );
    assert.equal(
      (await call("/session", "GET", undefined, { Cookie: third.cookie })).data
        .user,
      null,
    );
    const exported = await call("/account/export");
    assert.equal(exported.status, 200);
    assert.equal(exported.data.projects[0].data.id, project.id);
    assert.equal(exported.data.preferences.purpose, "client");
    assert.equal(exported.data.user.password, undefined);
    assert.equal(exported.data.user.recovery, undefined);
    const ownerCookie = cookie,
      ownerCsrf = csrf;
    const other = await call("/auth/register", "POST", {
      name: "Other",
      email: "settings-other@example.test",
      password: "another-password-123",
    });
    cookie = other.cookie;
    csrf = other.data.csrfToken;
    assert.equal((await call("/account/preferences")).data.completed, false);
    assert.equal((await call("/account/export")).data.projects.length, 0);
    cookie = ownerCookie;
    csrf = ownerCsrf;
    assert.equal((await call("/account/preferences")).data.purpose, "client");
    await call("/auth/logout", "POST", { scope: "global" });
    assert.equal((await call("/session")).data.user, null);
    assert.equal(
      (
        await call("/auth/login", "POST", {
          email: "settings@example.test",
          password: "original-password-123",
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await call("/auth/login", "POST", {
          email: "settings@example.test",
          password: "new-password-456",
        })
      ).status,
      200,
    );
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    app.locals.close();
  }
});
