import { Check, Sparkles, X } from "lucide-react";

export function EditorQuickStart({
  applied,
  exported,
  onDismiss,
  onStart,
  onContent,
  onExport,
}: {
  applied: boolean;
  exported: boolean;
  onDismiss: () => void;
  onStart: () => void;
  onContent: () => void;
  onExport: () => void;
}) {
  return (
    <section className="starter-guide" aria-label="First design checklist">
      <div className="starter-guide-title">
        <Sparkles size={16} />
        <strong>Your first design, one step at a time.</strong>
        <button aria-label="Dismiss quick-start checklist" onClick={onDismiss}>
          <X size={15} />
        </button>
      </div>
      <div className="starter-guide-steps">
        <button className="done" onClick={onStart}>
          <Check size={12} />
          1. Choose your starting point
        </button>
        <button className={applied ? "done" : ""} onClick={onContent}>
          {applied && <Check size={12} />}2. Apply your manuscript
        </button>
        <button className={exported ? "done" : ""} onClick={onExport}>
          {exported && <Check size={12} />}3. Check and export
        </button>
      </div>
    </section>
  );
}
