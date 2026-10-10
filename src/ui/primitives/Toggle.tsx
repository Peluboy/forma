import { type InputHTMLAttributes } from "react";

export interface ToggleProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
  className = "",
  id,
}: ToggleProps) {
  const toggleId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label
      htmlFor={toggleId}
      className={`inline-flex items-center justify-between gap-3 cursor-pointer select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      <div className="flex flex-col">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        {description && (
          <span className="text-xs text-text-tertiary">{description}</span>
        )}
      </div>

      <div className="relative inline-flex items-center shrink-0">
        <input
          type="checkbox"
          id={toggleId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div
          className={`w-9 h-5 rounded-full transition-colors duration-200 ease-in-out ${
            checked ? "bg-[var(--accent)]" : "bg-slate-300 dark:bg-slate-700"
          } peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)]/30`}
        />
        <div
          className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
    </label>
  );
}
