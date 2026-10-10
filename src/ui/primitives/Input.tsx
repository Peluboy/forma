import { type InputHTMLAttributes, type ReactNode, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    leftIcon,
    rightIcon,
    fullWidth = true,
    className = "",
    id,
    disabled,
    ...props
  },
  ref,
) {
  const inputId =
    id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? "w-full" : ""}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-text-primary select-none flex items-center justify-between"
        >
          <span>{label}</span>
          {hint && !error && (
            <span className="text-text-tertiary font-normal">{hint}</span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-text-tertiary pointer-events-none flex items-center justify-center">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={[
            "h-9 px-3 text-sm rounded-lg bg-[var(--bg-panel)] text-text-primary border transition-colors",
            "border-border placeholder:text-text-tertiary",
            "focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15",
            "disabled:opacity-50 disabled:bg-[var(--bg-muted)] disabled:cursor-not-allowed",
            error
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
              : "",
            leftIcon ? "pl-9" : "",
            rightIcon ? "pr-9" : "",
            fullWidth ? "w-full" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 text-text-tertiary pointer-events-none flex items-center justify-center">
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-600 font-medium m-0">{error}</p>
      )}
    </div>
  );
});
