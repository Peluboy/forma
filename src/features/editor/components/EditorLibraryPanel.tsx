import type { ComponentProps } from "react";
import { X } from "lucide-react";
import type { Project, FieldId } from "../../../domain/design/model";
import type { Session, User } from "../../../shared/api/api";
import { EditorDesignPanel } from "../panels/EditorDesignPanel";
import { EditorReferencePanel } from "../panels/EditorReferencePanel";
import {
  EditorElementsPanel,
  EditorTextPanel,
} from "../panels/EditorLayerPanels";
import DocumentPanel from "../panels/DocumentPanel";
import PresentationPanel from "../panels/PresentationPanel";
import SkillsPanel from "../../workflows/SkillsPanel";
import TeamPanel from "../../team/TeamPanel";
import ProjectsPanel from "../../projects/ProjectsPanel";
import type { EditorNav } from "../lib/editorNav";

type ElementsProps = ComponentProps<typeof EditorElementsPanel>;
type TextProps = ComponentProps<typeof EditorTextPanel>;
type ProjectsProps = ComponentProps<typeof ProjectsPanel>;
type TeamProps = ComponentProps<typeof TeamPanel>;
type LibraryProps = {
  showLibrary: boolean;
  nav: EditorNav;
  project: Project;
  query: string;
  category: string;
  selected: FieldId | null;
  selectedLayer: string | null;
  selectedGraphic: ElementsProps["selectedGraphic"];
  selectedTextLayer: TextProps["selectedTextLayer"];
  fits: TextProps["fits"];
  themeText: string;
  compare: boolean;
  provider: ComponentProps<typeof EditorReferencePanel>["provider"];
  capabilities: Session["capabilities"];
  analyzing: boolean;
  analysisError: string;
  drawing: ComponentProps<typeof EditorReferencePanel>["drawing"];
  user: User | null;
  projects: Project[];
  projectFilter: ProjectsProps["filter"];
  saveNow: TeamProps["saveNow"];
  setQuery: (value: string) => void;
  setCategory: (value: string) => void;
  setNav: (value: EditorNav) => void;
  setShowLibrary: (value: boolean) => void;
  setSelected: (value: FieldId | null) => void;
  setSelectedLayer: (value: string | null) => void;
  setDrawing: (value: FieldId | null) => void;
  setCompare: (value: boolean) => void;
  setProvider: (value: LibraryProps["provider"]) => void;
  setProjectFilter: ProjectsProps["setFilter"];
  setDeleteTarget: ProjectsProps["onDelete"];
  startGraphics: (template?: Project["template"]) => void;
  openTool: (value: EditorNav) => void;
  onChooseReference: () => void;
  onChooseProject: () => void;
  uploadReference: (file: File) => Promise<void>;
  analyzeReference: () => Promise<void>;
  update: (patch: Partial<Project>) => void;
  patchLayout: TextProps["onPatchField"];
  patchTextLayer: TextProps["onPatchText"];
  patchGraphicLayer: TextProps["onPatchGraphic"];
  removeSelectedLayer: TextProps["onRemove"];
  replaceSelectedImage: TextProps["onReplaceImage"];
  createFromCurrent: ComponentProps<typeof DocumentPanel>["onCreate"];
  onMessage: (message: string) => void;
  onApplySkill: (project: Project) => void;
  newProject: ProjectsProps["onNew"];
  duplicateDesign: (template: boolean) => void;
  openSavedProject: ProjectsProps["onOpen"];
};

