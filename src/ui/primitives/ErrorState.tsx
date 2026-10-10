import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  description: string;
  technicalDetails?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  technicalDetails,
  onRetry,
  className = "",
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto rounded-2xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/40 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 flex items-center justify-center mb-3">
        <AlertCircle size={20} />
      </div>
      <h3 className="text-sm font-semibold text-text-primary m-0">{title}</h3>
      <p className="text-xs text-text-secondary mt-1.5 leading-relaxed m-0">
        {description}
      </p>

      {onRetry && (
        <div className="mt-4">
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<RotateCcw size={14} />}
            onClick={onRetry}
          >
            Try again
          </Button>
        </div>
      )}

      {technicalDetails && (
        <div className="mt-4 w-full text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-primary"
          >
            <span>Details</span>
            {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showDetails && (
            <pre className="mt-1.5 p-2.5 rounded-lg bg-slate-900 text-slate-100 text-[10px] overflow-x-auto font-mono whitespace-pre-wrap">
              {technicalDetails}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
