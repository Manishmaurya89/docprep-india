import type { ImageFormat } from "../detect";
import { MIME_TYPES } from "../detect";
import { ProcessingError, throwIfAborted } from "../errors";
import { readImageMetadata, orientedSize } from "../image-metadata";
import { LIMITS } from "../limits";
import { type CanvasBackend, type AnyCanvas, type AnyContext2D, context2d, releaseCanvas } from "./canvas-backend";
import { type Rect, type Rotation, type Size, assertValidOutputSize, clampRect, rotatedSize, scaleToFitPixels } from "./geometry";

export interface ImageAdjustments {
  grayscale?: boolean;
  /** -100 … 100 */
  brightness?: number;
  /** -100 … 100 */
  contrast?: number;
}

/**
 * A complete description of how to turn a source image into an output canvas.
 * Coordinates are in the pixel space of the source *after* EXIF orientation,
 * user rotation and flips — i.e. what the user sees in the preview.
 */
export interface ImageTransform {
  rotation: Rotation;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  crop?: Rect;
  output: Size;
  /** Where the crop is drawn on the output. Defaults to the whole output. */
  placement?: Rect;
  /** CSS colour drawn behind the image. JPEG output always gets one (default white). */
  background?: string | null;
  adjustments?: ImageAdjustments;
}

export interface DecodedImage {
  bitmap: ImageBitmap;
  /** Size after EXIF orientation at full resolution. */
  fullSize: Size;
  /** decoded size ÷ full size (< 1 when a huge image was decoded smaller). */
  decodeScale: number;
  hasAlpha: boolean;
}

/**
 * Decodes at a reduced size. Browsers disagree on whether resize dimensions
 * apply before or after EXIF orientation, so if the aspect ratio comes out
 * swapped the image is decoded again with swapped dimensions.
 */
export async function createScaledBitmap(
  blob: Blob,
  size: Size,
  imageOrientation: ImageOrientation = "from-image",
  resizeQuality: ResizeQuality = "high",
): Promise<ImageBitmap> {
  const width = Math.max(1, Math.round(size.width));
  const height = Math.max(1, Math.round(size.height));
  let bitmap = await createImageBitmap(blob, { imageOrientation, resizeWidth: width, resizeHeight: height, resizeQuality });
  const expected = width / height;
  if (width !== height && Math.abs(bitmap.width / bitmap.height - expected) / expected > 0.02) {
    bitmap.close();
    bitmap = await createImageBitmap(blob, { imageOrientation, resizeWidth: height, resizeHeight: width, resizeQuality });
  }
  return bitmap;
}

export async function decodeImage(
  blob: Blob,
  options: { maxPixels?: number; respectOrientation?: boolean } = {},
): Promise<DecodedImage> {
  const maxPixels = options.maxPixels ?? LIMITS.maxCanvasPixels;
  const imageOrientation = options.respectOrientation === false ? "none" : "from-image";
  const header = new Uint8Array(await blob.slice(0, 512 * 1024).arrayBuffer());
  const meta = readImageMetadata(header);
  const known = meta ? (imageOrientation === "none" ? meta : orientedSize(meta)) : null;

  if (known && known.width * known.height > LIMITS.maxSourcePixels) {
    throw new ProcessingError("too-many-pixels");
  }

  const scale = known ? scaleToFitPixels(known, maxPixels) : 1;
  let bitmap: ImageBitmap;
  try {
    bitmap =
      scale < 1 && known
        ? await createScaledBitmap(blob, { width: Math.floor(known.width * scale), height: Math.floor(known.height * scale) }, imageOrientation)
        : await createImageBitmap(blob, { imageOrientation });
  } catch (error) {
    throw new ProcessingError("corrupted", undefined, { cause: error });
  }

  const fullSize = known ?? { width: bitmap.width, height: bitmap.height };
  if (!known && bitmap.width * bitmap.height > maxPixels) {
    bitmap.close();
    throw new ProcessingError("too-many-pixels");
  }
  return {
    bitmap,
    fullSize,
    decodeScale: bitmap.width / fullSize.width,
    hasAlpha: meta?.hasAlpha ?? true,
  };
}

/** Applies rotation/flip so that drawing `bitmap` at (0,0) lands in oriented space. */
export function applyOrientation(ctx: AnyContext2D, source: Size, transform: Pick<ImageTransform, "rotation" | "flipHorizontal" | "flipVertical">): void {
  const oriented = rotatedSize(source, transform.rotation);
  if (transform.flipHorizontal) {
    ctx.translate(oriented.width, 0);
    ctx.scale(-1, 1);
  }
  if (transform.flipVertical) {
    ctx.translate(0, oriented.height);
    ctx.scale(1, -1);
  }
  switch (transform.rotation) {
    case 90:
      ctx.translate(source.height, 0);
      ctx.rotate(Math.PI / 2);
      break;
    case 180:
      ctx.translate(source.width, source.height);
      ctx.rotate(Math.PI);
      break;
    case 270:
      ctx.translate(0, source.width);
      ctx.rotate(-Math.PI / 2);
      break;
  }
}

