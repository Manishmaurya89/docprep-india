import { ProcessingError } from "@/lib/file-processing/errors";
import { type Rotation, rotatedSize } from "@/lib/file-processing/image/geometry";
import { processImage } from "@/lib/file-processing/image/processor";
import type { InspectedImage } from "@/lib/file-processing/inspect";
import type { PdfImageInput } from "@/lib/file-processing/pdf/operations";
import { stripJpegMetadata } from "@/lib/file-processing/strip-metadata";

/**
 * pdf-lib embeds JPEG bytes as they are (PNGs are decoded to pixels). PDF
 * viewers ignore EXIF orientation and cannot show WebP, so those images — and
 * any image the user rotated — are re-encoded upright first. Other JPEGs are
 * embedded without re-compression but with their metadata (EXIF, GPS) removed.
 */
export async function prepareImageForPdf(image: InspectedImage, signal?: AbortSignal, rotation: Rotation = 0): Promise<PdfImageInput> {
  const exifRotated = image.format === "jpeg" && image.orientation !== undefined && image.orientation !== 1;
  if (image.format !== "webp" && !exifRotated && rotation === 0) {
    const bytes = new Uint8Array(await image.file.arrayBuffer());
    const kept = image.format === "png" ? bytes : stripJpegMetadata(bytes);
    if (kept) {
      return { bytes: kept, format: image.format === "png" ? "png" : "jpeg", width: image.width, height: image.height };
    }
  }
  const format = image.hasAlpha ? "png" : "jpeg";
  const result = await processImage(
    image.file,
    { kind: "transform", transform: { rotation, output: rotatedSize(image, rotation) }, format, quality: 0.92 },
    { signal },
  );
  if (result.format !== format) throw new ProcessingError("encode-unsupported");
  return { bytes: new Uint8Array(await result.blob.arrayBuffer()), format, width: result.width, height: result.height };
}
