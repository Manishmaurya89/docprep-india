import { unzipSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProcessingError, fromSerialized, toProcessingError } from "@/lib/file-processing/errors";
import { baseName, outputName, sanitizeFilename, uniqueNames } from "@/lib/file-processing/filenames";
import { formatBytes, formatReduction, percentReduction, toBytes } from "@/lib/file-processing/format";
import { ObjectUrlRegistry } from "@/lib/file-processing/object-urls";
import { createZip } from "@/lib/file-processing/zip";
import { CATEGORY_LABELS, TOOLS, searchTools, toolsByCategory } from "@/lib/tools/registry";

describe("filenames", () => {
  it("removes paths and unsafe characters", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("C:\\Users\\me\\photo.JPG")).toBe("photo.jpg");
    expect(sanitizeFilename('my<photo>:"final"?.png')).toBe("myphotofinal.png");
    expect(sanitizeFilename("   ")).toBe("file");
    expect(sanitizeFilename(`${"a".repeat(200)}.pdf`)).toBe(`${"a".repeat(80)}.pdf`);
  });

  it("builds output names and keeps them unique", () => {
    expect(outputName("IMG 1.jpeg", "resized", "webp")).toBe("IMG 1-resized.webp");
    expect(outputName("scan.pdf", "", "pdf")).toBe("scan.pdf");
    expect(baseName("report.final.pdf")).toBe("report.final");
    expect(uniqueNames(["a.jpg", "A.jpg", "a.jpg", "b.pdf"])).toEqual(["a.jpg", "A (2).jpg", "a (3).jpg", "b.pdf"]);
  });
});

describe("formatting", () => {
  it("formats sizes and reductions", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(51_200)).toBe("50.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(percentReduction(100, 25)).toBe(75);
    expect(formatReduction(100, 25)).toBe("75.0% smaller");
    expect(formatReduction(100, 120)).toBe("20.0% larger");
    expect(formatReduction(100, 100)).toBe("No change");
    expect(toBytes(2, "MB")).toBe(2 * 1024 * 1024);
  });
});

describe("createZip", () => {
  it("stores every file with a unique safe name", () => {
    const zip = createZip([
      { name: "photo.jpg", data: new Uint8Array([1, 2, 3]) },
      { name: "../photo.jpg", data: new Uint8Array([4]) },
      { name: "doc.pdf", data: new Uint8Array([5, 6]) },
    ]);
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual(["doc.pdf", "photo (2).jpg", "photo.jpg"]);
    expect(Array.from(files["photo (2).jpg"]!)).toEqual([4]);
  });
});

describe("ObjectUrlRegistry", () => {
  afterEach(() => vi.restoreAllMocks());

  it("revokes what it created, once", () => {
    let n = 0;
    const create = vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:test/${++n}`);
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const registry = new ObjectUrlRegistry();
    const a = registry.create(new Blob(["a"]));
    registry.create(new Blob(["b"]));
    registry.revoke(a);
    registry.revoke(a);
    registry.revoke("blob:not-ours");
    expect(revoke).toHaveBeenCalledTimes(1);
    registry.revokeAll();
    expect(revoke).toHaveBeenCalledTimes(2);
    expect(registry.size).toBe(0);
    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe("error mapping", () => {
  it("maps browser and library errors to specific codes", () => {
    expect(toProcessingError(new DOMException("aborted", "AbortError")).code).toBe("cancelled");
    expect(toProcessingError(new RangeError("Array buffer allocation failed")).code).toBe("out-of-memory");
    const encrypted = new Error("Input document to `PDFDocument.load` is encrypted");
    encrypted.name = "EncryptedPDFError";
    expect(toProcessingError(encrypted).code).toBe("pdf-encrypted");
    expect(toProcessingError(new DOMException("The source image could not be decoded.", "InvalidStateError")).code).toBe("corrupted");
    expect(toProcessingError("weird").code).toBe("unknown");
  });

  it("keeps hints and survives worker serialisation", () => {
    const original = new ProcessingError("pdf-encrypted");
    expect(original.hint).toMatch(/remove the password/);
    const copy = fromSerialized(JSON.parse(JSON.stringify(original.toJSON())));
    expect(copy).toBeInstanceOf(ProcessingError);
    expect(copy.code).toBe("pdf-encrypted");
    expect(copy.hint).toBe(original.hint);
  });
});

describe("tool registry", () => {
  it("has unique slugs and links, and a label for each category", () => {
    expect(new Set(TOOLS.map((t) => t.slug)).size).toBe(TOOLS.length);
    expect(new Set(TOOLS.map((t) => t.href)).size).toBe(TOOLS.length);
    for (const category of Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]) {
      expect(toolsByCategory(category).length).toBeGreaterThan(0);
    }
  });

  it("finds tools by task words", () => {
    expect(searchTools("50 kb")[0]?.slug).toBe("compress-image");
    expect(searchTools("merge")[0]?.slug).toBe("merge-pdf");
    expect(searchTools("signature").map((t) => t.slug)).toContain("photo-signature");
    expect(searchTools("ibps")[0]?.slug).toBe("exam");
    expect(searchTools("kyc").map((t) => t.slug)).toEqual(expect.arrayContaining(["photo-signature", "images-to-pdf", "compress-pdf"]));
    expect(searchTools("passport")[0]?.slug).toBe("photo-signature");
    expect(searchTools("bank statement")[0]?.slug).toBe("compress-pdf");
    expect(searchTools("aadhaar")[0]?.slug).toBe("images-to-pdf");
    expect(searchTools("nothing-matches-this")).toEqual([]);
    expect(searchTools("").length).toBe(TOOLS.length);
  });
});
