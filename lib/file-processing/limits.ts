/**
 * Processing limits. Browsers hold whole files in memory, so these are set to
 * values a mid-range phone can handle. Changing them here updates every tool
 * and the messages shown to users.
 */
export const LIMITS = {
  /** Largest single image accepted. */
  imageMaxBytes: 40 * 1024 * 1024,
  /** Largest single PDF accepted. */
  pdfMaxBytes: 150 * 1024 * 1024,
  /** Combined size of all PDFs in one merge. */
  pdfBatchMaxBytes: 300 * 1024 * 1024,
  /** Combined size of the images made from one PDF (PDF to JPG/PNG), all held in memory. */
  pdfImagesMaxTotalBytes: 400 * 1024 * 1024,
  /** Maximum number of files in one batch (merge, images to PDF). */
  maxBatchFiles: 50,
  /** Images above this are refused outright (decompression-bomb guard). */
  maxSourcePixels: 120_000_000,
  /**
   * Largest canvas area used for processing. 16,777,216 px (4096²) is the
   * iOS Safari limit; larger sources are decoded at a reduced size.
   */
  maxCanvasPixels: 16_777_216,
  /** Largest output side in pixels. */
  maxOutputSide: 10_000,
} as const;

export type Limits = typeof LIMITS;
