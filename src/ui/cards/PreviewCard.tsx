import { type ReactNode } from "react";
import { cx } from "../lib/cx";

export function PreviewCard({
  preview,
  ratio = "4/5",
  className = "",
}: {
  preview: ReactNode;
  ratio?: "4/5" | "16/10" | "1/1";
  className?: string;
}) {
  const aspect =
    ratio === "16/10"
      ? "aspect-[16/10]"
      : ratio === "1/1"
        ? "aspect-square"
        : "aspect-[4/5]";
  return (
    <div
      className={cx(
        "forma-preview-frame relative grid place-items-center overflow-hidden rounded-[14px] border border-border",
        aspect,
        className,
      )}
    >
      <div className="forma-preview-paper max-h-[86%] max-w-[78%] overflow-hidden rounded-[6px] bg-bg-panel">
        {preview}
      </div>
    </div>
  );
}
