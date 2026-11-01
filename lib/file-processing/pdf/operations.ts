import { PDFDocument, degrees } from "pdf-lib";
import { detectFormat } from "../detect";
import { ProcessingError, detail, throwIfAborted, toProcessingError } from "../errors";
import { LIMITS } from "../limits";
import { declaresEncryption } from "./encryption";
import { type PageLayoutOptions, layoutImagePage } from "./page-layout";
import { type PageRange, formatRange, rangePageCount } from "./page-ranges";

/**
 * PDF operations built on pdf-lib. All functions take and return bytes so they
 * run identically in the browser and in Node unit tests. Every output is
 * re-parsed and its page count checked before it is returned.
 */

export interface PdfOutput {
  bytes: Uint8Array;
  pageCount: number;
}

export type PageRotation = 0 | 90 | 180 | 270;

const SAVE_OPTIONS = { useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false } as const;

/** `name` is the file name shown in messages; without it they say "This file". */
export function assertPdfBytes(bytes: Uint8Array, name?: string): void {
  if (bytes.length === 0) throw new ProcessingError("corrupted", detail("pdfBytesEmpty", { name }));
  if (bytes.length > LIMITS.pdfMaxBytes) throw new ProcessingError("file-too-large");
  if (detectFormat(bytes.subarray(0, 1024)) !== "pdf") {
    throw new ProcessingError("unsupported-format", detail("notAPdf", { name }), { hint: detail("hintNoPdfHeader") });
  }
}

export async function loadPdf(bytes: Uint8Array, name?: string): Promise<PDFDocument> {
  assertPdfBytes(bytes, name);
  if (declaresEncryption(bytes)) {
    throw new ProcessingError("pdf-encrypted", detail("pdfLocked", { name }));
  }
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: false });
  } catch (error) {
    const mapped = toProcessingError(error);
    if (mapped.code === "pdf-encrypted" || mapped.code === "out-of-memory") throw mapped;
    throw new ProcessingError("pdf-malformed", detail("pdfUnreadable", { name }), { cause: error });
  }
  let count: number;
  try {
    count = doc.getPageCount();
  } catch (error) {
    throw new ProcessingError("pdf-malformed", detail("pdfDamagedPages", { name }), { cause: error });
  }
  if (count === 0) throw new ProcessingError("pdf-malformed", detail("pdfNoPages", { name }));
  return doc;
}

export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  return (await loadPdf(bytes)).getPageCount();
}

async function saveVerified(doc: PDFDocument, expectedPages: number): Promise<PdfOutput> {
  if (expectedPages === 0) throw new ProcessingError("pdf-empty");
  const bytes = await doc.save(SAVE_OPTIONS);
  const check = await PDFDocument.load(bytes, { updateMetadata: false });
  const pageCount = check.getPageCount();
  if (pageCount !== expectedPages) {
    throw new ProcessingError("unknown", detail("outputPageMismatch", { actual: pageCount, expected: expectedPages }));
  }
  return { bytes, pageCount };
}

function newDocument(): Promise<PDFDocument> {
  // updateMetadata:false avoids stamping creation dates or a producer string.
  return PDFDocument.create({ updateMetadata: false });
}

export interface ProgressOptions {
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

export async function mergePdfs(
  inputs: { name: string; bytes: Uint8Array }[],
  options: ProgressOptions = {},
): Promise<PdfOutput> {
  if (inputs.length < 2) throw new ProcessingError("no-file", detail("mergeNeedsTwo"));
  if (inputs.length > LIMITS.maxBatchFiles) throw new ProcessingError("too-many-files");
  const total = inputs.reduce((sum, input) => sum + input.bytes.length, 0);
  if (total > LIMITS.pdfBatchMaxBytes) {
    throw new ProcessingError("file-too-large", detail("mergeTooLarge"));
  }
  const output = await newDocument();
  let pages = 0;
  for (let i = 0; i < inputs.length; i++) {
    throwIfAborted(options.signal);
    const input = inputs[i]!;
    const source = await loadPdf(input.bytes, input.name);
    const copied = await output.copyPages(source, source.getPageIndices());
    for (const page of copied) output.addPage(page);
    pages += copied.length;
    options.onProgress?.(i + 1, inputs.length);
  }
  return saveVerified(output, pages);
}

export async function extractPages(bytes: Uint8Array, indices: number[]): Promise<PdfOutput> {
  const source = await loadPdf(bytes);
  const count = source.getPageCount();
  if (indices.length === 0) throw new ProcessingError("pdf-empty", detail("selectOnePage"));
  for (const index of indices) {
    if (!Number.isInteger(index) || index < 0 || index >= count) {
      throw new ProcessingError("page-range", detail("pageMissingOfCount", { page: index + 1, count }));
    }
  }
  const output = await newDocument();
  const copied = await output.copyPages(source, indices);
  for (const page of copied) output.addPage(page);
  return saveVerified(output, indices.length);
}

export interface SplitPart extends PdfOutput {
  range: PageRange;
  label: string;
}

export async function splitPdf(bytes: Uint8Array, ranges: PageRange[], options: ProgressOptions = {}): Promise<SplitPart[]> {
  const source = await loadPdf(bytes);
  const count = source.getPageCount();
  if (ranges.length === 0) throw new ProcessingError("page-range", detail("enterOneRange"));
  if (ranges.length > 500) throw new ProcessingError("too-many-files", detail("tooManyParts"));
  const parts: SplitPart[] = [];
  for (let i = 0; i < ranges.length; i++) {
    throwIfAborted(options.signal);
    const range = ranges[i]!;
    if (range.start < 1 || range.end > count || range.start > range.end) {
      throw new ProcessingError("page-range", detail("rangeOutside", { range: formatRange(range), count }));
    }
    const output = await newDocument();
    const indices = Array.from({ length: rangePageCount(range) }, (_, k) => range.start - 1 + k);
    const copied = await output.copyPages(source, indices);
    for (const page of copied) output.addPage(page);
    parts.push({ ...(await saveVerified(output, indices.length)), range, label: formatRange(range) });
    options.onProgress?.(i + 1, ranges.length);
  }
  return parts;
}

export interface OrganizedPage {
  /** 0-based index in the source document. */
  sourceIndex: number;
  /** Additional clockwise rotation applied on top of the page's existing rotation. */
  rotation: PageRotation;
}

/** Reorders, rotates and drops pages. Pages not listed are deleted. */
export async function organizePdf(bytes: Uint8Array, pages: OrganizedPage[]): Promise<PdfOutput> {
  if (pages.length === 0) throw new ProcessingError("pdf-empty", detail("removedEveryPage"));
  const source = await loadPdf(bytes);
  const count = source.getPageCount();
  for (const { sourceIndex } of pages) {
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= count) {
      throw new ProcessingError("page-range", detail("pageMissing", { page: sourceIndex + 1 }));
    }
  }
  const output = await newDocument();
  const copied = await output.copyPages(
    source,
    pages.map((page) => page.sourceIndex),
  );
  copied.forEach((page, i) => {
    const extra = pages[i]!.rotation;
    if (extra !== 0) page.setRotation(degrees((page.getRotation().angle + extra) % 360));
    output.addPage(page);
  });
  return saveVerified(output, pages.length);
}

