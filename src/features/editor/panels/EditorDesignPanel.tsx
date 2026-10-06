import {
  ArrowRight,
  Check,
  FileText,
  ImagePlus,
  Presentation,
  Search,
  Shapes,
} from "lucide-react";
import Poster from "../components/Poster";
import {
  defaultLayouts,
  parseManuscript,
  sampleManuscript,
  templates,
  type Project,
  type TemplateId,
} from "../../../domain/design/model";

const previewCopy: Partial<Record<TemplateId, string>> = {
  botanical:
    "Headline: Room to\ngrow.\n\nEyebrow: A SLOWER KIND OF SUNDAY\n\nBody copy: Find your own rhythm.\n\nFooter: MAKE SPACE FOR YOURSELF.",
  editorial:
    "Headline: A new\nchapter.\n\nEyebrow: THE EDIT · ISSUE 08\n\nBody copy: Stories worth staying for.\n\nFooter: A DIFFERENT POINT OF VIEW.",
  electric:
    "Headline: Think\noutside.\n\nEyebrow: NO RULES. JUST IDEAS.\n\nBody copy: Meet your next big idea.\n\nFooter: CREATE SOMETHING DIFFERENT.",
  atelier:
    "Headline: Less, but\nbetter.\n\nEyebrow: ATELIER STUDIO\n\nBody copy: Thoughtfully made.\n\nFooter: DETAILS MAKE THE DIFFERENCE.",
};

export function EditorDesignPanel({
  project,
  query,
  category,
  onQuery,
  onCategory,
  onTemplate,
  onReference,
  onGraphics,
  onDocument,
  onPresentation,
}: {
  project: Project;
  query: string;
  category: string;
  onQuery: (query: string) => void;
  onCategory: (category: string) => void;
  onTemplate: (template: TemplateId) => void;
  onReference: () => void;
  onGraphics: () => void;
  onDocument: () => void;
  onPresentation: () => void;
}) {
  const visible = templates.filter(
    (template) =>
      (category === "All" || template.category === category) &&
      `${template.name} ${template.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="panel-body">
      <div className="panel-stack">
        <div className="panel-heading">
          <h2>Design</h2>
        </div>
      </div>
      <div className="panel-section">
        <div className="library-label">Browse formats</div>
        <div
          className="design-formats"
          role="group"
          aria-label="Design formats"
        >
          <button
            type="button"
            className={
              project.family !== "document" && project.family !== "presentation"
                ? "selected"
                : ""
            }
            onClick={onGraphics}
          >
            <Shapes size={18} />
            Graphics
          </button>
          <button type="button" onClick={onDocument}>
            <FileText size={18} />
            Reports
          </button>
          <button type="button" onClick={onPresentation}>
            <Presentation size={18} />
            Slides
          </button>
        </div>
      </div>
      <label className="search-input">
        <Search size={16} strokeWidth={1.75} />
        <input
          aria-label="Search templates"
          placeholder="Search templates"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
      </label>
      <div className="category-tabs" role="tablist">
        {["All", "Events", "Business", "Lifestyle", "Editorial"].map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={category === item}
            className={category === item ? "selected" : ""}
            onClick={() => onCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="panel-section">
        <div className="library-label">Templates</div>
        <div className="template-grid">
          {visible.map((template) => (
            <button
              className={`template-card ${project.template === template.id ? "chosen" : ""}`}
              key={template.id}
              onClick={() => onTemplate(template.id)}
              aria-label={`Use ${template.name} template`}
            >
              <div className="template-preview">
                <Poster
                  miniature
                  project={{
                    ...project,
                    designMode: "template",
                    template: template.id,
                    layouts: defaultLayouts(),
                    format: "portrait",
                    backgroundColor: undefined,
                    copy: parseManuscript(
                      previewCopy[template.id] ||
                        (template.id === "gathering"
                          ? sampleManuscript
                          : "Headline: After\nhours.\n\nEyebrow: AN EVENING TO REMEMBER\n\nBody copy: Stay a little longer.\n\nFooter: GOOD COMPANY. GREAT CONVERSATION."),
                    ),
                  }}
                />
                {project.template === template.id && (
                  <span className="template-check">
                    <Check size={12} />
                  </span>
                )}
              </div>
              <span className="template-name">{template.name}</span>
              <span className="template-category">{template.category}</span>
            </button>
          ))}
        </div>
        {!visible.length && (
          <div className="empty-state">
            <Search size={20} strokeWidth={1.75} />
            <h3>No matching templates</h3>
            <p>Try a different search or category.</p>
            <button
              className="text-button"
              onClick={() => {
                onQuery("");
                onCategory("All");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
      <div className="reference-callout">
        <div className="callout-icon">
          <ImagePlus size={18} strokeWidth={1.75} />
        </div>
        <h3>Use your own layout</h3>
        <p>Upload a reference image and place your text on top.</p>
        <button type="button" onClick={onReference}>
          Upload a reference <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
