import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { compressPdf } from "@/lib/file-processing/pdf/compress";
import type { ReencodeJpegRequest } from "@/lib/file-processing/image/jobs";
import { GRADIENT_JPEG_64x48 } from "../fixtures/jpeg";
import { makePdf, pageTags } from "../helpers/pdf";

async function pdfWithJpeg(copies = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < copies; i++) {
    const image = await doc.embedJpg(GRADIENT_JPEG_64x48);
    const page = doc.addPage([300 + 10 * (i + 1), 400]);
    page.drawImage(image, { x: 10, y: 10, width: 64, height: 48 });
  }
  return doc.save();
}

function imageStreams(doc: PDFDocument): PDFRawStream[] {
  return doc.context
    .enumerateIndirectObjects()
    .map(([, obj]) => obj)
    .filter((obj): obj is PDFRawStream => obj instanceof PDFRawStream && obj.dict.get(PDFName.of("Subtype")) === PDFName.of("Image"));
}

describe("compressPdf", () => {
  it("re-saves structurally, keeps every page, and reports real sizes", async () => {
    const source = await makePdf([1, 2, 3]);
    const result = await compressPdf(source, { recompressImages: false });
    expect(result.originalSize).toBe(source.length);
    expect(result.outputSize).toBe(result.bytes.length);
    expect(result.pageCount).toBe(3);
    expect(await pageTags(result.bytes)).toEqual([1, 2, 3]);
  });

  it("replaces embedded JPEGs only when the re-encoded stream is smaller", async () => {
    const source = await pdfWithJpeg(2);
    const requests: ReencodeJpegRequest[] = [];
    const tiny = GRADIENT_JPEG_64x48.subarray(0, 200); // stand-in "smaller" stream
    const result = await compressPdf(source, {
      recompressImages: true,
      imageQuality: 0.5,
      maxImageDimension: 32,
      reencodeJpeg: async (request) => {
        requests.push(request);
        return { bytes: tiny, width: 32, height: 24 };
      },
    });
    expect(requests).toHaveLength(2);
    expect(requests[0]).toMatchObject({ width: 64, height: 48, quality: 0.5, maxDimension: 32 });
    expect(result.imagesFound).toBe(2);
    expect(result.imagesRecompressed).toBe(2);
    expect(result.outputSize).toBeLessThan(result.originalSize);

    const doc = await PDFDocument.load(result.bytes);
    const images = imageStreams(doc);
    expect(images).toHaveLength(2);
    for (const image of images) {
      expect(image.dict.get(PDFName.of("Width"))?.toString()).toBe("32");
      expect(image.contents.length).toBe(200);
    }
  });

  it("keeps the original image when re-encoding does not help", async () => {
    const source = await pdfWithJpeg(1);
    const result = await compressPdf(source, {
      recompressImages: true,
      reencodeJpeg: async (request) => ({ bytes: request.bytes, width: request.width, height: request.height }),
    });
    expect(result.imagesRecompressed).toBe(0);
    const [image] = imageStreams(await PDFDocument.load(result.bytes));
    expect(image!.contents.length).toBe(GRADIENT_JPEG_64x48.length);
  });

  it("leaves images alone when the re-encoder declines them", async () => {
    const result = await compressPdf(await pdfWithJpeg(1), { recompressImages: true, reencodeJpeg: async () => null });
    expect(result.imagesRecompressed).toBe(0);
    expect(result.pageCount).toBe(1);
  });

  it("propagates encryption and cancellation errors", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      compressPdf(await pdfWithJpeg(1), { recompressImages: true, reencodeJpeg: async () => null, signal: controller.signal }),
    ).rejects.toMatchObject({ code: "cancelled" });
  });
});

describe("reencodeJpeg", () => {
  it("leaves JPEGs with an EXIF orientation untouched (PDF viewers ignore EXIF)", async () => {
    const { reencodeJpeg } = await import("@/lib/file-processing/image/jobs");
    const tiff = [0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 3, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const payload = [...new TextEncoder().encode("Exif"), 0, 0, ...tiff];
    const rotated = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, payload.length + 2, ...payload, ...GRADIENT_JPEG_64x48.subarray(2)]);
    // Returns before touching any browser API, so this runs in Node.
    const backend = { name: "dom" as const, create: () => { throw new Error("should not render"); }, toBlob: async () => new Blob() };
    expect(await reencodeJpeg({ bytes: rotated, width: 64, height: 48, quality: 0.5 }, backend)).toBeNull();
  });
});
