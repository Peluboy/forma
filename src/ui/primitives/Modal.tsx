import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  children: React.ReactNode;
}

const MAX_WIDTH_MAP = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  maxWidth = "md",
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={`fixed inset-0 z-50 m-auto w-full ${MAX_WIDTH_MAP[maxWidth]} rounded-2xl bg-[var(--bg-panel)] p-0 text-text-primary shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-xs border border-border animate-in fade-in zoom-in-95 duration-150`}
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          {title && (
            <h2 className="text-base font-semibold text-text-primary m-0">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-xs text-text-tertiary mt-0.5 m-0">
              {description}
            </p>
          )}
        </div>
        <IconButton label="Close" size="sm" variant="ghost" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
    </dialog>
  );
}
