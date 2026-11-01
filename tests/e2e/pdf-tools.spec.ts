import { unzipSync } from "fflate";
import { expect, test } from "@playwright/test";
import { makeEncryptedPdf, makePdf, pageRotations, pageTags } from "../helpers/pdf";
import { gradientPng } from "../helpers/png";
import { appAlert, downloadFrom, pdfFile, pngFile, recordRequests } from "./helpers";

test.describe("PDF tools", () => {
  test("merge PDFs in a chosen order", async ({ page, baseURL }) => {
    const network = recordRequests(page);
    await page.goto("/tools/merge-pdf");
    await page.getByTestId("pdf-input").setInputFiles([pdfFile("first.pdf", await makePdf([1, 2])), pdfFile("second.pdf", await makePdf([3]))]);
    await expect(page.getByText("2 pages · ")).toBeVisible();
    await expect(page.getByText("1 page · ")).toBeVisible();

    // Put second.pdf first.
    await page.getByRole("button", { name: "Move second.pdf up" }).click();
    await page.getByRole("button", { name: "Merge 2 PDFs" }).click();
    const result = page.getByTestId("pdf-result");
    await expect(result).toHaveAttribute("data-page-count", "3");
    const { download, bytes } = await downloadFrom(page, () => result.getByRole("button", { name: "Download PDF" }).click());
    expect(download.suggestedFilename()).toBe("merged.pdf");
    expect(await pageTags(bytes)).toEqual([3, 1, 2]);
    network.assertNoUploads(baseURL!);
  });

  test("split a PDF by page ranges", async ({ page }) => {
    await page.goto("/tools/split-pdf");
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("report.pdf", await makePdf([1, 2, 3, 4, 5])));
    await expect(page.getByText("PDF · 5 pages")).toBeVisible();

    await page.getByLabel("Page ranges").fill("9");
    await expect(page.getByText(/"9" goes beyond the last page/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Split PDF" })).toBeDisabled();

    await page.getByLabel("Page ranges").fill("1-2, 4-");
    await expect(page.getByText("Creates 2 files: 1-2, 4-5")).toBeVisible();
    await page.getByRole("button", { name: "Split PDF" }).click();
    const result = page.getByTestId("split-result");
    await expect(result.getByTestId("split-part")).toHaveCount(2);

    const { bytes: part } = await downloadFrom(page, () => result.getByTestId("split-part").nth(1).getByRole("button", { name: "Download" }).click());
    expect(await pageTags(part)).toEqual([4, 5]);
    const { download, bytes: zip } = await downloadFrom(page, () => result.getByRole("button", { name: "Download all (ZIP)" }).click());
    expect(download.suggestedFilename()).toBe("report-split.zip");
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual(["report-pages-1-2.pdf", "report-pages-4-5.pdf"]);
    expect(await pageTags(files["report-pages-1-2.pdf"]!)).toEqual([1, 2]);
  });

  test("reorder, rotate and delete pages with previews", async ({ page }) => {
    await page.goto("/tools/organize-pdf");
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("doc.pdf", await makePdf([1, 2, 3])));
    await expect(page.getByTestId("page-card")).toHaveCount(3);
    await expect(page.getByRole("img", { name: "Preview of page 1" })).toBeVisible();

    await page.getByRole("button", { name: "Move page 3 earlier" }).click();
    await page.getByRole("button", { name: "Rotate page 1 right" }).click();
    await page.getByRole("button", { name: "Delete page 2" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    const result = page.getByTestId("pdf-result");
    await expect(result).toHaveAttribute("data-page-count", "2");
    const { bytes } = await downloadFrom(page, () => result.getByRole("button", { name: "Download PDF" }).click());
    expect(await pageTags(bytes)).toEqual([1, 3]);
    expect(await pageRotations(bytes)).toEqual([90, 0]);
  });

  test("extract selected pages", async ({ page }) => {
    await page.goto("/tools/extract-pdf-pages");
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("doc.pdf", await makePdf([1, 2, 3, 4])));
    await page.getByLabel("Select by page numbers").fill("2, 4");
    await page.getByRole("button", { name: "Apply" }).click();
    await page.getByRole("button", { name: "Extract 2 pages" }).click();
    const { bytes } = await downloadFrom(page, () => page.getByTestId("pdf-result").getByRole("button", { name: "Download PDF" }).click());
    expect(await pageTags(bytes)).toEqual([2, 4]);
  });

  test("compress a PDF and report the measured result", async ({ page }) => {
    await page.goto("/tools/compress-pdf");
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("text.pdf", await makePdf([1, 2, 3])));
    await page.getByRole("button", { name: "Compress PDF" }).click();
    const result = page.getByTestId("pdf-result");
    await expect(result).toBeVisible();
    const size = Number(await result.getAttribute("data-output-size"));
    expect(size).toBeGreaterThan(0);
    // Either outcome is acceptable, but it must be stated honestly.
    await expect(result.getByText(/Reduced to|No reduction achieved/)).toBeVisible();
    await expect(result).toHaveAttribute("data-page-count", "3");
  });

  test("turn images into an A4 PDF", async ({ page }) => {
    await page.goto("/tools/images-to-pdf");
    await page.getByTestId("image-input").setInputFiles([pngFile("one.png", gradientPng(300, 400)), pngFile("two.png", gradientPng(500, 300))]);
    await expect(page.getByText("PNG · 500 × 300 px")).toBeVisible();
    await page.getByRole("button", { name: "Create PDF" }).click();
    await expect(page.getByTestId("pdf-result")).toHaveAttribute("data-page-count", "2");
  });

  test("explains encrypted and malformed PDFs", async ({ page }) => {
    await page.goto("/tools/split-pdf");
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("locked.pdf", await makeEncryptedPdf()));
    await expect(appAlert(page)).toContainText("password-protected or locked against editing");

    await page.reload();
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("fake.pdf", new TextEncoder().encode("just some text")));
    await expect(appAlert(page)).toContainText("is not a PDF");

    await page.reload();
    const broken = new Uint8Array([...new TextEncoder().encode("%PDF-1.4\n"), ...new Uint8Array(400).fill(65)]);
    await page.getByTestId("pdf-input").setInputFiles(pdfFile("broken.pdf", broken));
    await expect(appAlert(page)).toContainText(/could not be read as a PDF|damaged page structure|does not contain any pages/);
    await expect(appAlert(page)).toContainText("Print to PDF");
  });
});
