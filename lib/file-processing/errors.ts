/**
 * Typed processing errors. Every failure the UI can show maps to one of these
 * codes so messages stay specific and actionable instead of "Something went wrong".
 *
 * Errors carry a message key and its values, not only English text, so the
 * UI can show them in the page's language. The English text below is the
 * source (and becomes `error.message`); translations live in lib/i18n/.
 * This module has no imports so the image worker stays small.
 */
export type ProcessingErrorCode =
  | "no-file"
  | "unsupported-format"
  | "corrupted"
  | "file-too-large"
  | "too-many-files"
  | "too-many-pixels"
  | "invalid-dimensions"
  | "invalid-option"
  | "target-unreachable"
  | "encode-unsupported"
  | "out-of-memory"
  | "worker-failed"
  | "page-range"
  | "pdf-encrypted"
  | "pdf-malformed"
  | "pdf-empty"
  | "spec-invalid"
  | "cancelled"
  | "download-failed"
  | "model-failed"
  | "unknown";

const CODE_TEXT: Record<ProcessingErrorCode, { title: string; hint?: string }> = {
  "no-file": { title: "No file selected.", hint: "Choose a file or drop it onto the upload area." },
  "unsupported-format": { title: "This file type is not supported here." },
  corrupted: {
    title: "The file could not be read. It may be damaged or incomplete.",
    hint: "Try exporting or downloading the file again, then retry.",
  },
  "file-too-large": { title: "The file is larger than this tool can safely process in a browser." },
  "too-many-files": { title: "Too many files selected at once." },
  "too-many-pixels": {
    title: "The image has too many pixels to process safely on this device.",
    hint: "Resize it with your phone or computer's photo app first.",
  },
  "invalid-dimensions": { title: "The requested dimensions are not valid." },
  "invalid-option": { title: "One of the settings is not valid." },
  "target-unreachable": { title: "The requested size limit could not be reached." },
  "encode-unsupported": {
    title: "This browser cannot create files in the selected format.",
    hint: "Choose a different output format or use a recent version of Chrome, Edge or Firefox.",
  },
  "out-of-memory": {
    title: "The device ran out of memory while processing.",
    hint: "Close other tabs, or try a smaller file or fewer files at once.",
  },
  "worker-failed": { title: "The background processor could not start." },
  "page-range": { title: "The page selection is not valid." },
  "pdf-encrypted": {
    title: "This PDF is password-protected or encrypted.",
    hint: "If it opens without a password, it is only locked against editing: open it in your browser or PDF viewer, choose Print → Save as PDF to make an unlocked copy, then try again. If it needs a password to open, remove the password in the app that created it first.",
  },
  "pdf-malformed": {
    title: "This PDF is damaged or uses a structure that cannot be read.",
    hint: "Try re-saving it with \"Print to PDF\" from a PDF viewer, then retry.",
  },
  "pdf-empty": { title: "The resulting PDF would have no pages." },
  "spec-invalid": { title: "This requirement record is incomplete or invalid and cannot be used." },
  cancelled: { title: "Processing was cancelled." },
  "download-failed": {
    title: "The download could not be started.",
    hint: "Check that your browser allows downloads from this site, then try again.",
  },
  "model-failed": {
    title: "The photo background tool could not start in this browser.",
    hint: "Reload the page and try again, or use an up-to-date Chrome, Edge, Firefox or Safari. Your photo was not sent anywhere.",
  },
  unknown: { title: "Processing failed unexpectedly.", hint: "Try again. If it keeps failing, try a different browser." },
};

