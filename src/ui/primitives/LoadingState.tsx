import { Loader2 } from "lucide-react";

export interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  fullPage?: boolean;
  className?: string;
}

export function LoadingState({
  message = "Loading...",
  subMessage,
  fullPage = false,
  className = "",
}: LoadingStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center p-8 gap-3 text-center ${
        fullPage ? "min-h-[50vh]" : ""
      } ${className}`}
    >
      <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-text-primary">{message}</span>
        {subMessage && (
          <span className="text-xs text-text-tertiary">{subMessage}</span>
        )}
      </div>
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-xl border border-border bg-[var(--bg-panel)] p-4 flex flex-col gap-3 animate-pulse ${className}`}
    >
      <div className="aspect-[4/3] w-full rounded-lg bg-[var(--bg-muted)]" />
      <div className="h-4 w-3/4 rounded-md bg-[var(--bg-muted)]" />
      <div className="h-3 w-1/2 rounded-md bg-[var(--bg-muted)]/60" />
    </div>
  );
}
