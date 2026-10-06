import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eye,
  Italic,
  Minus,
  Plus,
  SlidersHorizontal,
  Strikethrough,
  Underline,
} from "lucide-react";
import { IconButton } from "../../../shared/components/ui";
import {
  effectiveFontWeight,
  fontCatalog,
  fontWeights,
  nearestFontWeight,
  type FontFamily,
  type Layout,
} from "../../../domain/design/model";
import type { ReactNode } from "react";

export function EditorTextToolbar({
  layout,
  fallbackFont,
  colorControl,
  fallbackWeight = 400,
  brandFonts,
  onPatch,
}: {
  layout: Layout;
  fallbackFont: FontFamily;
  colorControl: ReactNode;
  fallbackWeight?: number;
  brandFonts?: { display: FontFamily; body: FontFamily };
  onPatch: (patch: Partial<Layout>) => void;
}) {
  const family = layout.fontFamily || fallbackFont;
  const weight = effectiveFontWeight(layout, fallbackWeight);
  const disabled = layout.locked;
  const changeSize = (delta: number) =>
    onPatch({ size: Math.max(11, Math.min(180, layout.size + delta)) });
  return (
    <div className="text-toolbar" role="group" aria-label="Text formatting">
      <select
        className="toolbar-font-select"
        aria-label="Font family"
        value={family}
        disabled={disabled}
        onChange={(event) => {
          const fontFamily = event.target.value as FontFamily;
          const fontWeight = nearestFontWeight(fontFamily, weight);
          onPatch({ fontFamily, fontWeight, bold: fontWeight >= 700 });
        }}
      >
        {brandFonts && (
          <optgroup label="Brand fonts">
            <option value={brandFonts.display}>
              {brandFonts.display} · display
            </option>
            {brandFonts.body !== brandFonts.display && (
              <option value={brandFonts.body}>{brandFonts.body} · body</option>
            )}
          </optgroup>
        )}
        {["Sans", "Serif", "Display", "System"].map((category) => (
          <optgroup key={category} label={category}>
            {fontCatalog
              .filter((font) => font.category === category)
              .map((font) => (
                <option key={font.family} value={font.family}>
                  {font.family}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      <div className="toolbar-size" role="group" aria-label="Font size">
        <IconButton
          label="Decrease font size"
          disabled={disabled || layout.size <= 11}
          onClick={() => changeSize(-1)}
        >
          <Minus size={14} />
        </IconButton>
        <input
          type="number"
          aria-label="Font size"
          min={11}
          max={180}
          value={layout.size}
          disabled={disabled}
          onChange={(event) => {
            const size = Number(event.target.value);
            if (size >= 11 && size <= 180) onPatch({ size });
          }}
        />
        <IconButton
          label="Increase font size"
          disabled={disabled || layout.size >= 180}
          onClick={() => changeSize(1)}
        >
          <Plus size={14} />
        </IconButton>
      </div>
      <select
        className="toolbar-weight-select"
        aria-label="Font weight"
        value={weight}
        disabled={disabled}
        onChange={(event) => {
          const fontWeight = Number(event.target.value);
          onPatch({ fontWeight, bold: fontWeight >= 700 });
        }}
      >
        {fontWeights(family).map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      {colorControl}
      <IconButton
        label="Bold"
        active={weight >= 700}
        disabled={disabled}
        onClick={() =>
          onPatch({ bold: weight < 700, fontWeight: weight >= 700 ? 400 : 700 })
        }
      >
        <Bold size={17} />
      </IconButton>
      <IconButton
        label="Italic"
        active={!!layout.italic}
        disabled={disabled}
        onClick={() => onPatch({ italic: !layout.italic })}
      >
        <Italic size={17} />
      </IconButton>
      <IconButton
        label="Underline"
        active={!!layout.underline}
        disabled={disabled}
        onClick={() => onPatch({ underline: !layout.underline })}
      >
        <Underline size={17} />
      </IconButton>
      <IconButton
        label="Strikethrough"
        active={!!layout.strikeThrough}
        disabled={disabled}
        onClick={() => onPatch({ strikeThrough: !layout.strikeThrough })}
      >
        <Strikethrough size={17} />
      </IconButton>
      <div className="toolbar-separator" />
      {(
        [
          { value: "left", icon: AlignLeft },
          { value: "center", icon: AlignCenter },
          { value: "right", icon: AlignRight },
        ] as const
      ).map(({ value, icon: Icon }) => (
        <IconButton
          key={value}
          label={`Align ${value}`}
          active={(layout.align || "left") === value}
          disabled={disabled}
          onClick={() => onPatch({ align: value })}
        >
          <Icon size={16} />
        </IconButton>
      ))}
      <details className="toolbar-spacing">
        <summary aria-label="Text spacing" title="Text spacing">
          <SlidersHorizontal size={16} />
        </summary>
        <div className="toolbar-spacing-menu">
          <label>
            Letter spacing
            <input
              aria-label="Letter spacing"
              type="number"
              min={-2}
              max={20}
              step={0.5}
              disabled={disabled}
              value={layout.letterSpacing ?? 0}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (value >= -2 && value <= 20)
                  onPatch({ letterSpacing: value });
              }}
            />
          </label>
          <label>
            Line height
            <input
              aria-label="Line height"
              type="number"
              min={0.8}
              max={2}
              step={0.05}
              disabled={disabled}
              value={layout.lineHeight ?? 1.18}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (value >= 0.8 && value <= 2) onPatch({ lineHeight: value });
              }}
            />
          </label>
        </div>
      </details>
      <details className="toolbar-spacing toolbar-opacity">
        <summary aria-label="Text transparency" title="Text transparency">
          <Eye size={16} />
        </summary>
        <div className="toolbar-spacing-menu">
          <label>
            Opacity: {Math.round((layout.opacity ?? 1) * 100)}%
            <input
              aria-label="Text opacity"
              type="range"
              min={0}
              max={100}
              step={1}
              disabled={disabled}
              value={Math.round((layout.opacity ?? 1) * 100)}
              onChange={(event) =>
                onPatch({ opacity: Number(event.target.value) / 100 })
              }
            />
          </label>
        </div>
      </details>
    </div>
  );
}
