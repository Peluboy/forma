/**
 * Template Authoring + Approval System is behind a feature flag. Default on;
 * set VITE_FORMA_TEMPLATE_AUTHORING=0 to hide the /dev/templates lab and the
 * /create template picker. The domain APIs stay available regardless (used by
 * the dev lab, benchmarks, and tests).
 */
export function templateAuthoringEnabled(): boolean {
  try {
    const env = (import.meta as { env?: Record<string, string> }).env;
    const value = env?.VITE_FORMA_TEMPLATE_AUTHORING;
    if (value === undefined) return true;
    return value !== "0" && value.toLowerCase() !== "false";
  } catch {
    return true;
  }
}
