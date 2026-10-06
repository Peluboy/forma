import { type ReactNode } from "react";
import { Tooltip } from "../Tooltip";

type IconButtonProps = {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  shortcut?: string;
};

export function IconButton({
  label,
  children,
  onClick,
  disabled,
  active,
  shortcut,
}: IconButtonProps) {
  return (
    <Tooltip label={label} shortcut={shortcut}>
      <button
        className={[
          "inline-flex items-center justify-center",
          "size-[30px] rounded-[5px] p-0 shrink-0",
          "text-text-secondary transition-colors",
          "hover:bg-bg-muted hover:text-text-primary",
          active ? "bg-accent-muted text-accent" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={label}
        aria-keyshortcuts={shortcut}
        aria-pressed={active}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    </Tooltip>
  );
}
