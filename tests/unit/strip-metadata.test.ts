import { describe, expect, it } from "vitest";
import { prepareImageForPdf } from "@/features/pdf-tools/prepare-images";
import { readImageMetadata } from "@/lib/file-processing/image-metadata";
import type { InspectedImage } from "@/lib/file-processing/inspect";
import { imagesToPdf } from "@/lib/file-processing/pdf/operations";
import { stripJpegMetadata } from "@/lib/file-processing/strip-metadata";
import { GRADIENT_JPEG_64x48 } from "../fixtures/jpeg";

const text = (value: string) => [...new TextEncoder().encode(value)];

function segment(marker: number, payload: number[]): number[] {
  const length = payload.length + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...payload];
}

function contains(haystack: Uint8Array, needle: string): boolean {
  return Buffer.from(haystack).includes(needle);
}

const GPS = "GPS-28.6139N-77.2090E";

/** The fixture with every kind of metadata added after SOI and data appended after EOI. */
const TAGGED = new Uint8Array([
  0xff, 0xd8,
  ...segment(0xe1, [...text("Exif\0\0"), ...text(GPS)]),
  ...segment(0xe1, text("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>xmp-location</x:xmpmeta>")),
  ...segment(0xe2, [...text("ICC_PROFILE\0"), 1, 1, ...text("icc-data")]),
  ...segment(0xe2, text("MPF\0mpf-index")),
  ...segment(0xed, text("Photoshop 3.0\0iptc-caption")),
  ...segment(0xee, [...text("Adobe"), 0, 100, 0, 0, 0, 0, 1]),
  ...segment(0xfe, text("comment-text")),
  0xff, 0xff, // fill bytes before the next marker
  ...GRADIENT_JPEG_64x48.subarray(2),
  ...text("trailing-motion-photo-video"),
]);

/** Fixture bytes from the frame header to EOI: the image data that must survive unchanged. */
function imageData(jpeg: Uint8Array): Uint8Array {
  const sof = jpeg.findIndex((byte, i) => byte === 0xff && jpeg[i + 1] === 0xc0);
  return jpeg.subarray(sof);
}

describe("stripJpegMetadata", () => {
  it("removes EXIF, XMP, IPTC, MPF, comments and data after the image", () => {
    const out = stripJpegMetadata(TAGGED)!;
    for (const marker of [GPS, "xmp-location", "mpf-index", "iptc-caption", "comment-text", "trailing-motion-photo-video", "Exif", "Photoshop"]) {
      expect(contains(out, marker), marker).toBe(false);
    }
  });

  it("keeps what decoding needs and leaves the image data byte-identical", () => {
    const out = stripJpegMetadata(TAGGED)!;
    for (const marker of ["JFIF", "ICC_PROFILE", "Adobe"]) expect(contains(out, marker), marker).toBe(true);
    const data = imageData(GRADIENT_JPEG_64x48);
    expect(Buffer.from(out.subarray(out.length - data.length)).equals(Buffer.from(data))).toBe(true);
    expect(readImageMetadata(out)).toMatchObject({ format: "jpeg", width: 64, height: 48, components: 3 });
  });

  it("returns null for input it does not understand", () => {
    expect(stripJpegMetadata(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(stripJpegMetadata(GRADIENT_JPEG_64x48.subarray(0, GRADIENT_JPEG_64x48.length - 40))).toBeNull(); // no EOI
    const badLength = GRADIENT_JPEG_64x48.slice();
    badLength[4] = 0xff; // APP0 length runs past the end of the file
    expect(stripJpegMetadata(badLength)).toBeNull();
  });
});

describe("images to PDF", () => {
  it("does not copy camera metadata into the PDF", async () => {
    const image: InspectedImage = {
      file: new File([TAGGED], "photo.jpg", { type: "image/jpeg" }),
      format: "jpeg",
      width: 64,
      height: 48,
      hasAlpha: false,
      size: TAGGED.length,
    };
    const prepared = await prepareImageForPdf(image);
    const pdf = await imagesToPdf([prepared], { pageSize: "a4", orientation: "auto", margin: 36 });
    expect(pdf.pageCount).toBe(1);
    expect(contains(pdf.bytes, GPS)).toBe(false);
    expect(contains(pdf.bytes, "xmp-location")).toBe(false);
  });
});
