import {
  applyContentBlocks,
  createProject,
  defaultLayouts,
  parseManuscriptBlocks,
  templates,
  type Project,
  type TemplateId,
} from "../../../domain/design/model";

/** Start a graphics design while preserving approved copy across formats. */
export function startGraphicsDesign({
  project,
  template,
  update,
  createFromCurrent,
  onMessage,
  clearDrawing,
}: {
  project: Project;
  template: TemplateId;
  update: (patch: Partial<Project>) => void;
  createFromCurrent: (project: Project) => Promise<unknown>;
  onMessage: (message: string) => void;
  clearDrawing: () => void;
}) {
  if (project.family !== "document" && project.family !== "presentation") {
    update({
      template,
      designMode: "template",
      layouts: defaultLayouts(),
      mappedFields: [],
      covers: {},
      backgroundColor: undefined,
    });
    clearDrawing();
    onMessage(
      `${templates.find((item) => item.id === template)?.name} applied. Your copy is unchanged.`,
    );
    return;
  }
  try {
    const next = createProject();
    Object.assign(
      next,
      applyContentBlocks(
        next,
        parseManuscriptBlocks(project.manuscript),
        project.manuscript,
      ),
    );
    next.template = template;
    next.name = `${project.name} graphic`;
    void createFromCurrent(next);
  } catch (error) {
    onMessage((error as Error).message);
  }
}
