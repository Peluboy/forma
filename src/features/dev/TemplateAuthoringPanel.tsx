import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  Play,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "../../shared/components/ui/Button";
import { api, useAccount } from "../../shared/api/api";
import { contentGraphFromManuscript } from "../../domain/content/contentGraph.js";
import { planDesignDeterministically } from "../../domain/design-plan/artDirector.js";
import { instantiateDesignSpec } from "../../domain/template-family/resolver.js";
import { FORMA_EDITORIAL_REPORT } from "../../domain/template-family/builtin/editorialReport.js";
import { buildReferenceProfileFromDesignSpec } from "../../domain/reference-design/extractFromDesignSpec.js";
import { profileToTemplateFamily } from "../../domain/reference-design/profileToTemplateFamily.js";
import { runAiDesignerPipeline } from "../../domain/pipeline/designerPipeline.js";
import type { DesignerPipelineResult } from "../../domain/pipeline/designerPipeline.js";
import { CORPORATE_REPORT_MANUSCRIPT } from "../../../tests/fixtures/corporateReportManuscript.js";
import {
  TEMPLATE_SMOKE_CASES,
  LocalStorageTemplateRecordStore,
  validateTemplateFamilyV2,
  createTemplateFamilyRecord,
  finalizeTemplateRecord,
  updateTemplateFamilyRecord,
  reviewLayout,
  approveAllLayouts,
  setTemplateApproved,
  summarizeApproval,
  applyApprovalToFamily,
  runTemplateCapacityTests,
  applyCapacitySuggestions,
  createTemplateVersion,
  listTemplateVersions,
  runTemplateSmokeGeneration,
  recordTemplateUsage,
  mergeHumanVerdict,
  isTemplateFamilyRecord,
  type TemplateFamilyRecord,
  type TemplateFamilyRecordStore,
  type TemplateSmokeReport,
  type TemplateCapacityReport,
  type TemplateReviewVerdict,
  type LayoutApprovalStatus,
} from "../../domain/template-authoring/index.js";
import {
  LayoutReview,
  Stat,
  Section,
  Chip,
  StatusChip,
  coverageLabel,
  statusExplanation,
} from "./templateAuthoringUi";
import { TemplateSharingPanel, VisibilityChip } from "./templateSharingUi";
import { forkTemplateRecord } from "../../domain/template-sharing/index.js";

type Tab =
  "overview" | "layouts" | "capacity" | "smoke" | "versions" | "sharing";

let storeInstance: TemplateFamilyRecordStore | null = null;
function getStore(): TemplateFamilyRecordStore {
  if (!storeInstance) storeInstance = new LocalStorageTemplateRecordStore();
  return storeInstance;
}

function loadRecords(): TemplateFamilyRecord[] {
  try {
    return getStore().list();
  } catch {
    return [];
  }
}

