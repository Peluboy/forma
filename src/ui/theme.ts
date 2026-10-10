/**
 * Forma UI: token references and status class mapping (Visual System v2).
 * Every class points at a semantic token so light and dark stay in sync.
 */

export const UI_COLORS = {
  accent: "var(--accent)",
  accentHover: "var(--accent-hover)",
  accentMuted: "var(--accent-muted)",
  bgPage: "var(--bg-page)",
  bgPanel: "var(--bg-panel)",
  bgElevated: "var(--bg-elevated)",
  bgMuted: "var(--bg-muted)",
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textTertiary: "var(--text-tertiary)",
  border: "var(--border)",
  borderStrong: "var(--border-strong)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
} as const;

export type StatusVariant =
  "success" | "warning" | "danger" | "info" | "neutral" | "accent";

export const STATUS_STYLES: Record<
  StatusVariant,
  { badge: string; dot: string; subtle: string }
> = {
  success: {
    badge: "bg-success-muted text-success border-success/15",
    dot: "bg-success",
    subtle: "text-success",
  },
  warning: {
    badge: "bg-warning-muted text-warning border-warning/15",
    dot: "bg-warning",
    subtle: "text-warning",
  },
  danger: {
    badge: "bg-danger-muted text-danger border-danger/15",
    dot: "bg-danger",
    subtle: "text-danger",
  },
  info: {
    badge: "bg-info-muted text-info border-info/15",
    dot: "bg-info",
    subtle: "text-info",
  },
  neutral: {
    badge: "bg-bg-muted text-text-secondary border-border",
    dot: "bg-text-tertiary",
    subtle: "text-text-secondary",
  },
  accent: {
    badge: "bg-accent-muted text-selected-fg border-accent/15",
    dot: "bg-accent",
    subtle: "text-accent",
  },
};
