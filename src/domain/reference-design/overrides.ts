import type {
  ExtractedColorToken,
  ReferenceDensity,
  ReferenceDesignProfile,
  ReferenceImageUsage,
  ReferenceVisualTone,
} from "./types.js";
import { normalizeColor } from "./validation.js";

/**
 * User corrections for an extracted profile. Prevents a bad AI/extraction guess
 * from controlling generation. This is deliberately small: a few colors and the
 * high-level visual language — not a full design-system editor.
 */
export interface ReferenceOverrides {
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  tone?: ReferenceVisualTone;
  density?: ReferenceDensity;
  imageUsage?: ReferenceImageUsage;
}

function upsertColor(
  colors: ExtractedColorToken[],
  role: string,
  value: string,
): ExtractedColorToken[] {
  const existing = colors.findIndex((token) => token.role === role);
  const token: ExtractedColorToken = {
    id: existing >= 0 ? colors[existing].id : `color-${role}-override`,
    value,
    role,
    frequency: existing >= 0 ? colors[existing].frequency : 0.5,
    confidence: 1,
    kind: "observed",
    evidence: ["user override"],
  };
  if (existing >= 0) {
    const next = [...colors];
    next[existing] = token;
    return next;
  }
  return [token, ...colors];
}

/** Applies user corrections without mutating the input profile. */
export function applyReferenceOverrides(
  profile: ReferenceDesignProfile,
  overrides: ReferenceOverrides,
): ReferenceDesignProfile {
  let colors = [...profile.extractedTokens.colors];
  const appliedRoles: string[] = [];

  const primary = normalizeColor(overrides.primaryColor);
  const accent = normalizeColor(overrides.accentColor);
  const background = normalizeColor(overrides.backgroundColor);
  if (primary) {
    colors = upsertColor(colors, "primary", primary);
    appliedRoles.push("primary");
  }
  if (accent) {
    colors = upsertColor(colors, "accent", accent);
    appliedRoles.push("accent");
  }
  if (background) {
    colors = upsertColor(colors, "background", background);
    appliedRoles.push("background");
  }

  const visualLanguage = {
    ...profile.visualLanguage,
    ...(overrides.tone ? { tone: overrides.tone } : {}),
    ...(overrides.density ? { density: overrides.density } : {}),
    ...(overrides.imageUsage ? { imageUsage: overrides.imageUsage } : {}),
  };

  const userCorrected =
    appliedRoles.length > 0 ||
    Boolean(overrides.tone || overrides.density || overrides.imageUsage);

  return {
    ...profile,
    extractedTokens: { ...profile.extractedTokens, colors },
    visualLanguage,
    metadata: {
      ...profile.metadata,
      userCorrected,
      correctedRoles: appliedRoles,
    },
  };
}
