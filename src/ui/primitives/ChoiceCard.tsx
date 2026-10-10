import { type ReactNode } from "react";
import { Check } from "lucide-react";
import { cx } from "../lib/cx";

export interface ChoiceCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  art?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Visual radio option. Use inside a <fieldset> with a legend. */
export function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  icon,
  art,
  disabled = false,
  className = "",
}: ChoiceCardProps) {
  return (
    <label
      className={cx(
        "group relative flex cursor-pointer flex-col gap-3 rounded-2xl border bg-bg-panel p-3 transition-[border-color,box-shadow,transform] duration-150",
        "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/20",
        checked
          ? "border-accent shadow-[0_0_0_1px_var(--accent),var(--shadow-sm)]"
          : "border-border hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-sm)]",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      {art && (
        <span
          className="block overflow-hidden rounded-[12px] bg-bg-muted"
          aria-hidden="true"
        >
          {art}
        </span>
      )}
      <span className="flex items-start gap-2.5 px-1 pb-0.5">
        {icon && (
          <span
            className={cx(
              "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[8px]",
              checked
                ? "bg-accent text-text-on-accent"
                : "bg-bg-muted text-text-secondary",
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <strong className="text-[13px] font-semibold text-text-primary">
            {title}
          </strong>
          {description && (
            <span className="text-xs leading-[18px] text-text-secondary">
              {description}
            </span>
          )}
        </span>
        <span
          className={cx(
            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
            checked
              ? "border-accent bg-accent text-text-on-accent"
              : "border-border-strong bg-bg-panel text-transparent",
          )}
          aria-hidden="true"
        >
          <Check size={12} strokeWidth={3} />
        </span>
      </span>
    </label>
  );
}
