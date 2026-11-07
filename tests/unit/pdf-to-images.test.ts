import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { setImageDpi } from "@/lib/file-processing/dpi";
import { readImageMetadata } from "@/lib/file-processing/image-metadata";
import { pdfPasswordProblem } from "@/lib/file-processing/pdf/pdfjs";
import { pageImageName, pageRenderSize } from "@/lib/file-processing/pdf/to-images";
import { ProcessingError } from "@/lib/file-processing/errors";
import { GRADIENT_JPEG_64x48 } from "../fixtures/jpeg";
import { gradientPng } from "../helpers/png";

const A4 = { width: 595.28, height: 841.89 };

describe("pageRenderSize", () => {
  it("renders at the requested DPI", () => {
    expect(pageRenderSize(A4.width, A4.height, 150)).toMatchObject({ width: 1240, height: 1754, dpi: 150, limited: false });
    expect(pageRenderSize(A4.width, A4.height, 300)).toMatchObject({ width: 2480, height: 3508, dpi: 300, limited: false });
    expect(pageRenderSize(612, 792, 72)).toMatchObject({ width: 612, height: 792, dpi: 72, limited: false });
  });

  it("scales uniformly to fit the pixel limit, and says so", () => {
    const size = pageRenderSize(A4.width, A4.height, 600, { maxPixels: 16_777_216, maxSide: 10_000 });
    expect(size.limited).toBe(true);
    expect(size.width * size.height).toBeLessThanOrEqual(16_777_216);
    expect(size.dpi).toBeLessThan(600);
    // No stretching: the page's aspect ratio is kept.
    expect(size.width / size.height).toBeCloseTo(A4.width / A4.height, 2);
  });

  it("keeps the longest side within the side limit", () => {
    const banner = pageRenderSize(5000, 200, 300, { maxPixels: 1e9, maxSide: 10_000 });
    expect(banner.limited).toBe(true);
    expect(banner.width).toBeLessThanOrEqual(10_000);
    expect(banner.width / banner.height).toBeCloseTo(25, 0);
  });

  it("rejects impossible input", () => {
    expect(() => pageRenderSize(0, 100, 150)).toThrow(ProcessingError);
    expect(() => pageRenderSize(100, 100, 0)).toThrow(ProcessingError);
  });
});

describe("pageImageName", () => {
  it("names a single page after the document", () => {
    expect(pageImageName("e-Aadhaar", 1, 1, "jpeg")).toBe("e-Aadhaar.jpg");
    expect(pageImageName("scan", 1, 1, "png")).toBe("scan.png");
  });

  it("pads page numbers so files sort in order", () => {
    expect(pageImageName("doc", 3, 12, "jpeg")).toBe("doc-page-03.jpg");
    expect(pageImageName("doc", 12, 12, "png")).toBe("doc-page-12.png");
    expect(pageImageName("doc", 2, 9, "jpeg")).toBe("doc-page-2.jpg");
  });
});

describe("setImageDpi", () => {
  it("writes DPI into an existing JFIF header without changing the pixels", () => {
    expect(GRADIENT_JPEG_64x48[3]).toBe(0xe0);
    const out = setImageDpi(GRADIENT_JPEG_64x48, 150);
    expect(out.length).toBe(GRADIENT_JPEG_64x48.length);
    expect(readImageMetadata(out)).toMatchObject({ format: "jpeg", width: 64, height: 48, dpi: { x: 150, y: 150 } });
    expect(out.subarray(20)).toEqual(GRADIENT_JPEG_64x48.subarray(20));
    // The input is not modified.
    expect(readImageMetadata(GRADIENT_JPEG_64x48)?.dpi).not.toEqual({ x: 150, y: 150 });
  });

  it("adds a JFIF header to a JPEG that has none", () => {
    // Drop the APP0 segment: SOI followed directly by the rest.
    const length = (GRADIENT_JPEG_64x48[4]! << 8) | GRADIENT_JPEG_64x48[5]!;
    const bare = new Uint8Array([0xff, 0xd8, ...GRADIENT_JPEG_64x48.subarray(4 + length)]);
    expect(readImageMetadata(bare)?.dpi).toBeUndefined();
    const out = setImageDpi(bare, 300);
    expect(readImageMetadata(out)).toMatchObject({ width: 64, height: 48, dpi: { x: 300, y: 300 } });
  });

  it("adds a valid pHYs chunk to a PNG, replacing any earlier one", () => {
    const png = gradientPng(20, 10);
    const once = setImageDpi(png, 72);
    const twice = setImageDpi(once, 300);
    expect(readImageMetadata(once)).toMatchObject({ format: "png", width: 20, height: 10, dpi: { x: 72, y: 72 } });
    expect(readImageMetadata(twice)).toMatchObject({ width: 20, height: 10, dpi: { x: 300, y: 300 } });
    expect(twice.length).toBe(png.length + 21);
    // pHYs sits right after IHDR (8-byte signature + 25-byte IHDR chunk) with a correct CRC.
    const chunk = twice.subarray(33, 33 + 21);
    expect(new TextDecoder().decode(chunk.subarray(4, 8))).toBe("pHYs");
    const view = new DataView(chunk.buffer, chunk.byteOffset);
    expect(view.getUint32(17)).toBe(crc32(chunk.subarray(4, 17)));
    // The image data after it is unchanged.
    expect(twice.subarray(54)).toEqual(png.subarray(33));
  });

  it("leaves other formats alone and rejects silly values", () => {
    const other = new Uint8Array([1, 2, 3, 4, 5]);
    expect(setImageDpi(other, 150)).toBe(other);
    expect(() => setImageDpi(GRADIENT_JPEG_64x48, 0)).toThrow(RangeError);
    expect(() => setImageDpi(GRADIENT_JPEG_64x48, 70_000)).toThrow(RangeError);
  });
});

describe("pdfPasswordProblem", () => {
  const passwordError = (code: number) => {
    const cause = Object.assign(new Error("password"), { name: "PasswordException", code });
    return new ProcessingError("pdf-encrypted", undefined, { cause });
  };

  it("tells a missing password from a wrong one", () => {
    expect(pdfPasswordProblem(passwordError(1))).toBe("needed");
    expect(pdfPasswordProblem(passwordError(2))).toBe("incorrect");
  });

  it("ignores other errors", () => {
    expect(pdfPasswordProblem(new ProcessingError("pdf-encrypted"))).toBeNull();
    expect(pdfPasswordProblem(new ProcessingError("pdf-malformed"))).toBeNull();
    expect(pdfPasswordProblem(new Error("x"))).toBeNull();
  });
});
