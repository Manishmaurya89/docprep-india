import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { expect, test } from "@playwright/test";
import { downloadFrom } from "./helpers";

/**
 * Runs the manual-test sample files (npm run samples) through the real
 * workflows, so the expectations in docs/MANUAL_TEST_PLAN.md are backed by an
 * automated run. Skipped when the samples have not been generated.
 */
const DIR = join(process.cwd(), "sample-files");
const sample = (name: string) => join(DIR, name);
test.skip(!existsSync(DIR), "Run `npm run samples` first");

async function prepare(page: import("@playwright/test").Page, docId: string, file: string, button: string) {
  const card = page.getByTestId(`document-${docId}`);
  await card.locator('input[type="file"]').first().setInputFiles(sample(file));
  await card.getByRole("button", { name: button }).click();
  const report = card.getByTestId("validation-report");
  await expect(report).toBeVisible({ timeout: 60_000 });
  const result = card.getByTestId("prepared-result");
  const findings = await report.locator("[data-finding]").evaluateAll((items) => items.map((li) => `${li.getAttribute("data-finding")}:${li.getAttribute("data-status")}`));
  const notes = await result.locator("ul.list-disc li").allTextContents();
  const summary = {
    docId,
    file,
    size: Number(await result.getAttribute("data-size")),
    width: await result.getAttribute("data-width"),
    height: await result.getAttribute("data-height"),
    failed: Number(await report.getAttribute("data-failed")),
    findings,
    notes,
  };
  console.log(JSON.stringify(summary));
  return summary;
}

test("IBPS PO/MT-XVI: every sample document passes its measurable checks and zips", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/exam/ibps-crp-po-mt-xvi");
  const results = [
    await prepare(page, "photograph", "photo-portrait.jpg", "Prepare photograph"),
    await prepare(page, "signature", "signature-scan.jpg", "Prepare signature"),
    await prepare(page, "left-thumb-impression", "thumb-impression.jpg", "Prepare left thumb impression"),
    await prepare(page, "handwritten-declaration", "handwritten-declaration.jpg", "Prepare handwritten declaration"),
    await prepare(page, "class-10-certificate", "scanned-certificate.pdf", "Prepare PDF"),
  ];
  for (const result of results) expect(result.failed, `${result.docId}: ${result.findings.join(", ")}`).toBe(0);

  const { bytes } = await downloadFrom(page, () => page.getByRole("button", { name: "Download all as ZIP" }).click());
  expect(Object.keys(unzipSync(bytes)).sort()).toEqual([
    "class-10-certificate.pdf",
    "handwritten-declaration.jpg",
    "left-thumb-impression.jpg",
    "photograph.jpg",
    "signature.jpg",
  ]);
});

test("RRB CEN 06/2025 signature from the sample scan", async ({ page }) => {
  await page.goto("/exam/rrb-ntpc-graduate-cen-06-2025");
  const result = await prepare(page, "signature", "signature-scan.jpg", "Prepare signature");
  expect(result.failed).toBe(0);
  expect(Number(result.width)).toBeGreaterThanOrEqual(140);
  expect(Number(result.height)).toBeGreaterThanOrEqual(60);
});

test("phone-rotated sample is shown upright", async ({ page }) => {
  await page.goto("/tools/resize-image");
  await page.getByTestId("image-input").setInputFiles(sample("photo-phone-rotated.jpg"));
  await expect(page.getByText("JPEG · 1200 × 1600 px")).toBeVisible();
});

test("large photo compresses under 200 KB", async ({ page }) => {
  await page.goto("/tools/compress-image?target=200&unit=KB");
  await page.getByTestId("image-input").setInputFiles(sample("large-photo-12mp.jpg"));
  await page.getByRole("button", { name: "Compress image" }).click();
  const result = page.getByTestId("image-result");
  await expect(result).toBeVisible({ timeout: 60_000 });
  const size = Number(await result.getAttribute("data-output-size"));
  console.log(JSON.stringify({ tool: "compress", size, width: await result.getAttribute("data-output-width") }));
  expect(size).toBeLessThanOrEqual(200_000);
});

test("album PDF compresses with the recommended level", async ({ page }) => {
  await page.goto("/tools/compress-pdf");
  await page.getByTestId("pdf-input").setInputFiles(sample("photos-album-large.pdf"));
  await page.getByRole("button", { name: "Compress PDF" }).click();
  const result = page.getByTestId("pdf-result");
  await expect(result).toBeVisible({ timeout: 90_000 });
  const size = Number(await result.getAttribute("data-output-size"));
  console.log(JSON.stringify({ tool: "compress-pdf", original: readFileSync(sample("photos-album-large.pdf")).length, size }));
  expect(size).toBeLessThan(readFileSync(sample("photos-album-large.pdf")).length);
});
