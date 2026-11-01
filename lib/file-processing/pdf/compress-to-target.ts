import { throwIfAborted } from "../errors";
import { formatBytes } from "../format";
import type { JpegReencoder } from "./compress";

/**
 * Tries progressively stronger compression until a PDF fits under `maxBytes`.
 * Gentlest first; converting pages to images is the last resort and is always
 * reported. Every candidate's real size is measured. Browser only (the
 * rasterising steps use PDF.js and canvas).
 */
interface Step {
  rasterize?: { dpi: number; quality: number };
  images?: { quality: number; maxDimension: number };
}

const LADDER: Step[] = [
  { images: { quality: 0.7, maxDimension: 2000 } },
  { images: { quality: 0.5, maxDimension: 1400 } },
  { images: { quality: 0.35, maxDimension: 1100 } },
  { rasterize: { dpi: 150, quality: 0.6 } },
  { rasterize: { dpi: 120, quality: 0.5 } },
  { rasterize: { dpi: 100, quality: 0.45 } },
  { rasterize: { dpi: 80, quality: 0.4 } },
];

/** Progress messages and result notes in English; lib/i18n/hi.ts has the Hindi version. */
export const TARGET_TEXT = {
  recompressingImages: (percent: number) => `Recompressing images at ${percent}% quality…`,
  convertingPages: (dpi: number) => `Converting pages to images at ${dpi} DPI…`,
  alreadyWithin: "The file was already within the limit, so it was left unchanged.",
  pagesConverted: (dpi: number) => `Pages were converted to images (${dpi} DPI) to reach the limit. Text is no longer selectable — check that every page is readable.`,
  imagesRecompressed: (percent: number) => `Embedded images were recompressed (${percent}% quality). Text is unchanged.`,
  stillAbove: (size: string) => `The smallest version produced is ${size}, still above the limit. Try scanning at a lower resolution or in greyscale.`,
};
export type TargetText = typeof TARGET_TEXT;

export interface TargetCompressionResult {
  bytes: Uint8Array;
  /** True only when the measured output is at or under the limit. */
  met: boolean;
  /** Pages were turned into images (text no longer selectable). */
  rasterized: boolean;
  notes: string[];
}

export async function compressPdfToTarget(
  bytes: Uint8Array,
  maxBytes: number,
  options: { reencodeJpeg: JpegReencoder; signal?: AbortSignal; onMessage?: (message: string) => void; text?: TargetText },
): Promise<TargetCompressionResult> {
  const text = options.text ?? TARGET_TEXT;
  if (bytes.length <= maxBytes) {
    return { bytes, met: true, rasterized: false, notes: [text.alreadyWithin] };
  }
  const { signal, onMessage } = options;
  const { compressPdf } = await import("./compress");
  let best = bytes;
  let bestRasterized = false;
  for (const step of LADDER) {
    throwIfAborted(signal);
    onMessage?.(step.images ? text.recompressingImages(Math.round(step.images.quality * 100)) : text.convertingPages(step.rasterize!.dpi));
    let candidate: Uint8Array;
    if (step.images) {
      const result = await compressPdf(bytes, {
        recompressImages: true,
        imageQuality: step.images.quality,
        maxImageDimension: step.images.maxDimension,
        reencodeJpeg: options.reencodeJpeg,
        signal,
      });
      if (result.imagesFound === 0) continue; // nothing to recompress; go straight to stronger steps
      candidate = result.bytes;
    } else {
      const { rasterizePdf } = await import("./rasterize");
      candidate = (await rasterizePdf(bytes, { ...step.rasterize!, signal })).bytes;
    }
    if (candidate.length < best.length) {
      best = candidate;
      bestRasterized = Boolean(step.rasterize);
    }
    if (candidate.length <= maxBytes) {
      return {
        bytes: candidate,
        met: true,
        rasterized: Boolean(step.rasterize),
        notes: [
          step.rasterize ? text.pagesConverted(step.rasterize.dpi) : text.imagesRecompressed(Math.round(step.images!.quality * 100)),
        ],
      };
    }
  }
  return {
    bytes: best,
    met: false,
    rasterized: bestRasterized,
    notes: [text.stillAbove(formatBytes(best.length))],
  };
}
