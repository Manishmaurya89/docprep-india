import { describe, expect, it } from "vitest";
import { ProcessingError } from "@/lib/file-processing/errors";
import { searchForTargetSize } from "@/lib/file-processing/image/quality-search";

/** Deterministic fake encoder: size grows with quality and with pixel count. */
function fakeEncoder(base: number, floor = 0) {
  const calls: { quality: number; scale: number }[] = [];
  const encode = async (quality: number, scale: number) => {
    calls.push({ quality, scale });
    const size = Math.round(floor + base * (0.2 + quality * quality) * scale * scale);
    return { size, data: `q=${quality.toFixed(3)} s=${scale.toFixed(3)}` };
  };
  return { encode, calls };
}

describe("searchForTargetSize", () => {
  it("returns the highest quality when it already fits", async () => {
    const { encode, calls } = fakeEncoder(10_000);
    const result = await searchForTargetSize(encode, { target: { maxBytes: 50_000 } });
    expect(result.status).toBe("met");
    expect(result.best.quality).toBe(0.95);
    expect(calls).toHaveLength(1);
  });

  it("finds a quality that fits the maximum, close to it, and never above it", async () => {
    const { encode } = fakeEncoder(100_000);
    const result = await searchForTargetSize(encode, { target: { maxBytes: 50_000 } });
    expect(result.status).toBe("met");
    expect(result.best.size).toBeLessThanOrEqual(50_000);
    expect(result.best.size).toBeGreaterThan(45_000);
    expect(result.best.scale).toBe(1);
  });

  it("respects a minimum size range", async () => {
    const { encode } = fakeEncoder(100_000);
    const result = await searchForTargetSize(encode, { target: { minBytes: 20_480, maxBytes: 50_000 } });
    expect(result.status).toBe("met");
    expect(result.best.size).toBeGreaterThanOrEqual(20_480);
    expect(result.best.size).toBeLessThanOrEqual(50_000);
  });

  it("reports below-minimum when even the best quality is too small", async () => {
    const { encode } = fakeEncoder(5_000);
    const result = await searchForTargetSize(encode, { target: { minBytes: 20_480, maxBytes: 50_000 } });
    expect(result.status).toBe("below-minimum");
    expect(result.best.quality).toBe(0.95);
  });

  it("reports unreachable with the smallest result when resizing is not allowed", async () => {
    const { encode } = fakeEncoder(1_000_000, 0);
    const result = await searchForTargetSize(encode, { target: { maxBytes: 10_000 }, allowResize: false });
    expect(result.status).toBe("unreachable");
    expect(result.best.quality).toBe(0.1);
    expect(result.best.size).toBeGreaterThan(10_000);
  });

  it("reduces dimensions when allowed and quality alone is not enough", async () => {
    const { encode } = fakeEncoder(1_000_000);
    const result = await searchForTargetSize(encode, { target: { maxBytes: 50_000 }, allowResize: true });
    expect(result.status).toBe("met");
    expect(result.best.scale).toBeLessThan(1);
    expect(result.best.size).toBeLessThanOrEqual(50_000);
  });

  it("gives up honestly when a fixed overhead makes the target impossible", async () => {
    // Every file is at least 60 KB (e.g. metadata/overhead), whatever the settings.
    const { encode } = fakeEncoder(10_000, 60_000);
    const result = await searchForTargetSize(encode, { target: { maxBytes: 50_000 }, allowResize: true });
    expect(result.status).toBe("unreachable");
    expect(result.best.size).toBeGreaterThan(50_000);
  });

  it("only changes scale for lossless encoders", async () => {
    const { encode, calls } = fakeEncoder(200_000);
    const result = await searchForTargetSize(encode, { target: { maxBytes: 50_000 }, lossless: true, allowResize: true });
    expect(new Set(calls.map((c) => c.quality))).toEqual(new Set([0.95]));
    expect(result.status).toBe("met");
    expect(result.best.scale).toBeLessThan(1);
  });

  it("stops when cancelled", async () => {
    const controller = new AbortController();
    const { encode } = fakeEncoder(1_000_000);
    const promise = searchForTargetSize(
      async (q, s) => {
        controller.abort();
        return encode(q, s);
      },
      { target: { maxBytes: 1_000 }, allowResize: true, signal: controller.signal },
    );
    await expect(promise).rejects.toMatchObject({ code: "cancelled" });
    await expect(promise).rejects.toBeInstanceOf(ProcessingError);
  });

  it("validates the target", async () => {
    const { encode } = fakeEncoder(1);
    await expect(searchForTargetSize(encode, { target: { maxBytes: 0 } })).rejects.toThrow(RangeError);
    await expect(searchForTargetSize(encode, { target: { maxBytes: 10, minBytes: 20 } })).rejects.toThrow(RangeError);
  });
});
