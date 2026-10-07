import type {
  DesignTokenSet,
  TemplateElementDefinition,
  TemplateFamily,
  TemplateLayout,
} from "../template-family/types.js";
import { validateTemplateFamily } from "../template-family/validation.js";
import { supportedLayoutIdsForPatterns } from "./extractLayoutPatterns.js";
import type {
  ExtractedDesignTokens,
  ReferenceDesignProfile,
  ReferenceUsageMode,
  ReferenceTemplateGateResult,
  ReferenceTemplateStatus,
} from "./types.js";

const MIN_DERIVED_LAYOUTS = 3;
const GUIDED_CONFIDENCE = 0.3;
const UNUSABLE_CONFIDENCE = 0.12;

type ColorRole = keyof DesignTokenSet["colors"];

interface ColorRolePlan {
  role: ColorRole;
  candidates: string[];
}

const COLOR_ROLE_PLAN: ColorRolePlan[] = [
  { role: "primary", candidates: ["primary", "text", "secondary"] },
  { role: "secondary", candidates: ["secondary", "text", "body"] },
  { role: "accent", candidates: ["accent", "primary"] },
  { role: "background", candidates: ["background", "surface"] },
  { role: "surface", candidates: ["surface", "background"] },
  { role: "muted", candidates: ["muted", "caption", "secondary"] },
  { role: "border", candidates: ["border", "muted", "surface"] },
];

/**
 * Re-skins an existing TemplateFamily with tokens inferred from a reference.
 * Geometry and slot grammar are untouched, so Exact Copy, fit, and projection
 * behave exactly as before — only colors and (when confident) fonts change.
 */
export function applyReferenceTokensToFamily(
  base: TemplateFamily,
  profile: ReferenceDesignProfile,
): TemplateFamily {
  const tokens = profile.extractedTokens;
  const colorByRole = new Map<string, string>();
  for (const token of tokens.colors) {
    if (!colorByRole.has(token.role)) colorByRole.set(token.role, token.value);
  }

  const colors: DesignTokenSet["colors"] = { ...base.designTokens.colors };
  const colorRemap = new Map<string, string>();
  for (const plan of COLOR_ROLE_PLAN) {
    const source = base.designTokens.colors?.[plan.role];
    const replacement = plan.candidates
      .map((role) => colorByRole.get(role))
      .find((value) => value);
    if (source && replacement && source.toLowerCase() !== replacement) {
      colors[plan.role] = replacement;
      colorRemap.set(source.toLowerCase(), replacement);
    }
  }

  const typographyConfidence = profile.confidence.typography;
  const fontByRole = new Map<string, string>();
  if (typographyConfidence >= 0.4)
    for (const token of tokens.typography) {
      if (token.fontFamily && !fontByRole.has(token.role))
        fontByRole.set(token.role, token.fontFamily);
    }
  // Map base font families to reference font families through matching roles.
  const fontRemap = new Map<string, string>();
  for (const [role, style] of Object.entries(base.designTokens.typography)) {
    const replacement = fontByRole.get(role);
    if (replacement && style.fontFamily && style.fontFamily !== replacement)
      fontRemap.set(style.fontFamily, replacement);
  }

  const remapElement = (
    element: TemplateElementDefinition,
  ): TemplateElementDefinition => {
    const next: TemplateElementDefinition = { ...element };
    if (element.fill?.color && colorRemap.has(element.fill.color.toLowerCase()))
      next.fill = { color: colorRemap.get(element.fill.color.toLowerCase())! };
    if (
      element.stroke?.color &&
      colorRemap.has(element.stroke.color.toLowerCase())
    )
      next.stroke = {
        color: colorRemap.get(element.stroke.color.toLowerCase())!,
      };
    if (element.textStyle) {
      const style = { ...element.textStyle };
      if (style.color && colorRemap.has(style.color.toLowerCase()))
        style.color = colorRemap.get(style.color.toLowerCase())!;
      if (style.fontFamily && fontRemap.has(style.fontFamily))
        style.fontFamily = fontRemap.get(style.fontFamily)!;
      next.textStyle = style;
    }
    return next;
  };

  return {
    ...base,
    id: `${base.id}::reference-guided`,
    name: `${base.name} (reference-guided)`,
    description: `${base.description ?? base.name} Re-skinned from a reference design.`,
    designTokens: {
      ...base.designTokens,
      colors,
      typography: base.designTokens.typography,
    },
    layouts: base.layouts.map((layout) => ({
      ...layout,
      baseElements: layout.baseElements.map(remapElement),
    })),
    metadata: {
      ...base.metadata,
      referenceDerived: false,
      referenceProfileId: profile.id,
      referenceColorRemap: Object.fromEntries(colorRemap),
      referenceFontRemap: Object.fromEntries(fontRemap),
    },
  };
}

function selectLayouts(
  base: TemplateFamily,
  supported: string[],
): TemplateLayout[] {
  const supportedSet = new Set(supported);
  const selected = base.layouts.filter((layout) => supportedSet.has(layout.id));
  // A reference-cover usually exists; include the base cover when supported.
  return selected;
}

/**
 * Builds a limited reference-derived TemplateFamily when the reference
 * confidently supports enough layouts. Otherwise signal a downgrade.
 */