export interface PdfImageInput {
  bytes: Uint8Array;
  format: "jpeg" | "png";
  /** Pixel size (upright). */
  width: number;
  height: number;
}

export type { PdfOrientation, PdfPageSize } from "./page-layout";

export interface ImagesToPdfOptions extends ProgressOptions, PageLayoutOptions {}

/** Images must already be upright JPEG or PNG (the UI normalises EXIF rotation and WebP). */
export async function imagesToPdf(images: PdfImageInput[], options: ImagesToPdfOptions): Promise<PdfOutput> {
  if (images.length === 0) throw new ProcessingError("no-file", detail("addOneImage"));
  if (images.length > LIMITS.maxBatchFiles) throw new ProcessingError("too-many-files");
  const output = await newDocument();
  for (let i = 0; i < images.length; i++) {
    throwIfAborted(options.signal);
    const image = images[i]!;
    const embedded =
      image.format === "jpeg" ? await output.embedJpg(image.bytes) : await output.embedPng(image.bytes);
    const layout = layoutImagePage(image.width, image.height, options);
    const page = output.addPage([layout.pageWidth, layout.pageHeight]);
    page.drawImage(embedded, { x: layout.x, y: layout.y, width: layout.drawWidth, height: layout.drawHeight });
    options.onProgress?.(i + 1, images.length);
  }
  return saveVerified(output, images.length);
}

const A4_POINTS: [number, number] = [595.28, 841.89];

/**
 * Places every page, scaled to fit and centred, on an A4 page of matching
 * orientation. Pages are embedded as vector content, so text stays sharp.
 * Page rotation is applied so the result displays the same way.
 */
export async function fitPagesToA4(bytes: Uint8Array, margin = 0): Promise<PdfOutput> {
  const source = await loadPdf(bytes);
  const output = await newDocument();
  const pages = source.getPages();
  // Blank pages have no content stream and cannot be embedded; they become blank A4 pages.
  const withContent = pages.filter((page) => page.node.Contents() !== undefined);
  const embeddedList = withContent.length ? await output.embedPages(withContent) : [];
  const embeddedByPage = new Map(withContent.map((page, i) => [page, embeddedList[i]!]));
  pages.forEach((page) => {
    const rotation = ((page.getRotation().angle % 360) + 360) % 360;
    const { width, height } = page.getSize();
    const sideways = rotation === 90 || rotation === 270;
    const displayW = sideways ? height : width;
    const displayH = sideways ? width : height;
    const [pageW, pageH] = displayW > displayH ? [A4_POINTS[1], A4_POINTS[0]] : A4_POINTS;
    const scale = Math.min((pageW - margin * 2) / displayW, (pageH - margin * 2) / displayH);
    const boxW = displayW * scale;
    const boxH = displayH * scale;
    const left = (pageW - boxW) / 2;
    const bottom = (pageH - boxH) / 2;
    const target = output.addPage([pageW, pageH]);
    const embedded = embeddedByPage.get(page);
    if (!embedded) return;
    const drawn = { width: width * scale, height: height * scale };
    // PDF rotation is clockwise for display; drawPage rotates counter-clockwise about (x, y).
    if (rotation === 90) target.drawPage(embedded, { ...drawn, x: left, y: bottom + boxH, rotate: degrees(-90) });
    else if (rotation === 180) target.drawPage(embedded, { ...drawn, x: left + boxW, y: bottom + boxH, rotate: degrees(180) });
    else if (rotation === 270) target.drawPage(embedded, { ...drawn, x: left + boxW, y: bottom, rotate: degrees(90) });
    else target.drawPage(embedded, { ...drawn, x: left, y: bottom });
  });
  return saveVerified(output, pages.length);
}

/** Page sizes in points, as stored (MediaBox). */
export async function getPageSizes(bytes: Uint8Array): Promise<{ width: number; height: number }[]> {
  const doc = await loadPdf(bytes);
  return doc.getPages().map((page) => page.getSize());
}
