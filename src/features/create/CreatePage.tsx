import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FileImage,
  FileText,
  LayoutGrid,
  LoaderCircle,
  Presentation,
  Sparkles,
} from "lucide-react";
import { post, api, useAccount } from "../../shared/api/api";
import { ThemeToggle } from "../../shared/components/ThemeToggle";
import {
  Button,
  ChoiceCard,
  DropZone,
  EmptyProjectIllustration,
  IllustrationPanel,
  Select,
  Stepper,
  TextArea,
  createStepIndex,
  saveDestinationLabel,
} from "../../ui";
import { START_KEY } from "../../shared/navigation";
import { CreativeDirections } from "./components/CreativeDirections";
import { CreateWorkspaceSelector } from "./CreateWorkspaceSelector";
import {
  CreatePipelineProgressView,
  CreatePipelineResultView,
} from "./CreatePipelineResult";
import {
  runAiDesignerPipeline,
  type DesignerPipelineResult,
} from "../../domain/pipeline/designerPipeline";
import { FORMA_EDITORIAL_REPORT } from "../../domain/template-family/builtin/editorialReport";
import {
  referenceIntelligenceEnabled,
  type ReferenceDesignProfile,
} from "../../domain/reference-design/index";
import {
  templateAuthoringEnabled,
  LocalStorageTemplateRecordStore,
  applyApprovalToFamily,
  type TemplateFamilyRecord,
} from "../../domain/template-authoring/index";
import {
  analyzeImageReference,
  type AnalysisProviderId,
} from "./lib/referenceAnalysis";
import {
  readGuestBrand,
  normalizeBrand,
  type BrandSystem,
} from "../../domain/design/designSystem";
import {
  projectFromCreativeConcept,
  type CreativeBrief,
  type CreativeConcept,
} from "../../domain/design/creativeDesign";
import {
  readManuscriptFile,
  readReferenceFile,
} from "../editor/lib/fileImports";
import {
  LocalStorageWorkspaceStore,
  LocalStorageClientStore,
  type WorkspaceRecord,
  type ClientRecord,
} from "../../domain/workspace/index";

const familyChoices = [
  {
    id: "graphics",
    label: "Graphics",
    detail: "Flyers, banners and social designs",
  },
  {
    id: "document",
    label: "Documents",
    detail: "One-pagers, reports and whitepapers",
  },
  { id: "presentation", label: "Slides", detail: "Pitches, updates and decks" },
] as const;

