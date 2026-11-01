import { PDFDocument, StandardFonts, degrees } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  extractPages,
  getPdfPageCount,
  imagesToPdf,
  loadPdf,
  mergePdfs,
  organizePdf,
  splitPdf,
} from "@/lib/file-processing/pdf/operations";
import { parsePageRanges, splitEvery } from "@/lib/file-processing/pdf/page-ranges";
import { GRADIENT_JPEG_64x48 } from "../fixtures/jpeg";
import { gradientPng } from "../helpers/png";
import { makeEncryptedPdf, makePdf, pageRotations, pageTags } from "../helpers/pdf";

describe("mergePdfs", () => {
  it("merges in the given order and preserves every page", async () => {
    const a = await makePdf([1, 2]);
    const b = await makePdf([3]);
    const c = await makePdf([4, 5, 6]);
    const merged = await mergePdfs([
      { name: "c.pdf", bytes: c },
      { name: "a.pdf", bytes: a },
      { name: "b.pdf", bytes: b },
    ]);
    expect(merged.pageCount).toBe(6);
    expect(await pageTags(merged.bytes)).toEqual([4, 5, 6, 1, 2, 3]);
  });

  it("reports progress and requires two files", async () => {
    const progress: number[] = [];
    await mergePdfs(
      [
        { name: "a", bytes: await makePdf([1]) },
        { name: "b", bytes: await makePdf([2]) },
      ],
      { onProgress: (done) => progress.push(done) },
    );
    expect(progress).toEqual([1, 2]);
    await expect(mergePdfs([{ name: "a", bytes: await makePdf([1]) }])).rejects.toMatchObject({ code: "no-file" });
  });

  it("names the file that failed", async () => {
    const good = await makePdf([1]);
    const bad = new TextEncoder().encode("%PDF-1.7\nthis is not really a pdf");
    await expect(
      mergePdfs([
        { name: "good.pdf", bytes: good },
        { name: "broken.pdf", bytes: bad },
      ]),
    ).rejects.toMatchObject({ code: "pdf-malformed", message: expect.stringContaining("broken.pdf") });
  });

  it("can be cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      mergePdfs(
        [
          { name: "a", bytes: await makePdf([1]) },
          { name: "b", bytes: await makePdf([2]) },
        ],
        { signal: controller.signal },
      ),
    ).rejects.toMatchObject({ code: "cancelled" });
  });
});

describe("splitPdf and extractPages", () => {
  it("creates one file per range with the right pages", async () => {
    const source = await makePdf([1, 2, 3, 4, 5, 6, 7]);
    const parts = await splitPdf(source, parsePageRanges("1-2, 4, 6-", 7));
    expect(parts.map((p) => p.label)).toEqual(["1-2", "4", "6-7"]);
    expect(await Promise.all(parts.map((p) => pageTags(p.bytes)))).toEqual([[1, 2], [4], [6, 7]]);
  });

  it("splits every N pages", async () => {
    const source = await makePdf([1, 2, 3, 4, 5]);
    const parts = await splitPdf(source, splitEvery(5, 2));
    expect(parts.map((p) => p.pageCount)).toEqual([2, 2, 1]);
    expect(await pageTags(parts[2]!.bytes)).toEqual([5]);
  });

  it("rejects ranges outside the document", async () => {
    const source = await makePdf([1, 2]);
    await expect(splitPdf(source, [{ start: 2, end: 3 }])).rejects.toMatchObject({ code: "page-range" });
  });

  it("extracts selected pages into one file in the chosen order", async () => {
    const source = await makePdf([1, 2, 3, 4]);
    const out = await extractPages(source, [3, 0]);
    expect(await pageTags(out.bytes)).toEqual([4, 1]);
    await expect(extractPages(source, [])).rejects.toMatchObject({ code: "pdf-empty" });
    await expect(extractPages(source, [9])).rejects.toMatchObject({ code: "page-range" });
  });
});

describe("organizePdf", () => {
  it("reorders, rotates and deletes pages", async () => {
    const source = await makePdf([1, 2, 3, 4]);
    const out = await organizePdf(source, [
      { sourceIndex: 2, rotation: 90 },
      { sourceIndex: 0, rotation: 0 },
      { sourceIndex: 3, rotation: 270 },
      // page index 1 (tag 2) deleted
    ]);
    expect(out.pageCount).toBe(3);
    expect(await pageTags(out.bytes)).toEqual([3, 1, 4]);
    expect(await pageRotations(out.bytes)).toEqual([90, 0, 270]);
  });

  it("adds rotation on top of the existing rotation", async () => {
    const first = await organizePdf(await makePdf([1]), [{ sourceIndex: 0, rotation: 270 }]);
    const second = await organizePdf(first.bytes, [{ sourceIndex: 0, rotation: 180 }]);
    expect(await pageRotations(second.bytes)).toEqual([90]);
  });

  it("refuses to delete every page", async () => {
    await expect(organizePdf(await makePdf([1]), [])).rejects.toMatchObject({ code: "pdf-empty" });
  });
});

