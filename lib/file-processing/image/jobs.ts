import { type ImageFormat, MIME_TYPES, detectFormat } from "../detect";
import { ProcessingError, detail, throwIfAborted } from "../errors";
import { readImageMetadata } from "../image-metadata";
import type { CanvasBackend, AnyCanvas } from "./canvas-backend";
import { context2d, releaseCanvas } from "./canvas-backend";
import { type SearchStatus, searchForTargetSize, type SizeTarget } from "./quality-search";
import { decodeImage, encodeCanvas, renderToCanvas, scaleTransform, type ImageTransform } from "./render";

export type ImageJob =
  | {
      kind: "transform";
      transform: ImageTransform;
      format: ImageFormat;
      /** 0–1, ignored for PNG. */
      quality?: number;
    }
  | {
      kind: "target-size";
      transform: ImageTransform;
      format: ImageFormat;
      target: SizeTarget;
      allowResize: boolean;
      /** Smallest dimension scale the search may use (keeps minimum pixel sizes). */
      minScale?: number;
      minQuality?: number;
      maxQuality?: number;
    };

export type ImageWarning =
  | { code: "transparency-flattened"; background: string }
  | { code: "decoded-at-reduced-size"; scale: number }
  | { code: "upscaled" };

export interface ImageJobResult {
  blob: Blob;
  format: ImageFormat;
  /** Measured from the output bytes. */
  width: number;
  height: number;
  size: number;
  quality?: number;
  /** Dimension scale applied by target-size search (1 = none). */
  scale: number;
  status?: SearchStatus;
  attempts?: number;
  warnings: ImageWarning[];
}

export interface JobProgress {
  /** Number of encodes performed so far (target-size search). */
  attempts: number;
  lastSize: number;
}

/**
 * Re-reads the encoded bytes and confirms they are the requested format and
 * size. Results are only reported from this verification, never from inputs.
 */
export async function verifyImageOutput(blob: Blob, format: ImageFormat): Promise<{ width: number; height: number }> {
  const header = new Uint8Array(await blob.slice(0, 256 * 1024).arrayBuffer());
  const detected = detectFormat(header);
  if (detected !== format) throw new ProcessingError("encode-unsupported");
  const meta = readImageMetadata(header);
  if (!meta) throw new ProcessingError("unknown", detail("outputUnverifiable"));
  return { width: meta.width, height: meta.height };
}

export async function runImageJob(
  source: Blob,
  job: ImageJob,
  backend: CanvasBackend,
  options: { signal?: AbortSignal; onProgress?: (progress: JobProgress) => void } = {},
): Promise<ImageJobResult> {
  const { signal, onProgress } = options;
  throwIfAborted(signal);
  const decoded = await decodeImage(source);
  const warnings: ImageWarning[] = [];
  if (decoded.decodeScale < 1) warnings.push({ code: "decoded-at-reduced-size", scale: decoded.decodeScale });
  if (job.format === "jpeg" && decoded.hasAlpha && !job.transform.background) {
    warnings.push({ code: "transparency-flattened", background: "#ffffff" });
  }

  const canvases = new Map<number, AnyCanvas>();
  const canvasAt = (scale: number) => {
    let canvas = canvases.get(scale);
    if (!canvas) {
      canvas = renderToCanvas(decoded, scaleTransform(job.transform, scale), job.format, backend, signal);
      canvases.set(scale, canvas);
    }
    return canvas;
  };

  try {
    if (job.kind === "transform") {
      const blob = await encodeCanvas(canvasAt(1), job.format, job.quality, backend);
      throwIfAborted(signal);
      const measured = await verifyImageOutput(blob, job.format);
      return { blob, format: job.format, ...measured, size: blob.size, quality: job.quality, scale: 1, warnings };
    }

    const search = await searchForTargetSize<Blob>(
      async (quality, scale) => {
        const blob = await encodeCanvas(canvasAt(scale), job.format, quality, backend);
        return { size: blob.size, data: blob };
      },
      {
        target: job.target,
        lossless: job.format === "png",
        allowResize: job.allowResize,
        minScale: job.minScale,
        minQuality: job.minQuality,
        maxQuality: job.maxQuality,
        signal,
        onAttempt: (attempt, index) => onProgress?.({ attempts: index, lastSize: attempt.size }),
      },
    );
    const blob = search.best.data;
    const measured = await verifyImageOutput(blob, job.format);
    return {
      blob,
      format: job.format,
      ...measured,
      size: blob.size,
      quality: job.format === "png" ? undefined : search.best.quality,
      scale: search.best.scale,
      status: search.status,
      attempts: search.attempts,
      warnings,
    };
  } finally {
    for (const canvas of canvases.values()) releaseCanvas(canvas);
    decoded.bitmap.close();
  }
}

export interface ReencodeJpegRequest {
  bytes: Uint8Array;
  /** Dimensions declared in the PDF image dictionary; decoding must match. */
  width: number;
  height: number;
  quality: number;
  /** Longest side after re-encoding; larger images are scaled down. */
  maxDimension?: number;
}

export interface ReencodeJpegResult {
  bytes: Uint8Array;
  width: number;
  height: number;
}

/**
 * Re-encodes a JPEG embedded in a PDF. Returns null (leave the original
 * stream untouched) when the image cannot be re-encoded faithfully.
 */
export async function reencodeJpeg(
  request: ReencodeJpegRequest,
  backend: CanvasBackend,
): Promise<ReencodeJpegResult | null> {
  // Browsers now apply EXIF orientation even with imageOrientation: "none", but PDF
  // viewers ignore it. Re-encoding such an image would rotate or flip it in the PDF.
  const orientation = readImageMetadata(request.bytes.subarray(0, 128 * 1024))?.orientation;
  if (orientation !== undefined && orientation !== 1) return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([request.bytes as BlobPart], { type: MIME_TYPES.jpeg }), {
      imageOrientation: "none",
    });
  } catch {
    return null;
  }
  try {
    if (bitmap.width !== request.width || bitmap.height !== request.height) return null;
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = request.maxDimension && longest > request.maxDimension ? request.maxDimension / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = backend.create(width, height);
    const ctx = context2d(canvas);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await backend.toBlob(canvas, MIME_TYPES.jpeg, request.quality);
    releaseCanvas(canvas);
    return { bytes: new Uint8Array(await blob.arrayBuffer()), width, height };
  } finally {
    bitmap.close();
  }
}
