import { type InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import { cx } from "../lib/cx";

export interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "size"
> {
  value: string;
  onChange: (value: string) => void;
  label: string;
  size?: "sm" | "md";
}

export function SearchInput({
  value,
  onChange,
  label,
  size = "md",
  placeholder = "Search",
  className = "",
  ...props
}: SearchInputProps) {
  return (
    <label
      className={cx(
        "group/search relative flex items-center gap-2 rounded-[10px] border border-border bg-bg-panel px-3 text-text-tertiary shadow-[var(--shadow-xs)] transition-colors",
        "hover:border-border-strong focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10",
        size === "sm" ? "h-[30px]" : "h-9",
        className,
      )}
    >
      <Search size={15} strokeWidth={1.9} aria-hidden="true" />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary outline-none shadow-none! [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="grid h-5 w-5 place-items-center rounded-full text-text-tertiary hover:bg-bg-muted hover:text-text-primary"
        >
          <X size={12} />
        </button>
      )}
    </label>
  );
}
