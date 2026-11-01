import { describe, expect, it } from "vitest";
import { ProcessingError } from "@/lib/file-processing/errors";
import {
  aspectMatches,
  centeredCropForAspect,
  clampRect,
  computeResize,
  fitContain,
  normalizeRotation,
  planFixedOutput,
  rotatedSize,
  scaleToFitPixels,
} from "@/lib/file-processing/image/geometry";

const source = { width: 4000, height: 3000 };

describe("computeResize", () => {
  it("preserves aspect ratio from width or height when locked", () => {
    expect(computeResize({ source, mode: "pixels", width: 800, lockAspect: true, allowUpscale: false })).toEqual({
      width: 800,
      height: 600,
      upscaleBlocked: false,
    });
    expect(
      computeResize({ source, mode: "pixels", width: 1, height: 300, anchor: "height", lockAspect: true, allowUpscale: false }),
    ).toMatchObject({ width: 400, height: 300 });
  });

  it("uses both values when unlocked", () => {
    expect(computeResize({ source, mode: "pixels", width: 200, height: 230, lockAspect: false, allowUpscale: false })).toMatchObject({
      width: 200,
      height: 230,
    });
  });

  it("scales by percentage", () => {
    expect(computeResize({ source, mode: "percent", percent: 25, lockAspect: true, allowUpscale: false })).toMatchObject({
      width: 1000,
      height: 750,
    });
  });

  it("does not upscale by default, and keeps the requested aspect when it clamps", () => {
    const small = { width: 400, height: 300 };
    const blocked = computeResize({ source: small, mode: "pixels", width: 800, lockAspect: true, allowUpscale: false });
    expect(blocked).toEqual({ width: 400, height: 300, upscaleBlocked: true });
    const allowed = computeResize({ source: small, mode: "pixels", width: 800, lockAspect: true, allowUpscale: true });
    expect(allowed).toEqual({ width: 800, height: 600, upscaleBlocked: false });
    const pct = computeResize({ source: small, mode: "percent", percent: 200, lockAspect: true, allowUpscale: false });
    expect(pct.upscaleBlocked).toBe(true);
  });

  it("rejects invalid dimensions with a specific error", () => {
    const bad = [
      { mode: "pixels", width: 0, lockAspect: true },
      { mode: "pixels", width: -5, height: 10, lockAspect: false },
      { mode: "pixels", width: 100, lockAspect: false },
      { mode: "percent", percent: 0, lockAspect: true },
      { mode: "pixels", width: 20000, height: 10, lockAspect: false, allowUpscale: true },
      { mode: "pixels", width: 9000, height: 9000, lockAspect: false, allowUpscale: true },
    ] as const;
    for (const request of bad) {
      expect(() => computeResize({ source, allowUpscale: false, ...request })).toThrow(ProcessingError);
    }
    try {
      computeResize({ source, mode: "pixels", width: Number.NaN, lockAspect: true, allowUpscale: false });
    } catch (error) {
      expect((error as ProcessingError).code).toBe("invalid-dimensions");
    }
  });
});

describe("crop and fit helpers", () => {
  it("finds the largest centred crop for an aspect ratio", () => {
    expect(centeredCropForAspect(source, 1)).toEqual({ x: 500, y: 0, width: 3000, height: 3000 });
    expect(centeredCropForAspect(source, 200 / 230)).toMatchObject({ height: 3000, width: 2609 });
    expect(centeredCropForAspect(source, null)).toEqual({ x: 0, y: 0, ...source });
  });

  it("clamps rectangles inside bounds", () => {
    expect(clampRect({ x: -10, y: 2990, width: 100, height: 100 }, source)).toEqual({ x: 0, y: 2900, width: 100, height: 100 });
    expect(clampRect({ x: 0, y: 0, width: 9999, height: 0 }, source, 1)).toEqual({ x: 0, y: 0, width: 4000, height: 1 });
  });

  it("fits content without distortion", () => {
    const rect = fitContain({ width: 400, height: 100 }, { width: 140, height: 60 });
    expect(rect.width / rect.height).toBeCloseTo(4, 1);
    expect(rect).toMatchObject({ width: 140, height: 35, x: 0 });
  });

  it("plans exact outputs by cropping (cover) or padding (contain), never stretching", () => {
    const crop = { x: 0, y: 0, width: 1000, height: 1000 };
    const cover = planFixedOutput(crop, { width: 200, height: 230 }, "cover");
    expect(aspectMatches(cover.crop, { width: 200, height: 230 })).toBe(true);
    expect(cover.placement).toEqual({ x: 0, y: 0, width: 200, height: 230 });

    const contain = planFixedOutput(crop, { width: 140, height: 60 }, "contain");
    expect(contain.crop).toEqual(crop);
    expect(contain.placement.width).toBe(contain.placement.height);
    expect(contain.placement).toMatchObject({ width: 60, height: 60, x: 40, y: 0 });

    const small = planFixedOutput({ x: 0, y: 0, width: 100, height: 115 }, { width: 200, height: 230 }, "cover");
    expect(small.upscaled).toBe(true);
  });

  it("handles rotation sizes and pixel budgets", () => {
    expect(rotatedSize(source, 90)).toEqual({ width: 3000, height: 4000 });
    expect(rotatedSize(source, 180)).toEqual(source);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
    expect(scaleToFitPixels({ width: 8000, height: 6000 }, 16_777_216)).toBeCloseTo(0.5913, 3);
    expect(scaleToFitPixels({ width: 100, height: 100 }, 16_777_216)).toBe(1);
  });
});
