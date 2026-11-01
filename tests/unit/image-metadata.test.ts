import { describe, expect, it } from "vitest";
import { orientedSize, readImageMetadata } from "@/lib/file-processing/image-metadata";
import { GRADIENT_JPEG_64x48 } from "../fixtures/jpeg";
import { encodePng, gradientPng } from "../helpers/png";

function webpHeader(chunk: string, body: number[]): Uint8Array {
  const out = new Uint8Array(40);
  out.set(new TextEncoder().encode("RIFF"), 0);
  out.set(new TextEncoder().encode("WEBP"), 8);
  out.set(new TextEncoder().encode(chunk), 12);
  out.set(body, 16); // body starts with the 4-byte chunk size
  return out;
}

/** Inserts an EXIF APP1 segment with the given orientation after SOI. */
function withExifOrientation(jpeg: Uint8Array, orientation: number): Uint8Array {
  const tiff = [0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
  const payload = [...new TextEncoder().encode("Exif"), 0, 0, ...tiff];
  const length = payload.length + 2;
  const segment = [0xff, 0xe1, length >> 8, length & 0xff, ...payload];
  return new Uint8Array([0xff, 0xd8, ...segment, ...jpeg.subarray(2)]);
}

describe("readImageMetadata", () => {
  it("reads PNG dimensions, alpha and DPI", () => {
    const opaque = readImageMetadata(gradientPng(120, 80));
    expect(opaque).toMatchObject({ format: "png", width: 120, height: 80, hasAlpha: false });
    const transparent = readImageMetadata(gradientPng(10, 20, true));
    expect(transparent).toMatchObject({ width: 10, height: 20, hasAlpha: true });
    const withDpi = readImageMetadata(encodePng(5, 5, () => [0, 0, 0, 255], { alpha: false, dpi: 300 }));
    expect(withDpi?.dpi).toEqual({ x: 300, y: 300 });
  });

  it("reads JPEG dimensions, components and JFIF density", () => {
    const meta = readImageMetadata(GRADIENT_JPEG_64x48);
    expect(meta).toMatchObject({ format: "jpeg", width: 64, height: 48, hasAlpha: false, components: 3 });
    // The fixture's JFIF header declares density without units (aspect ratio only).
    expect(meta?.dpi).toBeUndefined();
    const withUnits = GRADIENT_JPEG_64x48.slice();
    withUnits[13] = 1; // JFIF units byte: 1 = dots per inch
    expect(readImageMetadata(withUnits)?.dpi).toEqual({ x: 72, y: 72 });
  });

  it("reads EXIF orientation and reports oriented size", () => {
    const rotated = withExifOrientation(GRADIENT_JPEG_64x48, 6);
    const meta = readImageMetadata(rotated)!;
    expect(meta.orientation).toBe(6);
    expect(orientedSize(meta)).toEqual({ width: 48, height: 64 });
    expect(orientedSize({ width: 64, height: 48, orientation: 1 })).toEqual({ width: 64, height: 48 });
  });

  it("reads lossy, lossless and extended WebP headers", () => {
    // VP8: frame tag, start code 9d 01 2a, 14-bit width/height (little endian)
    const vp8 = webpHeader("VP8 ", [0, 0, 0, 0, 0, 0, 0, 0x9d, 0x01, 0x2a, 200, 0, 230, 0]);
    expect(readImageMetadata(vp8)).toMatchObject({ width: 200, height: 230, hasAlpha: false });

    // VP8L: signature 0x2f, then (width-1) in 14 bits, (height-1) in 14 bits, alpha bit 28
    const w = 140 - 1;
    const h = 60 - 1;
    const bits = (w | (h << 14) | (1 << 28)) >>> 0;
    const vp8l = webpHeader("VP8L", [0, 0, 0, 0, 0x2f, bits & 0xff, (bits >> 8) & 0xff, (bits >> 16) & 0xff, (bits >>> 24) & 0xff]);
    expect(readImageMetadata(vp8l)).toMatchObject({ width: 140, height: 60, hasAlpha: true });

    // VP8X: flags (alpha = 0x10), 3 reserved bytes, 24-bit (width-1), 24-bit (height-1)
    const vp8x = webpHeader("VP8X", [0, 0, 0, 0, 0x10, 0, 0, 0, 0x1f, 0x03, 0, 0xdf, 0x02, 0]);
    expect(readImageMetadata(vp8x)).toMatchObject({ width: 800, height: 736, hasAlpha: true });
  });

  it("returns null for truncated or non-image bytes", () => {
    expect(readImageMetadata(GRADIENT_JPEG_64x48.subarray(0, 20))).toBeNull();
    expect(readImageMetadata(gradientPng(4, 4).subarray(0, 20))).toBeNull();
    expect(readImageMetadata(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
  });
});
