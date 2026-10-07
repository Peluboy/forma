import type {
  ReferenceConfidence,
  ReferenceWarning,
  ReferenceWarningCode,
} from "./types.js";

/**
 * Confidence is never hidden. Extraction reports per-dimension confidence and
 * an overall derived from it. The overall weights layout and typography most
 * heavily because they drive TemplateFamily generation.
 */
const CONFIDENCE_WEIGHTS: Record<
  Exclude<keyof ReferenceConfidence, "overall">,
  number
> = {
  colors: 0.2,
  typography: 0.22,
  layout: 0.28,
  imagery: 0.15,
  data: 0.15,
};

export function computeOverallConfidence(
  confidence: Omit<ReferenceConfidence, "overall">,
): number {
  let total = 0;
  for (const [key, weight] of Object.entries(CONFIDENCE_WEIGHTS) as Array<
    [keyof typeof CONFIDENCE_WEIGHTS, number]
  >) {
    total += (confidence[key] ?? 0) * weight;
  }
  return Math.round(Math.max(0, Math.min(1, total)) * 1000) / 1000;
}

export type ConfidenceBand = "high" | "medium" | "low" | "unusable";

export function classifyConfidence(overall: number): ConfidenceBand {
  if (overall >= 0.75) return "high";
  if (overall >= 0.5) return "medium";
  if (overall >= 0.25) return "low";
  return "unusable";
}

export function warning(
  code: ReferenceWarningCode,
  message: string,
  severity: ReferenceWarning["severity"] = "low",
): ReferenceWarning {
  return { code, message, severity };
}

export function makeConfidence(
  partial: Partial<Omit<ReferenceConfidence, "overall">>,
): ReferenceConfidence {
  const base = {
    colors: partial.colors ?? 0,
    typography: partial.typography ?? 0,
    layout: partial.layout ?? 0,
    imagery: partial.imagery ?? 0,
    data: partial.data ?? 0,
  };
  return { ...base, overall: computeOverallConfidence(base) };
}
