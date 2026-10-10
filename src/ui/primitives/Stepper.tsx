import { Check } from "lucide-react";

export interface StepItem {
  id: string;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStepIndex: number;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function Stepper({
  steps,
  currentStepIndex,
  onStepClick,
  className = "",
}: StepperProps) {
  return (
    <nav aria-label="Creation steps" className={`w-full ${className}`}>
      <ol className="flex items-center justify-between w-full relative">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isClickable = onStepClick && isCompleted;

          return (
            <li
              key={step.id}
              className={`flex-1 flex flex-col items-center relative ${
                idx !== steps.length - 1
                  ? "after:content-[''] after:w-full after:h-0.5 after:top-4 after:left-1/2 after:absolute after:-z-0"
                  : ""
              } ${
                isCompleted
                  ? "after:bg-[var(--accent)]"
                  : "after:bg-slate-200 dark:after:bg-slate-700"
              }`}
            >
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(idx)}
                aria-current={isCurrent ? "step" : undefined}
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition-all ${
                  isCompleted
                    ? "bg-[var(--accent)] text-white shadow-xs cursor-pointer hover:bg-[var(--accent-hover)]"
                    : isCurrent
                      ? "bg-[var(--bg-panel)] text-[var(--accent)] border-2 border-[var(--accent)] shadow-sm"
                      : "bg-[var(--bg-muted)] text-text-tertiary border border-border cursor-default"
                }`}
              >
                {isCompleted ? <Check size={14} strokeWidth={2.5} /> : idx + 1}
              </button>
              <span
                className={`mt-2 text-xs text-center font-medium select-none truncate max-w-[120px] ${
                  isCurrent
                    ? "text-[var(--accent)] font-semibold"
                    : isCompleted
                      ? "text-text-primary"
                      : "text-text-tertiary"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
