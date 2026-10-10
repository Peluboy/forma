import { StatusBadge } from "./StatusBadge";
import { mapTemplateStatus } from "./statusMap";

export interface TemplateStatusBadgeProps {
  status: string;
  className?: string;
}

export function TemplateStatusBadge({
  status,
  className = "",
}: TemplateStatusBadgeProps) {
  const meta = mapTemplateStatus(status);
  return (
    <StatusBadge
      label={meta.label}
      variant={meta.variant}
      className={className}
    />
  );
}
