import type { Project } from "../../../domain/design/model";
import { orderedLayerIds, reorderLayer } from "../../../domain/design/layers";
export function StackControls({
  project,
  id,
  update,
}: {
  project: Project;
  id: string;
  update: (p: Partial<Project>) => void;
}) {
  const order = orderedLayerIds(project),
    index = order.indexOf(id);
  return (
    <div className="layer-stack-controls">
      <button
        className="button"
        disabled={index <= 0}
        onClick={() => update(reorderLayer(project, id, "backward"))}
      >
        Send backward
      </button>
      <button
        className="button"
        disabled={index < 0 || index === order.length - 1}
        onClick={() => update(reorderLayer(project, id, "forward"))}
      >
        Bring forward
      </button>
    </div>
  );
}
