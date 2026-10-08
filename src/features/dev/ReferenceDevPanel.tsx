import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  Play,
  Upload,
  ScanLine,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../../shared/components/ui/Button";
import { contentGraphFromManuscript } from "../../domain/content/contentGraph.js";
import { planDesignDeterministically } from "../../domain/design-plan/artDirector.js";
import { instantiateDesignSpec } from "../../domain/template-family/resolver.js";
import { FORMA_EDITORIAL_REPORT } from "../../domain/template-family/builtin/editorialReport.js";
import {
  buildReferenceProfileFromDesignSpec,
  validateReferenceDesignProfile,
  resolveReferenceFamily,
  referenceStatusLabel,
  applyReferenceOverrides,
  type ReferenceDesignProfile,
} from "../../domain/reference-design/index.js";
import { runAiDesignerPipeline } from "../../domain/pipeline/designerPipeline.js";
import type { DesignerPipelineResult } from "../../domain/pipeline/designerPipeline.js";
import {
  createTemplateFamilyRecord,
  LocalStorageTemplateRecordStore,
} from "../../domain/template-authoring/index.js";
import { CORPORATE_REPORT_MANUSCRIPT } from "../../../tests/fixtures/corporateReportManuscript.js";
import {
  analyzeImageReference,
  type AnalysisProviderId,
} from "../create/lib/referenceAnalysis";
import { readReferenceFile } from "../editor/lib/fileImports";
import { useAccount } from "../../shared/api/api";

type Tab = "profile" | "template" | "generated";