export function profileToTemplateFamily(
  profile: ReferenceDesignProfile,
  base: TemplateFamily,
): { family: TemplateFamily | null; gate: ReferenceTemplateGateResult } {
  const supported = supportedLayoutIdsForPatterns(
    profile.layoutPatterns,
  ).filter((id) => base.layouts.some((layout) => layout.id === id));
  const reasons: string[] = [];
  const overall = profile.confidence.overall;

  if (
    profile.source.type === "unknown" ||
    overall < UNUSABLE_CONFIDENCE ||
    (!profile.extractedTokens.colors.length &&
      !profile.extractedTokens.typography.length &&
      !profile.layoutPatterns.length)
  )
    return {
      family: null,
      gate: {
        status: "reference_unusable",
        ready: false,
        reasons: ["Reference produced no reusable design intelligence."],
        layoutIds: [],
      },
    };

  if (supported.length < MIN_DERIVED_LAYOUTS) {
    reasons.push(
      `Only ${supported.length} layout(s) were confidently observed (need ${MIN_DERIVED_LAYOUTS}).`,
    );
    if (overall < GUIDED_CONFIDENCE)
      reasons.push("Reference confidence is too low for template derivation.");
    return {
      family: null,
      gate: {
        status:
          overall < GUIDED_CONFIDENCE
            ? "reference_low_confidence"
            : "reference_guided_only",
        ready: false,
        reasons,
        layoutIds: supported,
      },
    };
  }

  const styled = applyReferenceTokensToFamily(base, profile);
  const derived: TemplateFamily = {
    ...styled,
    id: `reference-derived-${profile.id}`,
    name: `${base.name} — Reference-derived`,
    description:
      "A limited template family derived from an analysed reference design. Not a reproduction of the source.",
    layouts: selectLayouts(styled, supported),
    metadata: {
      ...styled.metadata,
      referenceDerived: true,
      referenceSourceType: profile.source.type,
      referenceConfidence: overall,
      sourceLayoutIds: supported,
    },
  };

  const validation = validateTemplateFamily(derived);
  if (!validation.valid || derived.layouts.length < MIN_DERIVED_LAYOUTS) {
    reasons.push(
      validation.valid
        ? "Derived family did not contain enough layouts."
        : `Derived family failed validation: ${validation.issues
            .slice(0, 3)
            .map((issue) => issue.message)
            .join("; ")}`,
    );
    return {
      family: null,
      gate: {
        status: "reference_guided_only",
        ready: false,
        reasons,
        layoutIds: supported,
      },
    };
  }

  return {
    family: derived,
    gate: {
      status: "reference_template_ready",
      ready: true,
      reasons: [
        `${derived.layouts.length} layouts derived from observed patterns.`,
      ],
      layoutIds: supported,
    },
  };
}

export function evaluateReferenceTemplateGate(
  profile: ReferenceDesignProfile,
  base: TemplateFamily,
): ReferenceTemplateGateResult {
  return profileToTemplateFamily(profile, base).gate;
}

export interface ReferenceFamilyResolution {
  family: TemplateFamily;
  mode: ReferenceUsageMode;
  gate: ReferenceTemplateGateResult;
  derivedFamily: TemplateFamily | null;
  reasons: string[];
}

/**
 * Chooses how (or whether) a reference influences generation. Never returns a
 * derived family that failed the gate.
 */
export function resolveReferenceFamily(
  profile: ReferenceDesignProfile | null | undefined,
  base: TemplateFamily,
): ReferenceFamilyResolution {
  if (!profile)
    return {
      family: base,
      mode: "none",
      gate: {
        status: "reference_guided_only",
        ready: false,
        reasons: ["No reference supplied."],
        layoutIds: [],
      },
      derivedFamily: null,
      reasons: ["No reference supplied."],
    };

  const { family, gate } = profileToTemplateFamily(profile, base);
  if (family && gate.status === "reference_template_ready")
    return {
      family,
      mode: "reference_derived_template",
      gate,
      derivedFamily: family,
      reasons: gate.reasons,
    };

  const overall = profile.confidence.overall;
  const hasTokens =
    profile.extractedTokens.colors.length > 0 ||
    profile.extractedTokens.typography.length > 0;
  if (overall >= GUIDED_CONFIDENCE && hasTokens)
    return {
      family: applyReferenceTokensToFamily(base, profile),
      mode: "reference_guided_tokens",
      gate,
      derivedFamily: null,
      reasons: [
        ...gate.reasons,
        "Applied reference-derived tokens to the standard family.",
      ],
    };

  return {
    family: base,
    mode: "reference_low_confidence_fallback",
    gate,
    derivedFamily: null,
    reasons: [
      ...gate.reasons,
      "Reference confidence was too low to influence generation.",
    ],
  };
}

export function referenceStatusLabel(status: ReferenceTemplateStatus): string {
  switch (status) {
    case "reference_template_ready":
      return "Reference-derived template ready";
    case "reference_guided_only":
      return "Reference-guided styling only";
    case "reference_low_confidence":
      return "Reference too weak to use";
    case "reference_unusable":
      return "Reference unusable";
  }
}

export function tokensForDisplay(tokens: ExtractedDesignTokens): {
  colors: ExtractedDesignTokens["colors"];
  typography: ExtractedDesignTokens["typography"];
} {
  return { colors: tokens.colors, typography: tokens.typography };
}
