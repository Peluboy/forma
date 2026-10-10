import { useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import type { FormatId, Project } from "../../../domain/design/model";
import {
  EXPORT_RASTER_SCALE,
  canvasHeight,
  canvasWidth,
  formatPresets,
  PAGE_SIZE_MAX,
  PAGE_SIZE_MIN,
} from "../../../domain/design/model";

const FORMAT_LABELS: Record<Exclude<FormatId, "custom">, string> = {
  portrait: "Portrait post",
  square: "Square post",
  story: "Story",
  banner: "Banner",
};

type ResizeDialogProps = {
  project: Project;
  onClose: () => void;
  onApply: (patch: Partial<Project>) => void;
};

export function ResizeDialog({ project, onClose, onApply }: ResizeDialogProps) {
  const current =
    formatPresets[project.format as Exclude<FormatId, "custom">] ||
    project.pageSize ||
    formatPresets.portrait;
  const [customWidth, setCustomWidth] = useState(
    project.format === "custom" && project.pageSize
      ? project.pageSize.width
      : current.width,
  );
  const [customHeight, setCustomHeight] = useState(
    project.format === "custom" && project.pageSize
      ? project.pageSize.height
      : current.height,
  );
  const presets = (["portrait", "square", "story", "banner"] as const).map(
    (format) => ({
      format,
      size: formatPresets[format],
      label: FORMAT_LABELS[format],
      pixels: `${Math.round(formatPresets[format].width * EXPORT_RASTER_SCALE)} × ${Math.round(formatPresets[format].height * EXPORT_RASTER_SCALE)}`,
    }),
  );
  const customValid =
    customWidth >= PAGE_SIZE_MIN &&
    customWidth <= PAGE_SIZE_MAX &&
    customHeight >= PAGE_SIZE_MIN &&
    customHeight <= PAGE_SIZE_MAX;
  return (
    <Modal title="Find your format." onClose={onClose}>
      <p className="text-xs leading-[1.8] text-text-tertiary mt-3 mb-6">
        Choose a canvas for your design. Your words stay unchanged; placement
        adapts to the format.
      </p>
      <div className="format-options">
        {presets.map(({ format, label, pixels }) => (
          <button
            key={format}
            className={project.format === format ? "selected" : ""}
            onClick={() =>
              onApply({ format, pageSize: { ...formatPresets[format] } })
            }
          >
            <div className={`format-shape ${format}`} />
            <strong>{label}</strong>
            <span>{pixels}</span>
            {project.format === format && <Check size={16} />}
          </button>
        ))}
      </div>
      <div className="custom-size-fields">
        <strong>Custom size</strong>
        <p className="quiet-note">
          Design units between {PAGE_SIZE_MIN} and {PAGE_SIZE_MAX}. Export
          pixels are {EXPORT_RASTER_SCALE}× these values.
        </p>
        <div className="custom-size-inputs">
          <label>
            Width
            <input
              type="number"
              min={PAGE_SIZE_MIN}
              max={PAGE_SIZE_MAX}
              value={customWidth}
              aria-label="Custom page width"
              onChange={(e) => setCustomWidth(Number(e.target.value))}
            />
          </label>
          <label>
            Height
            <input
              type="number"
              min={PAGE_SIZE_MIN}
              max={PAGE_SIZE_MAX}
              value={customHeight}
              aria-label="Custom page height"
              onChange={(e) => setCustomHeight(Number(e.target.value))}
            />
          </label>
          <Button
            variant="secondary"
            disabled={!customValid}
            onClick={() =>
              onApply({
                format: "custom",
                pageSize: { width: customWidth, height: customHeight },
              })
            }
          >
            Apply custom
          </Button>
        </div>
        {project.format === "custom" && (
          <p className="quiet-note">
            Current custom page: {canvasWidth(project)} ×{" "}
            {canvasHeight(project)}
          </p>
        )}
      </div>
      <p className="quiet-note">
        A new aspect ratio changes the layout. Check spacing and readability
        after resizing. Campaign ZIP for custom pages exports the actual page
        size rather than three aspect-ratio variants.
      </p>
    </Modal>
  );
}
