import { describe, expect, it } from "vitest";
import { detectFormat, isImageFormat, unsupportedFormatHint } from "@/lib/file-processing/detect";
import { GRADIENT_JPEG_64x48 } from "../fixtures/jpeg";
import { gradientPng } from "../helpers/png";
import { makePdf } from "../helpers/pdf";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);

describe("detectFormat", () => {
  it("detects real JPEG, PNG and PDF content", async () => {
    expect(detectFormat(GRADIENT_JPEG_64x48)).toBe("jpeg");
    expect(detectFormat(gradientPng(4, 4))).toBe("png");
    expect(detectFormat(await makePdf([1]))).toBe("pdf");
  });

  it("detects WebP RIFF containers", () => {
    expect(detectFormat(text("RIFF\u0000\u0000\u0000\u0000WEBPVP8 "))).toBe("webp");
    expect(detectFormat(text("RIFF\u0000\u0000\u0000\u0000WAVEfmt "))).toBe("unknown");
  });

  it("detects formats we reject so we can explain why", () => {
    expect(detectFormat(text("GIF89a......"))).toBe("gif");
    expect(detectFormat(text("BM.........."))).toBe("bmp");
    expect(detectFormat(text("\u0000\u0000\u0000\u0018ftypheic"))).toBe("heic");
    expect(detectFormat(bytes(0x49, 0x49, 0x2a, 0x00))).toBe("tiff");
  });

  it("accepts a PDF header preceded by junk within the first 1024 bytes", () => {
    const junk = new Uint8Array(300).fill(0x20);
    const withHeader = new Uint8Array([...junk, ...text("%PDF-1.7\n")]);
    expect(detectFormat(withHeader)).toBe("pdf");
  });

  it("does not trust names: a text file is unknown regardless of extension", () => {
    expect(detectFormat(text("hello, this is not an image"))).toBe("unknown");
    expect(detectFormat(new Uint8Array(0))).toBe("unknown");
    expect(detectFormat(bytes(0xff, 0xd8))).toBe("unknown"); // truncated JPEG marker
  });

  it("classifies image formats and gives specific hints", () => {
    expect(isImageFormat("jpeg")).toBe(true);
    expect(isImageFormat("pdf")).toBe(false);
    expect(unsupportedFormatHint("heic")).toMatch(/Most Compatible/);
    expect(unsupportedFormatHint("unknown")).toMatch(/Renaming/);
  });
});
