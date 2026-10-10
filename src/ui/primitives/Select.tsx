import { type SelectHTMLAttributes, forwardRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: SelectOption[];
  leftIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      label,
      hint,
      error,
      options,
      leftIcon,
      fullWidth = true,
      className = "",
      id,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    const selectId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className={`flex flex-col gap-1.5 ${fullWidth ? "w-full" : ""}`}>
        {label && (
          <label
            htmlFor={selectId}
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
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={[
              "h-9 pl-3 pr-8 text-sm rounded-lg bg-[var(--bg-panel)] text-text-primary border transition-colors appearance-none",
              "border-border placeholder:text-text-tertiary cursor-pointer",
              "focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15",
              "disabled:opacity-50 disabled:bg-[var(--bg-muted)] disabled:cursor-not-allowed",
              error
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
                : "",
              leftIcon ? "pl-9" : "",
              fullWidth ? "w-full" : "",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-2.5 text-text-tertiary pointer-events-none flex items-center justify-center">
            <ChevronDown size={15} />
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-600 font-medium m-0">{error}</p>
        )}
      </div>
    );
  },
);