export default function ReferenceDevPanel() {
  const { session } = useAccount();
  const [manuscript, setManuscript] = useState(CORPORATE_REPORT_MANUSCRIPT);
  const [profile, setProfile] = useState<ReferenceDesignProfile | null>(null);
  const [profileSource, setProfileSource] = useState<"designspec" | "image">(
    "designspec",
  );
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [provider, setProvider] = useState<AnalysisProviderId>("gemini");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DesignerPipelineResult | null>(null);
  const [tab, setTab] = useState<Tab>("profile");
  const [primaryColor, setPrimaryColor] = useState("#0f172a");
  const [accentColor, setAccentColor] = useState("#2563eb");
  const [tone, setTone] = useState("");
  const [density, setDensity] = useState("");
  const [authoringNotice, setAuthoringNotice] = useState("");

  function applyCorrections() {
    if (!profile) return;
    setProfile(
      applyReferenceOverrides(profile, {
        primaryColor,
        accentColor,
        ...(tone ? { tone: tone as never } : {}),
        ...(density ? { density: density as never } : {}),
      }),
    );
  }

  function buildFromDesignSpec() {
    setError("");
    try {
      const graph = contentGraphFromManuscript(manuscript);
      const plan = planDesignDeterministically(graph, FORMA_EDITORIAL_REPORT);
      const spec = instantiateDesignSpec(FORMA_EDITORIAL_REPORT, plan, graph);
      const built = buildReferenceProfileFromDesignSpec(spec);
      setProfile(built);
      setProfileSource("designspec");
      setResult(null);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  async function onFile(file?: File) {
    if (!file) return;
    setError("");
    try {
      const read = await readReferenceFile(file);
      setImage(read.data);
      setImageName(read.name);
      setProfile(null);
      setResult(null);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  async function analyzeImage() {
    if (!image) return;
    setBusy(true);
    setError("");
    try {
      const outcome = await analyzeImageReference({ image, provider });
      setProfile(outcome.profile);
      setProfileSource("image");
      if (outcome.usedFallback)
        setError(
          "Analysis provider unavailable; stored a fallback image-only profile.",
        );
      setResult(null);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!profile) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await runAiDesignerPipeline(manuscript, {
        family: FORMA_EDITORIAL_REPORT,
        referenceProfile: profile,
      });
      setResult(res);
      setTab("generated");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function sendCandidateToAuthoring() {
    if (!profile) return;
    const resolution = resolveReferenceFamily(profile, FORMA_EDITORIAL_REPORT);
    if (!resolution.derivedFamily) {
      setAuthoringNotice(
        `Not ready for authoring (${resolution.gate.status}): ${resolution.reasons.join(" ")}`,
      );
      return;
    }
    try {
      const record = createTemplateFamilyRecord({
        family: resolution.derivedFamily,
        source: "reference_derived",
        name: `${resolution.derivedFamily.name} candidate`,
        reference: {
          profileId: profile.id,
          sourceType: profile.source.type,
          confidence: profile.confidence.overall,
          usageMode: "reference_derived_template",
        },
      });
      new LocalStorageTemplateRecordStore().save(record);
      setAuthoringNotice(
        `Saved candidate "${record.name}" (${record.status}). Open the Template Authoring Lab to review and approve it before it can be used in /create.`,
      );
    } catch (cause) {
      setAuthoringNotice((cause as Error).message);
    }
  }

  const gate = profile
    ? resolveReferenceFamily(profile, FORMA_EDITORIAL_REPORT)
    : null;
  const validation = profile ? validateReferenceDesignProfile(profile) : null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 font-sans text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
        <div className="flex items-center gap-4">
          <a
            href="/dev/pipeline"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Pipeline Lab
          </a>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-blue-400" />
            <span className="font-semibold tracking-wide text-white">
              Reference Design Intelligence
            </span>
            <span className="rounded border border-blue-500/30 bg-blue-500/20 px-2 py-0.5 font-mono text-xs text-blue-300">
              Phase 4 v1
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/dev/templates"
            className="text-sm text-slate-400 hover:text-white"
          >
            Template Lab
          </a>
          <Button
            variant="primary"
            size="sm"
            disabled={busy || !profile}
            onClick={() => void generate()}
            className="flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <Play className="h-4 w-4 fill-current" /> Generate with reference
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-96 flex-col gap-3 border-r border-slate-800 bg-slate-950/50 p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Approved manuscript
          </span>
          <textarea
            value={manuscript}
            onChange={(event) => setManuscript(event.target.value)}
            className="h-48 resize-none rounded border border-slate-800 bg-slate-900 p-3 font-mono text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
          />
          <div className="rounded border border-slate-800 p-3 text-xs text-slate-300">
            <strong className="mb-2 block text-slate-200">
              Source 1 · Forma DesignSpec
            </strong>
            <button
              type="button"
              onClick={buildFromDesignSpec}
              className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-500"
            >
              Extract from built-in report
            </button>
            <p className="mt-2 text-[11px] text-slate-500">
              Deterministic, high-confidence extraction from a real DesignSpec.
            </p>
          </div>
          <div className="rounded border border-slate-800 p-3 text-xs text-slate-300">
            <strong className="mb-2 block text-slate-200">
              Source 2 · Uploaded image
            </strong>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-dashed border-slate-700 px-3 py-1.5">
              <Upload className="h-3.5 w-3.5" />
              {imageName || "Choose PNG/JPG/WebP"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => void onFile(event.target.files?.[0])}
              />
            </label>
            <div className="mt-2 flex items-center gap-2">
              <select
                aria-label="Provider"
                value={provider}
                onChange={(event) =>
                  setProvider(event.target.value as AnalysisProviderId)
                }
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
              >
                <option value="gemini">Gemini vision</option>
                <option value="local">Local OCR</option>
                <option value="openai">OpenAI vision</option>
              </select>
              <button
                type="button"
                disabled={busy || !image}
                onClick={() => void analyzeImage()}
                className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {busy ? "Analyzing…" : "Analyze image"}
              </button>
            </div>
            {!session.user && (
              <p className="mt-2 text-[11px] text-amber-400">
                Sign in to call the vision provider. Otherwise a fallback
                image-only profile is stored.
              </p>
            )}
          </div>
          {error && (
            <p className="rounded border border-amber-600/40 bg-amber-500/10 p-2 text-xs text-amber-300">
              {error}
            </p>
          )}
          {profile && (
            <div className="rounded border border-slate-800 p-3 text-xs text-slate-300">
              <strong className="mb-2 block text-slate-200">
                User corrections (prevent bad guesses)
              </strong>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-1">
                  Primary
                  <input
                    type="color"
                    aria-label="Primary color"
                    value={primaryColor}
                    onChange={(event) => setPrimaryColor(event.target.value)}
                    className="h-6 w-8 rounded border border-slate-700 bg-slate-900"
                  />
                </label>
                <label className="flex items-center gap-1">
                  Accent
                  <input
                    type="color"
                    aria-label="Accent color"
                    value={accentColor}
                    onChange={(event) => setAccentColor(event.target.value)}
                    className="h-6 w-8 rounded border border-slate-700 bg-slate-900"
                  />
                </label>
                <label className="flex items-center gap-1">
                  Tone
                  <select
                    aria-label="Tone"
                    value={tone}
                    onChange={(event) => setTone(event.target.value)}
                    className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5"
                  >
                    <option value="">keep</option>
                    <option value="corporate">corporate</option>
                    <option value="editorial">editorial</option>
                    <option value="premium">premium</option>
                    <option value="minimal">minimal</option>
                    <option value="data_forward">data_forward</option>
                    <option value="image_led">image_led</option>
                  </select>
                </label>
                <label className="flex items-center gap-1">
                  Density
                  <select
                    aria-label="Density"
                    value={density}
                    onChange={(event) => setDensity(event.target.value)}
                    className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5"
                  >
                    <option value="">keep</option>
                    <option value="sparse">sparse</option>
                    <option value="balanced">balanced</option>
                    <option value="dense">dense</option>
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={applyCorrections}
                className="mt-2 rounded bg-slate-700 px-3 py-1.5 text-white hover:bg-slate-600"
              >
                Apply corrections
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden bg-slate-900">
          {!profile && (
            <div className="flex flex-1 flex-col items-center justify-center text-slate-500">
              <ScanLine className="mb-3 h-12 w-12 stroke-1 text-slate-600" />
              <p className="text-base font-medium text-slate-300">
                No reference profile yet
              </p>
              <p className="mt-1 max-w-sm text-center text-xs text-slate-500">
                Extract a profile from the built-in report, or upload an image
                and analyze it. This is visual-language intelligence, not design
                reconstruction.
              </p>
            </div>
          )}

          {profile && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950 px-6">
                {(
                  [
                    ["profile", "Raw profile"],
                    ["template", "Template candidate"],
                    ["generated", "Generated result"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`border-b-2 px-3 py-2.5 text-xs font-medium ${
                      tab === id
                        ? "border-blue-500 text-white"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {tab === "profile" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <Stat
                        label="Source"
                        value={profile.source.type}
                        detail={profileSource}
                      />
                      <Stat
                        label="Confidence"
                        value={`${Math.round(profile.confidence.overall * 100)}%`}
                        detail={`colors ${Math.round(profile.confidence.colors * 100)} · type ${Math.round(profile.confidence.typography * 100)}`}
                      />
                      <Stat
                        label="Layout patterns"
                        value={String(profile.layoutPatterns.length)}
                        detail={profile.visualLanguage.tone}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Section title="Extracted colors">
                        <div className="flex flex-wrap gap-2">
                          {profile.extractedTokens.colors.map((color) => (
                            <span
                              key={color.id}
                              className="inline-flex items-center gap-1.5 rounded border border-slate-700 px-2 py-1 text-xs"
                            >
                              <span
                                aria-hidden
                                style={{ background: color.value }}
                                className="inline-block h-3.5 w-3.5 rounded-sm border border-slate-600"
                              />
                              {color.value} · {color.role} ·{" "}
                              {Math.round(color.confidence * 100)}%
                            </span>
                          ))}
                          {!profile.extractedTokens.colors.length && <Empty />}
                        </div>
                      </Section>
                      <Section title="Typography observations">
                        <ul className="space-y-1 text-xs">
                          {profile.extractedTokens.typography.map((token) => (
                            <li key={token.id}>
                              <strong>{token.role}</strong>: {token.fontFamily}{" "}
                              {token.fontSize}pt (
                              {Math.round(token.confidence * 100)}%)
                            </li>
                          ))}
                          {!profile.extractedTokens.typography.length && (
                            <Empty />
                          )}
                        </ul>
                      </Section>
                      <Section title="Spacing observations">
                        <ul className="space-y-1 text-xs">
                          {profile.extractedTokens.spacing.map((token) => (
                            <li key={token.id}>
                              <strong>{token.role}</strong>: {token.value}
                            </li>
                          ))}
                          {!profile.extractedTokens.spacing.length && <Empty />}
                        </ul>
                      </Section>
                      <Section title="Layout patterns">
                        <ul className="space-y-1 text-xs">
                          {profile.layoutPatterns.map((pattern) => (
                            <li key={pattern.id}>
                              <strong>{pattern.type}</strong> ×
                              {pattern.occurrenceCount} · {pattern.density} ·{" "}
                              {Math.round(pattern.confidence * 100)}% →{" "}
                              {pattern.candidateLayoutIds.join(", ") || "—"}
                            </li>
                          ))}
                          {!profile.layoutPatterns.length && <Empty />}
                        </ul>
                      </Section>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <Chip>tone: {profile.visualLanguage.tone}</Chip>
                      <Chip>density: {profile.visualLanguage.density}</Chip>
                      <Chip>
                        composition: {profile.visualLanguage.composition}
                      </Chip>
                      <Chip>images: {profile.visualLanguage.imageUsage}</Chip>
                      <Chip>data: {profile.visualLanguage.dataUsage}</Chip>
                    </div>

                    {profile.warnings.length > 0 && (
                      <Section title="Warnings (never hidden)">
                        <ul className="space-y-1 text-xs text-amber-300">
                          {profile.warnings.map((item) => (
                            <li key={item.code}>
                              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                              <strong>{item.code}</strong>: {item.message}
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {profileSource === "image" && image && (
                      <Section title="Detected regions overlay">
                        <div
                          className="relative inline-block border border-slate-800"
                          style={{ width: 360 }}
                        >
                          <img
                            src={image}
                            alt="Uploaded reference"
                            className="w-full"
                          />
                          {profile.pages[0].detectedRegions.map((region) => (
                            <div
                              key={region.id}
                              className="absolute border border-blue-400/70 bg-blue-400/10"
                              style={{
                                left: `${(region.bounds.x / 720) * 100}%`,
                                top: `${(region.bounds.y / 900) * 100}%`,
                                width: `${(region.bounds.width / 720) * 100}%`,
                                height: `${(region.bounds.height / 900) * 100}%`,
                              }}
                              title={`${region.type} (${Math.round(region.confidence * 100)}%)`}
                            />
                          ))}
                        </div>
                      </Section>
                    )}

                    <Section
                      title={`Schema validation: ${validation?.valid ? "valid" : "invalid"}`}
                    >
                      {validation && !validation.valid && (
                        <pre className="text-xs text-rose-300">
                          {JSON.stringify(validation.issues, null, 2)}
                        </pre>
                      )}
                    </Section>

                    <Section title="Raw profile JSON">
                      <pre className="max-h-80 overflow-auto rounded bg-slate-950 p-3 font-mono text-[11px] text-slate-300">
                        {JSON.stringify(profile, null, 2)}
                      </pre>
                    </Section>
                  </div>
                )}

                {tab === "template" && gate && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Chip>
                        status: {referenceStatusLabel(gate.gate.status)}
                      </Chip>
                      <Chip>usage mode: {gate.mode}</Chip>
                      <Chip>ready: {String(gate.gate.ready)}</Chip>
                    </div>
                    <Section title="Gate reasons">
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
                        {gate.reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </Section>
                    <Section title="Candidate layouts">
                      <p className="text-xs text-slate-300">
                        {gate.gate.layoutIds.join(", ") || "None"}
                      </p>
                    </Section>
                    {gate.derivedFamily ? (
                      <Section title="Send to Template Authoring (Part Q)">
                        <p className="text-xs text-slate-400">
                          Save this derived family as a candidate record. It is
                          not usable until a reviewer approves its layouts.
                        </p>
                        <button
                          type="button"
                          onClick={sendCandidateToAuthoring}
                          className="mt-2 rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500"
                        >
                          Send candidate to Template Authoring
                        </button>
                        {authoringNotice && (
                          <p className="mt-2 text-xs text-emerald-300">
                            {authoringNotice}
                          </p>
                        )}
                      </Section>
                    ) : (
                      <Section title="Why not ready for authoring">
                        <p className="text-xs text-amber-300">
                          {gate.gate.reasons.join(" ")}
                        </p>
                        {authoringNotice && (
                          <p className="mt-2 text-xs text-amber-300">
                            {authoringNotice}
                          </p>
                        )}
                      </Section>
                    )}

                    {gate.derivedFamily ? (
                      <Section title="Reference-derived TemplateFamily JSON">
                        <pre className="max-h-80 overflow-auto rounded bg-slate-950 p-3 font-mono text-[11px] text-slate-300">
                          {JSON.stringify(
                            {
                              id: gate.derivedFamily.id,
                              name: gate.derivedFamily.name,
                              layouts: gate.derivedFamily.layouts.map(
                                (l) => l.id,
                              ),
                              colors: gate.derivedFamily.designTokens.colors,
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </Section>
                    ) : (
                      <Section title="Fallback">
                        <p className="flex items-center gap-2 text-xs text-amber-300">
                          <AlertTriangle className="h-4 w-4" />
                          No derived family. Forma will use{" "}
                          {gate.mode === "reference_guided_tokens"
                            ? "reference-guided tokens on the standard family."
                            : "the standard family unchanged."}
                        </p>
                      </Section>
                    )}
                  </div>
                )}

                {tab === "generated" && (
                  <div className="space-y-4">
                    {!result && (
                      <p className="text-sm text-slate-400">
                        Press “Generate with reference” to run the full pipeline
                        with this profile.
                      </p>
                    )}
                    {result && (
                      <>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Chip>usage: {result.reference.usageMode}</Chip>
                          <Chip>
                            confidence:{" "}
                            {result.reference.confidence !== null
                              ? `${Math.round(result.reference.confidence * 100)}%`
                              : "—"}
                          </Chip>
                          <Chip>pages: {result.finalSpec.pages.length}</Chip>
                          <Chip>
                            quality: {result.quality.final.overallScore}/100
                          </Chip>
                          <Chip>
                            exact copy:{" "}
                            {result.copyCoverage.valid ? "pass" : "fail"}
                          </Chip>
                          <Chip>
                            fit: {result.fitReport.valid ? "pass" : "fail"}
                          </Chip>
                          <Chip>
                            fidelity: {result.projectionFidelity.overall} (
                            {result.projectionFidelity.score})
                          </Chip>
                          <Chip>trust: {result.deliverableQuality.status}</Chip>
                          {result.reference.similarity && (
                            <Chip>
                              similarity:{" "}
                              {Math.round(
                                result.reference.similarity.overall * 100,
                              )}
                              %
                            </Chip>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Reference metadata attached to the generated
                          DesignSpec:{" "}
                          {String(
                            result.finalSpec.metadata?.referenceUsageMode ??
                              "none",
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                          {result.finalSpec.pages.map((page, index) => (
                            <div
                              key={page.id}
                              className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950"
                            >
                              <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-[11px]">
                                <span>Page {index + 1}</span>
                                <span className="font-mono text-blue-400">
                                  {page.metadata?.layoutId as string}
                                </span>
                              </div>
                              <div
                                className="flex items-center justify-center bg-white p-2"
                                style={{ aspectRatio: "612/792" }}
                                dangerouslySetInnerHTML={{
                                  __html: result.pageSvgs[index] || "",
                                }}
                              />
                            </div>
                          ))}
                        </div>
                        {result.reference.similarity && (
                          <Section title="Reference similarity (heuristic)">
                            <pre className="rounded bg-slate-950 p-3 font-mono text-[11px] text-slate-300">
                              {JSON.stringify(
                                result.reference.similarity,
                                null,
                                2,
                              )}
                            </pre>
                          </Section>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat(props: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950 p-3">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">
        {props.label}
      </span>
      <div className="mt-1 text-lg font-bold text-white">{props.value}</div>
      {props.detail && (
        <div className="text-[11px] text-slate-500">{props.detail}</div>
      )}
    </div>
  );
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
        <Sparkles className="h-3.5 w-3.5 text-blue-400" />
        {props.title}
      </h4>
      {props.children}
    </div>
  );
}

function Chip(props: { children: ReactNode }) {
  return (
    <span className="rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono">
      {props.children}
    </span>
  );
}

function Empty() {
  return <span className="text-xs text-slate-500">None observed.</span>;
}
