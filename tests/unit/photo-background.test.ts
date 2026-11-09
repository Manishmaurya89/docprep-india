import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FACE_MODEL_FILE, MEDIAPIPE_VERSION, SEGMENTER_MODEL_FILE } from "@/lib/file-processing/background/assets";
import { cameraProblem, hexToRgb, normalizeHex } from "@/lib/file-processing/background/colors";
import {
  FACE_SHARE,
  PASSPORT_PIXELS,
  frameFor,
  framingHint,
  headAndShoulders,
  mainFace,
  outputFor,
  prominentFaces,
} from "@/lib/file-processing/background/framing";
import { blendMasks, boxBlur, coverage, guidedFilter, luminance, maskToRgba, resizeMask, sharpenMask } from "@/lib/file-processing/background/mask";
import { handOff, peekHandOff, takeHandOff } from "@/lib/handoff";

/** Straightforward O(n·r²) box mean, to check the fast version against. */
function naiveBox(src: Float32Array, width: number, height: number, r: number): Float32Array {
  const out = new Float32Array(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && xx < width && yy >= 0 && yy < height) {
            sum += src[yy * width + xx]!;
            count++;
          }
        }
      }
      out[y * width + x] = sum / count;
    }
  }
  return out;
}

function random(n: number, seed = 1): Float32Array {
  let state = seed;
  return Float32Array.from({ length: n }, () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return state / 2 ** 31;
  });
}

describe("mask maths", () => {
  it("box blur matches a direct computation, including at the borders", () => {
    const src = random(13 * 9, 7);
    for (const r of [1, 2, 5, 20]) {
      const fast = boxBlur(src, 13, 9, r);
      const slow = naiveBox(src, 13, 9, r);
      for (let i = 0; i < src.length; i++) expect(fast[i]).toBeCloseTo(slow[i]!, 5);
    }
    expect(boxBlur(src, 13, 9, 0)).toEqual(src);
    expect(() => boxBlur(src, 10, 10, 1)).toThrow(RangeError);
  });

  it("guided filter keeps a flat mask flat and snaps a blurry mask to the photo's edge", () => {
    const width = 40;
    const height = 10;
    const flat = new Float32Array(width * height).fill(0.7);
    const guideNoise = random(width * height, 3);
    guidedFilter(guideNoise, flat, width, height, 3, 1e-3).forEach((value) => expect(value).toBeCloseTo(0.7, 4));

    // The photo has a hard edge at x = 20; the model's mask fades over x = 14…26.
    const guide = new Float32Array(width * height);
    const mask = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        guide[y * width + x] = x < 20 ? 0.9 : 0.1;
        mask[y * width + x] = Math.min(1, Math.max(0, (26 - x) / 12));
      }
    }
    const out = guidedFilter(guide, mask, width, height, 4, 1e-4);
    const row = 5 * width;
    // Either side of the photo's edge the result moves towards the right answer, and the edge
    // becomes a step (input: 0.58 → 0.50 across it; measured output: 0.74 → 0.34).
    expect(out[row + 19]! - mask[row + 19]!).toBeGreaterThan(0.1);
    expect(mask[row + 20]! - out[row + 20]!).toBeGreaterThan(0.1);
    expect(out[row + 19]! - out[row + 20]!).toBeGreaterThan(0.35);
    // After sharpening (as the tool does) the edge is crisp.
    const crisp = sharpenMask(out, 0.3, 0.85);
    expect(crisp[row + 19]! - crisp[row + 20]!).toBeGreaterThan(0.65);
  });

  it("sharpens the soft middle of a mask and rejects silly thresholds", () => {
    expect(Array.from(sharpenMask(Float32Array.from([0, 0.2, 0.5, 0.8, 1]), 0.2, 0.8))).toEqual([0, 0, 0.5, 1, 1].map((v) => expect.closeTo(v, 5)));
    expect(() => sharpenMask(new Float32Array(1), 0.8, 0.2)).toThrow(RangeError);
  });

  it("resizes a mask, keeping flat areas flat", () => {
    const flat = new Float32Array(4 * 4).fill(0.25);
    const bigger = resizeMask(flat, 4, 4, 9, 7);
    expect(bigger).toHaveLength(63);
    bigger.forEach((value) => expect(value).toBeCloseTo(0.25, 6));
    const ramp = Float32Array.from([0, 1, 0, 1]);
    const out = resizeMask(ramp, 2, 2, 4, 4);
    expect(out[0]).toBeCloseTo(0, 6);
    expect(out[3]).toBeCloseTo(1, 6);
    expect(() => resizeMask(ramp, 3, 3, 4, 4)).toThrow(RangeError);
  });

  it("blends live masks over time, writes alpha, and measures coverage", () => {
    const previous = Float32Array.from([0, 1]);
    const blended = blendMasks(previous, Float32Array.from([1, 0]), 0.75);
    expect(Array.from(blended)).toEqual([0.25, 0.75]);
    expect(blended).toBe(previous);
    expect(Array.from(blendMasks(null, Float32Array.from([0.5]), 0.9))).toEqual([0.5]);

    const rgba = new Uint8ClampedArray(8);
    maskToRgba(Float32Array.from([0, 1]), rgba);
    expect(Array.from(rgba)).toEqual([255, 255, 255, 0, 255, 255, 255, 255]);
    expect(coverage(Float32Array.from([0.1, 0.5, 0.9, 0.2]))).toBe(0.5);
    expect(luminance(Uint8Array.from([255, 255, 255, 255, 0, 0, 0, 255]))).toEqual(Float32Array.from([1, 0]));
  });
});

