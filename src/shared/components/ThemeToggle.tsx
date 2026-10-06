import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  applyThemePreference,
  persistThemePreference,
  readThemePreference,
  type ThemePreference,
} from "../theme";

const OPTIONS: {
  id: ThemePreference;
  label: string;
  Icon: typeof Sun;
}[] = [
  { id: "system", label: "System", Icon: Monitor },
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
];

/** Compact segmented control. Does not touch design/artboard colors. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    readThemePreference(),
  );

  useEffect(() => {
    applyThemePreference(preference);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readThemePreference() === "system") applyThemePreference("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  function choose(next: ThemePreference) {
    setPreference(next);
    persistThemePreference(next);
  }

  return (
    <div
      className="inline-flex gap-[2px] p-[3px]
                 border border-border rounded-md bg-bg-muted"
      role="radiogroup"
      aria-label="Interface theme"
    >
      {OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={preference === id}
          title={label}
          onClick={() => choose(id)}
          className={[
            "inline-flex items-center gap-[6px]",
            "h-[28px] rounded-sm text-text-secondary text-xs font-medium",
            "transition-colors",
            compact ? "w-[30px] justify-center p-0" : "px-[10px]",
            preference === id
              ? "bg-bg-elevated text-text-primary shadow-sm"
              : "hover:text-text-primary",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Icon size={compact ? 15 : 16} strokeWidth={1.75} />
          {!compact && <span>{label}</span>}
        </button>
      ))}
    </div>
  );
}
