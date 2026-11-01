import { ProcessingError, detail } from "../errors";

/**
 * Lazily loads PDF.js (rendering only). The worker and its assets are served
 * from this site's own origin (see scripts/copy-pdf-worker.mjs); nothing is
 * fetched from a CDN. PDF scripting is never enabled.
 */
type PdfJs = typeof import("pdfjs-dist");
export type PdfJsDocument = import("pdfjs-dist").PDFDocumentProxy;

let loader: Promise<PdfJs> | null = null;

/** Assets live under a versioned path (see scripts/copy-pdf-worker.mjs) so they can be cached long-term. */
function assetBase(pdfjs: PdfJs): string {
  return `/vendor/pdfjs/${pdfjs.version}`;
}

export function loadPdfJs(): Promise<PdfJs> {
  loader ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = `${assetBase(pdfjs)}/pdf.worker.min.mjs`;
    return pdfjs;
  });
  return loader;
}

export async function openPdfForRendering(bytes: Uint8Array): Promise<PdfJsDocument> {
  const pdfjs = await loadPdfJs();
  const base = assetBase(pdfjs);
  // PDF.js transfers (detaches) the buffer it receives, so give it a copy.
  const task = pdfjs.getDocument({
    data: bytes.slice(),
    standardFontDataUrl: `${base}/standard_fonts/`,
    cMapUrl: `${base}/cmaps/`,
    cMapPacked: true,
    wasmUrl: `${base}/wasm/`,
    stopAtErrors: false,
  });
  try {
    return await task.promise;
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "PasswordException") throw new ProcessingError("pdf-encrypted", undefined, { cause: error });
    if (name === "InvalidPDFException") throw new ProcessingError("pdf-malformed", undefined, { cause: error });
    throw new ProcessingError("pdf-malformed", detail("previewFailed"), { cause: error });
  }
}

/** Renders one page (1-based) to a canvas at the given CSS-pixel width. */
export async function renderPage(
  doc: PdfJsDocument,
  pageNumber: number,
  options: { width?: number; scale?: number; extraRotation?: number } = {},
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  try {
    const rotation = (page.rotate + (options.extraRotation ?? 0)) % 360;
    const base = page.getViewport({ scale: 1, rotation });
    const scale = options.scale ?? (options.width ? options.width / base.width : 1);
    const viewport = page.getViewport({ scale, rotation });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    await page.render({ canvas, viewport, background: "#ffffff" }).promise;
    return canvas;
  } finally {
    page.cleanup();
  }
}

/** Releases the document and its share of the PDF.js worker. */
export async function closePdf(doc: PdfJsDocument): Promise<void> {
  try {
    await doc.loadingTask.destroy();
  } catch {
    // Already destroyed.
  }
}
