import { type ReactNode } from "react";
import { cx } from "../lib/cx";

export type ArtworkScene =
  "hero" | "create" | "workspace" | "gallery" | "auth" | "reference" | "empty";

const BLOBS: Record<ArtworkScene, string> = {
  hero: `
    radial-gradient(42% 58% at 88% 12%, var(--art-lilac) 0%, transparent 70%),
    radial-gradient(48% 62% at 72% 92%, var(--art-mint) 0%, transparent 68%),
    radial-gradient(36% 50% at 100% 62%, var(--art-peach) 0%, transparent 65%)`,
  create: `
    radial-gradient(50% 70% at 20% 18%, var(--art-mint) 0%, transparent 68%),
    radial-gradient(46% 60% at 88% 78%, var(--art-lilac) 0%, transparent 66%),
    radial-gradient(32% 44% at 70% 8%, var(--art-butter) 0%, transparent 70%)`,
  workspace: `
    radial-gradient(48% 62% at 14% 80%, var(--art-sky) 0%, transparent 68%),
    radial-gradient(40% 55% at 86% 18%, var(--art-mint) 0%, transparent 66%),
    radial-gradient(30% 40% at 50% 50%, var(--art-lilac) 0%, transparent 72%)`,
  gallery: `
    radial-gradient(44% 60% at 8% 20%, var(--art-peach) 0%, transparent 66%),
    radial-gradient(50% 70% at 92% 86%, var(--art-lilac) 0%, transparent 64%),
    radial-gradient(28% 40% at 60% 10%, var(--art-mint) 0%, transparent 70%)`,
  auth: `
    radial-gradient(60% 80% at 80% 10%, var(--art-mint) 0%, transparent 62%),
    radial-gradient(50% 70% at 10% 90%, var(--art-lilac) 0%, transparent 64%),
    radial-gradient(36% 50% at 90% 80%, var(--art-peach) 0%, transparent 68%)`,
  reference: `
    radial-gradient(46% 58% at 78% 24%, var(--art-peach) 0%, transparent 66%),
    radial-gradient(40% 54% at 18% 78%, var(--art-sky) 0%, transparent 68%),
    radial-gradient(28% 40% at 52% 12%, var(--art-butter) 0%, transparent 70%)`,
  empty: `
    radial-gradient(50% 70% at 30% 22%, var(--art-mint) 0%, transparent 66%),
    radial-gradient(42% 58% at 82% 78%, var(--art-peach) 0%, transparent 66%)`,
};

export function GradientArtwork({
  scene = "hero",
  className = "",
  children,
}: {
  scene?: ArtworkScene;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cx("relative overflow-hidden", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: BLOBS[scene] }}
      />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 h-[140%] w-[62%] opacity-70 forma-float-slow"
        viewBox="0 0 320 320"
        fill="none"
      >
        <circle cx="210" cy="90" r="78" fill="var(--art-mint)" opacity="0.55" />
        <circle
          cx="250"
          cy="210"
          r="64"
          fill="var(--art-lilac)"
          opacity="0.5"
        />
        <path
          d="M40 210c40-52 88-40 120-8 28 28 70 34 98-8"
          stroke="var(--art-coral)"
          strokeOpacity="0.45"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
