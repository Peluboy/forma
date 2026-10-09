import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  FileImage,
  FolderOpen,
  LayoutGrid,
  LayoutTemplate,
  Plus,
  Search,
  Settings,
  CircleHelp,
  Building2,
  Briefcase,
  User,
} from "lucide-react";
import { api, useAccount } from "../../shared/api/api";
import {
  isProject,
  templates,
  type Project,
  type TemplateId,
} from "../../domain/design/model";
import { START_KEY } from "../../shared/navigation";
import { readLocalProjects } from "../editor/hooks/usePersistence";
import { Logo, PageMeta, Preview } from "../site/PublicSite";
import Poster from "../editor/components/Poster";
import { ThemeToggle } from "../../shared/components/ThemeToggle";
import { Button } from "../../shared/components/ui/Button";
import { TemplateJobDialog, type TemplateJobInput } from "./TemplateJobDialog";
import {
  normalizeBrand,
  readGuestBrand,
} from "../../domain/design/designSystem";
import {
  LocalStorageWorkspaceStore,
  LocalStorageClientStore,
  type WorkspaceRecord,
  type ClientRecord,
} from "../../domain/workspace";
import "./dashboard.css";

export default function Dashboard() {
  const { session, ready, error: accountError } = useAccount();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [retry, setRetry] = useState(0);
  const [jobTemplate, setJobTemplate] = useState<Project | null>(null);
  const [brandName, setBrandName] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");

  useEffect(() => {
    const wsStore = new LocalStorageWorkspaceStore();
    const clStore = new LocalStorageClientStore();
    const localWs = wsStore.list();
    const localCl = clStore.list();

    if (session.user) {
      api<{ workspaces: WorkspaceRecord[] }>("/workspaces")
        .then((res) => {
          const merged = [...(res.workspaces || [])];
          for (const lw of localWs) {
            if (!merged.some((m) => m.id === lw.id)) merged.push(lw);
          }
          setWorkspaces(merged);
        })
        .catch(() => setWorkspaces(localWs));
      setClients(localCl);
    } else {
      setWorkspaces(localWs);
      setClients(localCl);
    }
  }, [session.user?.id]);
  useEffect(() => {
    if (!ready) return;
    if (!session.user) {
      setBrandName(readGuestBrand().name);
      return;
    }
    void api<unknown>("/brand")
      .then((value) => setBrandName(normalizeBrand(value).name))
      .catch(() => setBrandName(""));
  }, [ready, session.user?.id]);
  useEffect(() => {
    if (!ready || accountError) return;
    let active = true;
    setLoading(true);
    setError("");
    const request = session.user
      ? api<{ projects: { project: Project }[] }>("/projects").then((r) =>
          r.projects.map((row) => row.project).filter(isProject),
        )
      : Promise.resolve(readLocalProjects());
    void request
      .then((rows) => {
        if (active) setProjects(rows);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ready, session.user?.id, accountError, retry]);
  function create(
    start: "reference" | "template",
    template: TemplateId = "gathering",
  ) {
    try {
      sessionStorage.setItem(
        START_KEY,
        JSON.stringify({ owner: session.user?.id || "guest", start, template }),
      );
      location.assign("/editor");
    } catch {
      setError("Browser storage is unavailable. Enable it to start a design.");
    }
  }
  function createFromSavedTemplate(input: TemplateJobInput) {
    try {
      sessionStorage.setItem(
        START_KEY,
        JSON.stringify({
          owner: session.user?.id || "guest",
          start: "saved-template",
          ...input,
        }),
      );
      location.assign("/editor");
    } catch {
      setJobTemplate(null);
      setError("Browser storage is unavailable. Enable it to start a design.");
    }
  }
  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients],
  );
  const workspaceMap = useMemo(
    () => new Map(workspaces.map((w) => [w.id, w.name])),
    [workspaces],
  );

  const visible = projects
    .filter((p) => {
      if (
        query.trim() &&
        !p.name.toLowerCase().includes(query.trim().toLowerCase())
      ) {
        return false;
      }
      if (templateFilter !== "all" && p.template !== templateFilter) {
        return false;
      }
      if (scopeFilter === "personal") {
        return !p.workspaceId;
      }
      if (scopeFilter.startsWith("workspace:")) {
        const wsId = scopeFilter.slice("workspace:".length);
        return p.workspaceId === wsId;
      }
      if (scopeFilter.startsWith("client:")) {
        const clId = scopeFilter.slice("client:".length);
        return p.clientId === clId;
      }
      return true;
    })
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b.updatedAt.localeCompare(a.updatedAt),
    );
  return (
    <div className="dashboard-page min-h-dvh bg-bg-page text-text-primary font-[var(--font-ui)] [&_*]:box-border [&_button]:font-inherit [&_input]:font-inherit [&_select]:font-inherit [&_a]:text-inherit [&_a]:no-underline">
      <PageMeta title="My designs" privatePage />

      {/* Skip link */}
      <a
        className="fixed top-[-60px] z-10 bg-bg-elevated text-text-primary px-3 py-3 rounded-sm focus:top-2"
        href="#studio-main"
      >
        Skip to designs
      </a>

      {/* Sidebar */}
      <aside className="dashboard-sidebar w-[240px] fixed inset-y-0 left-0 bg-bg-panel border-r border-border px-4 py-6 flex flex-col gap-6 max-[900px]:static max-[900px]:w-auto max-[900px]:border-r-0 max-[900px]:border-b max-[900px]:border-border max-[900px]:p-4">
        <Logo />
        <div className="dashboard-workspace flex items-center gap-[10px]">
          {/* Avatar */}
          <span className="grid place-items-center w-8 h-8 rounded-sm bg-accent-muted text-selected-fg font-[650] shrink-0 text-sm">
            {session.user?.name[0]?.toUpperCase() || "G"}
          </span>
          <div>
            <strong className="block text-sm font-semibold">
              {session.user ? "Personal workspace" : "Guest workspace"}
            </strong>
            <small className="block text-xs text-text-tertiary mt-0.5 max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
              {session.user ? session.user.name : "Saved on this device"}
            </small>
          </div>
        </div>

        {/* New design CTA */}
        <button
          className="dashboard-new flex items-center justify-center gap-2 h-9 rounded-sm bg-accent text-text-on-accent font-semibold text-sm w-full hover:enabled:bg-accent-hover disabled:opacity-45"
          disabled={!ready || !!accountError}
          onClick={() => create("template")}
        >
          <Plus size={18} strokeWidth={1.75} />
          New design
        </button>

        <nav
          className="dashboard-nav flex flex-col gap-0.5"
          aria-label="Workspace navigation"
        >
          <a
            href="/dashboard"
            aria-current="page"
            className="flex items-center gap-[10px] px-[10px] py-2 rounded-sm text-text-secondary text-sm font-medium hover:bg-bg-muted hover:text-text-primary aria-[current=page]:bg-bg-muted aria-[current=page]:text-text-primary"
          >
            <LayoutGrid size={18} strokeWidth={1.75} />
            My designs
          </a>
          <a
            href="#studio-templates"
            className="flex items-center gap-[10px] px-[10px] py-2 rounded-sm text-text-secondary text-sm font-medium hover:bg-bg-muted hover:text-text-primary"
          >
            <LayoutTemplate size={18} strokeWidth={1.75} />
            Templates
          </a>
          <a
            href="/account"
            className="flex items-center gap-[10px] px-[10px] py-2 rounded-sm text-text-secondary text-sm font-medium hover:bg-bg-muted hover:text-text-primary"
          >
            <Settings size={18} strokeWidth={1.75} />
            Account
          </a>
          <a
            href="/help"
            className="dashboard-mobile-help flex items-center gap-[10px] px-[10px] py-2 rounded-sm text-text-secondary text-sm font-medium hover:bg-bg-muted hover:text-text-primary"
          >
            <CircleHelp size={18} strokeWidth={1.75} />
            Help
          </a>
        </nav>

        <div className="dashboard-sidebar-footer mt-auto flex flex-col gap-[10px] text-sm text-text-secondary">
          <a
            href="/help"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary"
          >
            <CircleHelp size={16} strokeWidth={1.75} />
            Help
          </a>
          {!session.user && ready && (
            <a
              href="/signup?next=/dashboard"
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary"
            >
              Create an account <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </aside>

      {/* Main */}
      <main
        id="studio-main"
        className="dashboard-main ml-[240px] min-h-dvh px-8 pb-12 max-[900px]:ml-0 max-[900px]:px-4 max-[900px]:pb-6"
      >
        {/* Topbar */}
        <header className="h-14 flex items-center justify-end gap-4 border-b border-border -mx-8 px-8 text-text-secondary text-sm max-[900px]:-mx-4 max-[900px]:px-4">
          <ThemeToggle compact />
          <a
            href={session.user ? "/account" : "/login?next=/dashboard"}
            className="inline-flex items-center gap-2 font-medium"
          >
            {session.user?.name || "Sign in"}
            <span className="grid place-items-center w-8 h-8 rounded-sm bg-accent-muted text-selected-fg font-[650] shrink-0 text-sm">
              {session.user?.name[0]?.toUpperCase() || "G"}
            </span>
          </a>
        </header>

        <section
          className="dashboard-start mt-7 grid grid-cols-1 gap-6 rounded-2xl bg-[var(--dashboard-ink)] px-7 py-6 text-[#f2f7f2] min-[1101px]:grid-cols-[minmax(220px,0.9fr)_minmax(400px,1.6fr)] max-[600px]:mt-4 max-[600px]:p-5"
          aria-labelledby="start-title"
        >
          <div className="dashboard-start-copy">
            <span className="dashboard-kicker">YOUR STUDIO</span>
            <h1 id="start-title">Start a design.</h1>
            <p>Bring your words. Explore new directions in minutes.</p>
          </div>
          <div className="min-w-0">
            <a
              href="/create"
              className="mb-4 flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-white/20 bg-white px-5 py-4 text-slate-950 no-underline shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span className="flex flex-col gap-1">
                <strong
                  className="text-base font-semibold"
                  style={{ color: "#173b2e" }}
                >
                  Create with AI
                </strong>
                <small className="text-sm text-slate-600">
                  Flyers, documents and slides from your manuscript
                </small>
              </span>
              <ArrowUpRight size={20} aria-hidden="true" color="#173b2e" />
            </a>
            <div className="dashboard-start-options grid grid-cols-1 gap-2.5 min-[601px]:grid-cols-2">
              <button
                type="button"
                disabled={!ready || !!accountError}
                onClick={() => create("template")}
              >
                <LayoutTemplate size={22} strokeWidth={1.6} />
                <span>
                  <strong>Use a template</strong>
                  <small>Start with a ready layout</small>
                </span>
                <ArrowUpRight size={18} strokeWidth={1.7} />
              </button>
              <button
                type="button"
                disabled={!ready || !!accountError}
                onClick={() => create("reference")}
              >
                <FileImage size={22} strokeWidth={1.6} />
                <span>
                  <strong>Use a reference</strong>
                  <small>Upload a design to adapt</small>
                </span>
                <ArrowUpRight size={18} strokeWidth={1.7} />
              </button>
            </div>
          </div>
        </section>

        {/* Projects section */}
        <section className="pt-6" aria-labelledby="designs-title">
          {/* Section heading */}
          <div className="flex items-end justify-between gap-4 mb-4 max-[600px]:flex-col max-[600px]:items-stretch">
            <div>
              <h2
                id="designs-title"
                className="m-0 text-xl font-semibold tracking-[-0.3px]"
              >
                My designs
              </h2>
              <p className="mt-1 text-text-secondary text-sm">
                {session.user
                  ? "Recent projects from your account."
                  : "Saved in this browser."}
              </p>
            </div>
            {/* Search + filter + sort */}
            <div className="flex flex-wrap gap-2 items-center max-[600px]:w-full">
              <label className="flex items-center gap-2 h-8 px-[10px] border border-border rounded-sm bg-bg-panel text-text-tertiary max-[600px]:flex-1 min-w-0">
                <Search size={16} strokeWidth={1.75} />
                <input
                  aria-label="Search designs"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="min-w-0 border-0 bg-transparent text-text-primary w-[140px] text-sm max-[600px]:w-full"
                />
              </label>

              <select
                aria-label="Filter by scope"
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                className="h-8 border border-border rounded-sm bg-bg-panel text-text-primary px-2 text-xs max-[600px]:shrink-0"
              >
                <option value="all">All Scopes</option>
                <option value="personal">Personal only</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={`workspace:${w.id}`}>
                    Workspace: {w.name}
                  </option>
                ))}
                {clients.map((c) => (
                  <option key={c.id} value={`client:${c.id}`}>
                    Client: {c.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by template"
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="h-8 border border-border rounded-sm bg-bg-panel text-text-primary px-2 text-xs max-[600px]:shrink-0"
              >
                <option value="all">All Templates</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Sort designs"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-8 border border-border rounded-sm bg-bg-panel text-text-primary px-[10px] text-xs max-[600px]:shrink-0"
              >
                <option value="recent">Recent</option>
                <option value="name">Name</option>
              </select>

              <a
                href="/workspaces"
                className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-sm border border-border bg-bg-panel text-xs text-text-secondary hover:text-text-primary transition-colors"
                title="Manage workspaces & clients"
              >
                <Building2 size={14} className="text-accent" />
                Workspaces
              </a>
            </div>
          </div>

          {accountError || error ? (
            <div
              className="my-4 px-[14px] py-3 rounded-md bg-danger-muted text-danger text-sm flex items-center gap-3"
              role="alert"
            >
              <span>{accountError || error}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  accountError ? location.reload() : setRetry((r) => r + 1)
                }
              >
                Try again
              </Button>
            </div>
          ) : loading ? (
            <p role="status">Loading designs…</p>
          ) : visible.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {visible.map((p) => (
                <a
                  className="flex flex-col gap-[10px] text-left p-0 bg-transparent border-0 text-inherit no-underline"
                  key={p.id}
                  href={`/editor?project=${encodeURIComponent(p.id)}`}
                  aria-label={`Open ${p.name}`}
                >
                  <div
                    className="aspect-[4/5] rounded-md border border-border bg-bg-muted overflow-hidden grid place-items-center"
                    aria-hidden="true"
                  >
                    <Poster miniature project={p} />
                  </div>
                  <div>
                    <strong className="block text-sm font-[550]">
                      {p.name}
                    </strong>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-text-tertiary">
                      <span>
                        {templates.find((t) => t.id === p.template)?.name ||
                          p.template}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 font-medium text-text-secondary">
                        {p.clientId ? (
                          <>
                            <Briefcase size={11} className="text-accent" />
                            {clientMap.get(p.clientId) || "Client"}
                          </>
                        ) : p.workspaceId ? (
                          <>
                            <Building2 size={11} className="text-accent" />
                            {workspaceMap.get(p.workspaceId) || "Workspace"}
                          </>
                        ) : (
                          <>
                            <User size={11} /> Personal
                          </>
                        )}
                      </span>
                      {typeof p.metadata?.qualityScore === "number" && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-600 font-semibold">
                            {p.metadata.qualityScore}/100
                          </span>
                        </>
                      )}
                    </div>
                    <small className="block text-text-tertiary text-xs mt-0.5">
                      Edited{" "}
                      {new Date(p.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </small>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-border-strong rounded-lg py-12 px-6 text-center bg-bg-panel">
              <FolderOpen size={28} strokeWidth={1.75} />
              <h3 className="mt-0 mb-2 text-lg">
                {query ? "No matching designs" : "Create your first design"}
              </h3>
              <p className="mt-0 mb-4 text-text-secondary text-sm max-w-[40ch] mx-auto">
                {query
                  ? "Try another name or clear search."
                  : "Start from a template or upload a reference image."}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {query ? (
                  <Button variant="secondary" onClick={() => setQuery("")}>
                    Clear search
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      disabled={!ready || !!accountError}
                      onClick={() => create("template")}
                    >
                      <Plus size={16} strokeWidth={1.75} />
                      Use a template
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={!ready || !!accountError}
                      onClick={() => create("reference")}
                    >
                      <FileImage size={16} strokeWidth={1.75} />
                      Upload a reference
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Templates section */}
        <section
          id="studio-templates"
          className="mt-12"
          aria-labelledby="templates-title"
        >
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h2
                id="templates-title"
                className="m-0 text-xl font-semibold tracking-[-0.3px]"
              >
                Templates
              </h2>
              <p className="mt-1 text-text-secondary text-sm">
                Pick a layout. Keep your own wording.
              </p>
            </div>
            <a href="/templates" className="text-sm">
              Browse all <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {templates.map((t) => (
              <button
                className="text-left bg-transparent border-0 p-0 text-inherit disabled:opacity-45"
                key={t.id}
                aria-label={`Use ${t.name} template`}
                disabled={!ready || !!accountError}
                onClick={() => create("template", t.id)}
              >
                <div
                  className="aspect-[3/4] rounded-md border border-border bg-bg-muted overflow-hidden grid place-items-center"
                  aria-hidden="true"
                >
                  <Preview template={t.id} />
                </div>
                <span className="block mt-2 text-sm font-[550]">{t.name}</span>
                <small className="text-text-tertiary text-xs">
                  Use this template
                </small>
              </button>
            ))}
          </div>
          {projects.some(
            (project) =>
              project.isTemplate &&
              (!project.family || project.family === "graphics"),
          ) && (
            <div className="dashboard-owned-templates">
              <div>
                <h3>Your templates</h3>
                <p>Reuse a design with new approved copy.</p>
              </div>
              <div className="dashboard-owned-template-grid">
                {projects
                  .filter(
                    (project) =>
                      project.isTemplate &&
                      (!project.family || project.family === "graphics"),
                  )
                  .map((project) => (
                    <button
                      type="button"
                      key={project.id}
                      onClick={() => setJobTemplate(project)}
                    >
                      <span className="dashboard-owned-template-preview">
                        <Poster miniature project={project} />
                      </span>
                      <strong>
                        {project.name.replace(/\s+template$/i, "")}
                      </strong>
                      <small>Use with new copy</small>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </section>
      </main>
      {jobTemplate && (
        <TemplateJobDialog
          template={jobTemplate}
          brandName={brandName}
          onClose={() => setJobTemplate(null)}
          onCreate={createFromSavedTemplate}
        />
      )}
    </div>
  );
}
