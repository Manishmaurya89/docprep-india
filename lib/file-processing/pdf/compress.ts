import { zlibSync } from "fflate";
import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRawStream, PDFRef, type PDFDocument, type PDFObject } from "pdf-lib";
import { throwIfAborted } from "../errors";
import type { ReencodeJpegRequest, ReencodeJpegResult } from "../image/jobs";
import { loadPdf } from "./operations";

/**
 * Real, measured PDF compression. Nothing here promises a reduction: the
 * caller receives both sizes and decides what to tell the user.
 *
 * 1. Image recompression (optional): re-encodes embedded JPEG images
 *    (DCTDecode, RGB or greyscale, 8-bit) at a lower quality and optional
 *    maximum dimension. A stream is replaced only when the new one is smaller.
 *    Text, vector graphics, links and form fields are untouched.
 * 2. Structural: Flate-compresses uncompressed streams and re-saves with
 *    object streams, which also drops superseded object revisions.
 */

export type JpegReencoder = (request: ReencodeJpegRequest) => Promise<ReencodeJpegResult | null>;

export interface CompressPdfOptions {
  recompressImages: boolean;
  /** JPEG quality 0–1 for recompressed images. */
  imageQuality?: number;
  /** Longest side for embedded images; larger ones are scaled down. */
  maxImageDimension?: number;
  reencodeJpeg?: JpegReencoder;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

export interface CompressPdfResult {
  bytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  pageCount: number;
  imagesFound: number;
  imagesRecompressed: number;
  /** Images left untouched because their format/colour space is not supported for recompression. */
  imagesSkipped: number;
  streamsCompressed: number;
}

const N = (name: string) => PDFName.of(name);

interface ImageCandidate {
  ref: PDFRef;
  stream: PDFRawStream;
  width: number;
  height: number;
  grayscale: boolean;
}

function numberValue(obj: PDFObject | undefined): number | undefined {
  return obj instanceof PDFNumber ? obj.asNumber() : undefined;
}

function isDctOnly(filter: PDFObject | undefined): boolean {
  if (filter === N("DCTDecode")) return true;
  return filter instanceof PDFArray && filter.size() === 1 && filter.get(0) === N("DCTDecode");
}

/** Returns colour component count for colour spaces we can safely re-encode, else undefined. */
function supportedComponents(doc: PDFDocument, colorSpace: PDFObject | undefined): 1 | 3 | undefined {
  const resolved = colorSpace instanceof PDFRef ? doc.context.lookup(colorSpace) : colorSpace;
  if (resolved === N("DeviceRGB")) return 3;
  if (resolved === N("DeviceGray")) return 1;
  if (resolved instanceof PDFArray && resolved.size() === 2 && resolved.get(0) === N("ICCBased")) {
    const profile = doc.context.lookup(resolved.get(1));
    const dict = profile instanceof PDFRawStream ? profile.dict : profile instanceof PDFDict ? profile : undefined;
    const n = numberValue(dict?.lookup(N("N")));
    if (n === 3) return 3;
    if (n === 1) return 1;
  }
  return undefined;
}

function findImages(doc: PDFDocument): { candidates: ImageCandidate[]; skipped: number } {
  const candidates: ImageCandidate[] = [];
  let skipped = 0;
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    if (dict.get(N("Subtype")) !== N("Image")) continue;
    const width = numberValue(dict.lookup(N("Width")));
    const height = numberValue(dict.lookup(N("Height")));
    const components = supportedComponents(doc, dict.get(N("ColorSpace")));
    const eligible =
      isDctOnly(dict.lookup(N("Filter"))) &&
      numberValue(dict.lookup(N("BitsPerComponent"))) === 8 &&
      !dict.has(N("Decode")) &&
      !(dict.lookup(N("Mask")) instanceof PDFArray) &&
      dict.get(N("ImageMask")) === undefined &&
      components !== undefined &&
      width !== undefined &&
      height !== undefined;
    if (!eligible) {
      skipped++;
      continue;
    }
    candidates.push({ ref, stream: obj, width: width!, height: height!, grayscale: components === 1 });
  }
  return { candidates, skipped };
}

function compressPlainStreams(doc: PDFDocument): number {
  let compressed = 0;
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    if (dict.has(N("Filter")) || dict.get(N("Type")) === N("Metadata")) continue;
    if (obj.contents.length < 512) continue;
    const deflated = zlibSync(obj.contents, { level: 9 });
    if (deflated.length >= obj.contents.length * 0.95) continue;
    const next = dict.clone(doc.context);
    next.set(N("Filter"), N("FlateDecode"));
    next.delete(N("DecodeParms"));
    next.set(N("Length"), PDFNumber.of(deflated.length));
    doc.context.assign(ref, PDFRawStream.of(next, deflated));
    compressed++;
  }
  return compressed;
}

export async function compressPdf(bytes: Uint8Array, options: CompressPdfOptions): Promise<CompressPdfResult> {
  const doc = await loadPdf(bytes);
  const { candidates, skipped } = findImages(doc);
  let recompressed = 0;

  if (options.recompressImages) {
    if (!options.reencodeJpeg) throw new Error("reencodeJpeg is required when recompressImages is true");
    for (let i = 0; i < candidates.length; i++) {
      throwIfAborted(options.signal);
      const candidate = candidates[i]!;
      const original = candidate.stream.contents;
      const result = await options.reencodeJpeg({
        bytes: original,
        width: candidate.width,
        height: candidate.height,
        quality: options.imageQuality ?? 0.6,
        maxDimension: options.maxImageDimension,
      });
      if (result && result.bytes.length < original.length * 0.97) {
        const dict = candidate.stream.dict.clone(doc.context);
        dict.set(N("Width"), PDFNumber.of(result.width));
        dict.set(N("Height"), PDFNumber.of(result.height));
        dict.set(N("Filter"), N("DCTDecode"));
        dict.delete(N("DecodeParms"));
        dict.set(N("Length"), PDFNumber.of(result.bytes.length));
        // Browsers encode JPEG as 3-component colour; greyscale sources must say so.
        if (candidate.grayscale) dict.set(N("ColorSpace"), N("DeviceRGB"));
        doc.context.assign(candidate.ref, PDFRawStream.of(dict, result.bytes));
        recompressed++;
      }
      options.onProgress?.(i + 1, candidates.length);
    }
  }

  throwIfAborted(options.signal);
  const streamsCompressed = compressPlainStreams(doc);
  const output = await doc.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false });
  const pageCount = (await loadPdf(output)).getPageCount();

  return {
    bytes: output,
    originalSize: bytes.length,
    outputSize: output.length,
    pageCount,
    imagesFound: candidates.length + skipped,
    imagesRecompressed: recompressed,
    imagesSkipped: skipped,
    streamsCompressed,
  };
}