const CREATE_DRAFT_KEY = "forma.createDraft.v1";
function readCreateDraft(): Partial<CreativeBrief> & {
  referenceName?: string;
} {
  try {
    const raw = sessionStorage.getItem(CREATE_DRAFT_KEY);
    const value = raw ? JSON.parse(raw) : {};
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export default function CreatePage() {
  const { session, ready } = useAccount();
  const [savedDraft] = useState(readCreateDraft);
  const [family, setFamily] = useState<CreativeBrief["family"]>(
    ["graphics", "document", "presentation"].includes(savedDraft.family || "")
      ? savedDraft.family!
      : "graphics",
  );
  const [format, setFormat] = useState<CreativeBrief["format"]>(
    ["portrait", "square", "story", "banner"].includes(savedDraft.format || "")
      ? savedDraft.format!
      : "portrait",
  );
  const [freedom, setFreedom] = useState<CreativeBrief["freedom"]>(
    ["close", "style", "explore"].includes(savedDraft.freedom || "")
      ? savedDraft.freedom!
      : "style",
  );
  const [manuscript, setManuscript] = useState(
    typeof savedDraft.manuscript === "string"
      ? savedDraft.manuscript.slice(0, 30000)
      : "",
  );
  const [reference, setReference] = useState(
    typeof savedDraft.reference === "string" &&
      savedDraft.reference.startsWith("data:image/")
      ? savedDraft.reference
      : "",
  );
  const [referenceName, setReferenceName] = useState(
    typeof savedDraft.referenceName === "string"
      ? savedDraft.referenceName
      : "",
  );
  const [brand, setBrand] = useState<BrandSystem | null>(null);
  const [useBrand, setUseBrand] = useState(true);
  const [concepts, setConcepts] = useState<CreativeConcept[]>([]);
  const [generatedBrief, setGeneratedBrief] = useState<CreativeBrief | null>(
    null,
  );
  const briefRevision = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [docMode, setDocMode] = useState<"report" | "standard">("report");
  const [pipelineProgress, setPipelineProgress] = useState<{
    stage: string;
    message: string;
    percent: number;
  } | null>(null);
  const [pipelineResult, setPipelineResult] =
    useState<DesignerPipelineResult | null>(null);
  const [referenceProfile, setReferenceProfile] =
    useState<ReferenceDesignProfile | null>(null);
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [referenceError, setReferenceError] = useState("");
  const [useReferenceStyle, setUseReferenceStyle] = useState(true);
  const [referenceProvider] = useState<AnalysisProviderId>("gemini");
  const [templateRecords, setTemplateRecords] = useState<
    TemplateFamilyRecord[]
  >([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    try {
      return new URLSearchParams(window.location.search).get("template") || "";
    } catch {
      return "";
    }
  });
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(() => {
    try {
      return new URLSearchParams(window.location.search).get("workspace") || "";
    } catch {
      return "";
    }
  });
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    try {
      return new URLSearchParams(window.location.search).get("client") || "";
    } catch {
      return "";
    }
  });
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);

  useEffect(() => {
    try {
      sessionStorage.removeItem(CREATE_DRAFT_KEY);
    } catch {
      /* private browser storage may be disabled */
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!session.user) {
      const localWs = new LocalStorageWorkspaceStore().list();
      setWorkspaces(localWs);
      if (selectedWorkspaceId) {
        setClients(new LocalStorageClientStore().list(selectedWorkspaceId));
      }
    } else {
      void api<{ workspaces: WorkspaceRecord[] }>("/workspaces")
        .then((res) => {
          setWorkspaces(res.workspaces || []);
          if (selectedWorkspaceId) {
            return api<{ clients: ClientRecord[] }>(
              `/workspaces/${encodeURIComponent(selectedWorkspaceId)}/clients`,
            ).then((cr) => setClients(cr.clients || []));
          }
        })
        .catch(() => {
          const localWs = new LocalStorageWorkspaceStore().list();
          setWorkspaces(localWs);
          if (selectedWorkspaceId) {
            setClients(new LocalStorageClientStore().list(selectedWorkspaceId));
          }
        });
    }
  }, [ready, session.user?.id, selectedWorkspaceId]);

  useEffect(() => {
    if (!templateAuthoringEnabled()) return;
    try {
      const approved = new LocalStorageTemplateRecordStore()
        .list()
        .filter((record) => record.status === "approved");
      setTemplateRecords(approved);
    } catch {
      setTemplateRecords([]);
    }
  }, []);

  const scopedTemplateRecords = useMemo(() => {
    return templateRecords
      .filter((record) => {
        if (
          selectedClientId &&
          record.clientId &&
          record.clientId !== selectedClientId
        ) {
          return false;
        }
        if (!selectedClientId && record.clientId) {
          return false;
        }
        if (
          selectedWorkspaceId &&
          record.workspaceId &&
          record.workspaceId !== selectedWorkspaceId
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aClient = a.clientId === selectedClientId ? 1 : 0;
        const bClient = b.clientId === selectedClientId ? 1 : 0;
        if (aClient !== bClient) return bClient - aClient;

        const aWs = a.workspaceId === selectedWorkspaceId ? 1 : 0;
        const bWs = b.workspaceId === selectedWorkspaceId ? 1 : 0;
        if (aWs !== bWs) return bWs - aWs;

        return a.name.localeCompare(b.name);
      });
  }, [templateRecords, selectedWorkspaceId, selectedClientId]);

  const selectedTemplate = useMemo(
    () =>
      scopedTemplateRecords.find(
        (record) => record.id === selectedTemplateId,
      ) ??
      templateRecords.find((record) => record.id === selectedTemplateId) ??
      null,
    [scopedTemplateRecords, templateRecords, selectedTemplateId],
  );
  useEffect(() => {
    if (!ready) return;
    if (!session.user) {
      setBrand(readGuestBrand());
      return;
    }
    void api<unknown>("/brand")
      .then((value) => setBrand(normalizeBrand(value)))
      .catch(() => setBrand(null));
  }, [ready, session.user?.id]);
  const brief = useMemo<CreativeBrief>(
    () => ({
      family,
      format,
      freedom,
      manuscript,
      ...(reference ? { reference } : {}),
      ...(useBrand && brand?.name ? { brand } : {}),
    }),
    [family, format, freedom, manuscript, reference, useBrand, brand],
  );
  useEffect(() => {
    briefRevision.current += 1;
    setConcepts([]);
  }, [brief]);
  const projects = useMemo(
    () =>
      concepts.map((concept) =>
        projectFromCreativeConcept(generatedBrief!, concept),
      ),
    [generatedBrief, concepts],
  );
  async function readCopy(file?: File) {
    if (!file) return;
    setError("");
    try {
      setManuscript(await readManuscriptFile(file));
      setConcepts([]);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }
  async function readReference(file?: File) {
    if (!file) return;
    setError("");
    try {
      const result = await readReferenceFile(file);
      setReference(result.data);
      setReferenceName(result.name);
      setReferenceProfile(null);
      setReferenceError("");
      setConcepts([]);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }
  async function analyzeReferenceStyle() {
    if (!reference) return;
    setReferenceBusy(true);
    setReferenceError("");
    try {
      const outcome = await analyzeImageReference({
        image: reference,
        provider: referenceProvider,
      });
      setReferenceProfile(outcome.profile);
      if (outcome.usedFallback)
        setReferenceError(
          "Reference analysis was unavailable; the standard family will be used.",
        );
    } catch (cause) {
      setReferenceError((cause as Error).message);
    } finally {
      setReferenceBusy(false);
    }
  }
  async function generate() {
    if (!session.user) {
      try {
        sessionStorage.setItem(
          CREATE_DRAFT_KEY,
          JSON.stringify({
            family,
            format,
            freedom,
            manuscript,
            reference,
            referenceName,
          }),
        );
        location.assign("/login?next=%2Fcreate");
      } catch {
        setError(
          "Browser storage is unavailable. Sign in, then return to Create with AI.",
        );
      }
      return;
    }
    if (family === "document" && docMode === "report") {
      setBusy(true);
      setError("");
      setConcepts([]);
      setPipelineResult(null);
      try {
        const usableFamily = selectedTemplate
          ? applyApprovalToFamily(
              selectedTemplate.family,
              selectedTemplate.approval,
              { requireApprovedLayouts: true, includeUnreviewed: false },
            )
          : FORMA_EDITORIAL_REPORT;
        if (selectedTemplate && usableFamily.layouts.length === 0) {
          setError(
            "The selected template has no approved layouts. Approve layouts in the Template Authoring Lab before generating with it.",
          );
          setBusy(false);
          return;
        }
        const res = await runAiDesignerPipeline(manuscript, {
          family: usableFamily,
          referenceProfile:
            useReferenceStyle && referenceProfile ? referenceProfile : null,
          templateRecord: selectedTemplate
            ? {
                recordId: selectedTemplate.id,
                templateId: selectedTemplate.templateId,
                versionNumber: selectedTemplate.versionNumber,
                source: selectedTemplate.source,
                status: selectedTemplate.status,
                ...(selectedTemplate.sharing?.visibility
                  ? { visibility: selectedTemplate.sharing.visibility }
                  : {}),
                ...(selectedTemplate.forkedFrom
                  ? {
                      forkedFromTemplateId:
                        selectedTemplate.forkedFrom.forkedFromTemplateId,
                      originalTemplateId:
                        selectedTemplate.forkedFrom.originalTemplateId,
                    }
                  : {}),
              }
            : null,
          workspaceId: selectedWorkspaceId || undefined,
          clientId: selectedClientId || undefined,
          onProgress: (u) => {
            setPipelineProgress({
              stage: u.stage,
              message: u.message,
              percent: u.progressPercent,
            });
          },
        });
        if (res.success) setPipelineResult(res);
        else
          setError(
            res.fitReport.unresolvedCount > 0
              ? "This copy is too long for the current report layout. Try shorter sections or edit the manuscript before generating."
              : "The report could not safely place every part of the approved copy. Review the manuscript and try again.",
          );
      } catch (cause) {
        setError((cause as Error).message || "Failed to generate report.");
      } finally {
        setBusy(false);
        setPipelineProgress(null);
      }
      return;
    }
    const revision = briefRevision.current;
    setBusy(true);
    setError("");
    setConcepts([]);
    setPipelineResult(null);
    try {
      const result = await post<{ concepts: CreativeConcept[] }>(
        "/design/concepts",
        brief,
      );
      if (revision === briefRevision.current) {
        setGeneratedBrief(brief);
        setConcepts(result.concepts);
      }
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function openPipelineProject() {
    if (!pipelineResult) return;
    try {
      const proj = pipelineResult.project;
      if (selectedWorkspaceId) proj.workspaceId = selectedWorkspaceId;
      if (selectedClientId) proj.clientId = selectedClientId;
      sessionStorage.setItem(
        START_KEY,
        JSON.stringify({
          owner: session.user?.id || "guest",
          start: "generated",
          project: proj,
        }),
      );
      location.assign("/editor");
    } catch {
      setError(
        "Browser storage is unavailable. Please enable it to open this design.",
      );
    }
  }
  function openProject(index: number) {
    const project = projects[index];
    if (!project) return;
    try {
      if (selectedWorkspaceId) project.workspaceId = selectedWorkspaceId;
      if (selectedClientId) project.clientId = selectedClientId;
      sessionStorage.setItem(
        START_KEY,
        JSON.stringify({
          owner: session.user?.id || "guest",
          start: "generated",
          project,
        }),
      );
      location.assign("/editor");
    } catch {
      setError(
        "Browser storage is unavailable. Please enable it to open this design.",
      );
    }
  }
  const workspaceName = workspaces.find(
    (w) => w.id === selectedWorkspaceId,
  )?.name;
  const clientName = clients.find((c) => c.id === selectedClientId)?.name;
  const step = createStepIndex({
    hasContent: Boolean(manuscript.trim()),
    generating: busy,
    hasResults: Boolean(concepts.length || pipelineResult),
  });
  const familyIcons = {
    graphics: <LayoutGrid size={14} />,
    document: <FileText size={14} />,
    presentation: <Presentation size={14} />,
  } as const;
  return (
    <div className="min-h-dvh bg-bg-page text-text-primary">
      <header className="flex h-[60px] items-center justify-between gap-4 border-b border-border bg-bg-panel px-5 md:px-8">
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-text-primary no-underline"
        >
          <ArrowLeft size={16} /> My designs
        </a>
        <strong className="forma-display text-[17px]">
          forma<span className="text-accent">.</span>
        </strong>
        <ThemeToggle compact />
      </header>
      <main className="mx-auto grid max-w-[1280px] gap-8 px-4 py-6 md:px-8 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] lg:py-8">
        <section className="min-w-0">
          <Stepper
            className="mb-6"
            currentStepIndex={step}
            steps={[
              { id: "words", label: "Words" },
              { id: "style", label: "Style" },
              { id: "review", label: "Review" },
            ]}
          />
          <h1 className="forma-display m-0 text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.08]">
            Start with your words.
          </h1>
          <p className="mt-2 mb-6 text-[13px] text-text-secondary">
            {saveDestinationLabel({ workspaceName, clientName })}
          </p>
          <div className="flex flex-col gap-5">
            <CreateWorkspaceSelector
              workspaces={workspaces}
              clients={clients}
              selectedWorkspaceId={selectedWorkspaceId}
              selectedClientId={selectedClientId}
              onSelectWorkspace={(id) => {
                setSelectedWorkspaceId(id);
                setSelectedClientId("");
              }}
              onSelectClient={setSelectedClientId}
            />
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2 text-[13px] font-semibold">
                What are you making?
              </legend>
              <div className="grid gap-2">
                {familyChoices.map((choice) => (
                  <ChoiceCard
                    key={choice.id}
                    name="family"
                    value={choice.id}
                    checked={family === choice.id}
                    onChange={() => {
                      setFamily(choice.id);
                      setConcepts([]);
                    }}
                    title={choice.label}
                    description={choice.detail}
                    icon={familyIcons[choice.id]}
                  />
                ))}
              </div>
            </fieldset>
            {family === "graphics" && (
              <Select
                label="Size"
                value={format}
                onChange={(event) => {
                  setFormat(event.target.value as CreativeBrief["format"]);
                  setConcepts([]);
                }}
              >
                <option value="portrait">Portrait flyer</option>
                <option value="square">Square post</option>
                <option value="story">Story</option>
                <option value="banner">Banner</option>
              </Select>
            )}
            {family === "document" && (
              <div className="space-y-3">
                <Select
                  label="Document type"
                  value={docMode}
                  onChange={(event) => {
                    setDocMode(event.target.value as "report" | "standard");
                    setConcepts([]);
                    setPipelineResult(null);
                  }}
                >
                  <option value="report">Branded report</option>
                  <option value="standard">Document</option>
                </Select>
                {docMode === "report" && templateAuthoringEnabled() && (
                  <Select
                    label="Template"
                    value={selectedTemplateId}
                    onChange={(event) =>
                      setSelectedTemplateId(event.target.value)
                    }
                  >
                    <option value="">Editorial report</option>
                    {scopedTemplateRecords.map((record) => (
                      <option key={record.id} value={record.id}>
                        {record.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            )}
            <TextArea
              id="creative-copy"
              label="Your manuscript"
              value={manuscript}
              maxLength={30000}
              rows={8}
              placeholder="Paste the exact words to include"
              onChange={(event) => {
                setManuscript(event.target.value);
                setConcepts([]);
              }}
            />
            <DropZone
              title="Upload a file"
              hint="TXT, DOCX, Markdown, or PDF"
              accept=".txt,.md,.docx,.pdf"
              onFile={(file) => void readCopy(file)}
            />
            <DropZone
              title="Add a reference"
              hint="Optional PNG, JPG, or WebP"
              accept="image/png,image/jpeg,image/webp"
              fileName={referenceName || undefined}
              icon={<FileImage size={18} />}
              onFile={(file) => void readReference(file)}
            />
            {family === "document" &&
              docMode === "report" &&
              referenceIntelligenceEnabled() &&
              reference && (
                <div className="rounded-2xl border border-border bg-bg-panel p-4">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-[13px]">Reference style</strong>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={referenceBusy}
                      onClick={() => void analyzeReferenceStyle()}
                    >
                      {referenceBusy ? "Reviewing…" : "Review style"}
                    </Button>
                  </div>
                  {referenceError && (
                    <p role="alert" className="mt-2 text-xs text-danger">
                      {referenceError}
                    </p>
                  )}
                  {referenceProfile && (
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {referenceProfile.extractedTokens.colors
                          .slice(0, 7)
                          .map((color) => (
                            <span
                              key={color.id}
                              title={color.role}
                              className="h-5 w-5 rounded-full border border-border"
                              style={{ background: color.value }}
                            />
                          ))}
                      </div>
                      <label className="flex items-center gap-2 text-[13px]">
                        <input
                          type="checkbox"
                          checked={useReferenceStyle}
                          onChange={(event) =>
                            setUseReferenceStyle(event.target.checked)
                          }
                          className="accent-[var(--accent)]"
                        />
                        Use this style
                      </label>
                    </div>
                  )}
                </div>
              )}
            {reference && (
              <fieldset className="m-0 border-0 p-0">
                <legend className="mb-2 text-[13px] font-semibold">
                  How close should we follow it?
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["close", "Follow closely"],
                      ["style", "Keep the style"],
                      ["explore", "Explore"],
                    ] as const
                  ).map(([id, label]) => (
                    <ChoiceCard
                      key={id}
                      name="freedom"
                      value={id}
                      checked={freedom === id}
                      onChange={() => {
                        setFreedom(id);
                        setConcepts([]);
                      }}
                      title={label}
                    />
                  ))}
                </div>
              </fieldset>
            )}
            {brand?.name && (
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={useBrand}
                  onChange={(event) => {
                    setUseBrand(event.target.checked);
                    setConcepts([]);
                  }}
                  className="accent-[var(--accent)]"
                />
                Use {brand.name} colors and fonts
              </label>
            )}
            <Button
              variant="primary"
              fullWidth
              size="lg"
              disabled={!ready || busy || !manuscript.trim()}
              iconLeft={
                busy ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Sparkles size={17} />
                )
              }
              onClick={() => void generate()}
            >
              {busy
                ? pipelineProgress
                  ? pipelineProgress.message
                  : "Creating design…"
                : family === "document" && docMode === "report"
                  ? "Create design"
                  : session.user
                    ? "Explore directions"
                    : "Sign in to create"}
            </Button>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-danger-muted p-3 text-sm text-danger"
              >
                {error}
              </p>
            )}
          </div>
        </section>

        {pipelineProgress ? (
          <CreatePipelineProgressView progress={pipelineProgress} />
        ) : pipelineResult ? (
          <CreatePipelineResultView
            pipelineResult={pipelineResult}
            onOpenProject={openPipelineProject}
          />
        ) : concepts.length ? (
          <CreativeDirections
            concepts={concepts}
            projects={projects}
            onOpen={openProject}
          />
        ) : (
          <IllustrationPanel
            scene="create"
            title="Pages will appear here"
            description="Add your words, pick a style, then review the pages."
            art={<EmptyProjectIllustration size={88} />}
          />
        )}
      </main>
    </div>
  );
}
