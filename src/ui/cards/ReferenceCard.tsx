import { ArrowUpRight, Palette } from "lucide-react";
import { Card } from "../primitives/Card";
import { Button } from "../primitives/Button";
import { ReferenceStatusBadge } from "../status/ReferenceStatus";

export interface ReferenceCardProps {
  id: string;
  name: string;
  confidence: string | number;
  palette?: string[];
  fonts?: string[];
  previewSrc?: string;
  onUse: () => void;
  className?: string;
}

export function ReferenceCard({
  name,
  confidence,
  palette = [],
  fonts = [],
  previewSrc,
  onUse,
  className = "",
}: ReferenceCardProps) {
  return (
    <Card
      hoverable
      padding="none"
      className={`flex flex-col overflow-hidden group select-none ${className}`}
    >
      <div className="relative aspect-[16/10] bg-[var(--bg-muted)] border-b border-border flex items-center justify-center overflow-hidden">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-text-tertiary">
            <Palette size={24} strokeWidth={1.5} />
            <span className="text-[11px] font-medium">Reference style</span>
          </div>
        )}
        <div className="absolute top-2.5 left-2.5">
          <ReferenceStatusBadge confidence={confidence} />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-sm text-text-primary truncate m-0">
          {name}
        </h3>

        {/* Extracted palette chips */}
        {palette.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            {palette.slice(0, 5).map((color, i) => (
              <span
                key={i}
                className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}

        {/* Extracted font tags */}
        {fonts.length > 0 && (
          <p className="text-[11px] text-text-tertiary truncate m-0">
            {fonts.join(", ")}
          </p>
        )}

        <div className="mt-auto pt-3 border-t border-border/50 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            iconRight={<ArrowUpRight size={13} />}
            onClick={onUse}
          >
            Use style
          </Button>
        </div>
      </div>
    </Card>
  );
}
