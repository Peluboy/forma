import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

type ModalProps = {
  children: ReactNode;
  title: string;
  onClose: () => void;
};

export function Modal({ children, title, onClose }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const root = ref.current!;
    root.querySelector<HTMLElement>("button,input,select,textarea")?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = [
          ...root.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input,select,textarea,[tabindex="0"]',
          ),
        ];
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", handle);
    return () => {
      window.removeEventListener("keydown", handle);
      before?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 p-[25px] sm:p-[14px]
                 bg-[rgba(20,20,26,0.4)] backdrop-blur-[5px]
                 [animation:fade-in_0.2s]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="w-[480px] max-w-full max-h-[90dvh] overflow-auto
                   bg-bg-elevated text-text-primary
                   border border-border rounded-2xl
                   p-[25px] sm:p-[21px]
                   shadow-[var(--shadow-modal)]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-[10px]">
          <h2
            className="text-[22px] sm:text-[20px] font-semibold
                       tracking-[-0.7px] m-0"
          >
            {title}
          </h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={19} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