describe("imagesToPdf", () => {
  it("creates one A4 page per image, landscape for wide images", async () => {
    const out = await imagesToPdf(
      [
        { bytes: GRADIENT_JPEG_64x48, format: "jpeg", width: 64, height: 48 },
        { bytes: gradientPng(30, 60, true), format: "png", width: 30, height: 60 },
      ],
      { pageSize: "a4", orientation: "auto", margin: 36 },
    );
    expect(out.pageCount).toBe(2);
    const doc = await PDFDocument.load(out.bytes);
    const [first, second] = doc.getPages();
    expect(first!.getWidth()).toBeCloseTo(841.89, 1);
    expect(second!.getWidth()).toBeCloseTo(595.28, 1);
  });

  it("sizes pages to the image when asked", async () => {
    const out = await imagesToPdf([{ bytes: gradientPng(96, 192), format: "png", width: 96, height: 192 }], {
      pageSize: "image",
      orientation: "auto",
      margin: 0,
    });
    const page = (await PDFDocument.load(out.bytes)).getPage(0);
    expect(page.getWidth()).toBeCloseTo(72);
    expect(page.getHeight()).toBeCloseTo(144);
  });

  it("rejects empty input", async () => {
    await expect(imagesToPdf([], { pageSize: "a4", orientation: "auto", margin: 0 })).rejects.toMatchObject({
      code: "no-file",
    });
  });
});

describe("loading untrusted PDFs", () => {
  it("rejects encrypted PDFs with a specific error", async () => {
    await expect(loadPdf(await makeEncryptedPdf())).rejects.toMatchObject({ code: "pdf-encrypted" });
  });

  it("rejects non-PDF content regardless of name", async () => {
    await expect(loadPdf(new TextEncoder().encode("hello"))).rejects.toMatchObject({ code: "unsupported-format" });
    await expect(loadPdf(new Uint8Array(0))).rejects.toMatchObject({ code: "corrupted" });
  });

  it("rejects malformed and truncated PDFs", async () => {
    const valid = await makePdf([1, 2, 3]);
    const truncated = valid.subarray(0, 40);
    await expect(loadPdf(truncated)).rejects.toMatchObject({ code: "pdf-malformed" });
    const garbage = new Uint8Array([...new TextEncoder().encode("%PDF-1.4\n"), ...new Uint8Array(500).fill(7)]);
    await expect(loadPdf(garbage)).rejects.toMatchObject({ code: "pdf-malformed" });
  });

  it("counts pages", async () => {
    expect(await getPdfPageCount(await makePdf([1, 2, 3]))).toBe(3);
  });
});

describe("fitPagesToA4", () => {
  it("puts every page on an A4 sheet of matching orientation, keeping page count", async () => {
    const { fitPagesToA4, getPageSizes } = await import("@/lib/file-processing/pdf/operations");
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    doc.addPage([612, 792]).drawText("Letter", { x: 50, y: 700, font }); // US Letter portrait
    doc.addPage([900, 400]).drawText("Wide", { x: 50, y: 200, font });
    const rotated = doc.addPage([300, 500]);
    rotated.drawText("Rotated", { x: 50, y: 250, font });
    rotated.setRotation(degrees(90));
    doc.addPage([200, 200]); // blank: no content stream
    const out = await fitPagesToA4(await doc.save());
    expect(out.pageCount).toBe(4);
    const sizes = await getPageSizes(out.bytes);
    expect(sizes[0]).toEqual({ width: 595.28, height: 841.89 });
    expect(sizes[1]).toEqual({ width: 841.89, height: 595.28 });
    // A 300×500 page rotated 90° displays landscape, so it lands on landscape A4.
    expect(sizes[2]).toEqual({ width: 841.89, height: 595.28 });
    expect(sizes[3]).toEqual({ width: 595.28, height: 841.89 });
    expect(await pageRotations(out.bytes)).toEqual([0, 0, 0, 0]);
  });
});

describe("encryption detection", () => {
  it("recognises a genuinely encrypted PDF (encrypted object streams) as password-protected", async () => {
    const { GHOSTSCRIPT_ENCRYPTED_PDF } = await import("../fixtures/encrypted-pdf");
    const { declaresEncryption } = await import("@/lib/file-processing/pdf/encryption");
    expect(declaresEncryption(GHOSTSCRIPT_ENCRYPTED_PDF)).toBe(true);
    await expect(loadPdf(GHOSTSCRIPT_ENCRYPTED_PDF)).rejects.toMatchObject({ code: "pdf-encrypted" });
    await expect(
      mergePdfs([
        { name: "ok.pdf", bytes: await makePdf([1]) },
        { name: "locked.pdf", bytes: GHOSTSCRIPT_ENCRYPTED_PDF },
      ]),
    ).rejects.toMatchObject({ code: "pdf-encrypted", message: expect.stringContaining("locked.pdf") });
  });

  it("does not flag ordinary PDFs or the word in other contexts", async () => {
    const { declaresEncryption } = await import("@/lib/file-processing/pdf/encryption");
    expect(declaresEncryption(await makePdf([1, 2]))).toBe(false);
    const text = (s: string) => new TextEncoder().encode(s);
    expect(declaresEncryption(text("%PDF-1.7 /EncryptMetadata false"))).toBe(false);
    expect(declaresEncryption(text("%PDF-1.7 (how to /Encrypt files)"))).toBe(false);
    expect(declaresEncryption(text("trailer << /Encrypt 5 0 R >>"))).toBe(true);
    expect(declaresEncryption(text("trailer << /Encrypt << /Filter /Standard >> >>"))).toBe(true);
  });
});
