import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FileImage,
  FileText,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { post, api, useAccount } from "../../shared/api/api";
import { Button } from "../../shared/components/ui/Button";
import { ThemeToggle } from "../../shared/components/ThemeToggle";
import { START_KEY } from "../../shared/navigation";
import { CreativeDirections } from "./components/CreativeDirections";
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
import { CheckCircle2, ExternalLink } from "lucide-react";
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
  const [referenceProvider, setReferenceProvider] =
    useState<AnalysisProviderId>("gemini");
  const [templateRecords, setTemplateRecords] = useState<
    TemplateFamilyRecord[]
  >([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  useEffect(() => {
    try {
      sessionStorage.removeItem(CREATE_DRAFT_KEY);
    } catch {
      /* private browser storage may be disabled */
    }
  }, []);
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
  const selectedTemplate = useMemo(
    () =>
      templateRecords.find((record) => record.id === selectedTemplateId) ??
      null,
    [templateRecords, selectedTemplateId],
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
      sessionStorage.setItem(
        START_KEY,
        JSON.stringify({
          owner: session.user?.id || "guest",
          start: "generated",
          project: pipelineResult.project,
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
  return (
    <div className="min-h-dvh bg-bg-page text-text-primary font-[var(--font-ui)]">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border bg-bg-panel px-5 md:px-8">
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary no-underline"
        >
          <ArrowLeft size={17} /> My designs
        </a>
        <strong className="font-[var(--font-display)] text-lg tracking-[-0.06em]">
          forma<span className="text-accent">.</span>
        </strong>
        <ThemeToggle compact />
      </header>
      <main className="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 md:px-8 lg:grid-cols-[minmax(330px,430px)_minmax(0,1fr)] lg:gap-12 lg:py-12">
        <section className="min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
            Create with AI
          </span>
          <h1 className="mt-2 mb-2 font-[var(--font-display)] text-[clamp(32px,4vw,48px)] font-semibold leading-[1.08] tracking-[-0.07em]">
            Start with your words.
          </h1>
          <p className="mb-8 max-w-[42ch] text-sm leading-6 text-text-secondary">
            Explore three editable design directions for your content. You
            choose what becomes final.
          </p>
          <div className="space-y-6">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">
                What are you making?
              </legend>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                {familyChoices.map((choice) => (
                  <label
                    key={choice.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${family === choice.id ? "border-accent bg-accent-muted" : "border-border bg-bg-panel"}`}
                  >
                    <input
                      type="radio"
                      name="family"
                      value={choice.id}
                      checked={family === choice.id}
                      onChange={() => {
                        setFamily(choice.id);
                        setConcepts([]);
                      }}
                      className="mt-1 accent-[var(--accent)]"
                    />
                    <span>
                      <strong className="block text-sm">{choice.label}</strong>
                      <small className="text-xs text-text-secondary">
                        {choice.detail}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {family === "graphics" && (
              <label className="block text-sm font-semibold">
                Size
                <select
                  value={format}
                  onChange={(event) => {
                    setFormat(event.target.value as CreativeBrief["format"]);
                    setConcepts([]);
                  }}
                  className="mt-2 h-11 w-full rounded-lg border border-border-strong bg-bg-panel px-3 text-sm font-normal text-text-primary"
                >
                  <option value="portrait">Portrait flyer</option>
                  <option value="square">Square post</option>
                  <option value="story">Story</option>
                  <option value="banner">Banner</option>
                </select>
              </label>
            )}
            {family === "document" && (
              <div className="space-y-3">
                <label className="block text-sm font-semibold">
                  Document Workflow
                  <select
                    value={docMode}
                    onChange={(event) => {
                      setDocMode(event.target.value as "report" | "standard");
                      setConcepts([]);
                      setPipelineResult(null);
                    }}
                    className="mt-2 h-11 w-full rounded-lg border border-border-strong bg-bg-panel px-3 text-sm font-normal text-text-primary"
                  >
                    <option value="report">
                      Multi-page Branded Report (Forma AI Designer)
                    </option>
                    <option value="standard">
                      Standard Article / Document
                    </option>
                  </select>
                </label>
                {docMode === "report" && (
                  <div className="space-y-3">
                    {templateAuthoringEnabled() && (
                      <label className="block text-sm font-semibold">
                        Template
                        <select
                          value={selectedTemplateId}
                          onChange={(event) =>
                            setSelectedTemplateId(event.target.value)
                          }
                          className="mt-2 h-11 w-full rounded-lg border border-border-strong bg-bg-panel px-3 text-sm font-normal text-text-primary"
                        >
                          <option value="">
                            Forma Editorial Report (built-in, approved)
                          </option>
                          {templateRecords.map((record) => (
                            <option key={record.id} value={record.id}>
                              {record.name} · v{record.versionNumber}
                              {record.source === "forked" ? " · forked" : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-text-secondary flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-text-primary font-medium mb-0.5">
                          Template:{" "}
                          {selectedTemplate
                            ? selectedTemplate.name
                            : "Forma Editorial Report"}
                        </strong>
                        <span>
                          {selectedTemplate
                            ? `An approved template record (${selectedTemplate.source}, v${selectedTemplate.versionNumber}${
                                selectedTemplate.sharing?.visibility
                                  ? `, ${selectedTemplate.sharing.visibility}`
                                  : ""
                              }). Only approved layouts are used.`
                            : "Structured multi-page layouts with exact copy integrity, measured fit checking, and visual critique."}
                        </span>
                        {selectedTemplate?.forkedFrom && (
                          <span className="mt-1 block text-text-secondary">
                            Forked from{" "}
                            {selectedTemplate.forkedFrom.originalTemplateId}
                            {" · "}
                            {selectedTemplate.forkedFrom.forkedAt.slice(0, 10)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <label
                htmlFor="creative-copy"
                className="mb-2 block text-sm font-semibold"
              >
                Approved manuscript
              </label>
              <textarea
                id="creative-copy"
                value={manuscript}
                maxLength={30000}
                onChange={(event) => {
                  setManuscript(event.target.value);
                  setConcepts([]);
                }}
                placeholder="Paste the exact words to include"
                className="min-h-40 w-full resize-y rounded-xl border border-border-strong bg-bg-panel p-3 text-sm leading-6 text-text-primary placeholder:text-text-tertiary focus:outline-2 focus:outline-offset-2 focus:outline-accent"
              />
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-accent focus-within:outline-2 focus-within:outline-accent">
                <FileText size={16} /> Upload TXT, DOCX, Markdown or text PDF
                <input
                  type="file"
                  accept=".txt,.md,.docx,.pdf"
                  className="sr-only"
                  onChange={(event) => void readCopy(event.target.files?.[0])}
                />
              </label>
            </div>
            <div>
              <span className="mb-2 block text-sm font-semibold">
                Visual reference{" "}
                <span className="font-normal text-text-tertiary">optional</span>
              </span>
              <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border-strong bg-bg-panel p-3 text-sm text-text-secondary focus-within:outline-2 focus-within:outline-accent">
                <FileImage size={19} />{" "}
                {referenceName || "Upload a PNG, JPG or WebP design"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) =>
                    void readReference(event.target.files?.[0])
                  }
                />
              </label>
            </div>
            {family === "document" &&
              docMode === "report" &&
              referenceIntelligenceEnabled() &&
              reference && (
                <div className="space-y-3 rounded-xl border border-border bg-bg-panel p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm">
                      Reference design intelligence
                    </strong>
                    <span className="text-[11px] text-text-tertiary">
                      v1 · not reconstruction
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-text-secondary">
                    Extract palette, typography and layout patterns to generate
                    a new editable document in a similar visual language.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs text-text-secondary">
                      Provider{" "}
                      <select
                        aria-label="Reference analysis provider"
                        value={referenceProvider}
                        onChange={(event) =>
                          setReferenceProvider(
                            event.target.value as AnalysisProviderId,
                          )
                        }
                        className="h-9 rounded-lg border border-border-strong bg-bg-panel px-2 text-xs"
                      >
                        <option
                          value="gemini"
                          disabled={!session.capabilities?.analysis?.gemini}
                        >
                          Gemini vision
                        </option>
                        <option
                          value="local"
                          disabled={!session.capabilities?.analysis?.local}
                        >
                          Local OCR
                        </option>
                        <option
                          value="openai"
                          disabled={!session.capabilities?.analysis?.openai}
                        >
                          OpenAI vision
                        </option>
                      </select>
                    </label>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={referenceBusy}
                      onClick={() => void analyzeReferenceStyle()}
                    >
                      {referenceBusy ? "Analyzing…" : "Analyze reference"}
                    </Button>
                  </div>
                  {referenceError && (
                    <p role="alert" className="text-xs text-danger">
                      {referenceError}
                    </p>
                  )}
                  {referenceProfile && (
                    <div className="space-y-2 text-xs text-text-secondary">
                      <div className="flex flex-wrap gap-1.5">
                        {referenceProfile.extractedTokens.colors
                          .slice(0, 7)
                          .map((color) => (
                            <span
                              key={color.id}
                              className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5"
                            >
                              <span
                                aria-hidden
                                style={{ background: color.value }}
                                className="inline-block h-3 w-3 rounded-sm border border-border"
                              />
                              {color.role}
                            </span>
                          ))}
                      </div>
                      <div>
                        Tone: {referenceProfile.visualLanguage.tone} · Density:{" "}
                        {referenceProfile.visualLanguage.density} · Images:{" "}
                        {referenceProfile.visualLanguage.imageUsage} · Data:{" "}
                        {referenceProfile.visualLanguage.dataUsage} ·
                        Confidence:{" "}
                        {Math.round(referenceProfile.confidence.overall * 100)}%
                      </div>
                      {referenceProfile.warnings.slice(0, 4).map((item) => (
                        <div key={item.code} className="text-text-tertiary">
                          ⚠ {item.message}
                        </div>
                      ))}
                      <label className="flex items-center gap-2 text-text-primary">
                        <input
                          type="checkbox"
                          checked={useReferenceStyle}
                          onChange={(event) =>
                            setUseReferenceStyle(event.target.checked)
                          }
                          className="accent-[var(--accent)]"
                        />{" "}
                        Use reference style for generation
                      </label>
                    </div>
                  )}
                </div>
              )}
            {reference && (
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">
                  How should the reference guide the design?
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["close", "Follow closely"],
                      ["style", "Keep the style"],
                      ["explore", "Explore ideas"],
                    ] as const
                  ).map(([id, label]) => (
                    <label
                      key={id}
                      className={`cursor-pointer rounded-lg border p-2 text-center text-xs font-semibold ${freedom === id ? "border-accent bg-accent-muted" : "border-border bg-bg-panel"}`}
                    >
                      <input
                        type="radio"
                        name="freedom"
                        value={id}
                        checked={freedom === id}
                        onChange={() => {
                          setFreedom(id);
                          setConcepts([]);
                        }}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {brand?.name && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useBrand}
                  onChange={(event) => {
                    setUseBrand(event.target.checked);
                    setConcepts([]);
                  }}
                  className="accent-[var(--accent)]"
                />{" "}
                Use {brand.name} colors and fonts
              </label>
            )}
            <div className="border-t border-border pt-5">
              <Button
                variant="primary"
                fullWidth
                disabled={!ready || busy || !manuscript.trim()}
                onClick={() => void generate()}
              >
                {busy ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Sparkles size={17} />
                )}{" "}
                {busy
                  ? pipelineProgress
                    ? pipelineProgress.message
                    : "Creating directions…"
                  : family === "document" && docMode === "report"
                    ? "Generate Branded Report"
                    : session.user
                      ? "Create three directions"
                      : "Sign in to create"}
              </Button>
              <p className="mt-3 text-xs leading-5 text-text-tertiary">
                {family === "document" && docMode === "report"
                  ? "Forma AI Designer structures page sequences, binds exact approved copy, and applies visual critique."
                  : "Sign-in is required before generating. Your manuscript and optional reference are then sent to Google Gemini for design planning. Forma renders your exact copy separately; AI suggestions do not rewrite it."}
              </p>
              {error && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg bg-danger-muted p-3 text-sm text-danger"
                >
                  {error}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Right Section: Either Pipeline Progress/Result OR Creative Directions */}
        {pipelineProgress ? (
          <section className="flex flex-col items-center justify-center p-8 bg-bg-panel border border-border rounded-2xl min-h-[400px]">
            <div className="w-full max-w-md space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto text-accent animate-pulse">
                <Sparkles size={24} />
              </div>
              <h3 className="text-base font-semibold text-text-primary">
                Generating Report Draft
              </h3>
              <p className="text-sm text-text-secondary">
                {pipelineProgress.message}
              </p>
              <div className="w-full bg-bg-page border border-border rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-accent h-full transition-all duration-300 rounded-full"
                  style={{ width: `${pipelineProgress.percent}%` }}
                />
              </div>
              <div className="text-xs text-text-tertiary font-mono">
                {pipelineProgress.percent}% complete
              </div>
            </div>
          </section>
        ) : pipelineResult ? (
          <section className="flex flex-col gap-6">
            <div className="bg-bg-panel border border-border rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <h3 className="font-semibold text-text-primary text-base">
                    Report Generation Complete
                  </h3>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {pipelineResult.finalSpec.pages.length} pages structured with{" "}
                  <strong>Forma Editorial Report</strong> | Quality:{" "}
                  <span className="text-emerald-600 font-semibold">
                    {pipelineResult.quality.final.overallScore}/100
                  </span>{" "}
                  | Exact Copy:{" "}
                  <span className="text-emerald-600 font-semibold">
                    100% Conforming
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <a
                  href="/dev/pipeline"
                  className="text-xs text-text-secondary hover:text-text-primary px-3 py-2 rounded-lg border border-border inline-flex items-center gap-1.5 transition-colors"
                >
                  Inspect Lab <ExternalLink size={14} />
                </a>
                <Button
                  variant="primary"
                  onClick={openPipelineProject}
                  className="inline-flex items-center gap-2"
                >
                  Open in Editor <ExternalLink size={16} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {pipelineResult.finalSpec.pages.map((p, idx) => (
                <div
                  key={p.id}
                  className="group relative rounded-xl border border-border bg-bg-panel overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="px-3 py-1.5 border-b border-border bg-bg-page flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-text-primary">
                      Page {idx + 1}
                    </span>
                    <span className="text-text-secondary font-mono">
                      {p.metadata?.layoutId as string}
                    </span>
                  </div>
                  <div
                    className="p-1.5 bg-white flex items-center justify-center overflow-hidden"
                    style={{ aspectRatio: "612/792" }}
                    dangerouslySetInnerHTML={{
                      __html: pipelineResult.pageSvgs[idx] || "",
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <CreativeDirections
            concepts={concepts}
            projects={projects}
            onOpen={openProject}
          />
        )}
      </main>
    </div>
  );
}
