import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createApp } from "../server/app.js";
import { createProject } from "../src/domain/design/model.js";
const url = process.env.SUPABASE_URL!,
  key = process.env.SUPABASE_ANON_KEY!;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const created: string[] = [];
const app = await createApp({ mode: "supabase" });
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((r) => server.on("listening", r));
const address = server.address() as { port: number };
async function call(
  token: string,
  path: string,
  method = "GET",
  body?: unknown,
) {
  const r = await fetch(`http://127.0.0.1:${address.port}/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json() };
}
try {
  const tokens: string[] = [];
  for (let i = 0; i < 2; i++) {
    const email = `forma-verification-${crypto.randomUUID()}@example.test`,
      password = crypto.randomUUID() + "Aa1!";
    const user = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Temporary Forma verification" },
    });
    assert(!user.error, "Test-user creation failed");
    created.push(user.data.user!.id);
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const session = await client.auth.signInWithPassword({ email, password });
    assert(!session.error, "Hosted password login failed");
    tokens.push(session.data.session!.access_token);
  }
  const project = createProject();
  project.name = "Temporary cloud verification";
  assert.equal(
    (
      await call(tokens[0], "/projects/" + project.id, "PUT", {
        project,
        expectedVersion: 0,
      })
    ).status,
    200,
  );
  const read = await call(tokens[0], "/projects/" + project.id);
  assert.equal(read.status, 200);
  assert.equal(read.body.project.name, project.name);
  assert.equal((await call(tokens[1], "/projects/" + project.id)).status, 404);
  assert.equal(
    (
      await call(tokens[1], "/projects/" + project.id, "PUT", {
        project,
        expectedVersion: 0,
      })
    ).status,
    404,
  );
  const list = await call(tokens[1], "/projects");
  assert.equal(list.status, 200);
  assert.equal(list.body.projects.length, 0);
  assert.equal(
    (
      await call(tokens[0], "/account/preferences", "PUT", {
        purpose: "business",
        start: "reference",
        completed: true,
      })
    ).status,
    200,
  );
  const pref = await call(tokens[0], "/account/preferences");
  assert.equal(pref.body.purpose, "business");
  const other = await call(tokens[1], "/account/preferences");
  assert.equal(other.body.completed, false);
  console.log(
    "PASS: hosted password login, API project save/reload, cross-account read/write denial, and isolated preferences.",
  );
} catch (e) {
  console.error(
    "Cloud verification failed: " +
      (e instanceof assert.AssertionError
        ? e.message
        : "provider or connection failure"),
  );
  process.exitCode = 1;
} finally {
  for (const id of created) {
    const r = await admin.auth.admin.deleteUser(id);
    if (r.error) {
      console.error(
        "Temporary account cleanup failed; inspect verification accounts.",
      );
      process.exitCode = 1;
    }
  }
  server.close();
  app.locals.close?.();
  console.log("Temporary account cleanup finished.");
}
