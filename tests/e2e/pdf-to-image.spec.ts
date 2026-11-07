import AxeBuilder from "@axe-core/playwright";
import { unzipSync } from "fflate";
import { type Page, expect, test } from "@playwright/test";
import { PDFDocument, degrees } from "pdf-lib";
import { readImageMetadata } from "@/lib/file-processing/image-metadata";
import { GHOSTSCRIPT_ENCRYPTED_PDF } from "../fixtures/encrypted-pdf";
import { makePdf, pageWidthFor } from "../helpers/pdf";
import { noisePng } from "../helpers/png";
import { downloadFrom, pdfFile, recordRequests } from "./helpers";

/** Share of clearly dark pixels, measured by decoding the image in the browser. */
async function darkShare(page: Page, bytes: Uint8Array, mime: string): Promise<number> {
  return page.evaluate(
    async ({ base64, mime }) => {
      const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([data], { type: mime }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
      let dark = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i]! + pixels[i + 1]! + pixels[i + 2]! < 300) dark++;
      return dark / (pixels.length / 4);
    },
    { base64: Buffer.from(bytes).toString("base64"), mime },
  );
}

/** One A4 page covered by a noisy picture, so JPEG sizes are large. */
async function photoPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(noisePng(400, 560, 7));
  const pdfPage = doc.addPage([595.28, 841.89]);
  pdfPage.drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 });
  return doc.save();
}

