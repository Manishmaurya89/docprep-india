import { detectFormat } from "../detect";
import { setImageDpi } from "../dpi";
import { ProcessingError, detail, throwIfAborted } from "../errors";
import { readImageMetadata } from "../image-metadata";
import { type SearchStatus, searchForTargetSize } from "../image/quality-search";
import { LIMITS } from "../limits";
import type { PdfJsDocument } from "./pdfjs";

/**
 * PDF pages → JPEG or PNG images, rendered with PDF.js in this browser.
 * Works on any PDF PDF.js can open, including password-protected ones once
 * the document has been opened with its password.
 */
export type PageImageFormat = "jpeg" | "png";

export interface RenderSize {
  width: number;
  height: number;
  /** Factor from PDF points to pixels. */
  scale: number;
  /** Resolution actually used (lower than requested when `limited`). */
  dpi: number;
  /** True when the page was too large for the requested DPI and was rendered smaller. */
  limited: boolean;
}

/**
 * Pixel size for rendering a page of `widthPt` × `heightPt` PDF points at
 * `dpi`, reduced uniformly when it would exceed what a browser canvas can hold.
 */
export function pageRenderSize(
  widthPt: number,
  heightPt: number,
  dpi: number,
  limits: { maxPixels: number; maxSide: number } = { maxPixels: LIMITS.maxCanvasPixels, maxSide: LIMITS.maxOutputSide },
): RenderSize {
  if (!(widthPt > 0 && heightPt > 0 && dpi > 0)) throw new ProcessingError("invalid-option");
  let scale = dpi / 72;
  let limited = false;
  const area = widthPt * scale * heightPt * scale;
  if (area > limits.maxPixels) {
    scale *= Math.sqrt(limits.maxPixels / area);
    limited = true;
  }
  const side = Math.max(widthPt, heightPt) * scale;
  if (side > limits.maxSide) {
    scale *= limits.maxSide / side;
    limited = true;
  }
  // Rounding gives the usual sizes (A4 at 300 DPI = 2480 × 3508); when limited, round down to stay within the limit.
  const fit = limited ? Math.floor : Math.round;
  return {
    width: Math.max(1, fit(widthPt * scale)),
    height: Math.max(1, fit(heightPt * scale)),
    scale,
    dpi: limited ? Math.floor(scale * 72) : dpi,
    limited,
  };
}

/** "Aadhaar.pdf", page 3 of 12 → "Aadhaar-page-03.jpg"; a one-page PDF → "Aadhaar.jpg". */
export function pageImageName(base: string, pageNumber: number, pageCount: number, format: PageImageFormat): string {
  const extension = format === "jpeg" ? "jpg" : "png";
  if (pageCount === 1) return `${base}.${extension}`;
  return `${base}-page-${String(pageNumber).padStart(String(pageCount).length, "0")}.${extension}`;
}

export interface PdfToImagesOptions {
  /** 1-based page numbers, in the order to produce them. */
  pages: number[];
  format: PageImageFormat;
  dpi: number;
  /** JPEG quality 0–1 when no size limit is set. */
  quality?: number;
  /** Optional maximum size of each image in bytes (JPEG only). */
  maxBytes?: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

export interface PageImage {
  pageNumber: number;
  bytes: Uint8Array;
  format: PageImageFormat;
  width: number;
  height: number;
  /** Resolution recorded in the file (pixels per inch of the original page). */
  dpi: number;
  /** Rendered below the requested DPI because the page is very large. */
  limited: boolean;
  /** Outcome of the size limit, when one was set. */
  target?: SearchStatus;
}

const MIME: Record<PageImageFormat, string> = { jpeg: "image/jpeg", png: "image/png" };
const DEFAULT_JPEG_QUALITY = 0.92;

function encode(canvas: HTMLCanvasElement, format: PageImageFormat, quality: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) return reject(new ProcessingError("out-of-memory", detail("encodeOutOfMemory")));
        try {
          resolve(new Uint8Array(await blob.arrayBuffer()));
        } catch (error) {
          reject(error);
        }
      },
      MIME[format],
      format === "jpeg" ? quality : undefined,
    );
  });
}

function scaledCopy(source: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new ProcessingError("out-of-memory", detail("noDrawingSurface"));
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function release(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

/** Re-reads the produced bytes so the result reports what the file really is. */
function verify(bytes: Uint8Array, format: PageImageFormat, width: number, height: number) {
  const meta = readImageMetadata(bytes);
  if (detectFormat(bytes) !== format || !meta || meta.width !== width || meta.height !== height) {
    throw new ProcessingError("encode-unsupported", detail("outputUnverifiable"));
  }
}

/** Renders the chosen pages of an open document to images. Browser only. */
export async function pdfToImages(doc: PdfJsDocument, options: PdfToImagesOptions): Promise<PageImage[]> {
  const { pages, format, dpi, signal } = options;
  if (pages.length === 0) throw new ProcessingError("page-range", detail("selectOnePage"));
  for (const pageNumber of pages) {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > doc.numPages) {
      throw new ProcessingError("page-range", detail("pageMissingOfCount", { page: pageNumber, count: doc.numPages }));
    }
  }
  const results: PageImage[] = [];
  let totalBytes = 0;
  for (const [index, pageNumber] of pages.entries()) {
    throwIfAborted(signal);
    const page = await doc.getPage(pageNumber);
    let canvas: HTMLCanvasElement | null = null;
    try {
      // The page's own /Rotate is applied, so the image is the right way up.
      const points = page.getViewport({ scale: 1 });
      const size = pageRenderSize(points.width, points.height, dpi);
      const viewport = page.getViewport({ scale: size.scale });
      canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      await page.render({ canvas, viewport, background: "#ffffff" }).promise;
      throwIfAborted(signal);

      let bytes: Uint8Array;
      let width = size.width;
      let height = size.height;
      let target: SearchStatus | undefined;
      if (format === "jpeg" && options.maxBytes) {
        const source = canvas;
        const search = await searchForTargetSize(
          async (quality, scale) => {
            const surface = scale === 1 ? source : scaledCopy(source, scale);
            try {
              const data = await encode(surface, "jpeg", quality);
              return { size: data.length, data: { data, width: surface.width, height: surface.height } };
            } finally {
              if (surface !== source) release(surface);
            }
          },
          // Text gets hard to read below ~50% JPEG quality; reduce pixels instead.
          { target: { maxBytes: options.maxBytes }, minQuality: 0.5, maxQuality: DEFAULT_JPEG_QUALITY, allowResize: true, minScale: 0.2, signal },
        );
        ({ data: bytes, width, height } = search.best.data);
        target = search.status;
      } else {
        bytes = await encode(canvas, format, options.quality ?? DEFAULT_JPEG_QUALITY);
      }
      verify(bytes, format, width, height);
      // Pixels per inch of the original page, so the image prints at the page's size.
      const recordedDpi = Math.max(1, Math.round((size.dpi * width) / size.width));
      bytes = setImageDpi(bytes, recordedDpi);

      totalBytes += bytes.length;
      if (totalBytes > LIMITS.pdfImagesMaxTotalBytes) {
        throw new ProcessingError("out-of-memory", detail("pageImagesTooLarge"));
      }
      results.push({ pageNumber, bytes, format, width, height, dpi: recordedDpi, limited: size.limited, target });
      options.onProgress?.(index + 1, pages.length);
    } finally {
      if (canvas) release(canvas);
      page.cleanup();
    }
  }
  return results;
}
