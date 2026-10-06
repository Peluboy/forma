import { useState } from "react";
import { Palette } from "lucide-react";
import { documentColors } from "../../../domain/design/colors";
import type { BrandSystem } from "../../../domain/design/designSystem";
import type { Project } from "../../../domain/design/model";

export function EditorColorPalette({
  project,
  brand,
  color,
  onApply,
  onReplaceAll,
  onOpenBrand,
  disabled = false,
}: {
  project: Project;
  brand: BrandSystem;
  color: string;
  onApply: (color: string) => void;
  onReplaceAll: (from: string, to: string) => void;
  onOpenBrand: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const brandColors = [
    ...new Set([
      brand.colors.text,
      brand.colors.background,
      brand.colors.accent,
      ...brand.palette,
    ]),
  ];
  function choose(next: string) {
    if (all) onReplaceAll(color, next);
    else onApply(next);
    setOpen(false);
  }
  return (
    <div
      className="editor-palette"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="toolbar-icon-button palette-trigger"
        aria-label="Colors"
        aria-expanded={open}
        disabled={disabled}
        title="Colors"
        onClick={() => setOpen(!open)}
      >
        <Palette size={16} />
        <span className="palette-current" style={{ backgroundColor: color }} />
      </button>
      {open && (
        <div className="editor-palette-popover">
          <div className="popover-title">Colors</div>
          <label className="palette-replace">
            <input
              type="checkbox"
              checked={all}
              onChange={(event) => setAll(event.target.checked)}
            />
            Change all matching colors
          </label>
          <div className="palette-group-label">Brand colors</div>
          <div className="palette-swatches">
            {brandColors.map((value) => (
              <button
                key={value}
                type="button"
                className="palette-swatch"
                style={{ backgroundColor: value }}
                aria-label={`Use brand color ${value}`}
                title={value}
                onClick={() => choose(value)}
              />
            ))}
          </div>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setOpen(false);
              onOpenBrand();
            }}
          >
            Edit brand colors and fonts
          </button>
          <div className="palette-group-label">In this design</div>
          <div className="palette-swatches">
            {documentColors(project).map((value) => (
              <button
                key={value}
                type="button"
                className="palette-swatch"
                style={{ backgroundColor: value }}
                aria-label={`Use design color ${value}`}
                title={value}
                onClick={() => choose(value)}
              />
            ))}
          </div>
          <label className="palette-custom">
            Custom color{" "}
            <input
              type="color"
              aria-label="Choose custom color"
              value={color}
              onChange={(event) => choose(event.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
