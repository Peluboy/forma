import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, Unlock, X } from "lucide-react";
import { IconButton } from "../../../shared/components/ui/IconButton";
import { orderedLayerIds, reorderLayer } from "../../../domain/design/layers";
import {
  fieldIds,
  labels,
  type FieldId,
  type Project,
} from "../../../domain/design/model";

export function EditorLayersPopover({
  project,
  selectedField,
  selectedLayer,
  onSelectField,
  onSelectLayer,
  update,
  onClose,
}: {
  project: Project;
  selectedField: FieldId | null;
  selectedLayer: string | null;
  onSelectField: (id: FieldId) => void;
  onSelectLayer: (id: string) => void;
  update: (patch: Partial<Project>) => void;
  onClose: () => void;
}) {
  const layerIds = orderedLayerIds(project).reverse();
  function patchField(
    id: FieldId,
    patch: { hidden?: boolean; locked?: boolean },
  ) {
    update({
      layouts: {
        ...project.layouts,
        [id]: { ...project.layouts[id], ...patch },
      },
    });
  }
  function patchLayer(
    id: string,
    patch: { hidden?: boolean; locked?: boolean },
  ) {
    update({
      textLayers: project.textLayers?.map((layer) =>
        layer.id === id
          ? { ...layer, layout: { ...layer.layout, ...patch } }
          : layer,
      ),
      graphicLayers: project.graphicLayers?.map((layer) =>
        layer.id === id
          ? { ...layer, layout: { ...layer.layout, ...patch } }
          : layer,
      ),
    });
  }
  return (
    <aside
      className="absolute z-[25] top-[54px] right-[18px]
                 w-[min(340px,calc(100%-28px))] max-h-[min(70vh,620px)]
                 overflow-auto p-[14px]
                 border border-border rounded-xl
                 bg-bg-elevated text-text-primary
                 shadow-[0_18px_50px_rgba(0,0,0,0.13)]"
      aria-label="Layers"
    >
      <header className="flex justify-between items-center">
        <strong>Layers</strong>
        <IconButton label="Close layers" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </header>
      <p className="text-[10px] text-text-tertiary leading-[1.75] mt-2 mb-3">
        Top layers appear first. Hide or lock without deleting.
      </p>
      <div className="layer-popover-list">
        {layerIds.map((id) => {
          const text = project.textLayers?.find((layer) => layer.id === id);
          const graphic = project.graphicLayers?.find(
            (layer) => layer.id === id,
          );
          const layer = text || graphic;
          if (!layer) return null;
          const name = text
            ? text.text.slice(0, 30) || "Text box"
            : graphic!.name;
          return (
            <div
              key={id}
              className={`layer-popover-row ${selectedLayer === id ? "selected" : ""}`}
            >
              <button
                type="button"
                className="layer-popover-name"
                onClick={() => onSelectLayer(id)}
              >
                {name}
              </button>
              <button
                type="button"
                aria-label={`Move ${name} up`}
                title="Move forward"
                onClick={() => update(reorderLayer(project, id, "forward"))}
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                aria-label={`Move ${name} down`}
                title="Move backward"
                onClick={() => update(reorderLayer(project, id, "backward"))}
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                aria-label={`${layer.layout.hidden ? "Show" : "Hide"} ${name}`}
                title={layer.layout.hidden ? "Show" : "Hide"}
                onClick={() => patchLayer(id, { hidden: !layer.layout.hidden })}
              >
                {layer.layout.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                type="button"
                aria-label={`${layer.layout.locked ? "Unlock" : "Lock"} ${name}`}
                title={layer.layout.locked ? "Unlock" : "Lock"}
                onClick={() => patchLayer(id, { locked: !layer.layout.locked })}
              >
                {layer.layout.locked ? (
                  <Lock size={15} />
                ) : (
                  <Unlock size={15} />
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-[14px] mb-[6px] text-xs font-bold">
        Manuscript fields
      </div>
      <div className="layer-popover-list">
        {fieldIds.map((id) => {
          const layout = project.layouts[id];
          return (
            <div
              key={id}
              className={`layer-popover-row ${selectedField === id ? "selected" : ""}`}
            >
              <button
                type="button"
                className="layer-popover-name"
                onClick={() => onSelectField(id)}
              >
                {labels[id]}
              </button>
              <button
                type="button"
                aria-label={`${layout.hidden ? "Show" : "Hide"} ${labels[id]}`}
                title={layout.hidden ? "Show" : "Hide"}
                onClick={() => patchField(id, { hidden: !layout.hidden })}
              >
                {layout.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                type="button"
                aria-label={`${layout.locked ? "Unlock" : "Lock"} ${labels[id]}`}
                title={layout.locked ? "Unlock" : "Lock"}
                onClick={() => patchField(id, { locked: !layout.locked })}
              >
                {layout.locked ? <Lock size={15} /> : <Unlock size={15} />}
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
