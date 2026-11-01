import { type ErrorDetail, detail, renderDetail } from "./errors";

/**
 * Detects file formats from their leading bytes ("magic numbers").
 * Extensions and browser-reported MIME types are never trusted.
 */
export type DetectedFormat = "jpeg" | "png" | "webp" | "pdf" | "gif" | "bmp" | "heic" | "tiff" | "unknown";
export type ImageFormat = "jpeg" | "png" | "webp";

export const IMAGE_FORMATS: readonly ImageFormat[] = ["jpeg", "png", "webp"];

export const MIME_TYPES: Record<ImageFormat | "pdf", string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export const EXTENSIONS: Record<ImageFormat | "pdf", string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  pdf: "pdf",
};

export const FORMAT_LABELS: Record<DetectedFormat, string> = {
  jpeg: "JPEG",
  png: "PNG",
  webp: "WebP",
  pdf: "PDF",
  gif: "GIF",
  bmp: "BMP",
  heic: "HEIC/HEIF",
  tiff: "TIFF",
  unknown: "Unknown",
};

/** Bytes needed by detectFormat. PDF headers may appear anywhere in the first 1024 bytes. */
export const DETECT_HEADER_BYTES = 1024;

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let out = "";
  for (let i = start; i < start + length && i < bytes.length; i++) out += String.fromCharCode(bytes[i]!);
  return out;
}

export function detectFormat(bytes: Uint8Array): DetectedFormat {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 3) === "PNG" &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";
  if (bytes.length >= 6 && (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a")) return "gif";
  if (bytes.length >= 2 && ascii(bytes, 0, 2) === "BM") return "bmp";
  if (bytes.length >= 4 && (ascii(bytes, 0, 4) === "II*\u0000" || ascii(bytes, 0, 4) === "MM\u0000*")) return "tiff";
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim", "heis", "avif"].includes(brand)) return "heic";
  }
  // %PDF- may be preceded by junk bytes; readers accept it within the first 1024 bytes.
  const limit = Math.min(bytes.length - 5, DETECT_HEADER_BYTES - 5);
  for (let i = 0; i <= limit; i++) {
    if (bytes[i] === 0x25 && ascii(bytes, i, 5) === "%PDF-") return "pdf";
  }
  return "unknown";
}

export function isImageFormat(format: DetectedFormat): format is ImageFormat {
  return (IMAGE_FORMATS as readonly string[]).includes(format);
}

export async function readBytes(blob: Blob, length?: number): Promise<Uint8Array> {
  const slice = length === undefined ? blob : blob.slice(0, length);
  return new Uint8Array(await slice.arrayBuffer());
}

export async function detectBlobFormat(blob: Blob): Promise<DetectedFormat> {
  return detectFormat(await readBytes(blob, DETECT_HEADER_BYTES));
}

/** A specific hint for formats people commonly try but which are not supported. */
export function unsupportedFormatHintDetail(format: DetectedFormat): ErrorDetail {
  switch (format) {
    case "heic":
      return detail("hintHeic");
    case "gif":
    case "bmp":
    case "tiff":
      return detail("hintConvertFirst", { format: FORMAT_LABELS[format] });
    case "pdf":
      return detail("hintUsePdfTools");
    case "unknown":
      return detail("hintUnknownFormat");
    default:
      return detail("hintChooseImage");
  }
}

/** The hint above in English. */
export function unsupportedFormatHint(format: DetectedFormat): string {
  return renderDetail(unsupportedFormatHintDetail(format));
}
