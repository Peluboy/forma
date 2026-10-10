import type { Project } from "../../../domain/design/model";
import {
  LocalStorageClientStore,
  LocalStorageWorkspaceStore,
  type WorkspaceActor,
} from "../../../domain/workspace";
import { post, type User } from "../../../shared/api/api";
import type { Analysis } from "../dialogs/AnalysisReview";
import { readManuscriptFile, readReferenceFile } from "./fileImports";

type EditorIoOptions = {
  project: Project;
  provider: "local" | "openai" | "gemini";
  signedIn: boolean;
  user: User | null;
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
    user,
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
      if (exportFormat === "pdf" || exportFormat === "pdf-native") {
        const { runNativePdfExport } =
          await import("../../../domain/export/pdfExport");
        const { downloadFile } = await import("./exports");
        const actor: WorkspaceActor | null = user
          ? { userId: user.id, email: user.email, name: user.name }
          : null;
        const workspace = project.workspaceId
          ? new LocalStorageWorkspaceStore().get(project.workspaceId)
          : null;
        const client = project.clientId
          ? new LocalStorageClientStore().get(project.clientId)
          : null;
        const job = await runNativePdfExport({
          project,
          user: actor,
          workspace,
          client,
          clientName: client?.name,
          projectName: project.name,
        });
        if (job.status === "blocked") {
          throw new Error(job.error || "Export blocked");
        }
        if (job.status !== "completed" || !job.output) {
          throw new Error(job.error || "Native PDF export failed.");
        }
        const blob =
          job.output.blob ||
          new Blob([Uint8Array.from(job.output.bytes || [])], {
            type: "application/pdf",
          });
        downloadFile(blob, job.output.filename);
        setToast("Your file is ready. Download started.");
        setGuideExported(true);
        closeDialog();
        return;
      }
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
