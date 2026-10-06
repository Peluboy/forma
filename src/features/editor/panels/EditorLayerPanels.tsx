import { useState } from "react";
import {
  BarChart3,
  ImagePlus,
  Search,
  Shapes,
  Table2,
  Type,
} from "lucide-react";
import GraphicLayers from "../components/GraphicLayers";
import TextLayers from "../components/TextLayers";
import SelectionInspector from "../components/SelectionInspector";
import type {
  FieldId,
  Layout,
  Project,
  TextFit,
  TextLayer,
} from "../../../domain/design/model";
import type { GraphicLayer } from "../../../domain/design/layers";
import { fieldIds, labels } from "../../../domain/design/model";

type PatchHandlers = {
  update: (patch: Partial<Project>) => void;
  onPatchField: (patch: Partial<Layout>) => void;
  onPatchText: (patch: Partial<Layout> & { text?: string }) => void;
  onPatchGraphic: (patch: {
    color?: string;
    shape?: "rectangle" | "ellipse" | "rounded" | "triangle";
    locked?: boolean;
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }) => void;
  onRemove: () => void;
  onReplaceImage: (file: File) => Promise<void>;
};

export function EditorElementsPanel({
  project,
  selectedLayer,
  selectedGraphic,
  themeText,
  onSelectLayer,
  onNavigate,
  ...handlers
}: PatchHandlers & {
  project: Project;
  selectedLayer: string | null;
  selectedGraphic: GraphicLayer | null;
  themeText: string;
  onSelectLayer: (id: string | null) => void;
  onNavigate: (tool: "text" | "document" | "presentation") => void;
}) {
  const [category, setCategory] = useState<"all" | "shapes" | "images">("all");
  const [search, setSearch] = useState("");
  return (
    <div className="panel-body">
      <div className="panel-stack">
        <div className="panel-heading">
          <h2>Elements</h2>
        </div>
      </div>
      <label className="element-search">
        <Search size={16} aria-hidden="true" />
        <input
          aria-label="Search elements"
          placeholder="Search shapes and images"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="panel-section">
        <div className="library-label">Browse categories</div>
        <div className="element-categories">
          {(
            [
              { id: "shapes", label: "Shapes", icon: Shapes },
              { id: "images", label: "Images", icon: ImagePlus },
              { id: "text", label: "Text", icon: Type },
              { id: "document", label: "Tables", icon: Table2 },
              { id: "presentation", label: "Charts", icon: BarChart3 },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`element-category ${category === id ? "selected" : ""}`}
              aria-pressed={
                id === "shapes" || id === "images" ? category === id : undefined
              }
              onClick={() => {
                if (id === "shapes" || id === "images") setCategory(id);
                else onNavigate(id);
              }}
            >
              <Icon size={19} strokeWidth={1.75} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        {category !== "all" && (
          <button
            type="button"
            className="text-link"
            onClick={() => setCategory("all")}
          >
            Show all elements
          </button>
        )}
      </div>
      <GraphicLayers
        key={project.id}
        project={project}
        selected={selectedLayer}
        select={onSelectLayer}
        update={handlers.update}
        listOnly
        addFilter={category}
        search={search}
      />
      <SelectionInspector
        project={project}
        fieldId={null}
        textLayer={null}
        graphic={selectedGraphic}
        themeText={themeText}
        {...handlers}
      />
    </div>
  );
}

export function EditorTextPanel({
  project,
  selectedField,
  selectedLayer,
  selectedTextLayer,
  fits,
  themeText,
  onSelectField,
  onSelectLayer,
  onCover,
  ...handlers
}: PatchHandlers & {
  project: Project;
  selectedField: FieldId | null;
  selectedLayer: string | null;
  selectedTextLayer: TextLayer | null;
  fits: Record<FieldId, TextFit>;
  themeText: string;
  onSelectField: (id: FieldId) => void;
  onSelectLayer: (id: string | null) => void;
  onCover: (color: string) => void;
}) {
  return (
    <div className="panel-body">
      <div className="panel-stack">
        <div className="panel-heading">
          <h2>Text</h2>
          <Type size={18} strokeWidth={1.75} />
        </div>
      </div>
      <div className="panel-section">
        <div className="library-label">Add to page</div>
        <TextLayers
          project={project}
          selected={selectedLayer}
          select={onSelectLayer}
          update={handlers.update}
          listOnly
        />
      </div>
      <div className="panel-section">
        <div className="library-label">Your manuscript</div>
        <div className="content-field-list">
          {fieldIds.map((id) => (
            <button
              key={id}
              type="button"
              className={`button full-width ${selectedField === id ? "selected" : ""}`}
              aria-pressed={selectedField === id}
              onClick={() => onSelectField(id)}
            >
              {labels[id]}
              {fits[id].overflow ? " · needs room" : ""}
            </button>
          ))}
        </div>
      </div>
      <SelectionInspector
        project={project}
        fieldId={selectedField}
        textLayer={selectedTextLayer}
        graphic={null}
        themeText={themeText}
        onCover={onCover}
        {...handlers}
      />
    </div>
  );
}