test.describe("PDF to JPG/PNG", () => {
  test("converts every page to JPG with DPI recorded, and offers a ZIP", async ({ page, baseURL }) => {
    const network = recordRequests(page);
    await page.goto("/tools/pdf-to-image");
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("marks.pdf", await makePdf([1, 2, 3])));
    await expect(page.getByText("PDF · 3 pages")).toBeVisible();
    await expect(page.getByRole("img", { name: "Preview of page 3" })).toBeVisible();

    await page.getByRole("button", { name: "Convert 3 pages to JPG" }).click();
    const result = page.getByTestId("pdf-image-result");
    await expect(result.getByTestId("pdf-image")).toHaveCount(3);
    await expect(result.getByText("3 images ready")).toBeVisible();

    const { download, bytes } = await downloadFrom(page, () => result.getByTestId("pdf-image").nth(1).getByRole("button", { name: "Download" }).click());
    expect(download.suggestedFilename()).toBe("marks-page-2.jpg");
    // 150 DPI: points × 150 / 72.
    expect(readImageMetadata(bytes)).toMatchObject({ format: "jpeg", width: Math.round((pageWidthFor(2) * 150) / 72), height: 833, dpi: { x: 150, y: 150 } });
    expect(await darkShare(page, bytes, "image/jpeg")).toBeGreaterThan(0.001);

    const { download: zipDownload, bytes: zip } = await downloadFrom(page, () => result.getByRole("button", { name: "Download all (ZIP)" }).click());
    expect(zipDownload.suggestedFilename()).toBe("marks-jpg.zip");
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual(["marks-page-1.jpg", "marks-page-2.jpg", "marks-page-3.jpg"]);
    expect(readImageMetadata(files["marks-page-3.jpg"]!)?.width).toBe(Math.round((pageWidthFor(3) * 150) / 72));
    network.assertNoUploads(baseURL!);
  });

  test("converts chosen pages to high-resolution PNG, keeping page rotation", async ({ page }) => {
    const doc = await PDFDocument.load(await makePdf([1, 2, 3]));
    doc.getPage(1).setRotation(degrees(90));
    await page.goto("/tools/pdf-to-image");
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("scan.pdf", await doc.save()));
    await expect(page.getByText("3 of 3 selected.")).toBeVisible();

    await page.getByLabel("Select by page numbers").fill("2");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("1 of 3 selected.")).toBeVisible();
    await page.getByText("PNG", { exact: true }).click();
    await page.getByText("High", { exact: true }).click();
    await expect(page.getByText(/^300 DPI: sharpest/)).toBeVisible();

    await page.getByRole("button", { name: "Convert 1 page to PNG" }).click();
    const result = page.getByTestId("pdf-image-result");
    await expect(result.getByTestId("pdf-image")).toHaveCount(1);
    await expect(result.getByRole("button", { name: "Download all (ZIP)" })).toHaveCount(0);
    const { download, bytes } = await downloadFrom(page, () => result.getByRole("button", { name: "Download" }).click());
    expect(download.suggestedFilename()).toBe("scan-page-2.png");
    // Rotated 90°: the image is landscape (height and width swapped).
    expect(readImageMetadata(bytes)).toMatchObject({ format: "png", width: 1667, height: Math.round((pageWidthFor(2) * 300) / 72), dpi: { x: 300, y: 300 } });
  });

  test("opens a password-protected PDF with its password, on the device", async ({ page, baseURL }) => {
    const network = recordRequests(page);
    await page.goto("/tools/pdf-to-image");
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("e-aadhaar.pdf", GHOSTSCRIPT_ENCRYPTED_PDF));
    const lock = page.getByTestId("pdf-password");
    await expect(lock.getByText("This PDF needs a password")).toBeVisible();
    await expect(lock.getByText(/first four letters of your name in capitals/)).toBeVisible();

    const field = lock.getByLabel("PDF password");
    await expect(field).toHaveAttribute("type", "password");
    await field.fill("wrong");
    await lock.getByRole("button", { name: "Open PDF" }).click();
    await expect(lock.getByText("That password is not correct.", { exact: false })).toBeVisible();

    await field.fill("test1234");
    await field.press("Enter");
    await expect(lock).toHaveCount(0);
    await expect(page.getByText(/PDF · 1 page · .* · opened with its password/)).toBeVisible();

    await page.getByRole("button", { name: "Convert 1 page to JPG" }).click();
    const result = page.getByTestId("pdf-image-result");
    const { download, bytes } = await downloadFrom(page, () => result.getByRole("button", { name: "Download" }).click());
    expect(download.suggestedFilename()).toBe("e-aadhaar.jpg");
    expect(readImageMetadata(bytes)).toMatchObject({ format: "jpeg", width: 1240, height: 1754 });
    // The decrypted page has visible content, not a blank sheet.
    expect(await darkShare(page, bytes, "image/jpeg")).toBeGreaterThan(0.001);
    // The password never appears in any request.
    expect(network.requests.filter((request) => request.url.includes("test1234"))).toEqual([]);
    network.assertNoUploads(baseURL!);
  });

  test("meets a size limit, and says so when a limit cannot be reached", async ({ page }) => {
    await page.goto("/tools/pdf-to-image");
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("photo.pdf", await photoPdf()));
    await expect(page.getByText("PDF · 1 page")).toBeVisible();
    const limit = page.getByLabel("Size limit per image (optional)");

    await limit.fill("abc");
    await expect(page.getByText("Enter a size in KB, for example 200.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Convert 1 page to JPG" })).toBeDisabled();

    await limit.fill("1");
    await page.getByRole("button", { name: "Convert 1 page to JPG" }).click();
    const result = page.getByTestId("pdf-image-result");
    await expect(result.getByText(/Page 1 could not get under 1 KB/)).toBeVisible({ timeout: 30_000 });

    await limit.fill("150");
    await page.getByRole("button", { name: "Convert 1 page to JPG" }).click();
    await expect(result.getByTestId("pdf-image")).toHaveCount(1, { timeout: 30_000 });
    await expect(result.getByText(/could not get under/)).toHaveCount(0);
    const { bytes } = await downloadFrom(page, () => result.getByRole("button", { name: "Download" }).click());
    expect(bytes.length).toBeLessThanOrEqual(150_000);
    expect(readImageMetadata(bytes)?.format).toBe("jpeg");

    // PNG cannot be size-limited; the option says so instead of pretending.
    await page.getByText("PNG", { exact: true }).click();
    await expect(limit).toHaveCount(0);
    await expect(page.getByText(/A size limit works with JPG only/)).toBeVisible();
  });

  test("password form, page grid and results have no WCAG A/AA violations", async ({ page }) => {
    const axe = async () => {
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    };
    await page.goto("/tools/pdf-to-image");
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("locked.pdf", GHOSTSCRIPT_ENCRYPTED_PDF));
    await page.getByLabel("PDF password").fill("nope");
    await page.getByRole("button", { name: "Open PDF" }).click();
    await expect(page.getByText(/That password is not correct/)).toBeVisible();
    await axe();

    await page.getByRole("button", { name: "Remove" }).click();
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("doc.pdf", await makePdf([1, 2])));
    await expect(page.getByRole("img", { name: "Preview of page 2" })).toBeVisible();
    await page.getByRole("button", { name: "Convert 2 pages to JPG" }).click();
    await expect(page.getByTestId("pdf-image")).toHaveCount(2);
    await axe();
  });

  test("works in Hindi, including the password prompt", async ({ page }) => {
    await page.goto("/hi/tools/pdf-to-image");
    await expect(page.getByRole("heading", { level: 1, name: "PDF से JPG या PNG" })).toBeVisible();
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("locked.pdf", GHOSTSCRIPT_ENCRYPTED_PDF));
    await expect(page.getByText("इस PDF को खोलने के लिए पासवर्ड चाहिए")).toBeVisible();
    await page.getByLabel("PDF का पासवर्ड").fill("test1234");
    await page.getByRole("button", { name: "PDF खोलें" }).click();
    await page.getByRole("button", { name: "1 पेज JPG में बदलें" }).click();
    await expect(page.getByText("1 इमेज तैयार")).toBeVisible();
  });

  test("rejects a file that is not a PDF", async ({ page }) => {
    await page.goto("/tools/pdf-to-image");
    await page.getByTestId("pdf-input").setInputFiles({ name: "photo.pdf", mimeType: "application/pdf", buffer: Buffer.from(noisePng(4, 4)) });
    await expect(page.getByText('"photo.pdf" is not a PDF.')).toBeVisible();
  });
});
