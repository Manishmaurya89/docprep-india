import { PDFDocument } from "pdf-lib";
import { ProcessingError, throwIfAborted } from "../errors";
import { closePdf, openPdfForRendering } from "./pdfjs";

/**
 * Strongest PDF compression: renders every page to a JPEG and rebuilds the
 * document. Text stops being selectable/searchable, and links and forms are
 * lost. The UI must explain this before running it. Browser only.
 */
export interface RasterizeOptions {
  dpi: number;
  quality: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) return reject(new ProcessingError("out-of-memory"));
        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      "image/jpeg",
      quality,
    );
  });
}

export async function rasterizePdf(bytes: Uint8Array, options: RasterizeOptions): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const source = await openPdfForRendering(bytes);
  try {
    const output = await PDFDocument.create({ updateMetadata: false });
    const total = source.numPages;
    for (let pageNumber = 1; pageNumber <= total; pageNumber++) {
      throwIfAborted(options.signal);
      const page = await source.getPage(pageNumber);
      const pointsViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: options.dpi / 72 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      await page.render({ canvas, viewport, background: "#ffffff" }).promise;
      const jpeg = await canvasToJpeg(canvas, options.quality);
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
      const image = await output.embedJpg(jpeg);
      const target = output.addPage([pointsViewport.width, pointsViewport.height]);
      target.drawImage(image, { x: 0, y: 0, width: pointsViewport.width, height: pointsViewport.height });
      options.onProgress?.(pageNumber, total);
    }
    const result = await output.save({ useObjectStreams: true });
    return { bytes: result, pageCount: total };
  } finally {
    await closePdf(source);
  }
}
