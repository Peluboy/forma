import type { Project } from "../../../domain/design/model";
import { post } from "../../../shared/api/api";
import type { Analysis } from "../dialogs/AnalysisReview";
import { readManuscriptFile, readReferenceFile } from "./fileImports";

type EditorIoOptions = {
  project: Project;
  provider: "local" | "openai" | "gemini";
  signedIn: boolean;
  exportFormat: string;
  update: (patch: Partial<Project>) => void;
  setDraft: (text: string) => void;
  setToast: (message: string) => void;
  setRightTab: (tab: "manuscript") => void;
  setCompare: (value: boolean) => void;
  setExporting: (value: boolean) => void;
  setGuideExported: (value: boolean) => void;
  closeDialog: () => void;
  setDialog: (dialog: "account" | "analysis") => void;
  setAnalyzing: (value: boolean) => void;
  setAnalysisError: (message: string) => void;
  setAnalysis: (analysis: Analysis) => void;
};

/** File, export and provider actions stay separate from editor layout/state wiring. */
export function createEditorIoActions(options: EditorIoOptions) {
  const {
    project,
    provider,
    signedIn,
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
  } = options;

  async function uploadManuscript(file?: File) {
    if (!file) return;
    try {
      const text = await readManuscriptFile(file);
      setDraft(text);
      setToast("Manuscript loaded. Review it, then apply to your design.");
      setRightTab("manuscript");
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "Could not read that document.",
      );
    }
  }

  async function uploadReference(file?: File) {
    if (!file) return;
    try {
      const reference = await readReferenceFile(file);
      update({
        reference: reference.data,
        referenceName: reference.name,
        referenceHeight: reference.height,
        designMode: "template",
        mappedFields: [],
      });
      setCompare(true);
      setToast("Reference added to your comparison view.");
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "This image could not be opened. Try another file.",
      );
    }
  }

  async function exportDesign() {
    setExporting(true);
    try {
      const { exportProject } = await import("./exports");
      await exportProject(project, exportFormat);
      setToast("Your file is ready. Download started.");
      setGuideExported(true);
      closeDialog();
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "Export failed. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  }

  async function analyzeReference() {
    if (!signedIn) {
      setDialog("account");
      return;
    }
    if (!project.reference) return;
    setAnalyzing(true);
    setAnalysisError("");
    try {
      const result = await post<Analysis>("/reference/analyze", {
        image: project.reference,
        provider,
      });
      if (!result.regions.length)
        throw new Error(
          "No readable text was detected. Mark the text areas manually.",
        );
      setAnalysis(result);
      setDialog("analysis");
    } catch (error) {
      setAnalysisError((error as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  return { uploadManuscript, uploadReference, exportDesign, analyzeReference };
}
