import type { Dispatch, SetStateAction } from "react";
import { api } from "../../../shared/api/api";
import {
  writeEditorLink,
  writeEditorProjectLink,
  type EditorNav,
} from "../lib/editorNav";
import {
  projectFromTemplate,
  readGuestTemplates,
  templateFromProject,
  writeGuestTemplates,
} from "../../../domain/design/designSystem";
import {
  createProject,
  type FieldId,
  type Project,
} from "../../../domain/design/model";

/** Project switching always goes through the save guard and resets editor selection. */
export function createEditorProjectActions({
  project,
  draftChanged,
  signedIn,
  saveNow,
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
}: {
  project: Project;
  draftChanged: boolean;
  signedIn: boolean;
  saveNow: () => Promise<unknown>;
  setProject: Dispatch<SetStateAction<Project>>;
  setDraft: Dispatch<SetStateAction<string>>;
  resetHistory: () => void;
  setSelected: Dispatch<SetStateAction<FieldId | null>>;
  setSelectedLayer: Dispatch<SetStateAction<string | null>>;
  setDrawing: Dispatch<SetStateAction<FieldId | null>>;
  setCompare: Dispatch<SetStateAction<boolean>>;
  setToast: Dispatch<SetStateAction<string>>;
  setNav: Dispatch<SetStateAction<EditorNav>>;
  setFileMenu: Dispatch<SetStateAction<boolean>>;
  setProjectFilter: Dispatch<SetStateAction<"all" | "templates">>;
  setShowLibrary: Dispatch<SetStateAction<boolean>>;
}) {
  function switchProject(p: Project) {
    writeEditorProjectLink(p.id);
    setProject(p);
    setDraft(p.manuscript);
    resetHistory();
    setSelected(null);
    setSelectedLayer(null);
    setDrawing(null);
    setCompare(false);
    setToast(`Opened ${p.name}`);
  }
  async function saveBeforeSwitch() {
    if (draftChanged)
      throw new Error(
        "Apply your Content changes before opening another design.",
      );
    await saveNow();
  }
  async function createFromCurrent(next: Project) {
    try {
      await saveBeforeSwitch();
      switchProject(next);
      setToast(
        `${next.family === "document" ? "Pages" : next.family === "presentation" ? "Slides" : "Graphic"} created. Your original design is in Projects.`,
      );
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function leaveEditor(path: string) {
    if (draftChanged) {
      setToast("Apply your manuscript changes before leaving the editor.");
      return;
    }
    try {
      await saveNow();
      location.assign(path);
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function newProject() {
    try {
      await saveBeforeSwitch();
      const p = createProject();
      p.name = "Untitled design";
      switchProject(p);
      setNav("templates");
      writeEditorLink({ tool: "design", panel: null, select: null });
      setFileMenu(false);
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  function duplicateDesign(asTemplate = false) {
    if (asTemplate) {
      void saveVersionedTemplate();
      return;
    }
    switchProject({
      ...project,
      id: crypto.randomUUID(),
      name: `${project.name} copy`,
      isTemplate: false,
      updatedAt: new Date().toISOString(),
    });
    setNav("projects");
    setShowLibrary(true);
    setFileMenu(false);
  }
  async function saveVersionedTemplate() {
    try {
      const existing = readGuestTemplates().find(
        (t) => t.id === project.templateRef?.id,
      );
      const record = templateFromProject(project, existing || null);
      if (!existing) record.id = `template-${crypto.randomUUID().slice(0, 8)}`;
      const local = [
        record,
        ...readGuestTemplates().filter((t) => t.id !== record.id),
      ];
      writeGuestTemplates(local);
      if (signedIn) {
        await api(`/templates/${record.id}`, {
          method: "PUT",
          body: JSON.stringify({ template: record }),
        });
      }
      switchProject({
        ...project,
        id: crypto.randomUUID(),
        name: `${record.name} template`,
        isTemplate: true,
        templateRef: { id: record.id, version: record.version },
        updatedAt: new Date().toISOString(),
      });
      setToast(`Template saved as ${record.name} v${record.version}.`);
      setNav("projects");
      setProjectFilter("templates");
      setShowLibrary(true);
      setFileMenu(false);
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  function openFromTemplateProject(p: Project) {
    const guestTemplates = readGuestTemplates();
    const versioned = guestTemplates.find(
      (t) =>
        t.id === p.templateRef?.id ||
        t.name === p.name.replace(/ template$/i, ""),
    );
    if (versioned) {
      switchProject(projectFromTemplate(versioned, p.manuscript));
      setToast(`Opened ${versioned.name} v${versioned.version}.`);
      return;
    }
    switchProject({
      ...p,
      id: crypto.randomUUID(),
      isTemplate: false,
      name: p.name.replace(/ template$/i, ""),
      templateRef: p.templateRef,
      updatedAt: new Date().toISOString(),
    });
  }
  async function openSavedProject(p: Project) {
    try {
      await saveBeforeSwitch();
      if (p.id === project.id && !p.isTemplate) return;
      if (p.isTemplate) openFromTemplateProject(p);
      else switchProject(p);
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function openImportedProject(p: Project) {
    try {
      await saveBeforeSwitch();
      switchProject(p);
    } catch (error) {
      setToast((error as Error).message);
    }
  }
  return {
    switchProject,
    createFromCurrent,
    leaveEditor,
    newProject,
    duplicateDesign,
    openSavedProject,
    openImportedProject,
  };
}

export function patchDocumentDecoration(
  project: Project,
  pageId: string,
  decorationId: string,
  patch: Record<string, unknown>,
): Partial<Project> {
  if (!project.flow) return {};
  const nextPages = project.flow.pages.map((p) => {
    if (p.id !== pageId) return p;
    return {
      ...p,
      decorations: (p.decorations || []).map((d) =>
        d.id === decorationId ? { ...d, ...patch } : d,
      ),
    };
  });
  return {
    family: "document",
    flow: { ...project.flow, pages: nextPages as typeof project.flow.pages },
  };
}
