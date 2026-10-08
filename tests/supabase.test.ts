import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createProject } from "../src/domain/design/model.ts";
import { emptyBilling } from "../server/billing/store.ts";

test("onboarding preferences are owner-only and constrained in PostgreSQL", async () => {
  const db = new PGlite();
  const owner = "11111111-1111-4111-8111-111111111111",
    other = "22222222-2222-4222-8222-222222222222";
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated; insert into auth.users values('${owner}'),('${other}');`,
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609240003_preferences.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      owner,
    ]);
    await db.exec("set role authenticated");
    await db.query(
      "insert into public.forma_preferences(owner_id,purpose,start,completed) values($1,'client','reference',true)",
      [owner],
    );
    await assert.rejects(
      db.query("insert into public.forma_preferences(owner_id) values($1)", [
        other,
      ]),
      /row-level security/,
    );
    await assert.rejects(
      db.query("update public.forma_preferences set purpose='admin'"),
      /check constraint/,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      other,
    ]);
    await db.exec("set role authenticated");
    assert.equal(
      (await db.query("select * from public.forma_preferences")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("delete from public.forma_preferences")).affectedRows,
      0,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.query("select * from public.forma_preferences"),
      /permission denied/,
    );
    await db.exec(`reset role; delete from auth.users where id='${owner}'`);
    assert.equal(
      (await db.query("select * from public.forma_preferences")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});

test("billing SQL denies client access and atomically compares versions for service writes", async () => {
  const db = new PGlite();
  const owner = "11111111-1111-4111-8111-111111111111";
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${owner}');`,
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609240002_billing.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select * from public.forma_billing"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.forma_billing_save($1,0,$2::jsonb)", [
        owner,
        JSON.stringify(emptyBilling()),
      ]),
      /permission denied/,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.query("select public.forma_billing_save($1,0,$2::jsonb)", [
        owner,
        JSON.stringify(emptyBilling()),
      ]),
      /permission denied/,
    );
    await db.exec("reset role; set role service_role");
    const save = async (version: number, data = emptyBilling()) =>
      (
        await db.query<{ forma_billing_save: boolean }>(
          "select public.forma_billing_save($1,$2,$3::jsonb)",
          [owner, version, JSON.stringify(data)],
        )
      ).rows[0].forma_billing_save;
    assert.equal(await save(0), true);
    assert.equal(await save(0), false);
    const changed = emptyBilling();
    changed.usage = { month: "2026-09", count: 1 };
    assert.equal(await save(1, changed), true);
    assert.equal(await save(1), false);
    const row = (
      await db.query<{ data: any; version: number }>(
        "select * from public.forma_billing",
      )
    ).rows[0];
    assert.equal(row.version, 2);
    assert.equal(row.data.usage.count, 1);
    await db.exec(`reset role; delete from auth.users where id='${owner}'`);
    assert.equal(
      (await db.query("select * from public.forma_billing")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});

test("Supabase SQL executes with owner RLS, atomic versions, immutable reviews, quotas and deletion", async () => {
  const db = new PGlite();
  const owner = "11111111-1111-4111-8111-111111111111",
    other = "22222222-2222-4222-8222-222222222222";
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${owner}'),('${other}');`,
    );
    const migration = await readFile(
      new URL("../supabase/migrations/202609240001_forma.sql", import.meta.url),
      "utf8",
    );
    await db.exec(migration);
    async function asUser(id: string | null) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id || "",
      ]);
      await db.exec(`set role ${id ? "authenticated" : "anon"}`);
    }
    const project = createProject();
    await asUser(owner);
    const saved = await db.query<{ forma_save: { version: number } }>(
      "select public.forma_save($1,$2,$3::jsonb,$4)",
      ["project", project.id, JSON.stringify(project), 0],
    );
    assert.equal(saved.rows[0].forma_save.version, 1);
    await assert.rejects(
      db.query("select public.forma_save($1,$2,$3::jsonb,$4)", [
        "project",
        project.id,
        JSON.stringify(project),
        0,
      ]),
      /VERSION_CONFLICT/,
    );
    await assert.rejects(
      db.query("update public.forma_records set version=99 where id=$1", [
        project.id,
      ]),
      /permission denied/,
    );
    const token = "a".repeat(48);
    await db.query("select public.forma_save($1,$2,$3::jsonb,$4)", [
      "review",
      token,
      JSON.stringify({
        projectId: project.id,
        project: { name: "forged" },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }),
      0,
    ]);
    await db.query("select public.forma_save($1,$2,$3::jsonb,$4)", [
      "project",
      project.id,
      JSON.stringify({ ...project, name: "Changed later" }),
      1,
    ]);
    await asUser(other);
    assert.equal(
      (await db.query("select * from public.forma_records")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select public.forma_save($1,$2,$3::jsonb,$4)", [
        "project",
        project.id,
        JSON.stringify(project),
        2,
      ]),
      /NOT_FOUND/,
    );
    await asUser(null);
    const snapshot = await db.query<{
      forma_review: { project: { name: string }; status: string };
    }>("select public.forma_review($1)", [token]);
    assert.equal(snapshot.rows[0].forma_review.project.name, project.name);
    await assert.rejects(
      db.query("select * from public.forma_records"),
      /permission denied/,
    );
    const approved = await db.query<{ forma_review: { status: string } }>(
      "select public.forma_review($1,$2,$3::jsonb)",
      [
        token,
        "status",
        JSON.stringify({ author: "Client", status: "approved" }),
      ],
    );
    assert.equal(approved.rows[0].forma_review.status, "approved");
    await assert.rejects(
      db.query("select public.forma_review($1,$2,$3::jsonb)", [
        token,
        "status",
        JSON.stringify({ author: "Client", status: "anything" }),
      ]),
      /INVALID_INPUT/,
    );
    await asUser(owner);
    for (let i = 0; i < 10; i++)
      await db.query("select public.forma_consume_analysis()");
    await assert.rejects(
      db.query("select public.forma_consume_analysis()"),
      /QUOTA_EXCEEDED/,
    );
    await db.query("select public.forma_remove($1,$2)", [
      "project",
      project.id,
    ]);
    assert.equal(
      (await db.query("select * from public.forma_records")).rows.length,
      0,
    );
    await asUser(null);
    await assert.rejects(
      db.query("select public.forma_review($1)", [token]),
      /NOT_FOUND/,
    );
  } finally {
    await db.close();
  }
});

