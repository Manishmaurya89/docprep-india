import type { FaceDetector, FilesetResolver, ImageSegmenter, ImageSource } from "@mediapipe/tasks-vision";

type WasmFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;
import { ProcessingError } from "../errors";
import { FACE_MODEL_URL, MEDIAPIPE_WASM_PATH, SEGMENTER_MODEL_URL } from "./assets";
import type { Box } from "./framing";
import { resizeMask } from "./mask";

/**
 * Loads MediaPipe (WebAssembly) and the two models from our own origin, once
 * per page, and only when the photo background tool needs them. Everything
 * runs on the CPU in this browser tab: it works the same on every device, and
 * no image ever leaves the page.
 */
export type RunningMode = "IMAGE" | "VIDEO";

let fileset: Promise<{ vision: typeof import("@mediapipe/tasks-vision"); files: WasmFileset }> | null = null;
const segmenters = new Map<RunningMode, Promise<ImageSegmenter>>();
const detectors = new Map<RunningMode, Promise<FaceDetector>>();

function failed(error: unknown): ProcessingError {
  return error instanceof ProcessingError ? error : new ProcessingError("model-failed", undefined, { cause: error });
}

function loadFileset() {
  fileset ??= (async () => {
    const vision = await import("@mediapipe/tasks-vision");
    const files = await vision.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
    return { vision, files };
  })().catch((error) => {
    fileset = null;
    throw failed(error);
  });
  return fileset;
}

export function loadSegmenter(mode: RunningMode): Promise<ImageSegmenter> {
  let task = segmenters.get(mode);
  if (!task) {
    task = loadFileset()
      .then(({ vision, files }) =>
        vision.ImageSegmenter.createFromOptions(files, {
          baseOptions: { modelAssetPath: SEGMENTER_MODEL_URL, delegate: "CPU" },
          runningMode: mode,
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        }),
      )
      .catch((error) => {
        segmenters.delete(mode);
        throw failed(error);
      });
    segmenters.set(mode, task);
  }
  return task;
}

export function loadFaceDetector(mode: RunningMode): Promise<FaceDetector> {
  let task = detectors.get(mode);
  if (!task) {
    task = loadFileset()
      .then(({ vision, files }) =>
        vision.FaceDetector.createFromOptions(files, {
          baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: "CPU" },
          runningMode: mode,
          minDetectionConfidence: 0.5,
        }),
      )
      .catch((error) => {
        detectors.delete(mode);
        throw failed(error);
      });
    detectors.set(mode, task);
  }
  return task;
}

/** The person mask (0–1) for an image, at `width` × `height`. */
export function personMask(segmenter: ImageSegmenter, image: ImageSource, width: number, height: number, timestamp?: number): Float32Array {
  let mask: Float32Array | null = null;
  const read = (result: { confidenceMasks?: { width: number; height: number; getAsFloat32Array(): Float32Array }[] }) => {
    const masks = result.confidenceMasks ?? [];
    // The selfie model gives one mask (person); a two-class model gives [background, person].
    const person = masks[masks.length - 1];
    if (!person) return;
    const data = person.getAsFloat32Array();
    mask = person.width === width && person.height === height ? data.slice() : resizeMask(data, person.width, person.height, width, height);
  };
  if (timestamp === undefined) segmenter.segment(image, read);
  else segmenter.segmentForVideo(image, timestamp, read);
  if (!mask) throw new ProcessingError("model-failed");
  return mask;
}

/** Faces found, as boxes in the image's pixels. */
export function findFaces(detector: FaceDetector, image: ImageSource, timestamp?: number): Box[] {
  const result = timestamp === undefined ? detector.detect(image) : detector.detectForVideo(image, timestamp);
  return result.detections.flatMap((detection) => {
    const box = detection.boundingBox;
    return box && box.width > 0 && box.height > 0 ? [{ x: box.originX, y: box.originY, width: box.width, height: box.height }] : [];
  });
}
