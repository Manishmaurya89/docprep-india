import type { DocumentRequirement } from "@/data/exam-requirements/schema";
import { EXTENSIONS, type ImageFormat, detectFormat } from "@/lib/file-processing/detect";
import { ProcessingError, detail } from "@/lib/file-processing/errors";
import { type FitMode, type Rect, type Rotation, planFixedOutput } from "@/lib/file-processing/image/geometry";
import { readImageMetadata } from "@/lib/file-processing/image-metadata";
import type { ImageJobResult } from "@/lib/file-processing/image/jobs";
import { processImage, type Engine } from "@/lib/file-processing/image/processor";
import { type ImageAdjustments, type ImageTransform, scaleTransform } from "@/lib/file-processing/image/render";
import type { InspectedImage } from "@/lib/file-processing/inspect";
import { planImageOutput } from "./plan";
import { maxKBToBytes, minKBToBytes } from "@/lib/file-processing/size-limits";
import { type Finding, type MeasuredFile, validateAgainstRequirement } from "./validate";
import { type UiMessages, enUi } from "@/lib/i18n/en";

export interface PreparedFile {
  blob: Blob;
  filename: string;
  measured: MeasuredFile;
  findings: Finding[];
  /** Plain-language notes about what was done (enlarged, flattened, rasterised…). */
  notes: string[];
  engine?: Engine;
}

export interface ImagePrepSettings {
  crop: Rect;
  rotation: Rotation;
  flipHorizontal?: boolean;
  fit: FitMode;
  background: string;
  adjustments?: ImageAdjustments;
  format: ImageFormat;
}

export function sizeTarget(requirement: DocumentRequirement): { maxBytes: number; minBytes?: number } | null {
  const { fileSize } = requirement;
  if (!fileSize) return null;
  const max = fileSize.maxKB !== undefined ? maxKBToBytes(fileSize.maxKB) - (fileSize.maxExclusive ? 1 : 0) : Number.MAX_SAFE_INTEGER;
  return { maxBytes: max, minBytes: fileSize.minKB !== undefined ? minKBToBytes(fileSize.minKB) : undefined };
}

export function buildTransform(image: InspectedImage, requirement: DocumentRequirement, settings: ImagePrepSettings): ImageTransform & { plan: ReturnType<typeof planImageOutput> } {
  const plan = planImageOutput(settings.crop, requirement.pixels);
  const layout = plan.aspect !== null ? planFixedOutput(settings.crop, plan.output, settings.fit) : { crop: settings.crop, placement: { x: 0, y: 0, ...plan.output }, output: plan.output };
  return {
    rotation: settings.rotation,
    flipHorizontal: settings.flipHorizontal,
    crop: layout.crop,
    output: layout.output,
    placement: layout.placement,
    background: settings.background,
    adjustments: settings.adjustments,
    plan,
  };
}

export async function measureImage(blob: Blob): Promise<MeasuredFile> {
  const header = new Uint8Array(await blob.slice(0, 256 * 1024).arrayBuffer());
  const meta = readImageMetadata(header);
  return { format: detectFormat(header), size: blob.size, width: meta?.width, height: meta?.height };
}

/**
 * Produces one application image. Never stretches: exact sizes are reached by
 * cropping or padding. If a "preferred" size cannot reach the minimum file
 * size, the image is enlarged proportionally and that is reported.
 */
export async function prepareImageDocument(
  image: InspectedImage,
  requirement: DocumentRequirement,
  settings: ImagePrepSettings,
  options: { signal?: AbortSignal; onMessage?: (message: string) => void; t?: UiMessages } = {},
): Promise<PreparedFile> {
  const t = options.t ?? enUi;
  const p = t.prepare;
  if (requirement.kind !== "image") throw new ProcessingError("spec-invalid", detail("notImageRequirement"));
  const { plan, ...transform } = buildTransform(image, requirement, settings);
  const target = sizeTarget(requirement);
  const notes: string[] = [];
  const run = (t: ImageTransform) =>
    target
      ? processImage(
          image.file,
          {
            kind: "target-size",
            transform: t,
            format: settings.format,
            target,
            allowResize: plan.allowResize,
            minScale: plan.minScale,
            maxQuality: target.minBytes !== undefined ? 1 : 0.95,
          },
          { signal: options.signal, onProgress: (progress) => options.onMessage?.(p.trying(progress.attempts)) },
        )
      : processImage(image.file, { kind: "transform", transform: t, format: settings.format, quality: 0.92 }, { signal: options.signal });

  let result: ImageJobResult & { engine: Engine } = await run(transform);

  const canEnlarge = requirement.pixels?.preferred === true && plan.aspect !== null;
  for (let attempt = 0; attempt < 3 && canEnlarge && result.status === "below-minimum" && target?.minBytes; attempt++) {
    const currentScale = result.width / transform.output.width;
    const growth = Math.min(4, Math.max(1.2, Math.sqrt(target.minBytes / result.size) * 1.2));
    const factor = Math.min(4, currentScale * growth);
    if (factor <= currentScale) break;
    options.onMessage?.(p.enlarging);
    result = await run(scaleTransform(transform, factor));
  }
  if (result.width !== plan.output.width && plan.aspect !== null) {
    notes.push(p.savedLarger(result.width, result.height, plan.output.width, plan.output.height));
  }
  if (result.status === "below-minimum") notes.push(p.belowMinimum);
  if (result.status === "unreachable") notes.push(p.unreachable);
  if (result.scale < 1 && plan.aspect === null) notes.push(p.reducedTo(Math.round(result.scale * 100)));
  for (const warning of result.warnings) {
    if (warning.code === "transparency-flattened") notes.push(p.flattened);
    if (warning.code === "decoded-at-reduced-size") notes.push(p.decodedReduced);
  }
  if (plan.aspect !== null && (settings.crop.width < plan.output.width || settings.crop.height < plan.output.height)) {
    notes.push(p.enlargedSoft);
  }

  const measured = await measureImage(result.blob);
  return {
    blob: result.blob,
    filename: `${requirement.id}.${EXTENSIONS[settings.format]}`,
    measured,
    findings: validateAgainstRequirement(measured, requirement, t),
    notes,
    engine: result.engine,
  };
}
