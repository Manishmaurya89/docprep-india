import { PDFDocument } from "pdf-lib";
import { expect, test } from "@playwright/test";
import { readImageMetadata } from "@/lib/file-processing/image-metadata";
import { GHOSTSCRIPT_ENCRYPTED_PDF } from "../fixtures/encrypted-pdf";
import { gradientPng } from "../helpers/png";
import { pageTags } from "../helpers/pdf";
import { appAlert, browserJpeg, downloadFrom, jpegFile, pdfFile, pngFile, withExifOrientation } from "./helpers";

/** A4 PDF whose pages are large photographic JPEGs, like a phone-scanned document. */
async function scannedPdf(jpeg: Uint8Array, pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const image = await doc.embedJpg(jpeg);
  for (let i = 0; i < pages; i++) doc.addPage([595.28, 841.89]).drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 });
  return doc.save();
}

test.describe("real-content paths", () => {
  test("compresses a scan-heavy PDF by recompressing its JPEG images", async ({ page }) => {
    await page.goto("/tools/compress-pdf");
    const jpeg = await browserJpeg(page, 2000, 2800, 0.95);
    const source = await scannedPdf(jpeg, 2);
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("scan.pdf", source));
    await page.getByRole("button", { name: "Compress PDF" }).click();
    const result = page.getByTestId("pdf-result");
    await expect(result).toBeVisible({ timeout: 45_000 });
    await expect(result.getByText(/Reduced to/)).toBeVisible();
    // The same image object is shared by both pages, so one recompression is expected.
    await expect(result.getByText("1 of 1")).toBeVisible();
    const { bytes } = await downloadFrom(page, () => result.getByRole("button", { name: "Download PDF" }).click());
    expect(bytes.length).toBeLessThan(source.length * 0.8);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
  });

  test("brings a large scanned certificate under the 500 KB limit on A4", async ({ page }) => {
    await page.goto("/exam/ibps-crp-po-mt-xvi");
    const jpeg = await browserJpeg(page, 2480, 3508, 0.95);
    const source = await scannedPdf(jpeg, 1);
    expect(source.length).toBeGreaterThan(600_000);
    const card = page.getByTestId("document-class-10-certificate");
    await card.locator('input[type="file"]').setInputFiles(pdfFile("certificate.pdf", source));
    await card.getByRole("button", { name: "Prepare PDF" }).click();
    const report = card.getByTestId("validation-report");
    await expect(report).toBeVisible({ timeout: 60_000 });
    await expect(report.locator('[data-finding="max-size"]')).toHaveAttribute("data-status", "pass");
    await expect(report.locator('[data-finding="page-size"]')).toHaveAttribute("data-status", "pass");
    expect(Number(await card.getByTestId("prepared-result").getAttribute("data-size"))).toBeLessThanOrEqual(500_000);
  });

  test("handles a phone photo stored sideways with an EXIF orientation tag", async ({ page }) => {
    await page.goto("/tools/resize-image");
    // Stored 400 × 300; orientation 6 means it displays as 300 × 400.
    const rotated = withExifOrientation(await browserJpeg(page, 400, 300), 6);
    await page.getByTestId("image-input").setInputFiles(jpegFile("phone.jpg", rotated));
    await expect(page.getByText("JPEG · 300 × 400 px")).toBeVisible();
    await page.getByLabel("Width", { exact: true }).fill("150");
    await expect(page.getByTestId("resize-preview-dimensions")).toHaveText("150 × 200 px");
    await page.getByRole("button", { name: "Resize image" }).click();
    const { bytes } = await downloadFrom(page, () => page.getByTestId("image-result").getByRole("button", { name: /Download/ }).click());
    // Saved upright, without the orientation tag.
    expect(readImageMetadata(bytes)).toMatchObject({ width: 150, height: 200 });
    expect(readImageMetadata(bytes)?.orientation).toBeUndefined();
  });

  test("warns before transparency is lost when converting to JPEG", async ({ page }) => {
    await page.goto("/tools/convert-image");
    await page.getByTestId("image-input").setInputFiles(pngFile("logo.png", gradientPng(300, 200, true)));
    await expect(page.getByText("has transparency")).toBeVisible();
    await expect(page.getByText("Transparency will be lost")).toBeVisible();
    await page.getByRole("button", { name: "Convert to JPEG" }).click();
    const { bytes } = await downloadFrom(page, () => page.getByTestId("image-result").getByRole("button", { name: /Download/ }).click());
    expect(readImageMetadata(bytes)).toMatchObject({ format: "jpeg", width: 300, height: 200, hasAlpha: false });
  });

  test("rotating 90° swaps the output dimensions", async ({ page }) => {
    await page.goto("/tools/crop-rotate-image");
    await page.getByTestId("image-input").setInputFiles(pngFile("wide.png", gradientPng(320, 200)));
    await page.getByRole("button", { name: "Rotate 90° right" }).click();
    await expect(page.getByText("Output: 200 × 320 px")).toBeVisible();
    await page.getByRole("button", { name: "Apply crop & rotation" }).click();
    const { bytes } = await downloadFrom(page, () => page.getByTestId("image-result").getByRole("button", { name: /Download/ }).click());
    expect(readImageMetadata(bytes)).toMatchObject({ width: 200, height: 320 });
  });

  test("identifies a genuinely encrypted PDF", async ({ page }) => {
    await page.goto("/tools/merge-pdf");
    await page.getByTestId("pdf-input").setInputFiles([pdfFile("locked.pdf", GHOSTSCRIPT_ENCRYPTED_PDF)]);
    await expect(page.getByText(/locked\.pdf" is password-protected or locked against editing/)).toBeVisible();
    await page.goto("/tools/organize-pdf");
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("locked.pdf", GHOSTSCRIPT_ENCRYPTED_PDF));
    await expect(appAlert(page)).toContainText("Print → Save as PDF");
  });

  test("verification sheet lists every official record with its source", async ({ page }) => {
    const { SPECS } = await import("@/data/exam-requirements");
    await page.goto("/exam/verify");
    const records = page.getByTestId("verify-record");
    await expect(records).toHaveCount(SPECS.filter((spec) => spec.verificationStatus !== "example").length);
    await expect(page.getByText("rrb-station-master-cen-08-2026").first()).toBeVisible();
    await expect(records.first().getByRole("link")).toHaveAttribute("href", /^https:\/\//);
    await expect(page.getByRole("checkbox", { name: "ibps-crp-po-mt-xvi Photograph File size matches the source" })).toBeVisible();
    await expect(page.getByText("20–50 KB").first()).toBeVisible();
    await expect(page.getByText("Example preset")).toHaveCount(0);
  });

  test("merged output keeps the order after moving files down", async ({ page }) => {
    const { makePdf } = await import("../helpers/pdf");
    await page.goto("/tools/merge-pdf");
    await page.getByTestId("pdf-input").setInputFiles([pdfFile("a.pdf", await makePdf([1])), pdfFile("b.pdf", await makePdf([2])), pdfFile("c.pdf", await makePdf([3]))]);
    await expect(page.getByText("1 page · ")).toHaveCount(3);
    await page.getByRole("button", { name: "Move a.pdf down" }).click();
    await page.getByRole("button", { name: "Move a.pdf down" }).click();
    await page.getByRole("button", { name: "Merge 3 PDFs" }).click();
    const { bytes } = await downloadFrom(page, () => page.getByTestId("pdf-result").getByRole("button", { name: "Download PDF" }).click());
    expect(await pageTags(bytes)).toEqual([2, 3, 1]);
  });
});