/** "This file" when the file has no name to show. */
const subject = (name?: string, fallback = "This file") => (name ? `"${name}"` : fallback);
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Specific messages and hints. Values are passed in already formatted (sizes, ranges, format names). */
const DETAIL_TEXT = {
  // Choosing files
  fileEmpty: ({ name }: { name: string }) => `"${name}" is empty (0 bytes).`,
  imageTooLarge: ({ name, size, limit }: { name: string; size: string; limit: string }) => `"${name}" is ${size}. The limit for images is ${limit}.`,
  pdfTooLarge: ({ name, size, limit }: { name: string; size: string; limit: string }) => `"${name}" is ${size}. The limit for PDFs is ${limit}.`,
  notAnImage: ({ name }: { name: string }) => `"${name}" is not a JPEG, PNG or WebP image.`,
  wrongImageFormat: ({ name, format }: { name: string; format: string }) => `"${name}" is a ${format} file, which this tool does not accept.`,
  imageHeaderDamaged: ({ name, format }: { name: string; format: string }) => `"${name}" looks like ${format} but its header is damaged.`,
  imageUndecodable: ({ name }: { name: string }) => `"${name}" could not be decoded. It may be incomplete or damaged.`,
  notAPdfFile: ({ name }: { name: string }) => `"${name}" is not a PDF.`,
  onePdfOrImages: () => "Choose one PDF, or one or more images of the pages.",
  pdfOrImages: () => "Choose a PDF, or JPEG/PNG/WebP images of the pages.",
  // Hints for formats people often try
  hintHeic: () =>
    "HEIC/HEIF photos (the iPhone default) cannot be decoded reliably in all browsers. On iPhone, choose Settings → Camera → Formats → Most Compatible, or share the photo as JPEG.",
  hintConvertFirst: ({ format }: { format: string }) => `${format} files are not supported. Convert the file to JPEG or PNG first.`,
  hintUsePdfTools: () => "This is a PDF. Use one of the PDF tools instead.",
  hintUnknownFormat: () => "The file content does not match a supported format. Renaming a file's extension does not change its format.",
  hintChooseImage: () => "Choose a JPEG, PNG or WebP image.",
  hintNoPdfHeader: () => "The file content does not start with a PDF header. Renaming a file to .pdf does not convert it.",
  // Reading PDFs
  pdfBytesEmpty: ({ name }: { name?: string }) => `${subject(name)} is empty.`,
  notAPdf: ({ name }: { name?: string }) => `${subject(name)} is not a PDF.`,
  pdfLocked: ({ name }: { name?: string }) => `${subject(name, "This PDF")} is password-protected or locked against editing.`,
  pdfUnreadable: ({ name }: { name?: string }) => `${subject(name)} could not be read as a PDF.`,
  pdfDamagedPages: ({ name }: { name?: string }) => `${subject(name)} has a damaged page structure.`,
  pdfNoPages: ({ name }: { name?: string }) => `${subject(name)} does not contain any pages.`,
  previewFailed: () => "The PDF could not be rendered for preview.",
  pageImagesTooLarge: () => "These images are too large to hold in this browser at once. Choose fewer pages, a lower resolution or JPG.",
  // PDF operations
  outputPageMismatch: ({ actual, expected }: { actual: number; expected: number }) => `The output has ${actual} pages but ${expected} were expected.`,
  mergeNeedsTwo: () => "Select at least two PDFs to merge.",
  mergeTooLarge: () => "The selected PDFs are too large to merge together in a browser.",
  selectOnePage: () => "Select at least one page.",
  pageMissingOfCount: ({ page, count }: { page: number; count: number }) => `Page ${page} does not exist. This document has ${count} pages.`,
  pageMissing: ({ page }: { page: number }) => `Page ${page} does not exist.`,
  enterOneRange: () => "Enter at least one range.",
  tooManyParts: () => "That would create more than 500 files.",
  rangeOutside: ({ range, count }: { range: string; count: number }) => `Range ${range} is outside pages 1-${count}.`,
  removedEveryPage: () => "You removed every page. Keep at least one page.",
  addOneImage: () => "Add at least one image.",
  marginTooLarge: () => "The margin is too large for the page.",
  // Page numbers typed by the user
  documentHasNoPages: () => "The document has no pages.",
  enterPageOrRange: () => "Enter at least one page or range, for example 1-3, 5.",
  notAPageRange: ({ part }: { part: string }) => `"${part}" is not a page number or range. Use forms like 4 or 2-6.`,
  pageStartsAtOne: ({ part }: { part: string }) => `"${part}": page numbers start at 1.`,
  beyondLastPage: ({ part, count }: { part: string; count: number }) => `"${part}" goes beyond the last page. This document has ${plural(count, "page")}.`,
  firstAfterLast: ({ part }: { part: string }) => `"${part}": the first page must not be after the last page.`,
  pagesPerFile: () => "Pages per file must be a whole number of at least 1.",
  // Image dimensions
  wholePixels: () => "Width and height must be whole numbers of at least 1 pixel.",
  maxSide: ({ max }: { max: string }) => `Width and height can be at most ${max} pixels.`,
  tooManyOutputPixels: ({ pixels, max }: { pixels: string; max: string }) =>
    `The output would have ${pixels} pixels, more than the ${max} that can be processed safely in a browser.`,
  noSourceSize: () => "The source image has no measurable size.",
  percentRange: () => "Enter a percentage between 1 and 1000.",
  enterWidthOrHeight: () => "Enter a width or a height.",
  enterBothOrLock: () => "Enter both a width and a height, or turn on aspect-ratio lock.",
  // Encoding and the background processor
  outputUnverifiable: () => "The produced image could not be verified.",
  noDrawingSurface: () => "The browser could not allocate a drawing surface for this image.",
  encodeOutOfMemory: () => "The browser could not encode the image. It may have run out of memory.",
  workerUnsupported: () => "This browser does not support background image processing.",
  workerStartFailed: () => "The background processor could not start.",
  workerStopped: () => "The background processor stopped unexpectedly.",
  workerUnreadable: () => "The background processor could not read the data.",
  // Other
  nothingToDownload: () => "There is no output to download.",
  notImageRequirement: () => "This document is not an image requirement.",
  notPdfRequirement: () => "This document is not a PDF requirement.",
};

