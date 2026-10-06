import type { ArtDirectionProfile } from "./qualityTypes.js";

export const ART_DIRECTION_PROFILES: ArtDirectionProfile[] = [
  {
    id: "editorial",
    name: "Editorial",
    style: "editorial",
    description:
      "Clean, typographically rich editorial style. Strong whitespace, serif display headings, restrained color.",
    densityTarget: "medium",
    imageProminence: "medium",
    typographyEmphasis: "headline",
    sectionTransitionStyle: "subtle",
    statTreatment: "minimal",
    maxLayoutRepeat: 2,
    minBodyFontSize: 10,
    maxLineLength: 85,
    preferredHeadingRatio: 2.0,
    spacingTolerance: "standard",
    contrastMinimum: 40,
  },
  {
    id: "corporate",
    name: "Corporate",
    style: "corporate",
    description:
      "Structured, professional corporate report style. Grid-aligned, data-forward, brand-consistent.",
    densityTarget: "medium",
    imageProminence: "low",
    typographyEmphasis: "balanced",
    sectionTransitionStyle: "clear",
    statTreatment: "card",
    maxLayoutRepeat: 2,
    minBodyFontSize: 10,
    maxLineLength: 90,
    preferredHeadingRatio: 1.8,
    spacingTolerance: "standard",
    contrastMinimum: 45,
  },
  {
    id: "data-forward",
    name: "Data Forward",
    style: "data-forward",
    description:
      "Data-dense analytical reporting. Prioritizes statistics, tables, and charts over prose.",
    densityTarget: "dense",
    imageProminence: "low",
    typographyEmphasis: "body",
    sectionTransitionStyle: "clear",
    statTreatment: "large-number",
    maxLayoutRepeat: 3,
    minBodyFontSize: 9,
    maxLineLength: 95,
    preferredHeadingRatio: 1.5,
    spacingTolerance: "tight",
    contrastMinimum: 40,
  },
];

export function getArtDirectionProfile(id: string): ArtDirectionProfile {
  const found = ART_DIRECTION_PROFILES.find((p) => p.id === id);
  return found ?? ART_DIRECTION_PROFILES[0];
}
