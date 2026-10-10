import { StatusBadge } from "./StatusBadge";
import { mapReferenceConfidence } from "./statusMap";

export interface ReferenceStatusBadgeProps {
  confidence: string | number;
  className?: string;
}

export function ReferenceStatusBadge({
  confidence,
  className = "",
}: ReferenceStatusBadgeProps) {
  const meta = mapReferenceConfidence(confidence);
  return (
    <StatusBadge
      label={meta.label}
      variant={meta.variant}
      className={className}
    />
  );
}
