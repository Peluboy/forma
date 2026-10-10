import type { DesignAssetRef, ImageElement } from "../design-spec/types.js";
import type { ExportBlocker, ExportWarning } from "./types.js";

const MIN_PIXELS_PER_POINT = 1.5;

export type ImageFitMode = "cover" | "contain" | "fill";

export interface ResolvedExportImage {
  elementId: string;
  dataUri?: string;
  mimeType?: string;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  dest: { x: number; y: number; width: number; height: number };
  fit: ImageFitMode;
  decorative: boolean;
  warnings: ExportWarning[];
  blockers: ExportBlocker[];
  missing: boolean;
}

export function mapDesignFit(
  fit: ImageElement["fit"] | undefined,
): ImageFitMode {
  if (fit === "fit") return "contain";
  if (fit === "fill") return "fill";
  return "cover";
}

export function isDecorativeImage(element: ImageElement): boolean {
  const role = element.metadata?.role;
  return role === "decorative" || element.metadata?.required === false;
}

export function findAsset(
  assets: DesignAssetRef[] | undefined,
  ref: string,
): DesignAssetRef | undefined {
  return (assets || []).find((asset) => asset.id === ref);
}

export function parseDataUri(uri: string | undefined): {
  mimeType?: string;
  bytes?: Uint8Array;
} {
  if (!uri || !uri.startsWith("data:")) return {};
  const match = uri.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return { mimeType: uri.slice(5).split(";")[0] };
  try {
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { mimeType: match[1], bytes };
  } catch {
    return { mimeType: match[1] };
  }
}

export function readPngSize(
  bytes: Uint8Array | undefined,
): { width: number; height: number } | null {
  if (!bytes || bytes.length < 24) return null;
  const png =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  if (!png) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

export function computeFittedRect(
  box: { x: number; y: number; width: number; height: number },
  intrinsic: { width: number; height: number } | null,
  fit: ImageFitMode,
  focal?: { x: number; y: number },
): { x: number; y: number; width: number; height: number } {
  if (!intrinsic || fit === "fill" || !intrinsic.width || !intrinsic.height) {
    return { ...box };
  }
  const imageRatio = intrinsic.width / intrinsic.height;
  const boxRatio = box.width / box.height;
  if (fit === "contain") {
    if (imageRatio > boxRatio) {
      const height = box.width / imageRatio;
      return {
        x: box.x,
        y: box.y + (box.height - height) / 2,
        width: box.width,
        height,
      };
    }
    const width = box.height * imageRatio;
    return {
      x: box.x + (box.width - width) / 2,
      y: box.y,
      width,
      height: box.height,
    };
  }
  const fx = focal && Number.isFinite(focal.x) ? focal.x : 0.5;
  const fy = focal && Number.isFinite(focal.y) ? focal.y : 0.5;
  if (imageRatio > boxRatio) {
    const width = box.height * imageRatio;
    const extra = width - box.width;
    return {
      x: box.x - extra * fx,
      y: box.y,
      width,
      height: box.height,
    };
  }
  const height = box.width / imageRatio;
  const extra = height - box.height;
  return {
    x: box.x,
    y: box.y - extra * fy,
    width: box.width,
    height,
  };
}

export function resolveExportImage(
  element: ImageElement,
  assets: DesignAssetRef[] | undefined,
  pageId: string,
): ResolvedExportImage {
  const decorative = isDecorativeImage(element);
  const warnings: ExportWarning[] = [];
  const blockers: ExportBlocker[] = [];
  const asset = findAsset(assets, element.assetRef);
  const uri = asset?.uri;
  const parsed = parseDataUri(uri);
  const pngSize = readPngSize(parsed.bytes);
  const fit = mapDesignFit(element.fit);
  const dest = computeFittedRect(
    {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    },
    pngSize,
    fit,
    element.focalPoint,
  );

  const unsupportedSource =
    uri && !uri.startsWith("data:") && !uri.startsWith("blob:");
  const missing = !uri || unsupportedSource || !parsed.bytes;

  if (missing) {
    const message = unsupportedSource
      ? "This image source cannot be embedded."
      : "An image is missing its source.";
    if (decorative) {
      warnings.push({
        code: "missing_decorative_image",
        message,
        pageId,
        elementId: element.id,
      });
    } else {
      blockers.push({
        code: "missing_required_image",
        message,
        pageId,
        elementId: element.id,
      });
    }
  } else if (pngSize) {
    const needW = element.width * MIN_PIXELS_PER_POINT;
    const needH = element.height * MIN_PIXELS_PER_POINT;
    if (pngSize.width < needW || pngSize.height < needH) {
      warnings.push({
        code: "low_resolution_image",
        message: "One image may look soft.",
        pageId,
        elementId: element.id,
      });
    }
  }
  if (element.crop || element.focalPoint) {
    warnings.push({
      code: "image_crop_approximated",
      message: "Image crop or focal point is approximated in the PDF.",
      pageId,
      elementId: element.id,
    });
  }

  return {
    elementId: element.id,
    dataUri: missing ? undefined : uri,
    mimeType: parsed.mimeType || asset?.mimeType,
    intrinsicWidth: pngSize?.width,
    intrinsicHeight: pngSize?.height,
    dest,
    fit,
    decorative,
    warnings,
    blockers,
    missing,
  };
}
