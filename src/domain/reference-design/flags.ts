/**
 * Reference Design Intelligence is behind a feature flag. Default on; set
 * VITE_FORMA_REFERENCE_INTELLIGENCE=0 to disable the /create reference flow.
 * The domain APIs remain available regardless (used by the dev lab and tests).
 */
export function referenceIntelligenceEnabled(): boolean {
  try {
    const env = (import.meta as { env?: Record<string, string> }).env;
    const value = env?.VITE_FORMA_REFERENCE_INTELLIGENCE;
    if (value === undefined) return true;
    return value !== "0" && value.toLowerCase() !== "false";
  } catch {
    return true;
  }
}
