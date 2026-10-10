import { StatusBadge } from "./StatusBadge";
import { mapQualityStatus } from "./statusMap";

export interface TrustStatusProps {
  score?: number;
  fidelity?: string;
  className?: string;
  showScore?: boolean;
}

export function TrustStatus({
  score = 90,
  fidelity,
  className = "",
  showScore = false,
}: TrustStatusProps) {
  const meta = mapQualityStatus(score, fidelity);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <StatusBadge
        label={meta.label}
        variant={meta.variant}
        description={meta.description}
      />
      {showScore && score !== undefined && (
        <span className="text-[11px] font-semibold text-text-tertiary select-none">
          {score}/100
        </span>
      )}
    </div>
  );
}
