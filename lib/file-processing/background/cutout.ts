import { detectFormat } from "../detect";
import { setImageDpi } from "../dpi";
import { ProcessingError, detail, throwIfAborted } from "../errors";
import { readImageMetadata } from "../image-metadata";
import { decodeImage } from "../image/render";
import { type Box, type Size, mainFace, prominentFaces } from "./framing";
import { coverage, guidedFilter, luminance, maskToRgba, sharpenMask } from "./mask";
import { findFaces, loadFaceDetector, loadSegmenter, personMask } from "./mediapipe";

/**
 * Photo → person cut out from its background, on this device. The result is
 * kept so that changing the colour, shape or zoom only re-draws (instant);
 * the models run once per photo.
 */
export interface Cutout {
  /** The photo, upright, at most ~4 megapixels. */
  source: HTMLCanvasElement;
  /** The photo with the background made transparent. */
  person: HTMLCanvasElement;
  size: Size;
  /** The main face, in `size` pixels; null when none was found. */
  face: Box | null;
  /** People clearly in the photo (faces at least a quarter the size of the main one). */
  faceCount: number;
  /** Share of the photo that is person, 0–1. */
  personShare: number;
}

export type CutoutStage = "loading" | "finding" | "edges";

const SOURCE_MAX_PIXELS = 2048 * 2048;
/** The models and the edge filter work on a copy at most this wide or tall. */
const WORK_MAX_SIDE = 1024;

function canvas(width: number, height: number): HTMLCanvasElement {
  const surface = document.createElement("canvas");
  surface.width = width;
  surface.height = height;
  return surface;
}

function context(surface: HTMLCanvasElement, options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
  const ctx = surface.getContext("2d", options);
  if (!ctx) throw new ProcessingError("out-of-memory", detail("noDrawingSurface"));
  return ctx;
}

/** Draws a camera frame or photo onto a canvas no larger than ~4 megapixels. */
export function frameToCanvas(image: CanvasImageSource & { width?: number; height?: number }, width: number, height: number): HTMLCanvasElement {
  const scale = Math.min(1, Math.sqrt(SOURCE_MAX_PIXELS / (width * height)));
  const out = canvas(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  const ctx = context(out);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, out.width, out.height);
  return out;
}

export async function cutOutPhoto(input: Blob | HTMLCanvasElement, options: { signal?: AbortSignal; onStage?: (stage: CutoutStage) => void } = {}): Promise<Cutout> {
  const { signal, onStage } = options;
  let source: HTMLCanvasElement;
  if (input instanceof Blob) {
    const decoded = await decodeImage(input, { maxPixels: SOURCE_MAX_PIXELS });
    try {
      source = frameToCanvas(decoded.bitmap, decoded.bitmap.width, decoded.bitmap.height);
    } finally {
      decoded.bitmap.close();
    }
  } else {
    source = input;
  }
  throwIfAborted(signal);

  const size = { width: source.width, height: source.height };
  const workScale = Math.min(1, WORK_MAX_SIDE / Math.max(size.width, size.height));
  const work = canvas(Math.max(1, Math.round(size.width * workScale)), Math.max(1, Math.round(size.height * workScale)));
  const workCtx = context(work, { willReadFrequently: true });
  workCtx.imageSmoothingQuality = "high";
  workCtx.drawImage(source, 0, 0, work.width, work.height);
  const pixels = workCtx.getImageData(0, 0, work.width, work.height);

  onStage?.("loading");
  const [segmenter, detector] = await Promise.all([loadSegmenter("IMAGE"), loadFaceDetector("IMAGE")]);
  throwIfAborted(signal);

  onStage?.("finding");
  const raw = personMask(segmenter, work, work.width, work.height);
  const faces = prominentFaces(findFaces(detector, work));
  const face = mainFace(faces);
  throwIfAborted(signal);

  onStage?.("edges");
  // Let the browser paint the progress message before the CPU-heavy filter.
  await new Promise((resolve) => setTimeout(resolve, 0));
  const radius = Math.max(2, Math.round(Math.max(work.width, work.height) / 160));
  // Below 0.3 is haze the model was unsure about (left-over background); above 0.85 is certainly the person.
  const refined = sharpenMask(guidedFilter(luminance(pixels.data), raw, work.width, work.height, radius, 1e-3), 0.3, 0.85);
  throwIfAborted(signal);

  const alpha = canvas(work.width, work.height);
  const alphaPixels = new ImageData(work.width, work.height);
  maskToRgba(refined, alphaPixels.data);
  context(alpha).putImageData(alphaPixels, 0, 0);

  const person = canvas(size.width, size.height);
  const personCtx = context(person);
  personCtx.drawImage(source, 0, 0);
  personCtx.globalCompositeOperation = "destination-in";
  personCtx.imageSmoothingEnabled = true;
  personCtx.imageSmoothingQuality = "high";
  personCtx.drawImage(alpha, 0, 0, size.width, size.height);
  alpha.width = 0;
  work.width = 0;

  const toSource = (box: Box): Box => ({ x: box.x / workScale, y: box.y / workScale, width: box.width / workScale, height: box.height / workScale });
  return { source, person, size, face: face ? toSource(face) : null, faceCount: faces.length, personShare: coverage(refined) };
}

/** Draws the cut-out person over a solid colour, cropped to `crop` (image pixels, may extend past the photo) at `output` size. */
export function renderPortrait(cutout: Cutout, color: string, crop: Box, output: Size): HTMLCanvasElement {
  const out = canvas(output.width, output.height);
  const ctx = context(out);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, out.width, out.height);
  const sx = output.width / crop.width;
  const sy = output.height / crop.height;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.setTransform(sx, 0, 0, sy, -crop.x * sx, -crop.y * sy);
  ctx.drawImage(cutout.person, 0, 0);
  return out;
}

/** JPEG bytes of a rendered portrait, checked by reading them back, with the DPI recorded when given. */
export async function encodePortrait(surface: HTMLCanvasElement, dpi?: number): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => surface.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new ProcessingError("out-of-memory", detail("encodeOutOfMemory"));
  let bytes: Uint8Array = new Uint8Array(await blob.arrayBuffer());
  const meta = readImageMetadata(bytes);
  if (detectFormat(bytes) !== "jpeg" || meta?.width !== surface.width || meta.height !== surface.height) {
    throw new ProcessingError("encode-unsupported", detail("outputUnverifiable"));
  }
  if (dpi) bytes = setImageDpi(bytes, dpi);
  return bytes;
}
