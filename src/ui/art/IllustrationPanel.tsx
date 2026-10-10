import { type ReactNode } from "react";
import { cx } from "../lib/cx";
import { GradientArtwork, type ArtworkScene } from "./GradientArtwork";

export function IllustrationPanel({
  scene = "empty",
  title,
  description,
  action,
  art,
  className = "",
}: {
  scene?: ArtworkScene;
  title: string;
  description?: string;
  action?: ReactNode;
  art?: ReactNode;
  className?: string;
}) {
  return (
    <GradientArtwork
      scene={scene}
      className={cx(
        "flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-border bg-bg-subtle px-8 py-12 text-center",
        className,
      )}
    >
      {art && <div className="mb-5 forma-float">{art}</div>}
      <h3 className="forma-display m-0 text-[22px] font-semibold text-text-primary">
        {title}
      </h3>
      {description && (
        <p className="mt-2 mb-0 max-w-[34ch] text-[13px] leading-5 text-text-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </GradientArtwork>
  );
}
