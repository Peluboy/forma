import type { RecordRow } from "./store.js";
import express from "express";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { isProject } from "../src/domain/design/model.js";
import { ApiError, localStore, supabaseStore, type Store } from "./store.js";
import { billingStore } from "./billing/store.js";
import { createBilling } from "./billing/paystack.js";
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
const passwordHash = (p: string) => {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(p, salt, 64).toString("hex");
};
const passwordMatch = (p: string, s: string) => {
  const [salt, h] = s.split(":");
  return timingSafeEqual(Buffer.from(h, "hex"), scryptSync(p, salt, 64));
};
const cleanUser = (u: any) =>
  u
    ? {
        id: u.id,
        name:
          u.name ||
          u.user_metadata?.name ||
          u.email?.split("@")[0] ||
          "Designer",
        email: u.email,
      }
    : null;
const str = (v: any, max: number) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
export async function createApp(
  options: {
    mode?: string;
    dbPath?: string;
    billingRequest?: typeof fetch;
  } = {},
) {
  const mode =
    options.mode ||
    process.env.FORMA_MODE ||
    (process.env.VERCEL ? "supabase" : "local");
  if (
    !["local", "supabase"].includes(mode) ||
    (process.env.VERCEL && mode !== "supabase")
  )
    throw Error("Vercel requires FORMA_MODE=supabase");
  const url = process.env.SUPABASE_URL || "",
    key = process.env.SUPABASE_ANON_KEY || "";
  if (mode === "supabase" && (!url || !key))
    throw Error("SUPABASE_URL and SUPABASE_ANON_KEY are required");
  let local: Awaited<ReturnType<typeof localStore>> | undefined;
  if (mode === "local") {
    const path =
      options.dbPath || process.env.FORMA_DB_PATH || ".data/forma.sqlite";
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    local = await localStore(path);
  }
  const app = express();
  const billing = createBilling(
    billingStore(local?.db),
    options.billingRequest,
  );
  app.disable("x-powered-by");
  app.post(
    "/api/billing/webhook",
    express.raw({ type: "application/json", limit: "1mb" }),
    async (req, res, next) => {
      try {
        if (!Buffer.isBuffer(req.body))
          throw new ApiError(400, "Expected JSON webhook");
        await billing.webhook(req.body, req.get("x-paystack-signature"));
        res.set("Cache-Control", "no-store").json({ ok: true });
      } catch (e) {
        next(e);
      }
    },
  );
  app.use(express.json({ limit: "4mb" }));
  const rates = new Map<string, { count: number; until: number }>();
  function rate(key: string, max: number, ms = 60000) {
    const now = Date.now();
    if (rates.size > 10000) {
      for (const [k, v] of rates) if (v.until < now) rates.delete(k);
    }
    const old = rates.get(key);
    const n = old && old.until > now ? old : { count: 0, until: now + ms };
    n.count++;
    rates.set(key, n);
    if (n.count > max)
      throw new ApiError(429, "Too many requests. Please try again later.");
  }
  app.use((req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        const origin = req.get("origin");
        const allowed =
          process.env.APP_ORIGIN || `${req.protocol}://${req.get("host")}`;
        if (
          origin &&
          origin !== allowed &&
          !(
            mode === "local" &&
            /^http:\/\/(localhost|127\.0\.0\.1):(5173|5174|8787)$/.test(origin)
          )
        )
          throw new ApiError(403, "Request origin is not allowed");
        if (!req.is("application/json") && req.method !== "DELETE")
          throw new ApiError(415, "Use application/json");
      }
      next();
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/health", (_req, res) => res.json({ ok: true, mode }));
  app.get("/api/config", (_req, res) =>
    res.json({
      mode,
      supabaseUrl: mode === "supabase" ? url : null,
      supabaseAnonKey: mode === "supabase" ? key : null,
      supportEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        process.env.SUPPORT_EMAIL || "",
      )
        ? process.env.SUPPORT_EMAIL
        : null,
    }),
  );
  app.use("/api", async (req, res, next) => {
    try {
      let user = null,
        csrfToken = null,
        store: Store | undefined = local?.store;
      if (mode === "local") {
        const token = req.headers.cookie
          ?.split(";")
          .map((x) => x.trim())
          .find((x) => x.startsWith("forma_session="))
          ?.slice(14);
        if (token) {
          const session: any = local!.db
            .prepare(
              "SELECT users.*,sessions.csrf FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?",
            )
            .get(hash(token), Date.now());
          if (session) {
            user = cleanUser(session);
            csrfToken = session.csrf;
          }
        }
      } else {
        const token = req.get("authorization")?.replace(/^Bearer /, "");
        const remote = await supabaseStore(url, key, token);
        store = remote.store;
        if (token) {
          const result = await remote.client.auth.getUser(token);
          if (!result.error) user = cleanUser(result.data.user);
        }
      }
      res.locals = { user, csrfToken, store };
      next();
    } catch (e) {
      next(e);
    }
  });
  const auth = (req: any, res: any, next: any) => {
    if (!res.locals.user) return next(new ApiError(401, "Sign in to continue"));
    if (
      mode === "local" &&
      !["GET", "HEAD"].includes(req.method) &&
      req.get("X-CSRF-Token") !== res.locals.csrfToken
    )
      return next(
        new ApiError(
          403,
          "Session verification failed. Refresh and try again.",
        ),
      );
    next();
  };
  app.get("/api/billing/plans", async (req, res, next) => {
    try {
      rate("billing-plans:" + req.ip, 30);
      res.json(await billing.catalog());
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/billing", auth, async (_req, res, next) => {
    try {
      res.json(await billing.status(res.locals.user.id));
    } catch (e) {
      next(e);
    }
  });
  for (const action of ["checkout", "verify", "manage", "refresh"]) {
    app.post(`/api/billing/${action}`, auth, async (req, res, next) => {
      try {
        rate("billing:" + res.locals.user.id, 15);
        const owner = res.locals.user.id;
        if (action === "checkout")
          return res.json(await billing.checkout(owner, res.locals.user.email));
        if (action === "manage") return res.json(await billing.manage(owner));
        if (action === "verify")
          await billing.verify(req.body.reference, owner);
        else await billing.refreshSubscription(owner);
        res.json(await billing.status(owner));
      } catch (e) {
        next(e);
      }
    });
  }
  app.get("/api/session", async (_req, res, next) => {
    try {
      const { analysisCapabilities } = await import("./analysis/index.mjs");
      res.json({
        user: res.locals.user,
        csrfToken: res.locals.csrfToken,
        capabilities: {
          analysis: analysisCapabilities(),
          mode,
          accountDeletion:
            mode === "local" || Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        },
      });
    } catch (e) {
      next(e);
    }
  });
  function session(res: any, user: any) {
    const token = randomBytes(32).toString("hex"),
      csrf = randomBytes(24).toString("hex");
    local!.db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
    local!.db
      .prepare("INSERT INTO sessions VALUES(?,?,?,?)")
      .run(hash(token), user.id, csrf, Date.now() + 7 * 86400000);
    res.cookie("forma_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 86400000,
      path: "/",
    });
    return { user: cleanUser(user), csrfToken: csrf };
  }
  app.use("/api/auth", (req, _res, next) => {
    try {
      if (mode !== "local")
        throw new ApiError(400, "Use Supabase authentication");
      rate("auth:" + req.ip, 15, 15 * 60000);
      next();
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/auth/register", (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      if (
        !str(name, 80) ||
        !str(email, 254) ||
        !/^\S+@\S+\.\S+$/.test(email) ||
        typeof password !== "string" ||
        password.length < 12 ||
        password.length > 128
      )
        throw new ApiError(
          400,
          "Provide a name, valid email, and password of 12–128 characters",
        );
      const user = {
          id: randomUUID(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
        },
        recoveryCode = randomBytes(20).toString("hex");
      if (
        local!.db.prepare("SELECT id FROM users WHERE email=?").get(user.email)
      )
        throw new ApiError(409, "An account already exists for this email");
      local!.db
        .prepare("INSERT INTO users VALUES(?,?,?,?,?)")
        .run(
          user.id,
          user.email,
          user.name,
          passwordHash(password),
          hash(recoveryCode),
        );
      res.status(201).json({ ...session(res, user), recoveryCode });
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/auth/login", (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!str(email, 254) || !str(password, 128))
        throw new ApiError(400, "Email and password required");
      const user: any = local!.db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(email.trim().toLowerCase());
      if (!user || !passwordMatch(password, user.password))
        throw new ApiError(401, "Email or password is incorrect");
      res.json(session(res, user));
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/auth/recover", (req, res, next) => {
    try {
      const { email, password, recoveryCode } = req.body;
      if (
        !str(email, 254) ||
        !str(recoveryCode, 100) ||
        !str(password, 128) ||
        password.length < 12
      )
        throw new ApiError(
          400,
          "Provide email, recovery code, and a password of 12–128 characters",
        );
      const user: any = local!.db
        .prepare("SELECT * FROM users WHERE email=? AND recovery=?")
        .get(email.trim().toLowerCase(), hash(recoveryCode));
      if (!user) throw new ApiError(401, "Email or recovery code is incorrect");
      const code = randomBytes(20).toString("hex");
      local!.db
        .prepare("UPDATE users SET password=?,recovery=? WHERE id=?")
        .run(passwordHash(password), hash(code), user.id);
      local!.db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
      res.json({ recoveryCode: code });
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/auth/logout", auth, (req, res) => {
    const token = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("forma_session="))
      ?.slice(14);
    if (req.body?.scope === "others") {
      local!.db
        .prepare("DELETE FROM sessions WHERE user_id=? AND token<>?")
        .run(res.locals.user.id, hash(token || ""));
      return res.json({ ok: true });
    }
    if (req.body?.scope === "global")
      local!.db
        .prepare("DELETE FROM sessions WHERE user_id=?")
        .run(res.locals.user.id);
    else if (token)
      local!.db.prepare("DELETE FROM sessions WHERE token=?").run(hash(token));
    res.clearCookie("forma_session", { path: "/" });
    res.json({ ok: true });
  });
  app.delete("/api/account", auth, async (_req, res, next) => {
    try {
      await billing.canDelete(res.locals.user.id);
      await res.locals.store.deleteAccount(res.locals.user.id);
      res.clearCookie("forma_session", { path: "/" });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/account/preferences", auth, async (_req, res, next) => {
    try {
      res.json(await res.locals.store.preferences(res.locals.user.id));
    } catch (e) {
      next(e);
    }
  });
  app.put("/api/account/preferences", auth, async (req, res, next) => {
    try {
      const { purpose, start, completed } = req.body;
      if (
        !["personal", "business", "client"].includes(purpose) ||
        !["sample", "template", "reference", "guest"].includes(start) ||
        typeof completed !== "boolean"
      )
        throw new ApiError(400, "Invalid onboarding preferences");
      res.json(
        await res.locals.store.preferences(res.locals.user.id, {
          purpose,
          start,
          completed,
        }),
      );
    } catch (e) {
      next(e);
    }
  });
  app.put("/api/account/profile", auth, (req, res, next) => {
    try {
      if (!local)
        throw new ApiError(400, "Update your profile through Supabase Auth");
      if (!str(req.body.name, 80))
        throw new ApiError(400, "Enter a display name of 1–80 characters");
      local.db
        .prepare("UPDATE users SET name=? WHERE id=?")
        .run(req.body.name.trim(), res.locals.user.id);
      res.json({ user: { ...res.locals.user, name: req.body.name.trim() } });
    } catch (e) {
      next(e);
    }
  });
  app.put("/api/account/password", auth, (req, res, next) => {
    try {
      if (!local)
        throw new ApiError(400, "Update your password through Supabase Auth");
      rate("password:" + res.locals.user.id, 5, 15 * 60000);
      const { currentPassword, password } = req.body;
      if (
        !str(currentPassword, 128) ||
        !str(password, 128) ||
        password.length < 12
      )
        throw new ApiError(
          400,
          "Enter your current password and a new password of 12–128 characters",
        );
      const user = local.db
        .prepare("SELECT * FROM users WHERE id=?")
        .get(res.locals.user.id) as any;
      if (!passwordMatch(currentPassword, user.password))
        throw new ApiError(403, "Your current password is incorrect");
      local.db.exec("BEGIN IMMEDIATE");
      try {
        local.db
          .prepare("UPDATE users SET password=? WHERE id=?")
          .run(passwordHash(password), user.id);
        local.db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
        const result = session(res, user);
        local.db.exec("COMMIT");
        res.json(result);
      } catch (e) {
        local.db.exec("ROLLBACK");
        throw e;
      }
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/account/export", auth, async (_req, res, next) => {
    try {
      const owner = res.locals.user.id;
      const [projects, revisions, reviews, brand, preferences, billingStatus] =
        await Promise.all([
          res.locals.store.list(owner, "project"),
          res.locals.store.list(owner, "revision"),
          res.locals.store.list(owner, "review"),
          res.locals.store.list(owner, "brand"),
          res.locals.store.preferences(owner),
          billing.status(owner),
        ]);
      res.set(
        "Content-Disposition",
        'attachment; filename="forma-account.json"',
      );
      res.json({
        exportedAt: new Date().toISOString(),
        user: res.locals.user,
        projects,
        revisions,
        reviews,
        brand,
        preferences,
        billing: billingStatus,
      });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/projects", auth, async (_req, res, next) => {
    try {
      const rows = await res.locals.store.list(res.locals.user.id, "project");
      res.json({
        projects: rows.map((r: any) => ({
          project: r.data,
          version: r.version,
        })),
      });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/projects/:id", auth, async (req, res, next) => {
    try {
      const row = await res.locals.store.get(
        res.locals.user.id,
        "project",
        req.params.id,
      );
      if (!row) throw new ApiError(404, "Project not found");
      res.json({ project: row.data, version: row.version });
    } catch (e) {
      next(e);
    }
  });
  app.put("/api/projects/:id", auth, async (req, res, next) => {
    try {
      const { project, expectedVersion } = req.body;
      if (
        !isProject(project) ||
        project.id !== req.params.id ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(project.id) ||
        !Number.isSafeInteger(expectedVersion) ||
        expectedVersion < 0
      )
        throw new ApiError(400, "Invalid project or version");
      const row = await res.locals.store.save(
        res.locals.user.id,
        "project",
        project.id,
        project,
        expectedVersion,
      );
      res.json({ project: row.data, version: row.version });
    } catch (e) {
      next(e);
    }
  });
  app.delete("/api/projects/:id", auth, async (req, res, next) => {
    try {
      await res.locals.store.remove(
        res.locals.user.id,
        "project",
        req.params.id,
      );
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/projects/:id/revisions", auth, async (req, res, next) => {
    try {
      const rows = await res.locals.store.list(res.locals.user.id, "revision");
      res.json({
        revisions: rows
          .filter((r: any) => r.data.projectId === req.params.id)
          .map((r: any) => ({
            id: r.id,
            version: r.version,
            createdAt: r.created_at,
            name: r.data.project.name,
          })),
      });
    } catch (e) {
      next(e);
    }
  });
  app.get(
    "/api/projects/:id/revisions/:revisionId",
    auth,
    async (req, res, next) => {
      try {
        const row = await res.locals.store.get(
          res.locals.user.id,
          "revision",
          req.params.revisionId,
        );
        if (!row || row.data.projectId !== req.params.id)
          throw new ApiError(404, "Revision not found");
        res.json({ project: row.data.project, version: row.version });
      } catch (e) {
        next(e);
      }
    },
  );
  app.get("/api/brand", auth, async (_req, res, next) => {
    try {
      const { normalizeBrand } =
        await import("../src/domain/design/designSystem.js");
      const row = await res.locals.store.get(
        res.locals.user.id,
        "brand",
        res.locals.user.id,
      );
      res.json(normalizeBrand(row?.data || null));
    } catch (e) {
      next(e);
    }
  });
  app.put("/api/brand", auth, async (req, res, next) => {
    try {
      const { normalizeBrand, isBrandSystem, defaultBrandSystem } =
        await import("../src/domain/design/designSystem.js");
      const incoming = normalizeBrand(req.body);
      if (!isBrandSystem(incoming))
        throw new ApiError(400, "Invalid brand settings");
      const old = await res.locals.store.get(
        res.locals.user.id,
        "brand",
        res.locals.user.id,
      );
      const previous = old?.data ? normalizeBrand(old.data) : null;
      const nextBrand = defaultBrandSystem({
        ...incoming,
        id: previous?.id || incoming.id || "brand-default",
        version: (previous?.version || 0) + 1,
        updatedAt: new Date().toISOString(),
      });
      if (!isBrandSystem(nextBrand))
        throw new ApiError(400, "Invalid brand settings");
      const row = await res.locals.store.save(
        res.locals.user.id,
        "brand",
        res.locals.user.id,
        nextBrand,
        old?.version || 0,
      );
      res.json(row.data);
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/templates", auth, async (_req, res, next) => {
    try {
      const { isVersionedTemplate } =
        await import("../src/domain/design/designSystem.js");
      const rows: RecordRow[] = await res.locals.store.list(
        res.locals.user.id,
        "template",
      );
      res.json({
        templates: rows.map((r) => r.data).filter(isVersionedTemplate),
      });
    } catch (e) {
      next(e);
    }
  });
  app.put("/api/templates/:id", auth, async (req, res, next) => {
    try {
      const { isVersionedTemplate, templateFromProject } =
        await import("../src/domain/design/designSystem.js");
      const { isProject } = await import("../src/domain/design/model.js");
      const body = req.body;
      let template = body?.template;
      if (!isVersionedTemplate(template) && isProject(body?.project)) {
        const old = await res.locals.store.get(
          res.locals.user.id,
          "template",
          req.params.id,
        );
        template = templateFromProject(
          body.project,
          old?.data && isVersionedTemplate(old.data) ? old.data : null,
        );
        template.id = req.params.id;
      }
      if (!isVersionedTemplate(template) || template.id !== req.params.id)
        throw new ApiError(400, "Invalid template");
      const old = await res.locals.store.get(
        res.locals.user.id,
        "template",
        template.id,
      );
      const row = await res.locals.store.save(
        res.locals.user.id,
        "template",
        template.id,
        template,
        old?.version || 0,
      );
      res.json({ template: row.data, version: row.version });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/skills", auth, async (_req, res, next) => {
    try {
      const { isSkillManifest, EVENT_CAMPAIGN_SKILL } =
        await import("../src/domain/design/designSystem.js");
      const rows: RecordRow[] = await res.locals.store.list(
        res.locals.user.id,
        "skill",
      );
      const skills = rows.map((r) => r.data).filter(isSkillManifest);
      if (!skills.some((s) => s.id === EVENT_CAMPAIGN_SKILL.id))
        skills.unshift(EVENT_CAMPAIGN_SKILL);
      res.json({ skills });
    } catch (e) {
      next(e);
    }
  });
  app.put("/api/skills/:id", auth, async (req, res, next) => {
    try {
      const { isSkillManifest } =
        await import("../src/domain/design/designSystem.js");
      const skill = req.body?.skill ?? req.body;
      if (!isSkillManifest(skill) || skill.id !== req.params.id)
        throw new ApiError(400, "Invalid skill");
      if (skill.layoutPolicy !== "exact-copy")
        throw new ApiError(400, "Skills must preserve exact copy");
      const old = await res.locals.store.get(
        res.locals.user.id,
        "skill",
        skill.id,
      );
      const previous = old?.data && isSkillManifest(old.data) ? old.data : null;
      const nextSkill = {
        ...skill,
        version: previous ? previous.version + 1 : skill.version,
        updatedAt: new Date().toISOString(),
      };
      if (!isSkillManifest(nextSkill)) throw new ApiError(400, "Invalid skill");
      const row = await res.locals.store.save(
        res.locals.user.id,
        "skill",
        nextSkill.id,
        nextSkill,
        old?.version || 0,
      );
      res.json({ skill: row.data, version: row.version });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/workspaces", auth, async (_req, res, next) => {
    try {
      if (mode !== "local" || !res.locals.store.getAny)
        throw new ApiError(
          501,
          "Team workspaces are available in local account mode for this release",
        );
      const { isWorkspace, membershipFromWorkspace } =
        await import("../src/domain/team/teamOps.js");
      const memberships = await res.locals.store.list(
        res.locals.user.id,
        "workspace_membership",
      );
      const workspaces = [];
      for (const m of memberships) {
        const row = await res.locals.store.getAny!(
          "workspace",
          m.data.workspaceId,
        );
        if (!row || !isWorkspace(row.data)) continue;
        try {
          const membership = membershipFromWorkspace(
            row.data,
            res.locals.user.id,
          );
          if (!membership) continue;
          workspaces.push({
            ...row.data,
            myRole: membership.role,
          });
        } catch {
          /* skip broken membership */
        }
      }
      res.json({ workspaces });
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/workspaces", auth, async (req, res, next) => {
    try {
      if (mode !== "local" || !res.locals.store.getAny)
        throw new ApiError(
          501,
          "Team workspaces are available in local account mode for this release",
        );
      const { createWorkspace, membershipFromWorkspace, createAuditEvent } =
        await import("../src/domain/team/teamOps.js");
      const id = randomUUID();
      const actor = {
        userId: res.locals.user.id,
        email: res.locals.user.email,
        name: res.locals.user.name,
      };
      const workspace = createWorkspace({
        id,
        name: typeof req.body?.name === "string" ? req.body.name : "",
        owner: actor,
      });
      await res.locals.store.save(actor.userId, "workspace", id, workspace, 0);
      await res.locals.store.save(
        actor.userId,
        "workspace_membership",
        `${id}:${actor.userId}`,
        membershipFromWorkspace(workspace, actor.userId),
        0,
      );
      const auditId = randomUUID();
      await res.locals.store.save(
        actor.userId,
        "audit",
        auditId,
        createAuditEvent({
          id: auditId,
          workspaceId: id,
          actor,
          action: "workspace.create",
          target: id,
          detail: { name: workspace.name },
        }),
        0,
      );
      res.status(201).json({ workspace, myRole: "owner" });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/workspaces/:id", auth, async (req, res, next) => {
    try {
      if (mode !== "local" || !res.locals.store.getAny)
        throw new ApiError(
          501,
          "Team workspaces are available in local account mode for this release",
        );
      const { isWorkspace, assertWorkspaceAccess, membershipFromWorkspace } =
        await import("../src/domain/team/teamOps.js");
      const row = await res.locals.store.getAny!("workspace", req.params.id);
      if (!row || !isWorkspace(row.data))
        throw new ApiError(404, "Workspace not found");
      const role = assertWorkspaceAccess(row.data, res.locals.user.id, "view");
      res.json({
        workspace: row.data,
        myRole: role,
        membership: membershipFromWorkspace(row.data, res.locals.user.id),
      });
    } catch (e: any) {
      if (e?.status === 403) next(new ApiError(403, e.message));
      else next(e);
    }
  });
  app.post("/api/workspaces/:id/members", auth, async (req, res, next) => {
    try {
      if (mode !== "local" || !res.locals.store.getAny)
        throw new ApiError(
          501,
          "Team workspaces are available in local account mode for this release",
        );
      const {
        isWorkspace,
        addWorkspaceMember,
        membershipFromWorkspace,
        createAuditEvent,
        isWorkspaceRole,
      } = await import("../src/domain/team/teamOps.js");
      const row = await res.locals.store.getAny!("workspace", req.params.id);
      if (!row || !isWorkspace(row.data))
        throw new ApiError(404, "Workspace not found");
      const email =
        typeof req.body?.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "";
      const role = req.body?.role;
      if (!email || !isWorkspaceRole(role) || role === "owner")
        throw new ApiError(400, "Provide a member email and role");
      const found = res.locals.store.findUserByEmail
        ? await res.locals.store.findUserByEmail(email)
        : null;
      if (!found) throw new ApiError(404, "No account found for that email");
      const actor = {
        userId: res.locals.user.id,
        email: res.locals.user.email,
        name: res.locals.user.name,
      };
      let nextWs;
      try {
        nextWs = addWorkspaceMember(
          row.data,
          {
            userId: found.id,
            email: found.email,
            name: found.name,
            role,
          },
          actor.userId,
        );
      } catch (e: any) {
        throw new ApiError(e.status || 400, e.message);
      }
      await res.locals.store.save(
        row.owner_id,
        "workspace",
        nextWs.id,
        nextWs,
        row.version,
      );
      await res.locals.store.save(
        found.id,
        "workspace_membership",
        `${nextWs.id}:${found.id}`,
        membershipFromWorkspace(nextWs, found.id),
        0,
      );
      const auditId = randomUUID();
      await res.locals.store.save(
        row.owner_id,
        "audit",
        auditId,
        createAuditEvent({
          id: auditId,
          workspaceId: nextWs.id,
          actor,
          action: "workspace.member.add",
          target: found.id,
          detail: { email: found.email, role },
        }),
        0,
      );
      res.status(201).json({ workspace: nextWs });
    } catch (e) {
      next(e);
    }
  });
  app.delete(
    "/api/workspaces/:id/members/:userId",
    auth,
    async (req, res, next) => {
      try {
        if (mode !== "local" || !res.locals.store.getAny)
          throw new ApiError(
            501,
            "Team workspaces are available in local account mode for this release",
          );
        const { isWorkspace, removeWorkspaceMember, createAuditEvent } =
          await import("../src/domain/team/teamOps.js");
        const row = await res.locals.store.getAny!("workspace", req.params.id);
        if (!row || !isWorkspace(row.data))
          throw new ApiError(404, "Workspace not found");
        const actor = {
          userId: res.locals.user.id,
          email: res.locals.user.email,
          name: res.locals.user.name,
        };
        let nextWs;
        try {
          nextWs = removeWorkspaceMember(
            row.data,
            req.params.userId,
            actor.userId,
          );
        } catch (e: any) {
          throw new ApiError(e.status || 400, e.message);
        }
        await res.locals.store.save(
          row.owner_id,
          "workspace",
          nextWs.id,
          nextWs,
          row.version,
        );
        await res.locals.store.remove(
          req.params.userId,
          "workspace_membership",
          `${nextWs.id}:${req.params.userId}`,
        );
        const auditId = randomUUID();
        await res.locals.store.save(
          row.owner_id,
          "audit",
          auditId,
          createAuditEvent({
            id: auditId,
            workspaceId: nextWs.id,
            actor,
            action: "workspace.member.remove",
            target: req.params.userId,
          }),
          0,
        );
        res.json({ workspace: nextWs });
      } catch (e) {
        next(e);
      }
    },
  );
  app.post("/api/workspaces/:id/publish", auth, async (req, res, next) => {
    try {
      if (mode !== "local" || !res.locals.store.getAny)
        throw new ApiError(
          501,
          "Team workspaces are available in local account mode for this release",
        );
      const { isWorkspace, createPublication, createAuditEvent } =
        await import("../src/domain/team/teamOps.js");
      const row = await res.locals.store.getAny!("workspace", req.params.id);
      if (!row || !isWorkspace(row.data))
        throw new ApiError(404, "Workspace not found");
      const kind = req.body?.kind;
      const sourceId = req.body?.sourceId;
      const pinnedVersion = req.body?.pinnedVersion;
      const name = req.body?.name;
      const snapshot = req.body?.snapshot;
      if (
        !["project", "template", "skill", "brand"].includes(kind) ||
        typeof sourceId !== "string" ||
        !Number.isInteger(pinnedVersion) ||
        typeof name !== "string" ||
        snapshot === undefined
      )
        throw new ApiError(
          400,
          "Provide kind, sourceId, pinnedVersion, name and snapshot",
        );
      // Scoped publishing: source must belong to the publisher (or already be a pin).
      if (kind === "project" || kind === "template" || kind === "skill") {
        const source = await res.locals.store.get(
          res.locals.user.id,
          kind,
          sourceId,
        );
        if (!source && kind !== "skill")
          throw new ApiError(
            403,
            "You can only publish sources you own into a workspace",
          );
      }
      const actor = {
        userId: res.locals.user.id,
        email: res.locals.user.email,
        name: res.locals.user.name,
      };
      let publication;
      try {
        publication = createPublication({
          id: randomUUID(),
          workspace: row.data,
          actor,
          kind,
          sourceId,
          pinnedVersion,
          name,
          snapshot,
        });
      } catch (e: any) {
        throw new ApiError(e.status || 400, e.message);
      }
      await res.locals.store.save(
        row.owner_id,
        "publication",
        publication.id,
        publication,
        0,
      );
      const auditId = randomUUID();
      await res.locals.store.save(
        row.owner_id,
        "audit",
        auditId,
        createAuditEvent({
          id: auditId,
          workspaceId: row.data.id,
          actor,
          action: "workspace.publish",
          target: publication.id,
          detail: {
            kind,
            sourceId,
            pinnedVersion,
            name: publication.name,
          },
        }),
        0,
      );
      res.status(201).json({ publication });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/workspaces/:id/publications", auth, async (req, res, next) => {
    try {
      if (mode !== "local" || !res.locals.store.getAny)
        throw new ApiError(
          501,
          "Team workspaces are available in local account mode for this release",
        );
      const { isWorkspace, assertWorkspaceAccess, isPublication } =
        await import("../src/domain/team/teamOps.js");
      const row = await res.locals.store.getAny!("workspace", req.params.id);
      if (!row || !isWorkspace(row.data))
        throw new ApiError(404, "Workspace not found");
      assertWorkspaceAccess(row.data, res.locals.user.id, "view");
      const pubs: RecordRow[] = await res.locals.store.list(
        row.owner_id,
        "publication",
      );
      res.json({
        publications: pubs
          .map((p) => p.data)
          .filter((p) => isPublication(p) && p.workspaceId === req.params.id),
      });
    } catch (e: any) {
      if (e?.status === 403) next(new ApiError(403, e.message));
      else next(e);
    }
  });
  app.get("/api/workspaces/:id/audit", auth, async (req, res, next) => {
    try {
      if (mode !== "local" || !res.locals.store.getAny)
        throw new ApiError(
          501,
          "Team workspaces are available in local account mode for this release",
        );
      const {
        isWorkspace,
        assertWorkspaceAccess,
        isAuditEvent,
        recoverMemberships,
      } = await import("../src/domain/team/teamOps.js");
      const row = await res.locals.store.getAny!("workspace", req.params.id);
      if (!row || !isWorkspace(row.data))
        throw new ApiError(404, "Workspace not found");
      assertWorkspaceAccess(row.data, res.locals.user.id, "audit");
      const events: RecordRow[] = await res.locals.store.list(
        row.owner_id,
        "audit",
      );
      const audit = events
        .map((e) => e.data)
        .filter((e) => isAuditEvent(e) && e.workspaceId === req.params.id)
        .sort((a, b) => b.at.localeCompare(a.at));
      res.json({
        audit,
        recovery: {
          memberships: recoverMemberships(row.data),
        },
      });
    } catch (e: any) {
      if (e?.status === 403) next(new ApiError(403, e.message));
      else next(e);
    }
  });

  app.post("/api/projects/:id/reviews", auth, async (req, res, next) => {
    try {
      const days = req.body.expiresInDays ?? 7;
      if (!Number.isInteger(days) || days < 1 || days > 30)
        throw new ApiError(400, "Choose 1–30 days");
      const p = await res.locals.store.get(
        res.locals.user.id,
        "project",
        req.params.id,
      );
      if (!p) throw new ApiError(404, "Save this project before sharing");
      const token = randomBytes(24).toString("hex"),
        expiresAt = new Date(Date.now() + days * 86400000).toISOString();
      const requireAuthenticatedApproval =
        !!req.body.requireAuthenticatedApproval;
      if (mode !== "local" && req.body.workspaceId)
        throw new ApiError(
          400,
          "Workspace-scoped reviews are not available in hosted mode.",
        );
      await res.locals.store.save(
        res.locals.user.id,
        "review",
        token,
        {
          project: p.data,
          projectId: p.id,
          status: "pending",
          comments: [],
          expiresAt,
          requireAuthenticatedApproval,
          workspaceId:
            typeof req.body.workspaceId === "string"
              ? req.body.workspaceId
              : undefined,
        },
        0,
      );
      res.status(201).json({
        token,
        url: `/review/${token}`,
        expiresAt,
        requireAuthenticatedApproval,
      });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/projects/:id/reviews", auth, async (req, res, next) => {
    try {
      const rows = await res.locals.store.list(res.locals.user.id, "review");
      res.json({
        reviews: rows
          .filter((r: any) => r.data.projectId === req.params.id)
          .map((r: any) => ({
            token: r.id,
            url: `/review/${r.id}`,
            expiresAt: r.data.expiresAt,
            status: r.data.status,
            requireAuthenticatedApproval: !!r.data.requireAuthenticatedApproval,
            decision: r.data.decision || null,
          })),
      });
    } catch (e) {
      next(e);
    }
  });
  app.delete(
    "/api/projects/:id/reviews/:token",
    auth,
    async (req, res, next) => {
      try {
        const row = await res.locals.store.get(
          res.locals.user.id,
          "review",
          req.params.token,
        );
        if (!row || row.data.projectId !== req.params.id)
          throw new ApiError(404, "Review not found");
        await res.locals.store.remove(
          res.locals.user.id,
          "review",
          req.params.token,
        );
        res.json({ ok: true });
      } catch (e) {
        next(e);
      }
    },
  );
  app.get("/api/reviews/:token", async (req, res, next) => {
    try {
      rate("review:" + req.ip, 100);
      res.json(await res.locals.store.publicReview(req.params.token));
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/reviews/:token/comments", async (req, res, next) => {
    try {
      rate("review-write:" + req.ip, 20);
      const { author, body } = req.body;
      if (!str(author, 80) || !str(body, 2000))
        throw new ApiError(400, "Invalid review submission");
      res.json(
        await res.locals.store.publicReview(req.params.token, "comment", {
          author: author.trim(),
          body: body.trim(),
        }),
      );
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/reviews/:token/status", async (req, res, next) => {
    try {
      rate("review-write:" + req.ip, 20);
      const { author, status } = req.body;
      if (
        !str(author, 80) ||
        !["approved", "changes_requested"].includes(status)
      )
        throw new ApiError(400, "Invalid review submission");
      const current = await res.locals.store.publicReview(req.params.token);
      if (current.requireAuthenticatedApproval)
        throw new ApiError(
          401,
          "This review requires a signed-in approval. Use the authenticated decision endpoint.",
        );
      res.json(
        await res.locals.store.publicReview(req.params.token, "status", {
          author: author.trim(),
          status,
        }),
      );
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/reviews/:token/decision", auth, async (req, res, next) => {
    try {
      rate("review-write:" + req.ip, 20);
      const { status } = req.body;
      if (!["approved", "changes_requested"].includes(status))
        throw new ApiError(400, "Invalid review decision");
      const current = await res.locals.store.publicReview(req.params.token);
      if (current.workspaceId && mode === "local" && res.locals.store.getAny) {
        const { isWorkspace, assertWorkspaceAccess } =
          await import("../src/domain/team/teamOps.js");
        const row = await res.locals.store.getAny(
          "workspace",
          current.workspaceId,
        );
        if (!row || !isWorkspace(row.data))
          throw new ApiError(404, "Review workspace not found");
        try {
          assertWorkspaceAccess(row.data, res.locals.user.id, "approve");
        } catch (e: any) {
          throw new ApiError(e.status || 403, e.message);
        }
      }
      const actor = {
        userId: res.locals.user.id,
        email: res.locals.user.email,
        name: res.locals.user.name,
      };
      const updated = await res.locals.store.publicReview(
        req.params.token,
        "status",
        {
          author: actor.name,
          status,
          authenticated: true,
          userId: actor.userId,
          email: actor.email,
        },
      );
      if (current.workspaceId && mode === "local" && res.locals.store.getAny) {
        const { createAuditEvent } =
          await import("../src/domain/team/teamOps.js");
        const ws = await res.locals.store.getAny(
          "workspace",
          current.workspaceId,
        );
        if (ws) {
          const auditId = randomUUID();
          await res.locals.store.save(
            ws.owner_id,
            "audit",
            auditId,
            createAuditEvent({
              id: auditId,
              workspaceId: current.workspaceId,
              actor,
              action: "review.decision",
              target: req.params.token,
              detail: { status },
            }),
            0,
          );
        }
      }
      res.json(updated);
    } catch (e) {
      next(e);
    }
  });
  let active = 0;
  app.post("/api/design/concepts", auth, async (req, res, next) => {
    let acquired = false;
    try {
      const { validCreativeBrief } =
        await import("../src/domain/design/creativeDesign.js");
      if (!validCreativeBrief(req.body))
        throw new ApiError(
          400,
          "Add approved copy, a supported format and an optional image reference under 2 MB.",
        );
      rate("creative:" + res.locals.user.id, 10, 3600000);
      if (active >= 2)
        throw new ApiError(429, "Design creation is busy. Try again shortly.");
      active++;
      acquired = true;
      if (res.locals.store.consumeAnalysis)
        await res.locals.store.consumeAnalysis(res.locals.user.id);
      await billing.consume(res.locals.user.id);
      const { generateCreativeConcepts } = await import("./creative.js");
      res.json({
        concepts: await generateCreativeConcepts(
          req.body,
          AbortSignal.timeout(45000),
        ),
      });
    } catch (error) {
      next(error);
    } finally {
      if (acquired) active--;
    }
  });
  app.post("/api/reference/analyze", auth, async (req, res, next) => {
    let acquired = false;
    try {
      const { image, provider } = req.body;
      if (
        typeof image !== "string" ||
        image.length > 2800000 ||
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image) ||
        !["local", "openai", "gemini"].includes(provider)
      )
        throw new ApiError(
          400,
          "Use a PNG, JPEG, or WebP image under 2 MB and a supported provider",
        );
      rate("analysis:" + res.locals.user.id, 10, 3600000);
      if (res.locals.store.consumeAnalysis)
        await res.locals.store.consumeAnalysis(res.locals.user.id);
      if (active >= 2)
        throw new ApiError(429, "Analysis is busy. Try again shortly.");
      active++;
      acquired = true;
      await billing.consume(res.locals.user.id);
      const { analyzeReference } = await import("./analysis/index.mjs");
      const result = await analyzeReference({
        image,
        provider,
        signal: AbortSignal.timeout(50000),
      });
      res.json(result);
    } catch (e) {
      next(e);
    } finally {
      if (acquired) active--;
    }
  });
  app.post("/api/design-quality/critique", auth, async (req, res, next) => {
    try {
      rate("quality-critique:" + res.locals.user.id, 5, 3600000);
      const { critiqueQualityImages } = await import("./qualityCritic.js");
      const review = await critiqueQualityImages(
        req.body,
        AbortSignal.timeout(45000),
        () => billing.consume(res.locals.user.id),
      );
      res.json(review);
    } catch (error) {
      next(error);
    }
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Endpoint not found" }),
  );
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status =
      err.status === 413
        ? 413
        : Number.isInteger(err.status) && err.status >= 400 && err.status < 600
          ? err.status
          : 500;
    res.status(status).json({
      error:
        status === 500
          ? "The request could not be completed"
          : err.message || "Request failed",
      ...(err.code ? { code: err.code } : {}),
    });
  });
  app.locals.close = () => local?.db.close();
  return app;
}
