import { useState, type ReactNode } from "react";
import { UploadCloud } from "lucide-react";
import { cx } from "../lib/cx";

export interface DropZoneProps {
  title: string;
  hint?: string;
  accept?: string;
  fileName?: string;
  icon?: ReactNode;
  onFile: (file: File | undefined) => void;
  compact?: boolean;
  className?: string;
}

/** File picker that also accepts drag and drop. */
export function DropZone({
  title,
  hint,
  accept,
  fileName,
  icon,
  onFile,
  compact = false,
  className = "",
}: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onFile(event.dataTransfer.files?.[0]);
      }}
      className={cx(
        "group flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed transition-colors",
        "focus-within:ring-4 focus-within:ring-accent/15",
        compact ? "p-3" : "p-4",
        dragging
          ? "border-accent bg-accent-muted"
          : fileName
            ? "border-accent/40 bg-accent-muted/60"
            : "border-border-strong bg-bg-subtle hover:border-accent/60 hover:bg-bg-panel",
        className,
      )}
    >
      <span
        className={cx(
          "grid shrink-0 place-items-center rounded-[12px] transition-colors",
          compact ? "h-9 w-9" : "h-11 w-11",
          fileName
            ? "bg-accent text-text-on-accent"
            : "bg-bg-panel text-text-secondary shadow-[var(--shadow-xs)] group-hover:text-accent",
        )}
        aria-hidden="true"
      >
        {icon || <UploadCloud size={compact ? 17 : 19} />}
      </span>
      <span className="flex min-w-0 flex-col">
        <strong className="truncate text-[13px] font-semibold text-text-primary">
          {fileName || title}
        </strong>
        {hint && (
          <span className="text-xs text-text-tertiary">
            {fileName ? "Click to replace" : hint}
          </span>
        )}
      </span>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </label>
  );
}