export function EditorLibraryPanel(props: LibraryProps) {
  const {
    showLibrary,
    nav,
    project,
    query,
    category,
    selected,
    selectedLayer,
    selectedGraphic,
    selectedTextLayer,
    fits,
    themeText,
    compare,
    provider,
    capabilities,
    analyzing,
    analysisError,
    drawing,
    user,
    projects,
    projectFilter,
    saveNow,
    setQuery,
    setCategory,
    setNav,
    setShowLibrary,
    setSelected,
    setSelectedLayer,
    setDrawing,
    setCompare,
    setProvider,
    setProjectFilter,
    setDeleteTarget,
    startGraphics,
    openTool,
    onChooseReference,
    onChooseProject,
    uploadReference,
    analyzeReference,
    update,
    patchLayout,
    patchTextLayer,
    patchGraphicLayer,
    removeSelectedLayer,
    replaceSelectedImage,
    createFromCurrent,
    onMessage,
    onApplySkill,
    newProject,
    duplicateDesign,
    openSavedProject,
  } = props;
  return showLibrary ? (
    <aside className="library-panel">
      <button
        className="mobile-panel-close"
        aria-label="Close library"
        onClick={() => setShowLibrary(false)}
      >
        <X size={17} />
      </button>
      {nav === "templates" && (
        <EditorDesignPanel
          project={project}
          query={query}
          category={category}
          onQuery={setQuery}
          onCategory={setCategory}
          onTemplate={startGraphics}
          onGraphics={() => {
            if (
              project.family === "document" ||
              project.family === "presentation"
            )
              startGraphics();
            else setCategory("All");
          }}
          onReference={() => {
            setNav("reference");
            setShowLibrary(true);
          }}
          onDocument={() => openTool("document")}
          onPresentation={() => openTool("presentation")}
        />
      )}
      {nav === "reference" && (
        <EditorReferencePanel
          project={project}
          compare={compare}
          provider={provider}
          available={{
            local: Boolean(capabilities?.analysis?.local),
            gemini: Boolean(capabilities?.analysis?.gemini),
            openai: Boolean(capabilities?.analysis?.openai),
          }}
          analyzing={analyzing}
          analysisError={analysisError}
          drawing={drawing}
          onChooseFile={() => onChooseReference()}
          onUploadFile={(file) => void uploadReference(file)}
          onRemove={() => {
            update({
              reference: null,
              referenceName: "",
              designMode: "template",
              mappedFields: [],
            });
            setDrawing(null);
            setCompare(false);
          }}
          onCompare={() => setCompare(!compare)}
          onUseReference={() => {
            update({
              designMode: "reference",
              mappedFields:
                project.designMode === "reference" ? project.mappedFields : [],
            });
            setDrawing("title");
            setSelected(null);
            setCompare(false);
            if (window.innerWidth < 850) setShowLibrary(false);
            onMessage(
              "Drag a rectangle over the original headline to replace it.",
            );
          }}
          onProvider={setProvider}
          onAnalyze={() => void analyzeReference()}
          onDrawArea={(id) => {
            setDrawing(id);
            setSelected(null);
            if (window.innerWidth < 850) setShowLibrary(false);
          }}
        />
      )}
      {nav === "elements" && (
        <EditorElementsPanel
          project={project}
          selectedLayer={selectedLayer}
          selectedGraphic={selectedGraphic || null}
          themeText={themeText}
          onSelectLayer={(id) => {
            setSelectedLayer(id);
            setSelected(null);
          }}
          onNavigate={(tool) => openTool(tool)}
          update={update}
          onPatchField={patchLayout}
          onPatchText={patchTextLayer}
          onPatchGraphic={patchGraphicLayer}
          onRemove={removeSelectedLayer}
          onReplaceImage={replaceSelectedImage}
        />
      )}
      {nav === "text" && (
        <EditorTextPanel
          project={project}
          selectedField={selected}
          selectedLayer={selectedLayer}
          selectedTextLayer={selectedTextLayer || null}
          fits={fits}
          themeText={themeText}
          onSelectField={(id) => {
            setSelected(id);
            setSelectedLayer(null);
          }}
          onSelectLayer={(id) => {
            setSelectedLayer(id);
            setSelected(null);
          }}
          onCover={(color) => {
            if (selected)
              update({
                covers: { ...project.covers, [selected]: color },
              });
          }}
          update={update}
          onPatchField={patchLayout}
          onPatchText={patchTextLayer}
          onPatchGraphic={patchGraphicLayer}
          onRemove={removeSelectedLayer}
          onReplaceImage={replaceSelectedImage}
        />
      )}
      {nav === "document" && (
        <DocumentPanel
          project={project}
          update={update}
          onCreate={createFromCurrent}
          onMessage={onMessage}
          selectedLayer={selectedLayer}
          onSelectLayer={onSelectLayer}
        />
      )}
      {nav === "presentation" && (
        <PresentationPanel
          project={project}
          update={update}
          onCreate={createFromCurrent}
          onMessage={onMessage}
        />
      )}
      {nav === "skills" && (
        <SkillsPanel
          project={project}
          onMessage={onMessage}
          onApply={(result) => {
            onApplySkill(result.project);
          }}
        />
      )}
      {nav === "team" && (
        <TeamPanel
          user={user}
          project={project}
          saveNow={saveNow}
          onMessage={onMessage}
        />
      )}
      {nav === "projects" && (
        <ProjectsPanel
          project={project}
          projects={projects}
          signedIn={Boolean(user)}
          filter={projectFilter}
          setFilter={setProjectFilter}
          onNew={newProject}
          onOpenFile={() => onChooseProject()}
          onSaveTemplate={() => duplicateDesign(true)}
          onOpen={(item) => void openSavedProject(item)}
          onDelete={setDeleteTarget}
        />
      )}
    </aside>
  ) : null;
}
