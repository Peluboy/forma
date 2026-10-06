export interface AnalysisRegion {
  id: string;
  text: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
  fontSize: number;
  fontFamily: "Arial" | "Georgia";
  textColor: string;
  coverColor: string;
  field:
    null | "kicker" | "title" | "description" | "date" | "location" | "footer";
}
export function analysisCapabilities(): { local: boolean; openai: boolean };
export function analyzeReference(options: {
  image: string;
  provider?: "local" | "openai";
  signal?: AbortSignal;
}): Promise<{
  regions: AnalysisRegion[];
  warnings: string[];
  provider: "local" | "openai";
}>;
export function normalizeRegions(candidates: unknown): AnalysisRegion[];
export function validateImage(
  image: unknown,
): Promise<{ buffer: Buffer; width: number; height: number }>;