export default function TemplateAuthoringPanel() {
  const { session } = useAccount();
  const [records, setRecords] = useState<TemplateFamilyRecord[]>(() =>
    loadRecords(),
  );
  const [selectedId, setSelectedId] = useState<string>("");
  const [manuscript, setManuscript] = useState(CORPORATE_REPORT_MANUSCRIPT);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [smoke, setSmoke] = useState<TemplateSmokeReport | null>(null);
  const [capacity, setCapacity] = useState<TemplateCapacityReport | null>(null);
  const [preview, setPreview] = useState<DesignerPipelineResult | null>(null);

  const selected = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId],
  );

  useEffect(() => {
    if (!selectedId && records.length > 0) setSelectedId(records[0].id);
  }, [records, selectedId]);

  // Signed-in reviewers keep a hosted copy; guests stay on localStorage.
  useEffect(() => {
    if (!session.user) return;
    void api<{ templateFamilies: TemplateFamilyRecord[] }>("/template-families")
      .then((value) => {
        const store = getStore();
        for (const record of value.templateFamilies || [])
          if (isTemplateFamilyRecord(record)) store.save(record);
        setRecords(loadRecords());
      })
      .catch(() => {
        /* hosted copy is best effort */
      });
  }, [session.user?.id]);

  function persist(record: TemplateFamilyRecord) {
    getStore().save(record);
    if (session.user)
      void api(`/template-families/${record.id}`, {
        method: "PUT",
        body: JSON.stringify({ record }),
      }).catch(() => {
        setError(
          "Saved locally, but the hosted copy could not be updated. Retry when online.",
        );
      });
    setRecords(loadRecords());
  }

  function refresh() {
    setRecords(loadRecords());
  }

  function basedOnBuiltin() {
    const record = createTemplateFamilyRecord({
      family: FORMA_EDITORIAL_REPORT,
      source: "builtin",
    });
    persist(record);
    setSelectedId(record.id);
    setNotice("Created an approved record from the built-in editorial family.");
  }

  function newDraft() {
    const record = createTemplateFamilyRecord({
      family: FORMA_EDITORIAL_REPORT,
      source: "manual",
      name: "Untitled report template",
    });
    persist(record);
    setSelectedId(record.id);
    setNotice("Created a draft. Review every layout before it can be used.");
  }

  function newReferenceCandidate() {
    setError("");
    try {
      const graph = contentGraphFromManuscript(manuscript);
      const plan = planDesignDeterministically(graph, FORMA_EDITORIAL_REPORT);
      const spec = instantiateDesignSpec(FORMA_EDITORIAL_REPORT, plan, graph);
      const profile = buildReferenceProfileFromDesignSpec(spec);
      const { family, gate } = profileToTemplateFamily(
        profile,
        FORMA_EDITORIAL_REPORT,
      );
      if (!family) {
        setError(
          `Reference is not strong enough for a template (${gate.status}): ${gate.reasons.join(" ")}`,
        );
        return;
      }
      const record = createTemplateFamilyRecord({
        family,
        source: "reference_derived",
        name: `${family.name} candidate`,
        reference: {
          profileId: profile.id,
          sourceType: profile.source.type,
          confidence: profile.confidence.overall,
          usageMode: "reference_derived_template",
        },
      });
      persist(record);
      setSelectedId(record.id);
      setNotice(
        `Created a reference-derived candidate with ${family.layouts.length} layouts. It is not usable until reviewed and approved.`,
      );
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  function recompute() {
    if (!selected) return;
    const validation = validateTemplateFamilyV2(selected.family);
    const next = finalizeTemplateRecord(selected, {
      validation,
      smoke,
      capacity,
    });
    persist(next);
    setNotice(
      validation.valid
        ? "Recomputed: validation passes."
        : `Recomputed: ${validation.errorCount} validation error(s) remain.`,
    );
  }

  function runCapacity() {
    if (!selected) return;
    const report = runTemplateCapacityTests(selected.family);
    setCapacity(report);
    persist(finalizeTemplateRecord(selected, { capacity: report }));
    setTab("capacity");
  }

  async function runSmoke() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const report = await runTemplateSmokeGeneration(selected.family, [
        TEMPLATE_SMOKE_CASES[0],
        TEMPLATE_SMOKE_CASES[1],
      ]);
      setSmoke(report);
      persist(finalizeTemplateRecord(selected, { smoke: report }));
      setTab("smoke");
      if (!report.passed)
        setError(
          `Smoke generation failed: ${report.criticalFailures.join("; ")}`,
        );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function review(
    record: TemplateFamilyRecord,
    layoutId: string,
    status: LayoutApprovalStatus,
  ) {
    const next = updateTemplateFamilyRecord(record, {
      approval: reviewLayout(record.approval, layoutId, status),
    });
    persist(next);
  }

  function approveEverything() {
    if (!selected) return;
    const approval = approveAllLayouts(selected.approval, selected.family);
    const next = updateTemplateFamilyRecord(selected, {
      approval: setTemplateApproved(approval, "reviewer"),
      status: "approved",
    });
    persist(next);
    setNotice("Approved every layout and marked the template approved.");
  }

  function saveVersion() {
    if (!selected) return;
    const version = createTemplateVersion(selected, {
      changelog: "Saved from the authoring lab.",
    });
    persist(version);
    setSelectedId(version.id);
    setTab("versions");
    setNotice(`Created version ${version.versionNumber}.`);
  }

  function applyTightenings() {
    if (!selected || !capacity) return;
    const { family, changes } = applyCapacitySuggestions(
      selected.family,
      capacity,
    );
    const next = updateTemplateFamilyRecord(selected, {
      family,
      changelog: `Applied ${changes.length} capacity tightening(s).`,
    });
    persist(next);
    setNotice(`Applied ${changes.length} capacity tightening(s).`);
  }

  async function previewGeneration() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const usable = applyApprovalToFamily(selected.family, selected.approval, {
        requireApprovedLayouts: true,
        includeUnreviewed: false,
      });
      if (usable.layouts.length === 0) {
        setError(
          "Nothing to generate: no layout is approved yet. Approve layouts first.",
        );
        return;
      }
      const result = await runAiDesignerPipeline(manuscript, {
        family: usable,
      });
      setPreview(result);
      const usage = recordTemplateUsage(selected.usage, {
        qualityScore: result.quality.final.overallScore,
        projectionFidelityScore: result.projectionFidelity.score,
        pageCount: result.finalSpec.pages.length,
        continued: result.finalSpec.pages.length > 4,
        failures: result.errors,
      });
      persist(updateTemplateFamilyRecord(selected, { usage }));
      setTab("smoke");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function recordReview(verdict: TemplateReviewVerdict) {
    if (!selected) return;
    const usage = mergeHumanVerdict(selected.usage, verdict);
    const next = updateTemplateFamilyRecord(selected, { usage });
    persist(next);
    setNotice(`Recorded a human verdict: ${verdict}.`);
  }

  /**
   * Dev-only: simulate another user forking the selected shared template. The
   * fork is a fresh lineage root, saved locally, and never mutates the source.
   */
  function forkAsViewer(record: TemplateFamilyRecord) {
    setError("");
    try {
      const forked = forkTemplateRecord(
        record,
        { ownerId: null, signedIn: false },
        { forkOwnerName: "dev viewer" },
      );
      persist(forked);
      setNotice(
        `Forked "${record.name}" into an independent copy owned by the viewer. The original is untouched.`,
      );
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  const approval = selected
    ? summarizeApproval(selected.approval, selected.family)
    : null;
  const versions = selected
    ? listTemplateVersions(records, selected.templateId)
    : [];

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
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span className="font-semibold tracking-wide text-white">
              Template Authoring + Approval
            </span>
            <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 font-mono text-xs text-emerald-300">
              Phase 5 v1
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={basedOnBuiltin}>
            From built-in
          </Button>
          <Button variant="secondary" size="sm" onClick={newDraft}>
            New draft
          </Button>
          <Button variant="secondary" size="sm" onClick={newReferenceCandidate}>
            Reference candidate
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-80 flex-col gap-2 overflow-y-auto border-r border-slate-800 bg-slate-950/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Records
            </span>
            <button
              type="button"
              onClick={refresh}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Refresh records"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          {records.length === 0 && (
            <p className="text-xs text-slate-500">
              No records yet. Create one from the built-in family or the
              reference candidate flow.
            </p>
          )}
          {records.map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => {
                setSelectedId(record.id);
                setSmoke(null);
                setCapacity(null);
                setPreview(null);
                setTab("overview");
              }}
              className={`rounded border p-2 text-left text-xs ${
                record.id === selectedId
                  ? "border-emerald-500/60 bg-emerald-500/10"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="font-medium text-slate-100">{record.name}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                <StatusChip status={record.status} />
                <span className="rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                  {record.source}
                </span>
                {record.versionNumber > 1 && (
                  <span className="rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                    v{record.versionNumber}
                  </span>
                )}
                {record.sharing && record.sharing.visibility !== "private" && (
                  <VisibilityChip visibility={record.sharing.visibility} />
                )}
                {record.forkedFrom && (
                  <span className="rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                    forked
                  </span>
                )}
              </div>
            </button>
          ))}

          <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Manuscript
            </span>
            <textarea
              value={manuscript}
              onChange={(event) => setManuscript(event.target.value)}
              className="h-40 resize-none rounded border border-slate-800 bg-slate-900 p-2 font-mono text-[11px] text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden">
          {!selected && (
            <div className="flex flex-1 flex-col items-center justify-center text-slate-500">
              <ShieldCheck className="mb-3 h-12 w-12 stroke-1 text-slate-600" />
              <p className="text-base font-medium text-slate-300">
                No template selected
              </p>
              <p className="mt-1 max-w-sm text-center text-xs text-slate-500">
                Create a record to review its layouts, validate it, test its
                capacity, and approve it for generation.
              </p>
            </div>
          )}

          {selected && (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-white">
                      {selected.name}
                    </h2>
                    <StatusChip status={selected.status} />
                    {selected.sharing &&
                      selected.sharing.visibility !== "private" && (
                        <VisibilityChip
                          visibility={selected.sharing.visibility}
                        />
                      )}
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                    {selected.id} · templateId {selected.templateId} · v
                    {selected.versionNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={recompute}
                    title="Recompute validation and quality"
                  >
                    Recompute
                  </Button>
                  <Button variant="secondary" size="sm" onClick={saveVersion}>
                    Save version
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busy}
                    onClick={() => void previewGeneration()}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    <Play className="h-4 w-4 fill-current" /> Generate preview
                  </Button>
                </div>
              </div>

              {error && (
                <p className="border-b border-amber-600/40 bg-amber-500/10 px-6 py-2 text-xs text-amber-300">
                  {error}
                </p>
              )}
              {notice && !error && (
                <p className="border-b border-emerald-700/40 bg-emerald-500/10 px-6 py-2 text-xs text-emerald-300">
                  {notice}
                </p>
              )}

              <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950 px-6">
                {(
                  [
                    ["overview", "Overview"],
                    ["layouts", "Layout review"],
                    ["capacity", "Capacity"],
                    ["smoke", "Smoke & preview"],
                    ["versions", "Versions"],
                    ["sharing", "Sharing & lineage"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`border-b-2 px-3 py-2.5 text-xs font-medium ${
                      tab === id
                        ? "border-emerald-500 text-white"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {tab === "overview" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <Stat
                        label="Validation"
                        value={selected.quality.validationStatus}
                        detail={`${selected.quality.warnings.length} warning(s)`}
                      />
                      <Stat
                        label="Approved layouts"
                        value={`${approval?.approvedLayoutCount}/${approval?.layoutCount}`}
                        detail={`${approval?.needsChangesLayoutCount} needs changes · ${approval?.unreviewedLayoutCount} unreviewed`}
                      />
                      <Stat
                        label="Coverage"
                        value={coverageLabel(selected)}
                        detail="cover · content · table · stats · quote · closing"
                      />
                      <Stat
                        label="Usage"
                        value={`${selected.usage?.timesUsed ?? 0} run(s)`}
                        detail={
                          selected.usage?.averageQualityScore !== undefined
                            ? `avg quality ${selected.usage.averageQualityScore}`
                            : "never generated"
                        }
                      />
                    </div>

                    <Section title="Status language">
                      <p className="text-xs text-slate-300">
                        {statusExplanation(selected)}
                      </p>
                    </Section>

                    {selected.quality.blockers.length > 0 && (
                      <Section title="Blockers (must resolve before approval)">
                        <ul className="space-y-1 text-xs text-rose-300">
                          {selected.quality.blockers.map((blocker) => (
                            <li key={blocker.code}>
                              <XCircle className="mr-1 inline h-3.5 w-3.5" />
                              <strong>{blocker.code}</strong>: {blocker.message}
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {selected.quality.warnings.length > 0 && (
                      <Section title="Warnings (never hidden)">
                        <ul className="space-y-1 text-xs text-amber-300">
                          {selected.quality.warnings.map((warning, index) => (
                            <li key={`${warning.code}-${index}`}>
                              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                              <strong>{warning.code}</strong>: {warning.message}
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    <Section title="Human review (Part O)">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="text-slate-400">
                          approved {selected.usage?.humanVerdicts.approved ?? 0}{" "}
                          · needs refinement{" "}
                          {selected.usage?.humanVerdicts.needs_refinement ?? 0}{" "}
                          · reject {selected.usage?.humanVerdicts.reject ?? 0}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        {(
                          ["approved", "needs_refinement", "reject"] as const
                        ).map((verdict) => (
                          <button
                            key={verdict}
                            type="button"
                            onClick={() => recordReview(verdict)}
                            className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                          >
                            {verdict}
                          </button>
                        ))}
                      </div>
                    </Section>

                    {preview && (
                      <Section title="Last preview">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Chip>pages: {preview.finalSpec.pages.length}</Chip>
                          <Chip>
                            quality: {preview.quality.final.overallScore}/100
                          </Chip>
                          <Chip>
                            copy: {preview.copyCoverage.valid ? "pass" : "fail"}
                          </Chip>
                          <Chip>
                            fit: {preview.fitReport.valid ? "pass" : "fail"}
                          </Chip>
                          <Chip>
                            fidelity: {preview.projectionFidelity.overall}
                          </Chip>
                        </div>
                      </Section>
                    )}
                  </div>
                )}

                {tab === "layouts" && (
                  <LayoutReview
                    record={selected}
                    onReview={review}
                    onApproveAll={approveEverything}
                  />
                )}

                {tab === "capacity" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={runCapacity}
                      >
                        Run capacity tests
                      </Button>
                      {capacity &&
                        Object.keys(capacity.suggestedSlotMaxCharacters)
                          .length > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={applyTightenings}
                          >
                            Apply tightenings
                          </Button>
                        )}
                    </div>
                    {!capacity && (
                      <p className="text-xs text-slate-400">
                        Run capacity tests to measure how much content each
                        layout can hold.
                      </p>
                    )}
                    {capacity && (
                      <div className="space-y-3">
                        {capacity.layouts.map((layout) => (
                          <div
                            key={layout.layoutId}
                            className="rounded border border-slate-800 bg-slate-950 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-200">
                                {layout.layoutId}
                              </span>
                              <span className="font-mono text-[11px] text-slate-400">
                                {layout.fitStatus} · {layout.recommendedDensity}
                              </span>
                            </div>
                            <table className="mt-2 w-full text-left text-[11px]">
                              <thead className="text-slate-500">
                                <tr>
                                  <th className="py-1">Slot</th>
                                  <th>Declared</th>
                                  <th>Measured</th>
                                  <th>Recommended</th>
                                  <th>Behaviour</th>
                                </tr>
                              </thead>
                              <tbody className="text-slate-300">
                                {layout.slots.map((slot) => (
                                  <tr key={slot.slotId}>
                                    <td className="py-0.5 font-mono">
                                      {slot.slotId}
                                    </td>
                                    <td>{slot.declaredMaxCharacters ?? "—"}</td>
                                    <td>{slot.measuredMaxCharacters}</td>
                                    <td>{slot.recommendedCharacters}</td>
                                    <td>{slot.overflowBehavior}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === "smoke" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => void runSmoke()}
                      >
                        Run smoke generation
                      </Button>
                    </div>
                    {smoke && (
                      <>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Chip>{smoke.passed ? "passed" : "failed"}</Chip>
                          <Chip>{smoke.cases.length} case(s)</Chip>
                        </div>
                        {smoke.criticalFailures.length > 0 && (
                          <ul className="space-y-1 text-xs text-rose-300">
                            {smoke.criticalFailures.map((failure, index) => (
                              <li key={index}>{failure}</li>
                            ))}
                          </ul>
                        )}
                        <table className="w-full text-left text-xs">
                          <thead className="text-slate-500">
                            <tr>
                              <th className="py-1">Case</th>
                              <th>Pages</th>
                              <th>Quality</th>
                              <th>Copy</th>
                              <th>Fit</th>
                              <th>Trusted</th>
                            </tr>
                          </thead>
                          <tbody className="text-slate-300">
                            {smoke.cases.map((testCase) => (
                              <tr key={testCase.caseId}>
                                <td className="py-0.5 font-mono">
                                  {testCase.caseId}
                                </td>
                                <td>{testCase.pageCount}</td>
                                <td>{testCase.qualityScore}</td>
                                <td>
                                  {testCase.exactCopyPass ? "pass" : "fail"}
                                </td>
                                <td>{testCase.fitPass ? "pass" : "fail"}</td>
                                <td>{testCase.trusted ? "yes" : "no"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}
                    {!smoke && (
                      <p className="text-xs text-slate-400">
                        Smoke generation runs the template through the full
                        pipeline against small fixtures. A template is never
                        approved if smoke generation fails a critical check.
                      </p>
                    )}
                    {preview && (
                      <Section title="Preview pages">
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                          {preview.finalSpec.pages.map((page, index) => (
                            <div
                              key={page.id}
                              className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950"
                            >
                              <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-[11px]">
                                <span>Page {index + 1}</span>
                                <span className="font-mono text-emerald-400">
                                  {page.metadata?.layoutId as string}
                                </span>
                              </div>
                              <div
                                className="flex items-center justify-center bg-white p-2"
                                style={{ aspectRatio: "612/792" }}
                                dangerouslySetInnerHTML={{
                                  __html: preview.pageSvgs[index] || "",
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}
                  </div>
                )}

                {tab === "sharing" && (
                  <TemplateSharingPanel
                    record={selected}
                    ownerId={session.user?.id}
                    isDev
                    onSave={persist}
                    onNotice={setNotice}
                    onError={setError}
                    onForkAsViewer={forkAsViewer}
                  />
                )}

                {tab === "versions" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">
                      Versions are a safe history, not git-style diffing. The
                      lineage root stays the same; each new version starts
                      unapproved.
                    </p>
                    {versions.map((version) => (
                      <div
                        key={version.recordId}
                        className="rounded border border-slate-800 bg-slate-950 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-200">
                            v{version.versionNumber} · {version.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(version.recordId);
                              setTab("overview");
                            }}
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            open
                          </button>
                        </div>
                        <p className="mt-1 text-slate-400">
                          {version.changelog}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
