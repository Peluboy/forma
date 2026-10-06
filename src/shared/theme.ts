/** Theme preference: system | light | dark. Persisted; applied before paint via index.html. */
export type ThemePreference = "system" | "light" | "dark";

export const THEME_KEY = "forma-theme";

export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === "light" || value === "dark" || value === "system")
      return value;
  } catch {
    /* private mode */
  }
  return "system";
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
  if (preference === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", preference);
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta)
    meta.setAttribute("content", resolved === "dark" ? "#0f0f12" : "#f4f4f5");
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
