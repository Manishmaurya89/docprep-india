import type { Size } from "@/lib/file-processing/image/geometry";
import type { DocumentRequirement } from "@/data/exam-requirements/schema";
import { type UiMessages, enUi } from "@/lib/i18n/en";

export interface OutputPlan {
  output: Size;
  /** Target aspect ratio for the crop box, or null for free cropping. */
  aspect: number | null;
  /** Whether the size search may shrink dimensions, and how far. */
  allowResize: boolean;
  minScale: number;
}

/**
 * Chooses output pixel dimensions for a crop under a requirement's pixel
 * constraints. Scaling is always uniform. Exact sizes lock the crop aspect.
 */
export function planImageOutput(crop: Size, pixels: DocumentRequirement["pixels"]): OutputPlan {
  if (pixels?.width !== undefined && pixels.height !== undefined) {
    return { output: { width: pixels.width, height: pixels.height }, aspect: pixels.width / pixels.height, allowResize: false, minScale: 1 };
  }
  const maxW = pixels?.maxWidth ?? pixels?.width ?? Number.POSITIVE_INFINITY;
  const maxH = pixels?.maxHeight ?? pixels?.height ?? Number.POSITIVE_INFINITY;
  const minW = pixels?.minWidth ?? pixels?.width ?? 1;
  const minH = pixels?.minHeight ?? pixels?.height ?? 1;

  let scale = Math.min(1, maxW / crop.width, maxH / crop.height);
  if (crop.width * scale < minW || crop.height * scale < minH) {
    scale = Math.max(minW / crop.width, minH / crop.height);
  }
  const output = { width: Math.max(1, Math.round(crop.width * scale)), height: Math.max(1, Math.round(crop.height * scale)) };
  const minScale = Math.min(1, Math.max(minW / output.width, minH / output.height, 0.1));
  return { output, aspect: null, allowResize: minScale < 1, minScale };
}

/** Pixel limits in plain words, in the language of `t` (English by default). The numbers are the record's own. */
export function describePixels(pixels: DocumentRequirement["pixels"], t: UiMessages = enUi): string | null {
  if (!pixels) return null;
  const l = t.limits;
  const suffix = `${pixels.dpi ? l.atDpi(pixels.dpi) : ""}${pixels.preferred ? l.preferred : ""}`;
  if (pixels.width !== undefined && pixels.height !== undefined) return `${l.exactPixels(pixels.width, pixels.height)}${suffix}`;
  if (pixels.minWidth !== undefined && pixels.minHeight !== undefined && pixels.maxWidth === undefined && pixels.maxHeight === undefined) {
    return `${l.minPixels(pixels.minWidth, pixels.minHeight)}${suffix}`;
  }
  const part = (min?: number, max?: number, exact?: number) =>
    exact !== undefined ? `${exact}` : min !== undefined && max !== undefined ? `${min}–${max}` : min !== undefined ? `≥ ${min}` : max !== undefined ? `≤ ${max}` : l.any;
  return `${l.pixelRange(part(pixels.minWidth, pixels.maxWidth, pixels.width), part(pixels.minHeight, pixels.maxHeight, pixels.height))}${suffix}`;
}

export function describeSize(fileSize: DocumentRequirement["fileSize"], t: UiMessages = enUi): string | null {
  if (!fileSize) return null;
  const { minKB, maxKB } = fileSize;
  const l = t.limits;
  if (minKB !== undefined && maxKB !== undefined) return l.sizeRange(minKB, maxKB);
  if (maxKB !== undefined) return fileSize.maxExclusive ? l.lessThan(maxKB) : l.upTo(maxKB);
  return l.atLeast(minKB!);
}
