import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { FORMA_EDITORIAL_REPORT } from "../src/domain/template-family/builtin/editorialReport.js";
import {
  createTemplateFamilyRecord,
  type TemplateFamilyRecord,
} from "../src/domain/template-authoring/index.js";

test("hosted template sharing: share, unlisted read, fork, revoke", async () => {
  const app = await createApp({ dbPath: ":memory:", mode: "local" });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;

  const makeClient = () => {
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
      const setCookie = r.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];
      return { status: r.status, data: await r.json() };
    };
    const register = async (name: string, email: string) => {
      const res = await call("/auth/register", "POST", {
        name,
        email,
        password: "long-password-123",
      });
      csrf = res.data.csrfToken;
      return res;
    };
    return { call, register };
  };

  try {
    const owner = makeClient();
    const ownerRes = await owner.register("Owner", "share-owner@example.test");
    assert.equal(ownerRes.status, 201);

    // Guest cannot write a record.
    const anon = makeClient();
    const approved: TemplateFamilyRecord = createTemplateFamilyRecord({
      family: FORMA_EDITORIAL_REPORT,
      source: "builtin",
    });

    // Owner saves an approved record.
    const saved = await owner.call(`/template-families/${approved.id}`, "PUT", {
      record: approved,
    });
    assert.ok([200, 201].includes(saved.status), JSON.stringify(saved.data));

    // Draft records cannot be shared.
    const draft = createTemplateFamilyRecord({
      family: FORMA_EDITORIAL_REPORT,
      source: "manual",
      name: "Draft that must not share",
    });
    await owner.call(`/template-families/${draft.id}`, "PUT", {
      record: draft,
    });
    const draftShare = await owner.call(
      `/template-families/${draft.id}/share`,
      "POST",
      { visibility: "unlisted" },
    );
    assert.equal(draftShare.status, 403);

    // Non-owner cannot share.
    const stranger = makeClient();
    await stranger.register("Stranger", "share-stranger@example.test");
    const strangerShare = await stranger.call(
      `/template-families/${approved.id}/share`,
      "POST",
      { visibility: "unlisted" },
    );
    assert.equal(strangerShare.status, 404);

    // Owner shares unlisted with forking enabled.
    const share = await owner.call(
      `/template-families/${approved.id}/share`,
      "POST",
      { visibility: "unlisted", allowForking: true, creatorName: "Owner" },
    );
    assert.equal(share.status, 200, JSON.stringify(share.data));
    const token: string = share.data.shareToken;
    assert.ok(token && token.length === 48);

    // Anonymous read of the share link, sanitized.
    const anonRead = await anon.call(`/template-families/shared/${token}`);
    assert.equal(anonRead.status, 200);
    assert.equal(anonRead.data.template.name, approved.name);
    assert.ok(anonRead.data.template.layoutCount > 0);
    assert.ok(anonRead.data.template.allowForking);
    assert.equal(anonRead.data.template.allowForking, true);
    const serialized = JSON.stringify(anonRead.data);
    for (const forbidden of ["ownerId", "reviewedLayouts", "usage"])
      assert.ok(!serialized.includes(forbidden), `leaked ${forbidden}`);

    // Unknown token fails.
    assert.equal(
      (await anon.call(`/template-families/shared/${"0".repeat(48)}`)).status,
      404,
    );

    // A different user forks the shared template.
    const forker = makeClient();
    await forker.register("Forker", "share-forker@example.test");
    const fork = await forker.call(
      `/template-families/${approved.id}/fork`,
      "POST",
      { token },
    );
    assert.equal(fork.status, 201, JSON.stringify(fork.data));
    assert.equal(fork.data.record.source, "forked");
    assert.equal(
      fork.data.record.forkedFrom.forkedFromTemplateId,
      approved.templateId,
    );
    assert.notEqual(fork.data.record.id, approved.id);

    // The forker's library now contains the fork.
    const library = await forker.call("/template-families");
    const ids = (library.data.templateFamilies || []).map(
      (r: TemplateFamilyRecord) => r.id,
    );
    assert.ok(ids.includes(fork.data.record.id));

    // Owner revokes → the link stops resolving (404).
    const revoke = await owner.call(
      `/template-families/${approved.id}/revoke-share`,
      "POST",
    );
    assert.equal(revoke.status, 200);
    assert.equal(
      (await anon.call(`/template-families/shared/${token}`)).status,
      404,
    );

    // Existing fork survives revocation.
    const stillThere = await forker.call("/template-families");
    assert.ok(
      (stillThere.data.templateFamilies || []).some(
        (r: TemplateFamilyRecord) => r.id === fork.data.record.id,
      ),
    );

    // Public gallery is empty because nothing is public.
    const gallery = await anon.call("/template-families/public");
    assert.equal(gallery.status, 200);
    assert.equal(gallery.data.templates.length, 0);
  } finally {
    server.close();
  }
});
