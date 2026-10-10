import React from "react";
import { Button } from "./Button";

export interface EmptyStateProps {
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
  secondaryAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`forma-empty-surface flex flex-col items-center justify-center text-center p-10 rounded-[28px] border border-border ${className}`}
    >
      {illustration && <div className="mb-4">{illustration}</div>}
      <h3 className="text-base font-semibold text-text-primary tracking-tight m-0">
        {title}
      </h3>
      {description && (
        <p className="text-[13px] text-text-secondary mt-2 max-w-sm leading-5 m-0">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex items-center gap-3">
          {action && (
            <Button
              variant="primary"
              size="sm"
              iconLeft={action.icon}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="secondary"
              size="sm"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
