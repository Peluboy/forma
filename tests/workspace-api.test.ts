import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";

test("workspace & client API: CRUD, membership, scoping, and isolation", async () => {
  const app = await createApp({ dbPath: ":memory:", mode: "local" });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;

  const call = async (
    path: string,
    method = "GET",
    body?: any,
    session?: { cookie: string; csrf: string },
  ) => {
    const s = session || { cookie: "", csrf: "" };
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
    // 1. Register owner
    const regOwner = await call("/auth/register", "POST", {
      name: "Agency Owner",
      email: "agency-owner@forma.test",
      password: "secure-agency-pass-123",
    });
    assert.equal(regOwner.status, 201);
    const ownerSession = {
      cookie: regOwner.cookie,
      csrf: regOwner.data.csrfToken,
    };

    // 2. Register stranger
    const regStranger = await call("/auth/register", "POST", {
      name: "Stranger User",
      email: "stranger@other.test",
      password: "secure-other-pass-123",
    });
    assert.equal(regStranger.status, 201);
    const strangerSession = {
      cookie: regStranger.cookie,
      csrf: regStranger.data.csrfToken,
    };

    // 3. Create agency workspace
    const createWs = await call(
      "/workspaces",
      "POST",
      {
        name: "Apex Studio",
        type: "agency",
        description: "Premier creative agency",
        settings: {
          defaultProjectVisibility: "workspace",
          allowTemplateSharing: true,
        },
      },
      ownerSession,
    );
    assert.equal(createWs.status, 201);
    assert.equal(createWs.data.workspace.name, "Apex Studio");
    assert.equal(createWs.data.workspace.type, "agency");
    const workspaceId = createWs.data.workspace.id;

    // 4. Stranger cannot view or edit Apex Studio
    const strangerGet = await call(
      `/workspaces/${workspaceId}`,
      "GET",
      undefined,
      strangerSession,
    );
    assert.equal(strangerGet.status, 403);

    // 5. Update workspace details
    const updateWs = await call(
      `/workspaces/${workspaceId}`,
      "PUT",
      {
        name: "Apex Creative Agency",
        description: "Updated description",
      },
      ownerSession,
    );
    assert.equal(updateWs.status, 200);
    assert.equal(updateWs.data.workspace.name, "Apex Creative Agency");

    // 6. Create client under Apex Creative Agency
    const createClient = await call(
      `/workspaces/${workspaceId}/clients`,
      "POST",
      {
        name: "Nexus Health",
        notes: "Healthcare tech client",
      },
      ownerSession,
    );
    assert.equal(createClient.status, 201);
    assert.equal(createClient.data.client.name, "Nexus Health");
    assert.equal(createClient.data.client.workspaceId, workspaceId);
    assert.equal(createClient.data.client.status, "active");
    const clientId = createClient.data.client.id;

    // 7. Stranger cannot view client
    const strangerClientGet = await call(
      `/clients/${clientId}`,
      "GET",
      undefined,
      strangerSession,
    );
    assert.equal(strangerClientGet.status, 403);

    // 8. List clients for workspace
    const listClients = await call(
      `/workspaces/${workspaceId}/clients`,
      "GET",
      undefined,
      ownerSession,
    );
    assert.equal(listClients.status, 200);
    assert.equal(listClients.data.clients.length, 1);
    assert.equal(listClients.data.clients[0].id, clientId);

    // 9. Update client
    const updateClient = await call(
      `/clients/${clientId}`,
      "PUT",
      {
        name: "Nexus Healthcare Systems",
      },
      ownerSession,
    );
    assert.equal(updateClient.status, 200);
    assert.equal(updateClient.data.client.name, "Nexus Healthcare Systems");

    // 10. Archive client
    const archiveClient = await call(
      `/clients/${clientId}/archive`,
      "POST",
      undefined,
      ownerSession,
    );
    assert.equal(archiveClient.status, 200);
    assert.equal(archiveClient.data.client.status, "archived");

    // 11. Delete client
    const deleteClient = await call(
      `/clients/${clientId}`,
      "DELETE",
      undefined,
      ownerSession,
    );
    assert.equal(deleteClient.status, 200);

    const clientAfterDelete = await call(
      `/clients/${clientId}`,
      "GET",
      undefined,
      ownerSession,
    );
    assert.equal(clientAfterDelete.status, 404);
  } finally {
    server.close();
  }
});
