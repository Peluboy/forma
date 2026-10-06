import { FolderOpen, Plus, Trash2, Upload } from "lucide-react";
import Poster from "../editor/components/Poster";
import { DocumentPageView } from "../editor/canvas/DocumentCanvas";
import { SlideView } from "../editor/canvas/PresentationCanvas";
import { templates, type Project } from "../../domain/design/model";
import { Button } from "../../shared/components/ui/Button";

type ProjectFilter = "all" | "templates";

export default function ProjectsPanel({
  project,
  projects,
  signedIn,
  filter,
  setFilter,
  onNew,
  onOpenFile,
  onSaveTemplate,
  onOpen,
  onDelete,
}: {
  project: Project;
  projects: Project[];
  signedIn: boolean;
  filter: ProjectFilter;
  setFilter: (filter: ProjectFilter) => void;
  onNew: () => void;
  onOpenFile: () => void;
  onSaveTemplate: () => void;
  onOpen: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  const visible = projects.filter(
    (item) => filter === "all" || item.isTemplate,
  );

  return (
    <div className="panel-body">
      <div className="panel-stack">
        <div className="panel-heading">
          <h2>Projects</h2>
          <FolderOpen size={18} strokeWidth={1.75} />
        </div>
        <p className="panel-description">
          {signedIn ? "Saved to your account." : "Saved in this browser."}
        </p>
      </div>
      <div className="panel-stack">
        <Button variant="primary" fullWidth onClick={onNew}>
          <Plus size={16} strokeWidth={1.75} />
          New design
        </Button>
        <Button variant="secondary" fullWidth onClick={onOpenFile}>
          <Upload size={16} strokeWidth={1.75} />
          Open project file
        </Button>
      </div>
      <div className="category-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={filter === "all"}
          className={filter === "all" ? "selected" : ""}
          onClick={() => setFilter("all")}
        >
          All designs
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "templates"}
          className={filter === "templates" ? "selected" : ""}
          onClick={() => setFilter("templates")}
        >
          My templates
        </button>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-[11px] text-accent hover:text-accent-hover"
        onClick={onSaveTemplate}
      >
        Save current design as a template
      </button>
      <div className="project-list">
        {visible.length === 0 && (
          <div className="project-empty">
            <FolderOpen size={24} strokeWidth={1.75} />
            <h3>
              {filter === "templates" ? "No templates yet" : "No projects yet"}
            </h3>
            <p>
              {filter === "templates"
                ? "Save a design as a template to reuse its look with new copy."
                : "Create a design or open a Forma project file."}
            </p>
          </div>
        )}
        {visible.map((item) => (
          <div className="saved-project-row" key={item.id}>
            <button
              type="button"
              className={`saved-project ${item.id === project.id ? "selected" : ""}`}
              onClick={() => onOpen(item)}
            >
              <div>
                {item.family === "document" && item.flow ? (
                  <DocumentPageView
                    flow={item.flow}
                    page={item.flow.pages[0]}
                    pageNumber={1}
                    total={item.flow.pages.length}
                    miniature
                  />
                ) : item.family === "presentation" && item.presentation ? (
                  <SlideView
                    deck={item.presentation}
                    slide={item.presentation.slides[0]}
                    miniature
                  />
                ) : (
                  <Poster miniature project={item} />
                )}
              </div>
              <span>
                <strong>{item.name || "Untitled design"}</strong>
                <small>
                  {new Date(item.updatedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  ·{" "}
                  {item.family === "document"
                    ? "Report"
                    : item.family === "presentation"
                      ? "Slides"
                      : templates.find(
                          (template) => template.id === item.template,
                        )?.name}
                </small>
              </span>
            </button>
            <button
              type="button"
              className="project-trash"
              aria-label={`Delete ${item.name}`}
              onClick={() => onDelete(item)}
            >
              <Trash2 size={13} strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>
      <div className="info-card">
        <FolderOpen size={18} strokeWidth={1.75} />
        <div>
          <strong>Backup</strong>
          <p>Export a Forma project file to move work between devices.</p>
        </div>
      </div>
    </div>
  );
}
