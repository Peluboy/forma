import { StatusBadge } from "./StatusBadge";
import { mapCopyStatus, mapFitStatus } from "./statusMap";

export function CopyCheckBadge({
  valid,
  className = "",
}: {
  valid: boolean;
  className?: string;
}) {
  const meta = mapCopyStatus(valid);
  return (
    <StatusBadge
      label={meta.label}
      variant={meta.variant}
      description={meta.description}
      className={className}
    />
  );
}

export function FitCheckBadge({
  valid,
  className = "",
}: {
  valid: boolean;
  className?: string;
}) {
  const meta = mapFitStatus(valid);
  return (
    <StatusBadge
      label={meta.label}
      variant={meta.variant}
      description={meta.description}
      className={className}
    />
  );
}
