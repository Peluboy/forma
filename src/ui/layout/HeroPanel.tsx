import { type ReactNode } from "react";
import { cx } from "../lib/cx";
import { GradientArtwork, type ArtworkScene } from "../art/GradientArtwork";

export function HeroPanel({
  kicker,
  title,
  subtitle,
  actions,
  art,
  scene = "hero",
  className = "",
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  art?: ReactNode;
  scene?: ArtworkScene;
  className?: string;
}) {
  return (
    <GradientArtwork
      scene={scene}
      className={cx(
        "overflow-hidden rounded-[28px] border border-border bg-bg-panel shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <div className="relative grid gap-8 px-7 py-7 md:grid-cols-[minmax(0,1.1fr)_minmax(200px,0.9fr)] md:px-8 md:py-8">
        <div className="flex min-w-0 flex-col justify-center">
          {kicker && (
            <span className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
              {kicker}
            </span>
          )}
          <h1 className="forma-display m-0 text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.08] text-text-primary">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 mb-0 max-w-[42ch] text-[14px] leading-6 text-text-secondary">
              {subtitle}
            </p>
          )}
          {actions && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {actions}
            </div>
          )}
        </div>
        {art && (
          <div className="relative hidden min-h-[140px] items-end justify-end md:flex">
            {art}
          </div>
        )}
      </div>
    </GradientArtwork>
  );
}