function drawRegion(ctx: AnyContext2D, bitmap: ImageBitmap, transform: ImageTransform, crop: Rect, dest: Rect): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(dest.x, dest.y, dest.width, dest.height);
  ctx.clip();
  ctx.translate(dest.x, dest.y);
  ctx.scale(dest.width / crop.width, dest.height / crop.height);
  ctx.translate(-crop.x, -crop.y);
  applyOrientation(ctx, { width: bitmap.width, height: bitmap.height }, transform);
  ctx.drawImage(bitmap, 0, 0);
  ctx.restore();
}

function clampByte(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

export function applyAdjustments(ctx: AnyContext2D, area: Rect, adjustments: ImageAdjustments): void {
  const { grayscale = false, brightness = 0, contrast = 0 } = adjustments;
  if (!grayscale && brightness === 0 && contrast === 0) return;
  const image = ctx.getImageData(area.x, area.y, area.width, area.height);
  const data = image.data;
  const offset = brightness * 2.55;
  const c = contrast * 2.55;
  const factor = (259 * (c + 255)) / (255 * (259 - c));
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]!;
    let g = data[i + 1]!;
    let b = data[i + 2]!;
    if (grayscale) r = g = b = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = clampByte(factor * (r + offset - 128) + 128);
    data[i + 1] = clampByte(factor * (g + offset - 128) + 128);
    data[i + 2] = clampByte(factor * (b + offset - 128) + 128);
  }
  ctx.putImageData(image, area.x, area.y);
}

export function effectiveBackground(transform: ImageTransform, format: ImageFormat): string | null {
  if (transform.background) return transform.background;
  return format === "jpeg" ? "#ffffff" : null;
}

/**
 * Draws the transformed image onto a new canvas. Large reductions are done in
 * halving steps, which avoids the aliasing a single big downscale produces.
 */
export function renderToCanvas(
  decoded: DecodedImage,
  transform: ImageTransform,
  format: ImageFormat,
  backend: CanvasBackend,
  signal?: AbortSignal,
): AnyCanvas {
  assertValidOutputSize(transform.output);
  const { bitmap, decodeScale } = decoded;
  const orientedFull = rotatedSize(decoded.fullSize, transform.rotation);
  const fullCrop = clampRect(transform.crop ?? { x: 0, y: 0, ...orientedFull }, orientedFull);
  // Map crop from full-resolution coordinates to decoded-bitmap coordinates.
  const crop: Rect = {
    x: fullCrop.x * decodeScale,
    y: fullCrop.y * decodeScale,
    width: Math.max(1, fullCrop.width * decodeScale),
    height: Math.max(1, fullCrop.height * decodeScale),
  };
  const placement = transform.placement ?? { x: 0, y: 0, ...transform.output };

  const canvas = backend.create(transform.output.width, transform.output.height);
  const ctx = context2d(canvas);
  const background = effectiveBackground(transform, format);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const scale = placement.width / crop.width;
  if (scale >= 0.5) {
    drawRegion(ctx, bitmap, transform, crop, placement);
  } else {
    let stage = backend.create(Math.round(crop.width), Math.round(crop.height));
    drawRegion(context2d(stage), bitmap, transform, crop, { x: 0, y: 0, width: stage.width, height: stage.height });
    while (stage.width / 2 >= placement.width && stage.height / 2 >= placement.height) {
      throwIfAborted(signal);
      const next = backend.create(Math.ceil(stage.width / 2), Math.ceil(stage.height / 2));
      context2d(next).drawImage(stage, 0, 0, next.width, next.height);
      releaseCanvas(stage);
      stage = next;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(placement.x, placement.y, placement.width, placement.height);
    ctx.clip();
    ctx.drawImage(stage, placement.x, placement.y, placement.width, placement.height);
    ctx.restore();
    releaseCanvas(stage);
  }

  if (transform.adjustments) applyAdjustments(ctx, placement, transform.adjustments);
  return canvas;
}

export async function encodeCanvas(
  canvas: AnyCanvas,
  format: ImageFormat,
  quality: number | undefined,
  backend: CanvasBackend,
): Promise<Blob> {
  return backend.toBlob(canvas, MIME_TYPES[format], format === "png" ? undefined : quality);
}

/** Scales a transform's output and placement uniformly (used when reducing dimensions). */
export function scaleTransform(transform: ImageTransform, scale: number): ImageTransform {
  if (scale === 1) return transform;
  const output = {
    width: Math.max(1, Math.round(transform.output.width * scale)),
    height: Math.max(1, Math.round(transform.output.height * scale)),
  };
  const placement = transform.placement
    ? {
        x: Math.round(transform.placement.x * scale),
        y: Math.round(transform.placement.y * scale),
        width: Math.max(1, Math.round(transform.placement.width * scale)),
        height: Math.max(1, Math.round(transform.placement.height * scale)),
      }
    : undefined;
  return { ...transform, output, placement };
}
