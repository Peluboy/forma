export interface ProgressProps {
  value: number; // 0 to 100
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export function Progress({
  value,
  label,
  showPercent = false,
  className = "",
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-xs text-text-secondary select-none">
          {label && <span className="font-medium">{label}</span>}
          {showPercent && (
            <span className="font-semibold">{Math.round(clamped)}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="w-full h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden border border-border"
      >
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
