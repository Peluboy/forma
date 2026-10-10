import { Badge, type BadgeProps } from "../primitives/Badge";
import type { StatusVariant } from "../theme";

export interface StatusBadgeProps extends Omit<BadgeProps, "children"> {
  label: string;
  variant?: StatusVariant;
  description?: string;
}

export function StatusBadge({
  label,
  variant = "neutral",
  dot = true,
  description,
  className = "",
  ...props
}: StatusBadgeProps) {
  return (
    <Badge
      variant={variant}
      dot={dot}
      title={description}
      className={className}
      {...props}
    >
      {label}
    </Badge>
  );
}
