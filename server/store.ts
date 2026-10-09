import { randomUUID } from "node:crypto";
export type RecordRow = {
  id: string;
  owner_id: string;
  kind: string;
  data: any;
  version: number;
  created_at: string;
};
export interface Store {
  list(owner: string, kind: string): Promise<RecordRow[]>;
  get(owner: string, kind: string, id: string): Promise<RecordRow | null>;
  /** Server-only lookup by kind+id after membership checks. */
  getAny?(kind: string, id: string): Promise<RecordRow | null>;
  /** Resolve an approved, unlisted/public template by its share token. */
  sharedTemplate?(token: string): Promise<RecordRow | null>;
  /** Approved, public, gallery-listed, non-revoked templates. */
  publicTemplates?(): Promise<RecordRow[]>;
  /** Resolve an approved, forkable template by public id or share token. */
  forkSource?(id: string, token?: string): Promise<RecordRow | null>;
  save(
    owner: string,
    kind: string,
    id: string,
    data: any,
    expected: number,
  ): Promise<RecordRow>;
  remove(owner: string, kind: string, id: string): Promise<void>;
  publicReview(token: string, action?: string, payload?: any): Promise<any>;
  deleteAccount(owner: string): Promise<void>;
  consumeAnalysis?(owner: string): Promise<void>;
  findUserByEmail?(
    email: string,
  ): Promise<{ id: string; name: string; email: string } | null>;
  preferences(
    owner: string,
    value?: { purpose: string; start: string; completed: boolean },
  ): Promise<{ purpose: string; start: string; completed: boolean }>;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
export async function localStore(path: string) {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,recovery TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS records(id TEXT NOT NULL,owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(id,kind));
 CREATE TABLE IF NOT EXISTS preferences(owner_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,data TEXT NOT NULL);`);
  const decode = (r: any) => (r ? { ...r, data: JSON.parse(r.data) } : null);
  const store: Store = {
    async preferences(owner, value) {
      if (value)
        db.prepare(
          "INSERT INTO preferences VALUES(?,?) ON CONFLICT(owner_id) DO UPDATE SET data=excluded.data",
        ).run(owner, JSON.stringify(value));
      const row = db
        .prepare("SELECT data FROM preferences WHERE owner_id=?")
        .get(owner) as { data: string } | undefined;
      return row
        ? JSON.parse(row.data)
        : { purpose: "personal", start: "sample", completed: false };
    },
    async list(owner, kind) {
      return db
        .prepare(
          "SELECT * FROM records WHERE owner_id=? AND kind=? ORDER BY created_at DESC",
        )
        .all(owner, kind)
        .map(decode);
    },
    async get(owner, kind, id) {
      return decode(
        db
          .prepare("SELECT * FROM records WHERE owner_id=? AND kind=? AND id=?")
          .get(owner, kind, id),
      );
    },
    async getAny(kind, id) {
      return decode(
        db.prepare("SELECT * FROM records WHERE kind=? AND id=?").get(kind, id),
      );
    },
    async sharedTemplate(token) {
      return decode(
        db
          .prepare(
            `SELECT * FROM records WHERE kind='template_family'
               AND (json_extract(data,'$.sharing.shareToken')=?
                    OR json_extract(data,'$.sharing.publicId')=?)
               AND json_extract(data,'$.status')='approved'
               AND json_extract(data,'$.sharing.revokedAt') IS NULL
               AND json_extract(data,'$.sharing.visibility') IN ('unlisted','public')
             LIMIT 1`,
          )
          .get(token, token),
      );
    },
    async publicTemplates() {
      return db
        .prepare(
          `SELECT * FROM records WHERE kind='template_family'
             AND json_extract(data,'$.status')='approved'
             AND json_extract(data,'$.sharing.visibility')='public'
             AND COALESCE(json_extract(data,'$.sharing.galleryListed'),1)<>0
             AND json_extract(data,'$.sharing.revokedAt') IS NULL
           ORDER BY created_at DESC`,
        )
        .all()
        .map(decode);
    },
    async forkSource(id, token) {
      if (token)
        return decode(
          db
            .prepare(
              `SELECT * FROM records WHERE kind='template_family'
                 AND json_extract(data,'$.sharing.shareToken')=?
                 AND json_extract(data,'$.status')='approved'
                 AND json_extract(data,'$.sharing.allowForking')=1
                 AND json_extract(data,'$.sharing.revokedAt') IS NULL
               LIMIT 1`,
            )
            .get(token),
        );
      return decode(
        db
          .prepare(
            `SELECT * FROM records WHERE kind='template_family' AND id=?
               AND json_extract(data,'$.status')='approved'
               AND json_extract(data,'$.sharing.allowForking')=1
               AND json_extract(data,'$.sharing.visibility')='public'
               AND json_extract(data,'$.sharing.revokedAt') IS NULL
             LIMIT 1`,
          )
          .get(id),
      );
    },
    async findUserByEmail(email) {
      const row = db
        .prepare("SELECT id,name,email FROM users WHERE email=?")
        .get(email.trim().toLowerCase()) as
        { id: string; name: string; email: string } | undefined;
      return row || null;
    },
    async save(owner, kind, id, data, expected) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const old: any = db
          .prepare("SELECT * FROM records WHERE id=? AND kind=?")
          .get(id, kind);
        if (old && old.owner_id !== owner) throw new ApiError(404, "Not found");
        if ((old?.version || 0) !== expected)
          throw new ApiError(
            409,
            "This design has changed. Reload the saved version before saving.",
            "VERSION_CONFLICT",
          );
        const row = {
          id,
          owner_id: owner,
          kind,
          data,
          version: expected + 1,
          created_at: new Date().toISOString(),
        };
        db.prepare(
          "INSERT INTO records VALUES(?,?,?,?,?,?) ON CONFLICT(id,kind) DO UPDATE SET data=excluded.data,version=excluded.version,created_at=excluded.created_at",
        ).run(
          id,
          owner,
          kind,
          JSON.stringify(data),
          row.version,
          row.created_at,
        );
        if (kind === "project")
          db.prepare("INSERT INTO records VALUES(?,?,?,?,?,?)").run(
            randomUUID(),
            owner,
            "revision",
            JSON.stringify({ project: data, projectId: id }),
            row.version,
            row.created_at,
          );
        db.exec("COMMIT");
        return row;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    async remove(owner, kind, id) {
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare(
          "DELETE FROM records WHERE owner_id=? AND kind=? AND id=?",
        ).run(owner, kind, id);
        if (kind === "project")
          db.prepare(
            "DELETE FROM records WHERE owner_id=? AND kind IN ('review','revision') AND json_extract(data,'$.projectId')=?",
          ).run(owner, id);
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    async publicReview(token, action = "read", payload = {}) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const row = decode(
          db
            .prepare("SELECT * FROM records WHERE kind='review' AND id=?")
            .get(token),
        );
        if (!row || Date.parse(row.data.expiresAt) < Date.now())
          throw new ApiError(404, "Review link is unavailable or expired");
        if (action === "comment") {
          if (row.data.comments.length >= 200)
            throw new ApiError(429, "Comment limit reached");
          row.data.comments.push({
            id: randomUUID(),
            ...payload,
            createdAt: new Date().toISOString(),
          });
        }
        if (action === "status") {
          if (row.data.requireAuthenticatedApproval && !payload.authenticated)
            throw new ApiError(
              401,
              "This review requires a signed-in approval",
            );
          row.data.status = payload.status;
          row.data.statusBy = payload.author;
          if (payload.authenticated) {
            row.data.decision = {
              status: payload.status,
              decidedBy: {
                userId: payload.userId,
                email: payload.email,
                name: payload.author,
              },
              decidedAt: new Date().toISOString(),
            };
          }
        }
        if (action !== "read")
          db.prepare(
            "UPDATE records SET data=? WHERE kind='review' AND id=?",
          ).run(JSON.stringify(row.data), token);
        db.exec("COMMIT");
        return row.data;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    async deleteAccount(owner) {
      db.prepare("DELETE FROM users WHERE id=?").run(owner);
    },
  };
  return { db, store };
}
export async function supabaseStore(url: string, key: string, token?: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined,
  });
  const check = (r: any) => {
    if (r.error) {
      const text = r.error.message || "";
      if (text.includes("VERSION_CONFLICT"))
        throw new ApiError(
          409,
          "This design has changed. Reload before saving.",
          "VERSION_CONFLICT",
        );
      if (text.includes("QUOTA_EXCEEDED"))
        throw new ApiError(
          429,
          "Hourly analysis quota reached. Try again later.",
        );
      if (text.includes("INVALID_INPUT"))
        throw new ApiError(400, "Invalid request");
      if (text.includes("AUTH_REQUIRED"))
        throw new ApiError(401, "This review requires a signed-in approval");
      if (text.includes("NOT_FOUND")) throw new ApiError(404, "Not found");
      throw new ApiError(500, "Data service request failed");
    }
    return r.data;
  };
  const store: Store = {
    async preferences(owner, value) {
      if (value)
        check(
          await client
            .from("forma_preferences")
            .upsert({ owner_id: owner, ...value }),
        );
      const row = check(
        await client
          .from("forma_preferences")
          .select("purpose,start,completed")
          .eq("owner_id", owner)
          .maybeSingle(),
      );
      return row || { purpose: "personal", start: "sample", completed: false };
    },
    async list(owner, kind) {
      const rows: RecordRow[] = [];
      for (let offset = 0; offset < 10000; offset += 100) {
        const page = check(
          await client
            .from("forma_records")
            .select("*")
            .eq("owner_id", owner)
            .eq("kind", kind)
            .order("created_at", { ascending: false })
            .order("id")
            .range(offset, offset + 99),
        );
        rows.push(...page);
        if (page.length < 100) return rows;
      }
      throw new ApiError(
        413,
        "This account is too large for an inline export. Contact support for a complete archive.",
      );
    },
    async get(owner, kind, id) {
      return check(
        await client
          .from("forma_records")
          .select("*")
          .eq("owner_id", owner)
          .eq("kind", kind)
          .eq("id", id)
          .maybeSingle(),
      );
    },
    async sharedTemplate(token) {
      return check(
        await client.rpc("forma_template_shared", { p_token: token }),
      );
    },
    async publicTemplates() {
      return check(await client.rpc("forma_template_public_list"));
    },
    async forkSource(id, token) {
      return check(
        await client.rpc("forma_template_fork_source", {
          p_id: id,
          p_token: token ?? null,
        }),
      );
    },
    async save(_owner, kind, id, data, expected) {
      return check(
        await client.rpc("forma_save", {
          p_kind: kind,
          p_id: id,
          p_data: data,
          p_expected: expected,
        }),
      );
    },
    async remove(_owner, kind, id) {
      check(await client.rpc("forma_remove", { p_kind: kind, p_id: id }));
    },
    async publicReview(token, action = "read", payload = {}) {
      return check(
        await client.rpc("forma_review", {
          p_token: token,
          p_action: action,
          p_payload: payload,
        }),
      );
    },
    async consumeAnalysis() {
      check(await client.rpc("forma_consume_analysis"));
    },
    async deleteAccount(owner) {
      const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!service)
        throw new ApiError(
          503,
          "Account deletion is unavailable. Contact the beta administrator.",
        );
      const admin = createClient(url, service, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      check(await admin.auth.admin.deleteUser(owner));
    },
  };
  return { store, client };
}
