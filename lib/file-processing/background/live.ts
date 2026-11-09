import { type FramingHint, framingHint, prominentFaces } from "./framing";
import { blendMasks, guidedFilter, luminance, maskToRgba, sharpenMask } from "./mask";
import { findFaces, loadFaceDetector, loadSegmenter, personMask } from "./mediapipe";

/**
 * Live camera preview with the background already replaced. Each frame is
 * shrunk to 256 px for the model (fast, even on modest phones), the mask is
 * smoothed over time so the edge does not flicker, and the camera picture is
 * drawn through it over the chosen colour. Frames are never stored or sent:
 * they are drawn and discarded.
 */
export interface LivePreview {
  stop(): void;
}

const MODEL_SIDE = 256;
const DISPLAY_MAX_SIDE = 960;
/** Look for faces every few frames: tips do not need to update 30 times a second. */
const FACE_EVERY = 6;

export async function startLivePreview(options: {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  color: () => string;
  onHint?: (hint: FramingHint) => void;
}): Promise<LivePreview> {
  const { video, canvas, color, onHint } = options;
  const [segmenter, detector] = await Promise.all([loadSegmenter("VIDEO"), loadFaceDetector("VIDEO")]);
  const small = document.createElement("canvas");
  const smallCtx = small.getContext("2d", { willReadFrequently: true })!;
  const maskSurface = document.createElement("canvas");
  const maskCtx = maskSurface.getContext("2d")!;
  const person = document.createElement("canvas");
  const personCtx = person.getContext("2d")!;
  const display = canvas.getContext("2d")!;
  let maskImage: ImageData | null = null;
  let previous: Float32Array | null = null;
  let frame = 0;
  let lastTimestamp = 0;
  let stopped = false;
  let handle = 0;

  const resize = () => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const modelScale = MODEL_SIDE / Math.max(vw, vh);
    const sw = Math.max(1, Math.round(vw * modelScale));
    const sh = Math.max(1, Math.round(vh * modelScale));
    if (small.width !== sw || small.height !== sh) {
      small.width = maskSurface.width = sw;
      small.height = maskSurface.height = sh;
      maskImage = maskCtx.createImageData(sw, sh);
      previous = null;
    }
    const displayScale = Math.min(1, DISPLAY_MAX_SIDE / Math.max(vw, vh));
    const dw = Math.round(vw * displayScale);
    const dh = Math.round(vh * displayScale);
    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = person.width = dw;
      canvas.height = person.height = dh;
    }
  };

  const tick = (now: number) => {
    if (stopped) return;
    if (video.readyState >= 2 && video.videoWidth > 0) {
      resize();
      smallCtx.drawImage(video, 0, 0, small.width, small.height);
      // MediaPipe needs strictly increasing timestamps.
      const timestamp = Math.max(now, lastTimestamp + 1);
      lastTimestamp = timestamp;
      try {
        const pixels = smallCtx.getImageData(0, 0, small.width, small.height);
        const raw = personMask(segmenter, small, small.width, small.height, timestamp);
        const refined = sharpenMask(guidedFilter(luminance(pixels.data), raw, small.width, small.height, 2, 1e-3), 0.3, 0.85);
        previous = blendMasks(previous, refined, 0.45);
        maskToRgba(previous, maskImage!.data);
        maskCtx.putImageData(maskImage!, 0, 0);

        personCtx.globalCompositeOperation = "copy";
        personCtx.drawImage(video, 0, 0, person.width, person.height);
        personCtx.globalCompositeOperation = "destination-in";
        personCtx.imageSmoothingEnabled = true;
        personCtx.drawImage(maskSurface, 0, 0, person.width, person.height);

        display.fillStyle = color();
        display.fillRect(0, 0, canvas.width, canvas.height);
        display.drawImage(person, 0, 0);

        if (onHint && frame % FACE_EVERY === 0) {
          const faces = prominentFaces(findFaces(detector, small, timestamp));
          onHint(framingHint(faces, small, faces[0] ? boxBrightness(pixels, faces[0]) : undefined));
        }
        frame++;
      } catch {
        // A dropped frame (for example while the camera switches) is not an error worth showing.
      }
    }
    handle = requestAnimationFrame(tick);
  };
  handle = requestAnimationFrame(tick);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(handle);
    },
  };
}

/** Mean brightness (0–1) inside a box of an image. */
function boxBrightness(pixels: ImageData, box: { x: number; y: number; width: number; height: number }): number {
  const x0 = Math.max(0, Math.floor(box.x));
  const y0 = Math.max(0, Math.floor(box.y));
  const x1 = Math.min(pixels.width, Math.ceil(box.x + box.width));
  const y1 = Math.min(pixels.height, Math.ceil(box.y + box.height));
  let sum = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = (y * pixels.width + x) * 4;
      sum += 0.299 * pixels.data[p]! + 0.587 * pixels.data[p + 1]! + 0.114 * pixels.data[p + 2]!;
      count++;
    }
  }
  return count ? sum / count / 255 : 1;
}
