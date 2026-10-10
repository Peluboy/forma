import { StatusBadge } from "./StatusBadge";
import { mapWorkspaceRole } from "./statusMap";

export interface WorkspaceRoleBadgeProps {
  role: string;
  className?: string;
}

export function WorkspaceRoleBadge({
  role,
  className = "",
}: WorkspaceRoleBadgeProps) {
  const meta = mapWorkspaceRole(role);
  return (
    <StatusBadge
      label={meta.label}
      variant={meta.variant}
      dot={false}
      className={className}
    />
  );
}
