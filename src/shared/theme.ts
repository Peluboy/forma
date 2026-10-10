/** Theme preference: system | light | dark. Persisted; applied before paint via index.html. */
export type ThemePreference = "system" | "light" | "dark";

/** v2 key: the light-first redesign resets earlier OS-driven choices once. */
export const THEME_KEY = "forma.theme.v2";
export const DEFAULT_THEME: ThemePreference = "light";

export function normalizeThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : DEFAULT_THEME;
}

export function readThemePreference(): ThemePreference {
  try {
    return normalizeThemePreference(localStorage.getItem(THEME_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function resolvedTheme(
  preference: ThemePreference,
  systemDark = false,
): "light" | "dark" {
  if (preference === "light" || preference === "dark") return preference;
  return systemDark ? "dark" : "light";
}

export function applyThemePreference(
  preference: ThemePreference,
): "light" | "dark" {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolvedTheme(preference, systemDark);
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta)
    meta.setAttribute("content", resolved === "dark" ? "#111214" : "#f7f6f3");
  return resolved;
}

export function persistThemePreference(
  preference: ThemePreference,
): "light" | "dark" {
  try {
    localStorage.setItem(THEME_KEY, preference);
  } catch {
    /* ignore */
  }
  return applyThemePreference(preference);
}
