import { post } from "../../../shared/api/api";
import {
  buildReferenceProfileFromImage,
  buildFallbackImageProfile,
  type ReferenceDesignProfile,
} from "../../../domain/reference-design/index";

export type AnalysisProviderId = "local" | "gemini" | "openai";

interface AnalysisResponse {
  regions: unknown;
  warnings?: string[];
  provider: string;
}

export function readImageDimensions(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("The image could not be opened."));
    image.src = dataUrl;
  });
}

export interface ImageProfileOutcome {
  profile: ReferenceDesignProfile;
  provider: string;
  usedFallback: boolean;
}

/**
 * Runs the existing, validated vision endpoint and converts its regions into a
 * cautious reference profile. On any failure, returns a safe fallback profile
 * rather than throwing, so generation can continue with the standard family.
 */
export async function analyzeImageReference(input: {
  image: string;
  provider: AnalysisProviderId;
  width?: number;
  height?: number;
}): Promise<ImageProfileOutcome> {
  let dimensions = { width: input.width ?? 720, height: input.height ?? 900 };
  if (input.width === undefined || input.height === undefined) {
    try {
      dimensions = await readImageDimensions(input.image);
    } catch {
      /* keep defaults */
    }
  }
  try {
    const response = await post<AnalysisResponse>("/reference/analyze", {
      image: input.image,
      provider: input.provider,
    });
    const { profile } = buildReferenceProfileFromImage({
      imageDataUrl: input.image,
      width: dimensions.width,
      height: dimensions.height,
      provider: response.provider,
      regions: response.regions,
      providerWarnings: response.warnings,
    });
    return { profile, provider: response.provider, usedFallback: false };
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : "Reference analysis could not be completed.";
    return {
      profile: buildFallbackImageProfile({
        imageDataUrl: input.image,
        width: dimensions.width,
        height: dimensions.height,
        reason,
      }),
      provider: input.provider,
      usedFallback: true,
    };
  }
}