describe("framing", () => {
  const image = { width: 1200, height: 1600 };
  const face = { x: 500, y: 400, width: 200, height: 240 };

  it("frames head and shoulders around the face at the requested shape", () => {
    const crop = headAndShoulders(face, image, 35 / 45);
    expect(crop.width / crop.height).toBeCloseTo(35 / 45, 6);
    expect(face.height / crop.height).toBeCloseTo(FACE_SHARE.initial, 6);
    // Face centred left-right, a little above the middle top-to-bottom.
    expect(crop.x + crop.width / 2).toBeCloseTo(600, 6);
    expect((520 - crop.y) / crop.height).toBeCloseTo(0.48, 6);
  });

  it("zooms with the face size, within the offered range", () => {
    const tight = headAndShoulders(face, image, 1, 0.5);
    const loose = headAndShoulders(face, image, 1, 0.24);
    expect(face.height / tight.height).toBeCloseTo(0.5, 6);
    expect(face.height / loose.height).toBeCloseTo(0.24, 6);
    expect(face.height / headAndShoulders(face, image, 1, 0.9).height).toBeCloseTo(FACE_SHARE.max, 6);
  });

  it("zooms in rather than run past the bottom of the photo", () => {
    const low = { x: 500, y: 1100, width: 200, height: 240 };
    const crop = headAndShoulders(low, image, 1);
    expect(crop.y + crop.height).toBeLessThanOrEqual(image.height + 1e-6);
    // …but never so far that the face no longer fits.
    const lowest = headAndShoulders({ x: 500, y: 1450, width: 200, height: 140 }, image, 1);
    expect(140 / lowest.height).toBeLessThanOrEqual(FACE_SHARE.max + 1e-9);
  });

  it("keeps the whole photo when asked, or when no face was found", () => {
    expect(frameFor("whole", image, face)).toEqual({ x: 0, y: 0, ...image });
    expect(frameFor("passport", image, null)).toEqual({ x: 0, y: 0, ...image });
    expect(() => headAndShoulders({ ...face, width: 0 }, image, 1)).toThrow(RangeError);
  });

  it("outputs passport size at 413 × 531 px and 300 DPI, and never enlarges anything else", () => {
    expect(outputFor("passport", { width: 300, height: 386 }, true)).toEqual({ ...PASSPORT_PIXELS, dpi: 300 });
    expect(outputFor("square", { width: 640, height: 640 }, true)).toEqual({ width: 640, height: 640 });
    expect(outputFor("square", { width: 1800, height: 1800 }, true)).toEqual({ width: 1000, height: 1000 });
    expect(outputFor("whole", { width: 4000, height: 3000 }, true)).toEqual({ width: 2000, height: 1500 });
    // No face: passport falls back to the whole photo at its own size.
    expect(outputFor("passport", { width: 320, height: 240 }, false)).toEqual({ width: 320, height: 240 });
  });

  it("gives one live tip at a time, most important first", () => {
    const frame = { width: 256, height: 192 };
    const centred = { x: 98, y: 50, width: 60, height: 72 };
    expect(framingHint([], frame)).toBe("no-face");
    expect(framingHint([centred, centred], frame)).toBe("one-person");
    expect(framingHint([{ ...centred, height: 20 }], frame)).toBe("closer");
    expect(framingHint([{ ...centred, height: 150 }], frame)).toBe("farther");
    expect(framingHint([{ ...centred, x: 5 }], frame)).toBe("centre");
    expect(framingHint([centred], frame, 0.1)).toBe("more-light");
    expect(framingHint([centred], frame, 0.6)).toBe("good");
  });

  it("ignores small faces far in the background", () => {
    const near = { x: 0, y: 0, width: 100, height: 100 };
    const far = { x: 200, y: 0, width: 30, height: 30 };
    expect(mainFace([far, near])).toBe(near);
    expect(prominentFaces([far, near])).toEqual([near]);
    expect(prominentFaces([near, { ...near, x: 150 }])).toHaveLength(2);
    expect(mainFace([])).toBeNull();
  });
});

