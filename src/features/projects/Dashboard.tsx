import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  FileImage,
  LayoutTemplate,
  Plus,
  Sparkles,
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
import { PageMeta, Preview } from "../site/PublicSite";
import Poster from "../editor/components/Poster";
import { DocumentPageView } from "../editor/canvas/DocumentCanvas";
import { SlideView } from "../editor/canvas/PresentationCanvas";
import {
  ActionCard,
  AppShell,
  Button,
  EmptyProjectIllustration,
  EmptyState,
  greeting,
  HeroPanel,
  PreviewCard,
  ProjectCard,
  SearchInput,
  SegmentedControl,
  Select,
  SkeletonCard,
  SlideDocumentIllustration,
} from "../../ui";
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

type ScopeFilter = "all" | "personal" | "workspace";

function ProjectPreview({ project }: { project: Project }) {
  if (project.family === "document" && project.flow) {
    return (
      <DocumentPageView
        flow={project.flow}
        page={project.flow.pages[0]}
        pageNumber={1}
        total={project.flow.pages.length}
        miniature
      />
    );
  }
  if (project.family === "presentation" && project.presentation) {
    return (
      <SlideView
        deck={project.presentation}
        slide={project.presentation.slides[0]}
        miniature
      />
    );
  }
  return <Poster miniature project={project} />;
}

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
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");

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
      if (scopeFilter === "personal") return !p.workspaceId;
      if (scopeFilter === "workspace") return Boolean(p.workspaceId);
      return true;
    })
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b.updatedAt.localeCompare(a.updatedAt),
    );
  const hello = greeting(new Date(), session.user?.name);
  const hasWorkspaceProjects = projects.some((p) => p.workspaceId);
  return (
    <AppShell
      activeNavId="designs"
      contentWidth="wide"
      userName={session.user?.name}
      guest={!session.user}
      currentScope={{
        type: "personal",
        name: session.user?.name || "Guest",
        subName: session.user ? "Personal" : "Saved on this device",
      }}
    >
      <PageMeta title="My designs" privatePage />
      <div className="flex flex-col gap-8">
        <HeroPanel
          kicker="Your studio"
          title={hello}
          subtitle="Start with your words. Pick a style. Review the pages."
          actions={
            <Button
              variant="primary"
              size="lg"
              iconLeft={<Sparkles size={16} />}
              disabled={!ready || !!accountError}
              onClick={() => location.assign("/create")}
            >
              Create design
            </Button>
          }
          art={<SlideDocumentIllustration size={176} />}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <ActionCard
            tone="feature"
            title="Create with AI"
            description="Paste a manuscript. Get pages."
            href="/create"
            icon={<Sparkles size={18} />}
          />
          <ActionCard
            title="Use a template"
            description="Start with a ready layout"
            icon={<LayoutTemplate size={18} />}
            disabled={!ready || !!accountError}
            onClick={() => create("template")}
          />
          <ActionCard
            title="Use a reference"
            description="Upload a design to adapt"
            icon={<FileImage size={18} />}
            disabled={!ready || !!accountError}
            onClick={() => create("reference")}
          />
        </div>

        <section aria-labelledby="designs-title">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2
              id="designs-title"
              className="forma-display m-0 text-[20px] font-semibold"
            >
              Recent designs
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                label="Search designs"
                value={query}
                onChange={setQuery}
                className="w-[200px] max-sm:w-full"
              />
              <SegmentedControl
                label="Scope"
                size="sm"
                value={scopeFilter}
                onChange={setScopeFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "personal", label: "Personal" },
                  ...(hasWorkspaceProjects
                    ? [{ value: "workspace" as const, label: "Workspace" }]
                    : []),
                ]}
              />
              <Select
                aria-label="Sort designs"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                fullWidth={false}
                className="w-[120px]"
              >
                <option value="recent">Recent</option>
                <option value="name">Name</option>
              </Select>
            </div>
          </div>

          {accountError || error ? (
            <div
              className="flex items-center gap-3 rounded-2xl bg-danger-muted px-4 py-3 text-sm text-danger"
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
            <div
              className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5"
              role="status"
            >
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : visible.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
              {visible.map((p) => (
                <ProjectCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  family={p.family}
                  templateName={
                    templates.find((t) => t.id === p.template)?.name ||
                    p.template
                  }
                  updatedAt={p.updatedAt}
                  qualityScore={
                    typeof p.metadata?.qualityScore === "number"
                      ? p.metadata.qualityScore
                      : 90
                  }
                  workspaceName={
                    p.workspaceId ? workspaceMap.get(p.workspaceId) : undefined
                  }
                  clientName={
                    p.clientId ? clientMap.get(p.clientId) : undefined
                  }
                  preview={<ProjectPreview project={p} />}
                  onOpen={() =>
                    location.assign(
                      `/editor?project=${encodeURIComponent(p.id)}`,
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              illustration={<EmptyProjectIllustration size={88} />}
              title={query ? "No matching designs" : "Start your first design"}
              description={
                query
                  ? "Try another keyword."
                  : "Create a design from your words, a template, or a reference."
              }
              action={
                query
                  ? { label: "Clear search", onClick: () => setQuery("") }
                  : {
                      label: "Create design",
                      onClick: () => location.assign("/create"),
                      icon: <Plus size={15} />,
                    }
              }
              secondaryAction={
                !query
                  ? {
                      label: "Explore templates",
                      onClick: () => create("template"),
                    }
                  : undefined
              }
            />
          )}
        </section>

        <section id="studio-templates" aria-labelledby="templates-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2
              id="templates-title"
              className="forma-display m-0 text-[20px] font-semibold"
            >
              Templates
            </h2>
            <a
              href="/templates"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-text-secondary no-underline hover:text-text-primary"
            >
              Browse all <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {templates.map((t) => (
              <button
                className="group text-left"
                key={t.id}
                type="button"
                aria-label={`Use ${t.name} template`}
                disabled={!ready || !!accountError}
                onClick={() => create("template", t.id)}
              >
                <PreviewCard preview={<Preview template={t.id} />} />
                <span className="mt-2 block text-[13px] font-semibold">
                  {t.name}
                </span>
                <small className="text-xs text-text-tertiary">
                  {t.category}
                </small>
              </button>
            ))}
          </div>
          {projects.some(
            (project) =>
              project.isTemplate &&
              (!project.family || project.family === "graphics"),
          ) && (
            <div className="mt-8 border-t border-border pt-6">
              <h3 className="forma-display m-0 text-[18px]">Your templates</h3>
              <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
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
                      className="text-left"
                      onClick={() => setJobTemplate(project)}
                    >
                      <PreviewCard
                        preview={<Poster miniature project={project} />}
                      />
                      <strong className="mt-2 block text-[13px]">
                        {project.name.replace(/\s+template$/i, "")}
                      </strong>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </section>
      </div>
      {jobTemplate && (
        <TemplateJobDialog
          template={jobTemplate}
          brandName={brandName}
          onClose={() => setJobTemplate(null)}
          onCreate={createFromSavedTemplate}
        />
      )}
    </AppShell>
  );
}
