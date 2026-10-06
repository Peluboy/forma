import "../../styles/editor.css";
import "../../styles/panel.css";
import "../../styles/editor-overhaul.css";
import { useEffect, useRef, useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import Poster, { getFits } from "./components/Poster";
import { layerFits } from "./components/TextLayers";
import { EditorModalHost, type EditorDialog } from "./dialogs/EditorModalHost";
import {
  GUIDE_DISMISSED_KEY,
  readProjects,
  shouldAutoShowGuide,
} from "./lib/projectGuide";
import {
  duplicateAddedLayer,
  moveAddedLayer,
} from "../../domain/design/layers";
import {
  applyContentBlocks,
  changedBlocks,
  createProject,
  editCanvasText,
  fieldIds,
  outputPixels,
  parseManuscript,
  parseManuscriptBlocks,
  serializeCopy,
  templates,
  unmappedFields,
  wordCount,
  type FieldId,
  type Project,
  type TemplateId,
} from "../../domain/design/model";

import { useAccount, api } from "../../shared/api/api";
import {
  defaultBrandSystem,
  normalizeBrand,
  readGuestBrand,
  type BrandSystem,
} from "../../domain/design/designSystem";
import { replaceProjectColor } from "../../domain/design/colors";
import { type Analysis } from "./dialogs/AnalysisReview";
import { usePersistence } from "./hooks/usePersistence";
import { useEditorHistory } from "./hooks/useEditorHistory";
import { useEditorKeyboard } from "./hooks/useEditorKeyboard";
import { createEditorSelectionActions } from "./lib/selectionActions";
import {
  createEditorProjectActions,
  patchDocumentDecoration,
} from "./lib/projectActions";
import {
  runCanvasAction,
  type CanvasClipboard,
  type CanvasTarget,
} from "./lib/canvasActions";
import { applyStartIntent } from "./lib/startIntent";
import { createEditorIoActions } from "./lib/editorIoActions";
import { startGraphicsDesign } from "./lib/startGraphics";
import { editorIssueState } from "./lib/editorIssues";
import { EditorContentPanel } from "./components/EditorContentPanel";
import { EditorCanvasToolbar } from "./components/EditorCanvasToolbar";
import { EditorLibraryPanel } from "./components/EditorLibraryPanel";
import { EditorFileInputs } from "./components/EditorFileInputs";
import { EditorStorageStatus } from "./components/EditorStorageStatus";
import { EditorQuickStart } from "./components/EditorQuickStart";
import { EditorToolRail } from "./components/EditorToolRail";
import { EditorHeader } from "./components/EditorHeader";
import { EditorSelectionToolbar } from "./components/EditorSelectionToolbar";
import { EditorLayersPopover } from "./components/EditorLayersPopover";
import type { ContextAction } from "./components/EditorContextMenu";
import { EditorContextMenuHost } from "./components/EditorContextMenuHost";
import { EditorArtboard } from "./canvas/EditorArtboard";
import { EditorPageTopline } from "./canvas/EditorPageTopline";
import { EditorCanvasFooter } from "./canvas/EditorCanvasFooter";
import { EditorQualityPanel } from "./components/EditorQualityPanel";
import {
  isFieldSelect,
  navFromTool,
  readEditorLink,
  toolFromNav,
  writeEditorLink,
  type EditorNav,
  type EditorPanel,
  type IssueTarget,
} from "./lib/editorNav";

type Nav = EditorNav;
type Dialog = EditorDialog;
export default function EditorPage() {
  const [project, setProject] = useState<Project>(
    () => readProjects()[0] || createProject(),
  );
  const [draft, setDraft] = useState(project.manuscript);
  const [nav, setNav] = useState<Nav>("templates");
  const [showLibrary, setShowLibrary] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: CanvasTarget;
  } | null>(null);
  const canvasClipboard = useRef<CanvasClipboard | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [selected, setSelected] = useState<FieldId | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<FieldId | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const { history, future, resetHistory, update, undo, redo } =
    useEditorHistory({
      project,
      setProject,
      setDraft,
      onFamilyChange: () => {
        setSelected(null);
        setSelectedLayer(null);
      },
    });
  const { session, config, ready: sessionReady } = useAccount();
  const persistence = usePersistence(
    project,
    (p) => {
      setProject(p);
      setDraft(p.manuscript);
      resetHistory();
      setSelected(null);
      setDrawing(null);
    },
    session.user,
    sessionReady,
  );
  const { projects, saved } = persistence;
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [provider, setProvider] = useState<"local" | "openai" | "gemini">(
    "local",
  );
  const [projectFilter, setProjectFilter] = useState<"all" | "templates">(
    "all",
  );
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  useEffect(() => {
    const available = session.capabilities?.analysis;
    if (available?.gemini) setProvider("gemini");
    else if (available?.openai) setProvider("openai");
    else setProvider("local");
  }, [
    session.capabilities?.analysis?.gemini,
    session.capabilities?.analysis?.openai,
  ]);
  useEffect(() => {
    if (window.location.search.includes("reset=1")) setDialog("account");
    else if (new URLSearchParams(window.location.search).has("billing"))
      setDialog("billing");
  }, []);
  const [toast, setToast] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [brand, setBrand] = useState<BrandSystem>(
    () => readGuestBrand() || defaultBrandSystem(),
  );
  useEffect(() => {
    if (dialog === "brand") return;
    void api<BrandSystem>("/brand")
      .then((value) => setBrand(normalizeBrand(value)))
      .catch(() => setBrand(readGuestBrand()));
  }, [dialog, session.user?.id]);
  function closeDialog() {
    setDialog(null);
    writeEditorLink({
      dialog: null,
      ...(readEditorLink().tool === "help" ? { tool: null } : {}),
    });
  }
  const [showGuide, setShowGuide] = useState(
    () =>
      new URLSearchParams(location.search).get("tour") === "1" ||
      shouldAutoShowGuide(project),
  );
  const [guideApplied, setGuideApplied] = useState(false);
  const [guideExported, setGuideExported] = useState(false);
  const startHandled = useRef("");
  useEffect(() => {
    document.title = "Your workspace — Forma";
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.append(robots);
    }
    robots.content = "noindex,nofollow";
  }, []);
  useEffect(() => {
    if (!persistence.isReady || !sessionReady) return;
    const owner = session.user?.id || "guest";
    if (startHandled.current === owner) return;
    startHandled.current = owner;
    void applyStartIntent({
      owner,
      signedIn: !!session.user,
      projects,
      switchProject,
      setNav,
      setShowLibrary,
      setShowRight,
      setRightTab,
      setShowGuide,
      setToast,
    });
  }, [persistence.isReady, sessionReady, session.user?.id, projects]);
  const [rightTab, setRightTab] = useState<"manuscript" | "checks">(
    "manuscript",
  );
  const [compare, setCompare] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showRight, setShowRight] = useState(
    () =>
      new URLSearchParams(location.search).has("tour") ||
      readEditorLink().panel === "content" ||
      readEditorLink().panel === "issues" ||
      readEditorLink().tool === "content" ||
      readEditorLink().tool === "issues" ||
      window.innerWidth > 1100,
  );
  const [exportFormat, setExportFormat] = useState("png");
  const [exporting, setExporting] = useState(false);
  const [fileMenu, setFileMenu] = useState(false);
  const manuscriptInput = useRef<HTMLInputElement>(null);
  const referenceInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!persistence.isReady) return;
    const link = readEditorLink();
    if (link.dialog === "help" || link.tool === "help") setDialog("help");
    else if (link.dialog === "export") setDialog("export");
    else if (link.dialog === "share") setDialog("share");
    if (link.tool === "content" || link.panel === "content") {
      setShowRight(true);
      setRightTab("manuscript");
      setShowLibrary(false);
    } else if (link.tool === "issues" || link.panel === "issues") {
      setShowRight(true);
      setRightTab("checks");
      setShowLibrary(false);
    }
    if (
      link.tool &&
      link.tool !== "content" &&
      link.tool !== "issues" &&
      link.tool !== "help"
    ) {
      const next = navFromTool(link.tool);
      if (next) {
        setNav(next);
        if (!link.panel) {
          setShowLibrary(true);
          setShowRight(false);
        }
      }
    }
    if (link.select) {
      if (isFieldSelect(link.select)) {
        setSelected(link.select);
        setSelectedLayer(null);
        setNav("text");
        setShowLibrary(true);
        setShowRight(false);
      } else {
        setSelected(null);
        setSelectedLayer(link.select);
        const graphic = project.graphicLayers?.some(
          (l) => l.id === link.select,
        );
        setNav(graphic ? "elements" : "text");
        setShowLibrary(true);
        setShowRight(false);
      }
    }
    // One-shot deep link when the workspace becomes ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistence.isReady]);

  const fits = getFits(project);
  const missing = unmappedFields(project);
  const overflowing = fieldIds.filter(
    (id) => fits[id].overflow && !missing.includes(id),
  );
  const extraOverflow = layerFits(project).filter(({ fit }) => fit.overflow);
  const { issues, targets: issueTargets } = editorIssueState(
    project,
    missing,
    overflowing,
    extraOverflow,
  );
  const pixels = outputPixels(project);
  const nextBlocks = parseManuscriptBlocks(draft);
  const nextCopy = parseManuscript(draft);
  const currentBlocks =
    project.contentBlocks || parseManuscriptBlocks(serializeCopy(project.copy));
  const blockChanges = changedBlocks(currentBlocks, nextBlocks);
  const draftChanged = draft !== project.manuscript;
  const theme = templates.find((t) => t.id === project.template)!;

  function handleCanvasAction(action: ContextAction) {
    runCanvasAction(action, {
      project,
      contextTarget: contextMenu?.target || null,
      showGuides,
      setShowGuides,
      setShowLayers,
      setDialog,
      update,
      canvasClipboard,
      setToast,
      setSelectedLayer,
      setSelected,
    });
  }
  function openTool(next: Nav, opts?: { toggle?: boolean }) {
    const same = nav === next && showLibrary;
    const open = opts?.toggle ? !same : true;
    setNav(next);
    setShowLibrary(open);
    if (open) setShowRight(false);
    setMoreOpen(false);
    writeEditorLink({
      tool: open ? toolFromNav(next) : null,
      panel: open ? null : undefined,
      select: open ? undefined : null,
    });
  }

  function openPanel(panel: EditorPanel) {
    setShowRight(true);
    setRightTab(panel === "issues" ? "checks" : "manuscript");
    setShowLibrary(false);
    setMoreOpen(false);
    writeEditorLink({ panel, tool: null });
  }

  function focusIssue(target: IssueTarget) {
    setShowRight(false);
    setMoreOpen(false);
    closeDialog();
    if (target.kind === "document") {
      if (project.flow && project.flow.activePageId !== target.pageId)
        update({ flow: { ...project.flow, activePageId: target.pageId } });
      setNav("document");
      setShowLibrary(true);
      writeEditorLink({ tool: "document", panel: null, dialog: null });
      setToast(target.reason);
      return;
    }
    const graphic = project.graphicLayers?.some((l) => l.id === target.id);
    if (target.kind === "field") {
      setSelected(target.id);
      setSelectedLayer(null);
      setNav("text");
    } else {
      setSelected(null);
      setSelectedLayer(target.id);
      setNav(graphic ? "elements" : "text");
    }
    setShowLibrary(true);
    writeEditorLink({
      tool: target.kind === "field" ? "text" : graphic ? "elements" : "text",
      panel: null,
      select: target.id,
      dialog: null,
    });
    setToast(target.reason);
  }

  function applyManuscript() {
    if (!draft.trim()) {
      setToast("Add your manuscript before applying it.");
      return;
    }
    if (draft.length > 30000) {
      setToast("Please keep manuscripts under 30,000 characters.");
      return;
    }
    try {
      const patch = applyContentBlocks(project, nextBlocks, draft);
      update(patch);
      setGuideApplied(true);
      const freeCount = nextBlocks.filter((b) => !b.fieldId).length;
      setToast(
        blockChanges.length
          ? `Updated ${blockChanges.length} manuscript ${blockChanges.length === 1 ? "section" : "sections"}${freeCount ? ` (${freeCount} extra as text layers)` : ""}. Your wording is preserved.`
          : "Your design already matches this manuscript.",
      );
      closeDialog();
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEditorKeyboard({
    blocked: Boolean(dialog || deleteTarget),
    hasSelectedLayer: Boolean(selectedLayer),
    onApplyContent: applyManuscript,
    onUndo: undo,
    onRedo: redo,
    onEscape: () => {
      setSelected(null);
      setSelectedLayer(null);
      setFileMenu(false);
      setMoreOpen(false);
    },
    onRemoveLayer: () => removeSelectedLayer(),
    onDuplicateLayer: () => {
      if (!selectedLayer) return;
      const patch = duplicateAddedLayer(project, selectedLayer);
      if (!patch) {
        setToast("Could not duplicate that layer.");
        return;
      }
      update(patch);
      const nextId =
        patch.textLayers?.at(-1)?.id || patch.graphicLayers?.at(-1)?.id || null;
      if (nextId) setSelectedLayer(nextId);
      setToast("Layer duplicated.");
    },
  });
  const {
    switchProject,
    createFromCurrent,
    leaveEditor,
    newProject,
    duplicateDesign,
    openSavedProject,
    openImportedProject,
  } = createEditorProjectActions({
    project,
    draftChanged,
    signedIn: Boolean(session.user),
    saveNow: persistence.saveNow,
    setProject,
    setDraft,
    resetHistory,
    setSelected,
    setSelectedLayer,
    setDrawing,
    setCompare,
    setToast,
    setNav,
    setFileMenu,
    setProjectFilter,
    setShowLibrary,
  });
  const { uploadManuscript, uploadReference, exportDesign, analyzeReference } =
    createEditorIoActions({
      project,
      provider,
      signedIn: !!session.user,
      exportFormat,
      update,
      setDraft,
      setToast,
      setRightTab,
      setCompare,
      setExporting,
      setGuideExported,
      closeDialog,
      setDialog,
      setAnalyzing,
      setAnalysisError,
      setAnalysis,
    });
  function requireAccount(next: Dialog) {
    setDialog(session.user ? next : "account");
  }
  const {
    mapRegion,
    patchLayout,
    selectedTextLayer,
    selectedGraphic,
    patchTextLayer,
    patchGraphicLayer,
    replaceSelectedImage,
    removeSelectedLayer,
    applyFieldBox,
    applyLayerBox,
  } = createEditorSelectionActions({
    project,
    selected,
    selectedLayer,
    setSelected,
    setSelectedLayer,
    setDrawing,
    update,
    onMessage: setToast,
  });
  const workspaceOpened = useRef(false);
  function startGraphics(template: TemplateId = project.template) {
    startGraphicsDesign({
      project,
      template,
      update,
      createFromCurrent,
      onMessage: setToast,
      clearDrawing: () => setDrawing(null),
    });
  }
  if (sessionReady && persistence.isReady) workspaceOpened.current = true;
  if (
    !workspaceOpened.current &&
    (!sessionReady || (!persistence.isReady && !persistence.loadError))
  )
    return (
      <div className="page-loading" role="status">
        Opening your workspace…
      </div>
    );
  return (
    <div className="app-shell">
      <EditorFileInputs
        manuscriptInput={manuscriptInput}
        referenceInput={referenceInput}
        projectInput={projectInput}
        onManuscript={(file) => void uploadManuscript(file)}
        onReference={(file) => void uploadReference(file)}
        onProject={(opened) => void openImportedProject(opened)}
        onMessage={setToast}
      />
      <EditorHeader
        project={project}
        saved={saved}
        userName={session.user?.name || null}
        fileMenu={fileMenu}
        issueCount={issues.length}
        onBack={() => void leaveEditor("/dashboard")}
        onRename={(name) => update({ name })}
        onRetrySave={() =>
          void persistence.saveNow().catch((error) => setToast(error.message))
        }
        onToggleFileMenu={() => setFileMenu(!fileMenu)}
        onNew={() => {
          void newProject();
          setFileMenu(false);
        }}
        onOpenFile={() => {
          projectInput.current?.click();
          setFileMenu(false);
        }}
        onSaveEditable={() => {
          setExportFormat("json");
          setDialog("export");
          setFileMenu(false);
        }}
        onResize={() => {
          if (project.designMode === "reference")
            setToast("Reference mode keeps the original image proportions.");
          else setDialog("resize");
          setFileMenu(false);
        }}
        onVersions={() => {
          setFileMenu(false);
          requireAccount("versions");
        }}
        onBrand={() => {
          setFileMenu(false);
          requireAccount("brand");
        }}
        onHelp={() => {
          setFileMenu(false);
          setDialog("help");
        }}
        onSignIn={() => setDialog("account")}
        onShare={() => requireAccount("share")}
        onAccount={() => setDialog("account")}
        onExport={() => {
          if (
            project.family === "document" ||
            project.family === "presentation"
          )
            setExportFormat("pdf");
          if (issues.length) {
            openPanel("issues");
            setToast(
              `${issues.length} issue${issues.length === 1 ? "" : "s"} to fix before some exports.`,
            );
          }
          setDialog("export");
          writeEditorLink({ dialog: "export" });
        }}
      />
      <EditorStorageStatus
        conflict={persistence.conflict}
        loadError={persistence.loadError}
        signedIn={Boolean(session.user)}
        ready={persistence.isReady}
        onLoadRemote={() =>
          void persistence
            .loadRemote()
            .catch((error) => setToast(error.message))
        }
        onKeepAsCopy={persistence.keepAsCopy}
        onRetry={persistence.retry}
      />
      <div className="workspace">
        <EditorToolRail
          nav={nav}
          showLibrary={showLibrary}
          contentOpen={showRight}
          moreOpen={moreOpen}
          avatar={session.user?.name?.[0]?.toUpperCase() || "Y"}
          onOpenTool={(tool, toggle) => openTool(tool, { toggle })}
          onOpenContent={() => openPanel("content")}
          onToggleMore={() => setMoreOpen((open) => !open)}
          onHelp={() => {
            setMoreOpen(false);
            setDialog("help");
            writeEditorLink({ dialog: "help", tool: null });
          }}
          onAccount={() => setDialog("account")}
        />
        <EditorLibraryPanel
          showLibrary={showLibrary}
          nav={nav}
          project={project}
          query={query}
          category={category}
          selected={selected}
          selectedLayer={selectedLayer}
          selectedGraphic={selectedGraphic || null}
          selectedTextLayer={selectedTextLayer || null}
          fits={fits}
          themeText={theme.text}
          compare={compare}
          provider={provider}
          capabilities={session.capabilities}
          analyzing={analyzing}
          analysisError={analysisError}
          drawing={drawing}
          user={session.user}
          projects={projects}
          projectFilter={projectFilter}
          saveNow={persistence.saveNow}
          setQuery={setQuery}
          setCategory={setCategory}
          setNav={setNav}
          setShowLibrary={setShowLibrary}
          setSelected={setSelected}
          setSelectedLayer={setSelectedLayer}
          setDrawing={setDrawing}
          setCompare={setCompare}
          setProvider={setProvider}
          setProjectFilter={setProjectFilter}
          setDeleteTarget={setDeleteTarget}
          startGraphics={startGraphics}
          openTool={openTool}
          onChooseReference={() => referenceInput.current?.click()}
          onChooseProject={() => projectInput.current?.click()}
          uploadReference={uploadReference}
          analyzeReference={analyzeReference}
          update={update}
          patchLayout={patchLayout}
          patchTextLayer={patchTextLayer}
          patchGraphicLayer={patchGraphicLayer}
          removeSelectedLayer={removeSelectedLayer}
          replaceSelectedImage={replaceSelectedImage}
          createFromCurrent={createFromCurrent}
          onMessage={setToast}
          onApplySkill={(next) => {
            switchProject(next);
            setDraft(next.manuscript);
            setGuideApplied(true);
          }}
          newProject={newProject}
          duplicateDesign={duplicateDesign}
          openSavedProject={openSavedProject}
        />
        <main className="editor-area">
          {import.meta.env.VITE_FORMA_QUALITY_PANEL === "true" && (
            <EditorQualityPanel project={project} onApply={update} />
          )}
          <EditorCanvasToolbar
            project={project}
            canUndo={Boolean(history.length)}
            canRedo={Boolean(future.length)}
            showLayers={showLayers}
            compare={compare}
            issues={issues.length}
            showRight={showRight}
            onUndo={undo}
            onRedo={redo}
            onToggleLayers={() => setShowLayers(!showLayers)}
            onToggleCompare={() => setCompare(!compare)}
            onIssues={() => openPanel("issues")}
            onToggleContent={() => {
              if (showRight && rightTab === "manuscript") {
                setShowRight(false);
                writeEditorLink({ panel: null });
              } else openPanel("content");
            }}
          />
          {showLayers &&
            project.family !== "document" &&
            project.family !== "presentation" && (
              <EditorLayersPopover
                project={project}
                selectedField={selected}
                selectedLayer={selectedLayer}
                onSelectField={(id) => {
                  setSelected(id);
                  setSelectedLayer(null);
                }}
                onSelectLayer={(id) => {
                  setSelectedLayer(id);
                  setSelected(null);
                }}
                update={update}
                onClose={() => setShowLayers(false)}
              />
            )}
          {showGuide && (
            <EditorQuickStart
              applied={guideApplied}
              exported={guideExported}
              onDismiss={() => {
                setShowGuide(false);
                try {
                  window.localStorage.setItem(GUIDE_DISMISSED_KEY, "1");
                } catch {
                  /* storage unavailable; the guide simply returns next visit */
                }
                const params = new URLSearchParams(location.search);
                params.delete("tour");
                window.history.replaceState(
                  {},
                  "",
                  `${location.pathname}${params.size ? `?${params}` : ""}`,
                );
              }}
              onStart={() => {
                setNav(project.reference ? "reference" : "templates");
                setShowLibrary(true);
              }}
              onContent={() => {
                setShowRight(true);
                setRightTab("manuscript");
                if (innerWidth <= 850) setShowLibrary(false);
              }}
              onExport={() => {
                setShowRight(true);
                setRightTab("checks");
                setDialog("export");
              }}
            />
          )}
          <div
            className="canvas-workspace"
            onClick={() => {
              setSelected(null);
              setSelectedLayer(null);
            }}
          >
            <EditorPageTopline
              project={project}
              zoom={zoom}
              guideOpen={showGuide}
              pixelSize={pixels}
              onPageActions={(x, y) => setContextMenu({ x, y, target: null })}
            />
            <EditorSelectionToolbar
              project={project}
              selected={selected}
              selectedLayer={selectedLayer}
              selectedTextLayer={selectedTextLayer || null}
              selectedGraphic={selectedGraphic || null}
              themeText={theme.text}
              themeFont={theme.font as "Arial" | "Georgia"}
              brand={brand}
              patchLayout={patchLayout}
              patchTextLayer={patchTextLayer}
              patchGraphicLayer={patchGraphicLayer}
              update={update}
              onOpenText={() => {
                setNav("text");
                setShowLibrary(true);
              }}
              onOpenElements={() => {
                setNav("elements");
                setShowLibrary(true);
              }}
              onRemove={removeSelectedLayer}
              onReplaceAllColor={(from, to) =>
                update(replaceProjectColor(project, from, to))
              }
              onOpenBrand={() => setDialog("brand")}
            />
            <EditorArtboard
              project={project}
              compare={compare}
              zoom={zoom}
              selected={selected}
              selectedLayer={selectedLayer}
              drawing={drawing}
              onSelectLayer={(id) => {
                setSelectedLayer(id);
                setSelected(null);
              }}
              onMoveLayer={(id, dx, dy) =>
                update(moveAddedLayer(project, id, dx, dy))
              }
              onLayerBox={applyLayerBox}
              onSelectField={(id) => {
                setSelected(id);
                setSelectedLayer(null);
              }}
              onRegion={(id, box) => void mapRegion(id, box)}
              onFieldBox={applyFieldBox}
              onEditField={(id, text) => {
                if (text.length <= 10000) {
                  const patch = editCanvasText(project, id, text);
                  update(patch);
                  if (patch.manuscript) setDraft(patch.manuscript);
                }
              }}
              onEditLayer={(id, text) => {
                if (text.length <= 10000) {
                  const patch = editCanvasText(project, id, text);
                  update(patch);
                  if (patch.manuscript) setDraft(patch.manuscript);
                }
              }}
              onUpdateFlowDecoration={(pageId, decId, patch) =>
                update(patchDocumentDecoration(project, pageId, decId, patch))
              }
              guides={showGuides}
              guideOpen={showGuide}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const element =
                  event.target instanceof Element ? event.target : null;
                const layerId = element
                  ?.closest("[data-layer-id]")
                  ?.getAttribute("data-layer-id");
                const fieldId = element
                  ?.closest("[data-field-id]")
                  ?.getAttribute("data-field-id");
                const target: CanvasTarget = layerId
                  ? { kind: "layer", id: layerId }
                  : fieldId
                    ? { kind: "field", id: fieldId }
                    : null;
                if (target?.kind === "layer") {
                  setSelectedLayer(target.id);
                  setSelected(null);
                }
                if (target?.kind === "field") {
                  setSelected(target.id as FieldId);
                  setSelectedLayer(null);
                }
                setContextMenu({ x: event.clientX, y: event.clientY, target });
              }}
            />
          </div>
          <EditorCanvasFooter project={project} zoom={zoom} onZoom={setZoom} />
        </main>
        {showRight && (
          <EditorContentPanel
            tab={rightTab}
            draft={draft}
            draftChanged={draftChanged}
            wordCount={wordCount(nextCopy)}
            changeCount={blockChanges.length}
            issueCount={issues.length}
            issueTargets={issueTargets}
            onClose={() => setShowRight(false)}
            onOpenPanel={openPanel}
            onChooseFile={() => manuscriptInput.current?.click()}
            onUploadFile={(file) => void uploadManuscript(file)}
            onDraftChange={setDraft}
            onApply={applyManuscript}
            onReview={() => setDialog("revision")}
            onFocusIssue={focusIssue}
          />
        )}
      </div>
      <EditorContextMenuHost
        contextMenu={contextMenu}
        project={project}
        clipboard={canvasClipboard}
        guides={showGuides}
        onAction={handleCanvasAction}
        onClose={() => setContextMenu(null)}
      />
      <div className="export-render" aria-hidden="true">
        <Poster project={project} exportId="export-svg" />
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <EditorModalHost
        dialog={dialog}
        project={project}
        user={session.user}
        config={config}
        analysis={analysis}
        deleteTarget={deleteTarget}
        exportState={{
          format: exportFormat,
          pixels,
          draftChanged,
          issueTargets,
          issueCount: issues.length,
          exporting,
        }}
        revision={{ changes: blockChanges, current: currentBlocks }}
        saveNow={persistence.saveNow}
        onClose={closeDialog}
        onCloseDelete={() => setDeleteTarget(null)}
        onMessage={setToast}
        onChangeDialog={setDialog}
        onSettings={() => void leaveEditor("/account")}
        onExportFormat={setExportFormat}
        onFocusIssue={focusIssue}
        onExport={() => void exportDesign()}
        onResize={(patch) => {
          update(patch);
          closeDialog();
          setToast("Format updated. Review placement before exporting.");
        }}
        onApplyContent={applyManuscript}
        onApplyAnalysis={(patch) => {
          update(patch);
          setCompare(false);
          setDrawing(null);
          setSelected(null);
          closeDialog();
          setToast("Text areas mapped. Your manuscript wording is unchanged.");
        }}
        onRestore={(restored) => {
          update(restored);
          setDraft(restored.manuscript);
          closeDialog();
          setToast("Earlier version restored as a new save.");
        }}
        onApplyBrand={(patch) => {
          update(patch);
          closeDialog();
          setToast("Brand colors applied. Copy preserved.");
        }}
        onDelete={async (target) => {
          try {
            await persistence.remove(target.id);
            setDeleteTarget(null);
            setToast("Design deleted.");
          } catch (error) {
            setToast((error as Error).message);
          }
        }}
      />
    </div>
  );
}
