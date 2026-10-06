import type { DesignQualityPreset } from "./qualityTypes.js";

export const QUALITY_PRESETS: DesignQualityPreset[] = [
  {
    id: "editorial_report",
    name: "Editorial Report",
    description:
      "Balanced editorial quality for narrative-driven business reports.",
    artDirectionProfileId: "editorial",
    targetOverallScore: 85,
    minAcceptableScore: 72,
    minBodyFontSize: 10,
    maxBodyLineLength: 85,
    maxLayoutRepeat: 2,
    maxDensityVariation: 30,
    minHierarchyRatio: 1.8,
    contrastMinimum: 40,
    maxTypeStyleCount: 5,
    maxIterations: 3,
  },
  {
    id: "corporate_report",
    name: "Corporate Report",
    description:
      "Professional corporate quality for structured business reports.",
    artDirectionProfileId: "corporate",
    targetOverallScore: 82,
    minAcceptableScore: 70,
    minBodyFontSize: 10,
    maxBodyLineLength: 90,
    maxLayoutRepeat: 2,
    maxDensityVariation: 35,
    minHierarchyRatio: 1.6,
    contrastMinimum: 45,
    maxTypeStyleCount: 5,
    maxIterations: 3,
  },
  {
    id: "financial_report",
    name: "Financial Report",
    description: "Dense analytical quality for data-heavy financial documents.",
    artDirectionProfileId: "data-forward",
    targetOverallScore: 80,
    minAcceptableScore: 68,
    minBodyFontSize: 9,
    maxBodyLineLength: 95,
    maxLayoutRepeat: 3,
    maxDensityVariation: 40,
    minHierarchyRatio: 1.4,
    contrastMinimum: 40,
    maxTypeStyleCount: 4,
    maxIterations: 3,
  },
  {
    id: "executive_summary",
    name: "Executive Summary",
    description: "High-impact, concise executive summary quality.",
    artDirectionProfileId: "editorial",
    targetOverallScore: 88,
    minAcceptableScore: 75,
    minBodyFontSize: 11,
    maxBodyLineLength: 75,
    maxLayoutRepeat: 1,
    maxDensityVariation: 25,
    minHierarchyRatio: 2.0,
    contrastMinimum: 50,
    maxTypeStyleCount: 4,
    maxIterations: 3,
  },
];

export function getQualityPreset(id: string): DesignQualityPreset {
  const found = QUALITY_PRESETS.find((p) => p.id === id);
  return found ?? QUALITY_PRESETS[0];
}
