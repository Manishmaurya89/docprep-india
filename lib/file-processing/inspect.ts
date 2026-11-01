import { type ImageFormat, detectFormat, isImageFormat, readBytes, unsupportedFormatHintDetail, FORMAT_LABELS } from "./detect";
import { ProcessingError, detail } from "./errors";
import { formatBytes } from "./format";
import { orientedSize, readImageMetadata } from "./image-metadata";
import { LIMITS } from "./limits";

export interface InspectedImage {
  file: File;
  format: ImageFormat;
  /** Size as displayed (after EXIF orientation). */
  width: number;
  height: number;
  hasAlpha: boolean;
  orientation?: number;
  dpi?: { x: number; y: number };
  size: number;
}

/**
 * Validates a user-selected image before any processing: size limit, actual
 * format from bytes, header sanity, pixel limits and (in browsers) that it
 * can really be decoded.
 */
export async function inspectImageFile(file: File | null | undefined, options: { verifyDecode?: boolean } = {}): Promise<InspectedImage> {
  if (!file) throw new ProcessingError("no-file");
  if (file.size === 0) throw new ProcessingError("corrupted", detail("fileEmpty", { name: file.name }));
  if (file.size > LIMITS.imageMaxBytes) {
    throw new ProcessingError("file-too-large", detail("imageTooLarge", { name: file.name, size: formatBytes(file.size), limit: formatBytes(LIMITS.imageMaxBytes) }));
  }
  const header = await readBytes(file, 512 * 1024);
  const format = detectFormat(header);
  if (!isImageFormat(format)) {
    throw new ProcessingError(
      "unsupported-format",
      format === "unknown" ? detail("notAnImage", { name: file.name }) : detail("wrongImageFormat", { name: file.name, format: FORMAT_LABELS[format] }),
      { hint: unsupportedFormatHintDetail(format) },
    );
  }
  const meta = readImageMetadata(header) ?? readImageMetadata(await readBytes(file));
  if (!meta) throw new ProcessingError("corrupted", detail("imageHeaderDamaged", { name: file.name, format: FORMAT_LABELS[format] }));
  const { width, height } = orientedSize(meta);
  if (width * height > LIMITS.maxSourcePixels) throw new ProcessingError("too-many-pixels");

  if (options.verifyDecode !== false && typeof createImageBitmap === "function") {
    try {
      const probe = await createImageBitmap(file, { resizeWidth: 32, resizeHeight: 32, resizeQuality: "low" });
      probe.close();
    } catch (error) {
      throw new ProcessingError("corrupted", detail("imageUndecodable", { name: file.name }), { cause: error });
    }
  }
  return { file, format, width, height, hasAlpha: meta.hasAlpha, orientation: meta.orientation, dpi: meta.dpi, size: file.size };
}

export async function assertPdfFile(file: File | null | undefined): Promise<void> {
  if (!file) throw new ProcessingError("no-file");
  if (file.size === 0) throw new ProcessingError("corrupted", detail("fileEmpty", { name: file.name }));
  if (file.size > LIMITS.pdfMaxBytes) {
    throw new ProcessingError("file-too-large", detail("pdfTooLarge", { name: file.name, size: formatBytes(file.size), limit: formatBytes(LIMITS.pdfMaxBytes) }));
  }
  const format = detectFormat(await readBytes(file, 1024));
  if (format !== "pdf") {
    throw new ProcessingError("unsupported-format", detail("notAPdfFile", { name: file.name }), { hint: unsupportedFormatHintDetail(format) });
  }
}
