import React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { STATUS_STYLES, type StatusVariant } from "../theme";
import { IconButton } from "./IconButton";

export interface NoticeProps {
  variant?: StatusVariant;
  title?: string;
  onClose?: () => void;
  className?: string;
  children: React.ReactNode;
}

export function Notice({
  variant = "info",
  title,
  onClose,
  className = "",
  children,
}: NoticeProps) {
  const styles = STATUS_STYLES[variant];

  const Icon = {
    success: CheckCircle2,
    warning: AlertCircle,
    danger: AlertCircle,
    info: Info,
    neutral: Info,
    accent: Info,
  }[variant];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 rounded-xl border ${styles.badge} ${className}`}
    >
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1 text-xs leading-relaxed">
        {title && (
          <strong className="block font-semibold mb-0.5">{title}</strong>
        )}
        <div className="opacity-95">{children}</div>
      </div>
      {onClose && (
        <IconButton label="Dismiss" size="xs" variant="ghost" onClick={onClose}>
          <X size={14} />
        </IconButton>
      )}
    </div>
  );
}
