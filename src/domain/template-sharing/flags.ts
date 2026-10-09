/**
 * Template Distribution, Sharing & Forking v1 is behind a feature flag.
 * Default on; set VITE_FORMA_TEMPLATE_SHARING=0 to hide share controls, the
 * gallery, and the public preview page. The domain APIs remain available
 * regardless (used by the dev lab, benchmarks, and tests).
 */
export function templateSharingEnabled(): boolean {
  try {
    const env = (import.meta as { env?: Record<string, string> }).env;
    const value = env?.VITE_FORMA_TEMPLATE_SHARING;
    if (value === undefined) return true;
    return value !== "0" && value.toLowerCase() !== "false";
  } catch {
    return true;
  }
}