/** English error text. The same shape is translated in lib/i18n/hi.ts. */
export const ERROR_TEXT = { codes: CODE_TEXT, details: DETAIL_TEXT };
export type ErrorText = typeof ERROR_TEXT;
export type ErrorDetailKey = keyof typeof DETAIL_TEXT;
type DetailParams = Record<string, string | number | undefined>;

/** A message key and its values: serialisable, so it survives the trip from the worker. */
export interface ErrorDetail {
  key: ErrorDetailKey;
  params?: DetailParams;
}

/** Builds a typed ErrorDetail: `detail("pageMissing", { page: 3 })`. */
export function detail<K extends ErrorDetailKey>(key: K, ...params: Parameters<(typeof DETAIL_TEXT)[K]>): ErrorDetail {
  return params.length ? { key, params: params[0] as DetailParams } : { key };
}

/** Renders a detail with the given language's text (English by default). */
export function renderDetail(error: ErrorDetail, text: ErrorText = ERROR_TEXT): string {
  const render = text.details[error.key] as (params: DetailParams) => string;
  return render(error.params ?? {});
}

/** Title and hint of an error in the given language's text. */
export function errorText(error: ProcessingError, text: ErrorText = ERROR_TEXT): { title: string; hint?: string } {
  return {
    title: error.detail ? renderDetail(error.detail, text) : text.codes[error.code].title,
    hint: error.hintDetail ? renderDetail(error.hintDetail, text) : text.codes[error.code].hint,
  };
}

export class ProcessingError extends Error {
  readonly code: ProcessingErrorCode;
  readonly hint?: string;
  readonly detail?: ErrorDetail;
  readonly hintDetail?: ErrorDetail;

  constructor(code: ProcessingErrorCode, detail?: ErrorDetail, options?: { hint?: ErrorDetail; cause?: unknown }) {
    super(detail ? renderDetail(detail) : CODE_TEXT[code].title, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "ProcessingError";
    this.code = code;
    this.detail = detail;
    this.hintDetail = options?.hint;
    this.hint = options?.hint ? renderDetail(options.hint) : CODE_TEXT[code].hint;
  }

  toJSON(): SerializedProcessingError {
    return { code: this.code, message: this.message, hint: this.hint, detail: this.detail, hintDetail: this.hintDetail };
  }
}

export interface SerializedProcessingError {
  code: ProcessingErrorCode;
  message: string;
  hint?: string;
  detail?: ErrorDetail;
  hintDetail?: ErrorDetail;
}

export function fromSerialized(error: SerializedProcessingError): ProcessingError {
  return new ProcessingError(error.code, error.detail, { hint: error.hintDetail });
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof ProcessingError && error.code === "cancelled")
  );
}

/** Converts anything thrown by browser APIs or libraries into a ProcessingError. */
export function toProcessingError(error: unknown): ProcessingError {
  if (error instanceof ProcessingError) return error;
  if (isAbortError(error)) return new ProcessingError("cancelled");

  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof RangeError || /out of memory|allocation failed|array buffer allocation/i.test(message)) {
    return new ProcessingError("out-of-memory", undefined, { cause: error });
  }
  if (name === "EncryptedPDFError" || /is encrypted/i.test(message)) {
    return new ProcessingError("pdf-encrypted", undefined, { cause: error });
  }
  if (name === "InvalidStateError" || name === "EncodingError" || /decode|source image/i.test(message)) {
    return new ProcessingError("corrupted", undefined, { cause: error });
  }
  return new ProcessingError("unknown", undefined, { cause: error });
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new ProcessingError("cancelled");
}
