import { ProcessingError, detail } from "../errors";

/**
 * Abstracts the two canvas implementations so the same rendering code runs in
 * a Web Worker (OffscreenCanvas) and on the main thread (HTMLCanvasElement).
 */
export type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
export type AnyContext2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export interface CanvasBackend {
  readonly name: "offscreen" | "dom";
  create(width: number, height: number): AnyCanvas;
  toBlob(canvas: AnyCanvas, type: string, quality?: number): Promise<Blob>;
}

export function context2d(canvas: AnyCanvas, options?: CanvasRenderingContext2DSettings): AnyContext2D {
  const ctx = canvas.getContext("2d", options) as AnyContext2D | null;
  if (!ctx) {
    throw new ProcessingError("out-of-memory", detail("noDrawingSurface"));
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

function checkBlob(blob: Blob | null, type: string): Blob {
  if (!blob || blob.size === 0) {
    throw new ProcessingError("out-of-memory", detail("encodeOutOfMemory"));
  }
  if (blob.type !== type) {
    // Browsers silently fall back to PNG for formats they cannot encode (e.g. WebP on older Safari).
    throw new ProcessingError("encode-unsupported");
  }
  return blob;
}

/** Releases canvas backing memory early instead of waiting for garbage collection. */
export function releaseCanvas(canvas: AnyCanvas): void {
  canvas.width = 0;
  canvas.height = 0;
}

export const offscreenBackend: CanvasBackend = {
  name: "offscreen",
  create(width, height) {
    return new OffscreenCanvas(width, height);
  },
  async toBlob(canvas, type, quality) {
    const blob = await (canvas as OffscreenCanvas).convertToBlob({ type, quality });
    return checkBlob(blob, type);
  },
};

export const domBackend: CanvasBackend = {
  name: "dom",
  create(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  },
  toBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      try {
        (canvas as HTMLCanvasElement).toBlob(
          (blob) => {
            try {
              resolve(checkBlob(blob, type));
            } catch (error) {
              reject(error);
            }
          },
          type,
          quality,
        );
      } catch (error) {
        reject(error);
      }
    });
  },
};

export function supportsOffscreenWorker(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof OffscreenCanvas.prototype.convertToBlob === "function" &&
    typeof createImageBitmap === "function"
  );
}