test("hosted migration saves owner-only templates/skills and enforces review approval identity", async () => {
  const db = new PGlite();
  const owner = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${owner}'),('${other}');`,
    );
    for (const file of [
      "202609240001_forma.sql",
      "202610040001_records_and_reviews.sql",
      "202610080001_template_family_kind.sql",
    ])
      await db.exec(
        await readFile(
          new URL(`../supabase/migrations/${file}`, import.meta.url),
          "utf8",
        ),
      );
    async function asUser(id: string | null) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id || "",
      ]);
      await db.exec(`set role ${id ? "authenticated" : "anon"}`);
    }
    const save = async (kind: string, id: string, data: object, version = 0) =>
      db.query("select public.forma_save($1,$2,$3::jsonb,$4)", [
        kind,
        id,
        JSON.stringify(data),
        version,
      ]);
    await asUser(owner);
    const project = createProject();
    await save("project", project.id, project);
    await save("template", "tpl-1", { id: "tpl-1", name: "Template" });
    await save("skill", "skill-1", { id: "skill-1", name: "Skill" });
    assert.equal(
      (
        await db.query(
          "select * from public.forma_records where kind in ('template','skill')",
        )
      ).rows.length,
      2,
    );
    await save("template_family", "tf-1", { id: "tf-1", name: "Record" });
    assert.equal(
      (
        await db.query(
          "select * from public.forma_records where kind='template_family'",
        )
      ).rows.length,
      1,
    );
    await db.query("select public.forma_remove('template_family','tf-1')");
    assert.equal(
      (
        await db.query(
          "select * from public.forma_records where kind='template_family'",
        )
      ).rows.length,
      0,
    );
    await assert.rejects(save("workspace", "ws-1", {}), /INVALID_INPUT/);
    const secure = "s".repeat(48);
    const open = "o".repeat(48);
    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    await save("review", secure, {
      projectId: project.id,
      expiresAt,
      requireAuthenticatedApproval: true,
    });
    await save("review", open, {
      projectId: project.id,
      expiresAt,
      requireAuthenticatedApproval: false,
    });
    await assert.rejects(
      save("review", "w".repeat(48), {
        projectId: project.id,
        expiresAt,
        workspaceId: "unavailable",
      }),
      /INVALID_INPUT/,
    );
    await asUser(other);
    assert.equal(
      (
        await db.query(
          "select * from public.forma_records where kind in ('template','skill')",
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      save("template", "tpl-1", { name: "Stolen" }, 1),
      /NOT_FOUND/,
    );
    await asUser(null);
    const read = await db.query<{
      forma_review: { requireAuthenticatedApproval: boolean };
    }>("select public.forma_review($1)", [secure]);
    assert.equal(read.rows[0].forma_review.requireAuthenticatedApproval, true);
    await db.query("select public.forma_review($1,$2,$3::jsonb)", [
      secure,
      "comment",
      JSON.stringify({ author: "Visitor", body: "Please review" }),
    ]);
    await assert.rejects(
      db.query("select public.forma_review($1,$2,$3::jsonb)", [
        secure,
        "status",
        JSON.stringify({
          author: "Visitor",
          status: "approved",
          authenticated: true,
        }),
      ]),
      /AUTH_REQUIRED/,
    );
    const anonymousApproval = await db.query<{
      forma_review: { status: string };
    }>("select public.forma_review($1,$2,$3::jsonb)", [
      open,
      "status",
      JSON.stringify({ author: "Visitor", status: "approved" }),
    ]);
    assert.equal(anonymousApproval.rows[0].forma_review.status, "approved");
    await assert.rejects(
      db.query("select public.forma_review($1)", ["bad"]),
      /NOT_FOUND/,
    );
    await asUser(other);
    const authenticated = await db.query<{
      forma_review: {
        status: string;
        decision: { decidedBy: { userId: string } };
      };
    }>("select public.forma_review($1,$2,$3::jsonb)", [
      secure,
      "status",
      JSON.stringify({
        author: "Reviewer",
        status: "changes_requested",
        userId: owner,
      }),
    ]);
    assert.equal(
      authenticated.rows[0].forma_review.status,
      "changes_requested",
    );
    assert.equal(
      authenticated.rows[0].forma_review.decision.decidedBy.userId,
      other,
    );
    await asUser(owner);
    await db.query("select public.forma_remove($1,$2)", ["template", "tpl-1"]);
    await db.query("select public.forma_remove($1,$2)", ["skill", "skill-1"]);
    assert.equal(
      (
        await db.query(
          "select * from public.forma_records where kind in ('template','skill')",
        )
      ).rows.length,
      0,
    );
    await db.exec("reset role");
    await db.query(
      "update public.forma_records set data=jsonb_set(data,'{expiresAt}',to_jsonb($1::text)) where id=$2",
      [new Date(Date.now() - 86400000).toISOString(), secure],
    );
    await asUser(null);
    await assert.rejects(
      db.query("select public.forma_review($1)", [secure]),
      /NOT_FOUND/,
    );
  } finally {
    await db.close();
  }
});
