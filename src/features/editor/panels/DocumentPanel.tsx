import { useState } from "react";
import {
  addDocumentPage,
  createDocumentProject,
  documentIssues,
  paginateDocument,
  parseDocumentManuscript,
  removeDocumentPage,
  type FlowDecorationElement,
  type FlowDocument,
  type FlowImageElement,
  type FlowChartElement,
} from "../../../domain/design/flowDocument";
import { DocumentPageView } from "../canvas/DocumentCanvas";
import type { Project } from "../../../domain/design/model";
import {
  BarChart2,
  FileText,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Shapes,
  Trash2,
} from "lucide-react";

export default function DocumentPanel({
  project,
  update,
  onCreate,
  onMessage,
  selectedLayer,
  onSelectLayer,
}: {
  project: Project;
  update: (patch: Partial<Project>) => void;
  onCreate: (project: Project) => Promise<void>;
  onMessage: (msg: string) => void;
  selectedLayer?: string | null;
  onSelectLayer?: (id: string | null) => void;
}) {
  const [chartError, setChartError] = useState("");
  const flow = project.flow;
  if (!flow) {
    return (
      <div className="document-panel panel-body">
        <div className="panel-stack">
          <div className="panel-heading">
            <h2>Document</h2>
            <FileText size={18} strokeWidth={1.75} />
          </div>
          <p className="panel-description">
            Turn your Content into a report or one-pager.
          </p>
        </div>
        <button
          type="button"
          className="button primary full-width"
          disabled={!project.manuscript.trim()}
          onClick={() => {
            const next = createDocumentProject(
              project.manuscript,
              `${project.name || "Untitled design"} report`,
            );
            void onCreate(next);
          }}
        >
          Create pages from Content
        </button>
        {!project.manuscript.trim() && (
          <p className="quiet-note">Add Content first, then create pages.</p>
        )}
      </div>
    );
  }

  const issues = documentIssues(project);
  const active =
    flow.pages.find((p) => p.id === flow.activePageId) || flow.pages[0];
  const pageNumber = flow.pages.findIndex((p) => p.id === active.id) + 1;

  function setFlow(next: FlowDocument) {
    update({ family: "document", flow: next });
  }

  function updateDecoration(id: string, patch: Partial<FlowDecorationElement>) {
    const nextPages = flow!.pages.map((p) => {
      if (p.id !== active.id) return p;
      return {
        ...p,
        decorations: (p.decorations || []).map((dec) =>
          dec.id === id ? ({ ...dec, ...patch } as FlowDecorationElement) : dec,
        ),
      };
    });
    setFlow({ ...flow!, pages: nextPages });
  }

  function removeDecoration(id: string) {
    const nextPages = flow!.pages.map((p) => {
      if (p.id !== active.id) return p;
      return {
        ...p,
        decorations: (p.decorations || []).filter((dec) => dec.id !== id),
      };
    });
    setFlow({ ...flow!, pages: nextPages });
    onSelectLayer?.(null);
    onMessage("Element removed from page.");
  }

  const activeDecorations = active.decorations || [];
  const selectedDecoration = activeDecorations.find(
    (d) => d.id === selectedLayer,
  );

  return (
    <div className="document-panel panel-body">
      <div className="panel-stack">
        <div className="panel-heading">
          <h2>Pages</h2>
          <span className="small-pill">{flow.pages.length}</span>
        </div>
        <p className="panel-description">
          Choose a page, then adjust its header, elements, and layout.
        </p>
      </div>
      <div className="doc-thumb-list">
        {flow.pages.map((page, i) => (
          <button
            key={page.id}
            type="button"
            className={`doc-thumb ${page.id === active.id ? "selected" : ""}`}
            onClick={() => {
              setFlow({ ...flow, activePageId: page.id });
              onSelectLayer?.(null);
            }}
            aria-label={`Open page ${i + 1}`}
          >
            <DocumentPageView
              flow={flow}
              page={page}
              pageNumber={i + 1}
              total={flow.pages.length}
              miniature
            />
            <span>
              Page {i + 1}
              {page.hidden ? " · hidden" : ""}
            </span>
          </button>
        ))}
      </div>
      <div className="custom-size-inputs">
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            try {
              setFlow(addDocumentPage(flow));
              onMessage("Page added.");
            } catch (e) {
              onMessage((e as Error).message);
            }
          }}
        >
          <Plus size={16} strokeWidth={1.75} />
          Add page
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={flow.pages.length <= 1}
          onClick={() => {
            try {
              setFlow(removeDocumentPage(flow, active.id));
              onMessage("Page removed.");
            } catch (e) {
              onMessage((e as Error).message);
            }
          }}
        >
          <Trash2 size={16} strokeWidth={1.75} />
          Remove
        </button>
      </div>

      {/* Selected Element Inspector */}
      {selectedDecoration && (
        <div className="panel-section border-t border-slate-200 dark:border-slate-800 pt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 dark:text-slate-200">
              {selectedDecoration.type === "image" && <ImageIcon size={14} />}
              {selectedDecoration.type === "chart" && <BarChart2 size={14} />}
              {selectedDecoration.type === "shape" && <Shapes size={14} />}
              <span>
                {selectedDecoration.type === "image"
                  ? (selectedDecoration as FlowImageElement).altText ||
                    "Image Element"
                  : selectedDecoration.type === "chart"
                    ? (selectedDecoration as FlowChartElement).title ||
                      "Chart Element"
                    : "Shape Element"}
              </span>
            </div>
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              onClick={() => onSelectLayer?.(null)}
            >
              Done
            </button>
          </div>

          {/* IMAGE FOCAL CROP INSPECTOR */}
          {selectedDecoration.type === "image" &&
            (() => {
              const img = selectedDecoration as FlowImageElement;
              const fp = img.focalPoint || { x: 0.5, y: 0.5 };
              return (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                      Fit Mode
                    </label>
                    <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800/50">
                      {(["crop", "fit", "fill"] as const).map((fit) => (
                        <button
                          key={fit}
                          type="button"
                          className={`flex-1 py-1 text-[11px] font-medium rounded-md capitalize transition-colors ${
                            img.fit === fit
                              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                          }`}
                          onClick={() => updateDecoration(img.id, { fit })}
                        >
                          {fit === "crop"
                            ? "Cover"
                            : fit === "fit"
                              ? "Contain"
                              : "Fill"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        Focal Point ({Math.round(fp.x * 100)}%,{" "}
                        {Math.round(fp.y * 100)}%)
                      </span>
                      <button
                        type="button"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                        onClick={() =>
                          updateDecoration(img.id, {
                            focalPoint: { x: 0.5, y: 0.5 },
                          })
                        }
                      >
                        <RefreshCw size={10} /> Reset center
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-slate-400">X</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round(fp.x * 100)}
                          onChange={(e) =>
                            updateDecoration(img.id, {
                              focalPoint: {
                                ...fp,
                                x: Number(e.target.value) / 100,
                              },
                            })
                          }
                          className="flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-slate-400">Y</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round(fp.y * 100)}
                          onChange={(e) =>
                            updateDecoration(img.id, {
                              focalPoint: {
                                ...fp,
                                y: Number(e.target.value) / 100,
                              },
                            })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Click anywhere on the image on the canvas to place focal
                      point.
                    </p>
                  </div>

                  <label className="form-label">
                    Alt text / Description
                    <input
                      value={img.altText || ""}
                      placeholder="Description of visual"
                      onChange={(e) =>
                        updateDecoration(img.id, { altText: e.target.value })
                      }
                    />
                  </label>

                  <button
                    type="button"
                    className="button secondary full-width text-red-600 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => removeDecoration(img.id)}
                  >
                    <Trash2 size={14} /> Remove Image
                  </button>
                </div>
              );
            })()}

          {/* CHART DATA EDITOR */}
          {selectedDecoration.type === "chart" &&
            (() => {
              const chart = selectedDecoration as FlowChartElement;
              const data = chart.data || [];
              const labels = chart.labels || [];

              const handleValueChange = (index: number, valStr: string) => {
                const val = Number(valStr);
                if (isNaN(val)) {
                  setChartError("Please enter a valid number.");
                  return;
                }
                setChartError("");
                const nextData = [...data];
                nextData[index] = val;
                updateDecoration(chart.id, { data: nextData });
              };

              const handleLabelChange = (index: number, label: string) => {
                const nextLabels = [...labels];
                nextLabels[index] = label;
                updateDecoration(chart.id, { labels: nextLabels });
              };

              const addRow = () => {
                const nextData = [...data, 50];
                const nextLabels = [...labels, `Item ${data.length + 1}`];
                updateDecoration(chart.id, {
                  data: nextData,
                  labels: nextLabels,
                });
              };

              const removeRow = (index: number) => {
                if (data.length <= 1) return;
                const nextData = data.filter((_, i) => i !== index);
                const nextLabels = labels.filter((_, i) => i !== index);
                updateDecoration(chart.id, {
                  data: nextData,
                  labels: nextLabels,
                });
              };

              return (
                <div className="space-y-3">
                  <label className="form-label">
                    Chart Title
                    <input
                      value={chart.title || ""}
                      placeholder="E.g. Quarterly Performance"
                      onChange={(e) =>
                        updateDecoration(chart.id, { title: e.target.value })
                      }
                    />
                  </label>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                      Chart Type
                    </label>
                    <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800/50">
                      {(["bar", "line", "pie"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          className={`flex-1 py-1 text-[11px] font-medium rounded-md capitalize transition-colors ${
                            chart.chartType === type
                              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                          }`}
                          onClick={() =>
                            updateDecoration(chart.id, { chartType: type })
                          }
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        Data Points ({data.length})
                      </span>
                      <button
                        type="button"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-medium text-xs"
                        onClick={addRow}
                      >
                        <Plus size={12} /> Add Point
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {data.map((val, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <input
                            className="flex-1 text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 rounded"
                            placeholder={`Label ${i + 1}`}
                            value={labels[i] || ""}
                            onChange={(e) =>
                              handleLabelChange(i, e.target.value)
                            }
                          />
                          <input
                            type="number"
                            className="w-16 text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 rounded text-right"
                            value={val}
                            onChange={(e) =>
                              handleValueChange(i, e.target.value)
                            }
                          />
                          <button
                            type="button"
                            disabled={data.length <= 1}
                            className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"
                            onClick={() => removeRow(i)}
                            title="Remove point"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {chartError && (
                      <p className="text-[10px] text-red-500 mt-1">
                        {chartError}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      Note: Chart values are presentation elements. Check
                      manuscript alignment if source copy mentions specific
                      numbers.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="button secondary full-width text-red-600 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => removeDecoration(chart.id)}
                  >
                    <Trash2 size={14} /> Remove Chart
                  </button>
                </div>
              );
            })()}
        </div>
      )}

      {/* ACTIVE PAGE DECORATIONS LIST */}
      {!selectedDecoration && activeDecorations.length > 0 && (
        <div className="panel-section border-t border-slate-200 dark:border-slate-800 pt-3">
          <div className="library-label">Page Elements</div>
          <div className="space-y-1.5 mt-1">
            {activeDecorations.map((dec) => (
              <button
                key={dec.id}
                type="button"
                className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-400 bg-white dark:bg-slate-800/80 text-left transition-colors"
                onClick={() => onSelectLayer?.(dec.id)}
              >
                <div className="flex items-center gap-2 text-xs">
                  {dec.type === "image" && (
                    <ImageIcon size={14} className="text-blue-500" />
                  )}
                  {dec.type === "chart" && (
                    <BarChart2 size={14} className="text-emerald-500" />
                  )}
                  {dec.type === "shape" && (
                    <Shapes size={14} className="text-purple-500" />
                  )}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {dec.type === "image"
                      ? (dec as FlowImageElement).altText || "Image"
                      : dec.type === "chart"
                        ? (dec as FlowChartElement).title || "Chart"
                        : "Shape"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">
                  {dec.type}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="panel-section">
        <div className="library-label">Page details</div>
        <label className="form-label">
          Header
          <input
            value={flow.master.header}
            maxLength={120}
            onChange={(e) =>
              setFlow({
                ...flow,
                master: { ...flow.master, header: e.target.value },
              })
            }
          />
        </label>
        <label className="form-label">
          Footer
          <input
            value={flow.master.footer}
            maxLength={120}
            onChange={(e) =>
              setFlow({
                ...flow,
                master: { ...flow.master, footer: e.target.value },
              })
            }
          />
        </label>
        <label className="form-label">
          <input
            type="checkbox"
            checked={flow.master.showPageNumbers}
            onChange={(e) =>
              setFlow({
                ...flow,
                master: { ...flow.master, showPageNumbers: e.target.checked },
              })
            }
          />
          Show page numbers
        </label>
      </div>
      <button
        type="button"
        className="button secondary full-width"
        disabled={!project.manuscript.trim()}
        onClick={() => {
          const content = parseDocumentManuscript(project.manuscript);
          const next = paginateDocument(content, flow.master, flow.pageSize);
          setFlow(next);
          onMessage(
            `Repaginated into ${next.pages.length} page${next.pages.length === 1 ? "" : "s"}.`,
          );
        }}
      >
        Update pages from Content
      </button>
      <p className="quiet-note">
        Page {pageNumber} of {flow.pages.length}
      </p>
      {issues.length > 0 && (
        <ul className="form-error">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
