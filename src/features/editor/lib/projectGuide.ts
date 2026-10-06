import { readLocalProjects } from "../hooks/usePersistence";
import { sampleManuscript, type Project } from "../../../domain/design/model";

/** Initial projects: guest browser storage first, then the sample project. */
export function readProjects(): Project[] {
  return readLocalProjects();
}

export const GUIDE_DISMISSED_KEY = "forma.editor.guide.dismissed.v1";

/** True while a project is still the untouched first-visit sample. */
export function isUntouchedProject(project: Project): boolean {
  return (
    project.designMode === "template" &&
    project.template === "gathering" &&
    !project.reference &&
    !project.textLayers?.length &&
    !project.graphicLayers?.length &&
    project.manuscript === sampleManuscript
  );
}

/**
 * First-run onboarding: show the quick-start checklist for a new, untouched
 * project until the user dismisses it. Gated off on narrow screens, where the
 * rail and the Content entry carry the guidance instead.
 */
export function shouldAutoShowGuide(project: Project): boolean {
  if (typeof window === "undefined" || window.innerWidth < 900) return false;
  try {
    if (window.localStorage.getItem(GUIDE_DISMISSED_KEY)) return false;
  } catch {
    return false;
  }
  return isUntouchedProject(project);
}
