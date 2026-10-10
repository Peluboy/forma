import { type TextareaHTMLAttributes, forwardRef } from "react";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  fullWidth?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    {
      label,
      hint,
      error,
      fullWidth = true,
      className = "",
      id,
      disabled,
      rows = 4,
      ...props
    },
    ref,
  ) {
    const textareaId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className={`flex flex-col gap-1.5 ${fullWidth ? "w-full" : ""}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-semibold text-text-primary select-none flex items-center justify-between"
          >
            <span>{label}</span>
            {hint && !error && (
              <span className="text-text-tertiary font-normal">{hint}</span>
            )}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          className={[
            "p-3 text-sm rounded-lg bg-[var(--bg-panel)] text-text-primary border transition-colors resize-y",
            "border-border placeholder:text-text-tertiary",
            "focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15",
            "disabled:opacity-50 disabled:bg-[var(--bg-muted)] disabled:cursor-not-allowed",
            error
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
              : "",
            fullWidth ? "w-full" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />

        {error && (
          <p className="text-xs text-rose-600 font-medium m-0">{error}</p>
        )}
      </div>
    );
  },
);