describe("colours and camera errors", () => {
  it("normalises colours", () => {
    expect(normalizeHex("#FFF")).toBe("#ffffff");
    expect(normalizeHex("d62828")).toBe("#d62828");
    expect(normalizeHex("red")).toBeNull();
    expect(hexToRgb("#2f6fdb")).toEqual([47, 111, 219]);
    expect(() => hexToRgb("nope")).toThrow(RangeError);
  });

  it("explains why the camera did not open", () => {
    const named = (name: string) => Object.assign(new Error(name), { name });
    expect(cameraProblem(named("NotAllowedError"))).toBe("denied");
    expect(cameraProblem(named("NotFoundError"))).toBe("no-camera");
    expect(cameraProblem(named("NotReadableError"))).toBe("busy");
    expect(cameraProblem(named("SecurityError"))).toBe("insecure");
    expect(cameraProblem(named("TypeError"))).toBe("unsupported");
    expect(cameraProblem("weird")).toBe("other");
  });
});

describe("handing a photo to another tool", () => {
  afterEach(() => vi.useRealTimers());

  it("passes the file once, only to the named tool, and forgets it after ten minutes", () => {
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    handOff(file, "photo-signature");
    expect(peekHandOff("other-tool")).toBeNull();
    expect(peekHandOff("photo-signature")).toBe(file);
    expect(takeHandOff("photo-signature")).toBe(file);
    expect(takeHandOff("photo-signature")).toBeNull();

    vi.useFakeTimers();
    handOff(file, "photo-signature");
    vi.advanceTimersByTime(11 * 60 * 1000);
    expect(takeHandOff("photo-signature")).toBeNull();
  });
});

describe("MediaPipe assets", () => {
  it("serves the runtime from the installed version's folder", () => {
    const installed = JSON.parse(readFileSync(join(process.cwd(), "node_modules/@mediapipe/tasks-vision/package.json"), "utf8")).version;
    expect(MEDIAPIPE_VERSION).toBe(installed);
  });

  it("ships the two models exactly as downloaded from Google (SHA-256 recorded in assets/mediapipe/README.md)", () => {
    const sha = (file: string) => createHash("sha256").update(readFileSync(join(process.cwd(), "assets/mediapipe", file))).digest("hex");
    expect(sha(SEGMENTER_MODEL_FILE)).toBe("191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b");
    expect(sha(FACE_MODEL_FILE)).toBe("b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f");
  });
});
