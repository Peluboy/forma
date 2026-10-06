import { api } from "../../../shared/api/api";
import { START_KEY } from "../../../shared/navigation";
import {
  normalizeBrand,
  readGuestBrand,
} from "../../../domain/design/designSystem";
import { createTemplateJob } from "../../../domain/design/templateJob";
import {
  createProject,
  isProject,
  templates,
  type Project,
} from "../../../domain/design/model";
import { readLocalProjects } from "../hooks/usePersistence";

type StartIntentActions = {
  owner: string;
  signedIn: boolean;
  projects: Project[];
  switchProject: (project: Project) => void;
  setNav: (nav: "templates" | "reference") => void;
  setShowLibrary: (value: boolean) => void;
  setShowRight: (value: boolean) => void;
  setRightTab: (value: "checks") => void;
  setShowGuide: (value: boolean) => void;
  setToast: (message: string) => void;
};

/** Consume a dashboard/create handoff once the editor's project storage is ready. */
export async function applyStartIntent(
  actions: StartIntentActions,
): Promise<void> {
  const {
    owner,
    signedIn,
    projects,
    switchProject,
    setNav,
    setShowLibrary,
    setShowRight,
    setRightTab,
    setShowGuide,
    setToast,
  } = actions;
  try {
    const raw = sessionStorage.getItem(START_KEY);
    if (!raw) return;
    const intent = JSON.parse(raw);
    if (intent.owner !== owner) return;
    if (intent.start === "generated") {
      sessionStorage.removeItem(START_KEY);
      if (!isProject(intent.project))
        throw new Error("This design could not be opened. Create it again.");
      switchProject(intent.project);
      setShowLibrary(false);
      setShowGuide(false);
      setShowRight(true);
      setRightTab("checks");
      setToast("Design created. Review the layout and copy before export.");
      return;
    }
    if (intent.start === "saved-template") {
      sessionStorage.removeItem(START_KEY);
      const source = projects.find(
        (item) => item.id === intent.sourceId && item.isTemplate,
      );
      if (
        !source ||
        typeof intent.manuscript !== "string" ||
        !["match", "fit"].includes(intent.layoutMode)
      )
        throw new Error(
          "This template job could not be opened. Choose the template again.",
        );
      const selectedBrand = intent.useBrand
        ? signedIn
          ? normalizeBrand(await api("/brand"))
          : readGuestBrand()
        : undefined;
      const next = createTemplateJob(source, intent.manuscript, {
        layoutMode: intent.layoutMode,
        brand: selectedBrand,
      });
      switchProject(next);
      setNav("templates");
      setShowLibrary(false);
      setShowRight(true);
      setRightTab("checks");
      setShowGuide(false);
      setToast("New design created. Review fit and copy before export.");
      return;
    }
    if (!["sample", "template", "reference", "guest"].includes(intent.start))
      return;
    const source =
      intent.start === "guest" ? readLocalProjects()[0] : createProject();
    if (!source) {
      setToast("No browser draft was found. You can start with a template.");
      sessionStorage.removeItem(START_KEY);
      return;
    }
    const next = {
      ...source,
      id: crypto.randomUUID(),
      isTemplate: false,
      updatedAt: new Date().toISOString(),
    };
    if (
      intent.start === "template" &&
      templates.some((template) => template.id === intent.template)
    )
      next.template = intent.template;
    next.name =
      intent.start === "guest"
        ? `${source.name.slice(0, 170)} (my copy)`
        : intent.start === "reference"
          ? "My reference design"
          : "My first design";
    switchProject(next);
    setNav(intent.start === "reference" ? "reference" : "templates");
    setShowLibrary(true);
    setShowGuide(true);
    sessionStorage.removeItem(START_KEY);
  } catch (cause) {
    setToast(
      (cause as Error).message ||
        "Your quick-start choice could not be opened. You can continue with this workspace.",
    );
  }
}
