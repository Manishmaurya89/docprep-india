import { ProcessingError, detail } from "../errors";

/**
 * Where an image goes on a PDF page. Used both to build the PDF and to draw
 * the page previews, so what users arrange is exactly what they get.
 * Units are PDF points (1/72 inch); the origin is the bottom-left corner.
 */
export type PdfPageSize = "a4" | "letter" | "image";
export type PdfOrientation = "auto" | "portrait" | "landscape";

export interface PageLayoutOptions {
  pageSize: PdfPageSize;
  orientation: PdfOrientation;
  /** Margin in points. */
  margin: number;
}

export interface PageLayout {
  pageWidth: number;
  pageHeight: number;
  x: number;
  y: number;
  drawWidth: number;
  drawHeight: number;
}

export const PAGE_SIZES: Record<Exclude<PdfPageSize, "image">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

/** Lays out an upright image of `width` × `height` pixels: fitted, centred, never cropped or stretched. */
export function layoutImagePage(width: number, height: number, options: PageLayoutOptions): PageLayout {
  let pageWidth: number;
  let pageHeight: number;
  if (options.pageSize === "image") {
    // Pixels at 96 per inch → points.
    pageWidth = (width * 72) / 96 + options.margin * 2;
    pageHeight = (height * 72) / 96 + options.margin * 2;
  } else {
    const [w, h] = PAGE_SIZES[options.pageSize];
    const landscape = options.orientation === "landscape" || (options.orientation === "auto" && width > height);
    [pageWidth, pageHeight] = landscape ? [h, w] : [w, h];
  }
  const boxWidth = pageWidth - options.margin * 2;
  const boxHeight = pageHeight - options.margin * 2;
  if (boxWidth <= 0 || boxHeight <= 0) throw new ProcessingError("invalid-option", detail("marginTooLarge"));
  const scale = Math.min(boxWidth / width, boxHeight / height);
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  return { pageWidth, pageHeight, x: (pageWidth - drawWidth) / 2, y: (pageHeight - drawHeight) / 2, drawWidth, drawHeight };
}
