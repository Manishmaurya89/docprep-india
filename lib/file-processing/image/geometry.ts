import { ProcessingError, detail } from "../errors";
import { LIMITS } from "../limits";

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

export type Rotation = 0 | 90 | 180 | 270;

export function normalizeRotation(degrees: number): Rotation {
  const r = (((Math.round(degrees / 90) * 90) % 360) + 360) % 360;
  return r as Rotation;
}

export function rotatedSize(size: Size, rotation: Rotation): Size {
  return rotation === 90 || rotation === 270 ? { width: size.height, height: size.width } : { ...size };
}

export function assertValidOutputSize(size: Size): void {
  const { width, height } = size;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new ProcessingError("invalid-dimensions", detail("wholePixels"));
  }
  if (width > LIMITS.maxOutputSide || height > LIMITS.maxOutputSide) {
    throw new ProcessingError("invalid-dimensions", detail("maxSide", { max: LIMITS.maxOutputSide.toLocaleString("en-IN") }));
  }
  if (width * height > LIMITS.maxCanvasPixels) {
    throw new ProcessingError(
      "invalid-dimensions",
      detail("tooManyOutputPixels", { pixels: (width * height).toLocaleString("en-IN"), max: LIMITS.maxCanvasPixels.toLocaleString("en-IN") }),
    );
  }
}

export interface ResizeRequest {
  source: Size;
  mode: "pixels" | "percent";
  width?: number;
  height?: number;
  percent?: number;
  lockAspect: boolean;
  /** With aspect lock and both values present, which one the user set. */
  anchor?: "width" | "height";
  allowUpscale: boolean;
}

export interface ResizeResult extends Size {
  /** True when the request was larger than the source and was reduced to avoid upscaling. */
  upscaleBlocked: boolean;
}

function positive(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

export function computeResize(request: ResizeRequest): ResizeResult {
  const { source } = request;
  if (!positive(source.width) || !positive(source.height)) {
    throw new ProcessingError("invalid-dimensions", detail("noSourceSize"));
  }
  let width: number;
  let height: number;

  if (request.mode === "percent") {
    if (!positive(request.percent) || request.percent > 1000) {
      throw new ProcessingError("invalid-dimensions", detail("percentRange"));
    }
    width = Math.max(1, Math.round((source.width * request.percent) / 100));
    height = Math.max(1, Math.round((source.height * request.percent) / 100));
  } else if (request.lockAspect) {
    const ratio = source.width / source.height;
    const useHeight = request.anchor === "height" ? positive(request.height) : !positive(request.width);
    if (useHeight) {
      if (!positive(request.height)) throw new ProcessingError("invalid-dimensions", detail("enterWidthOrHeight"));
      height = Math.round(request.height);
      width = Math.max(1, Math.round(height * ratio));
    } else {
      width = Math.round(request.width!);
      height = Math.max(1, Math.round(width / ratio));
    }
  } else {
    if (!positive(request.width) || !positive(request.height)) {
      throw new ProcessingError("invalid-dimensions", detail("enterBothOrLock"));
    }
    width = Math.round(request.width);
    height = Math.round(request.height);
  }

  let upscaleBlocked = false;
  if (!request.allowUpscale && (width > source.width || height > source.height)) {
    const scale = Math.min(source.width / width, source.height / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    upscaleBlocked = true;
  }

  assertValidOutputSize({ width, height });
  return { width, height, upscaleBlocked };
}

/** Largest rectangle of the given aspect ratio centred in `bounds`. `null` aspect → full bounds. */
export function centeredCropForAspect(bounds: Size, aspect: number | null): Rect {
  if (aspect === null || !Number.isFinite(aspect) || aspect <= 0) {
    return { x: 0, y: 0, width: bounds.width, height: bounds.height };
  }
  let width = bounds.width;
  let height = Math.round(width / aspect);
  if (height > bounds.height) {
    height = bounds.height;
    width = Math.round(height * aspect);
  }
  width = Math.max(1, Math.min(width, bounds.width));
  height = Math.max(1, Math.min(height, bounds.height));
  return {
    x: Math.floor((bounds.width - width) / 2),
    y: Math.floor((bounds.height - height) / 2),
    width,
    height,
  };
}

/** Rounds to whole pixels and keeps the rectangle inside `bounds`. */
export function clampRect(rect: Rect, bounds: Size, minSize = 1): Rect {
  const width = Math.round(Math.min(Math.max(rect.width, minSize), bounds.width));
  const height = Math.round(Math.min(Math.max(rect.height, minSize), bounds.height));
  const x = Math.round(Math.min(Math.max(rect.x, 0), bounds.width - width));
  const y = Math.round(Math.min(Math.max(rect.y, 0), bounds.height - height));
  return { x, y, width, height };
}

/** Uniformly scales `content` to fit inside `box`, centred. Never distorts. */
export function fitContain(content: Size, box: Size): Rect {
  const scale = Math.min(box.width / content.width, box.height / content.height);
  const width = Math.max(1, Math.round(content.width * scale));
  const height = Math.max(1, Math.round(content.height * scale));
  return { x: Math.round((box.width - width) / 2), y: Math.round((box.height - height) / 2), width, height };
}

export type FitMode = "cover" | "contain";

export interface FixedOutputPlan {
  /** Region of the oriented source to draw. */
  crop: Rect;
  /** Where that region is drawn on the output canvas. */
  placement: Rect;
  output: Size;
  /** Output is larger than the source region (may look soft). */
  upscaled: boolean;
}

/**
 * Plans an exact-size output without stretching.
 * - cover: trims the crop to the target aspect ratio, then scales to fill.
 * - contain: scales the crop to fit and pads the rest with the background colour.
 */
export function planFixedOutput(crop: Rect, output: Size, fit: FitMode): FixedOutputPlan {
  assertValidOutputSize(output);
  if (fit === "cover") {
    const inner = centeredCropForAspect(crop, output.width / output.height);
    const trimmed = { x: crop.x + inner.x, y: crop.y + inner.y, width: inner.width, height: inner.height };
    return {
      crop: trimmed,
      placement: { x: 0, y: 0, ...output },
      output,
      upscaled: output.width > trimmed.width || output.height > trimmed.height,
    };
  }
  const placement = fitContain(crop, output);
  return { crop, placement, output, upscaled: placement.width > crop.width || placement.height > crop.height };
}

/** True when two aspect ratios differ by less than `tolerance` (relative). */
export function aspectMatches(a: Size, b: Size, tolerance = 0.01): boolean {
  const ra = a.width / a.height;
  const rb = b.width / b.height;
  return Math.abs(ra - rb) / rb <= tolerance;
}

/** Scale factor that brings `size` within `maxPixels` (1 if already within). */
export function scaleToFitPixels(size: Size, maxPixels: number): number {
  const pixels = size.width * size.height;
  return pixels <= maxPixels ? 1 : Math.sqrt(maxPixels / pixels);
}
