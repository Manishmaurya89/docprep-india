import { expect, test } from "@playwright/test";
import { readImageMetadata } from "@/lib/file-processing/image-metadata";
import { gradientPng, noisePng } from "../helpers/png";
import { downloadFrom, pngFile, recordRequests } from "./helpers";

test.describe("government application preparation", () => {
  test("prepares an image with a custom preset and validates the output", async ({ page, baseURL }) => {
    const network = recordRequests(page);
    await page.goto("/tools/photo-signature?label=Photograph&type=photograph&w=200&h=230&min=20&max=50");
    await expect(page.getByTestId("spec-warnings")).toContainText("You entered these requirements");

    const card = page.getByTestId("document-photograph");
    await card.getByTestId("image-input").setInputFiles(pngFile("me.png", noisePng(600, 760, 7)));
    await expect(card.getByRole("group", { name: /^Crop area:/ })).toBeVisible();
    await card.getByRole("button", { name: "Prepare photograph" }).click();

    const report = card.getByTestId("validation-report");
    await expect(report).toBeVisible({ timeout: 30_000 });
    await expect(report).toHaveAttribute("data-failed", "0");
    await expect(report.locator('[data-finding="pixels"]')).toHaveAttribute("data-status", "pass");
    await expect(report.locator('[data-finding="max-size"]')).toHaveAttribute("data-status", "pass");
    await expect(report.locator('[data-finding="min-size"]')).toHaveAttribute("data-status", "pass");

    const { download, bytes } = await downloadFrom(page, () => card.getByRole("button", { name: "Download photograph.jpg" }).click());
    expect(download.suggestedFilename()).toBe("photograph.jpg");
    expect(readImageMetadata(bytes)).toMatchObject({ format: "jpeg", width: 200, height: 230 });
    expect(bytes.length).toBeLessThanOrEqual(50_000);
    expect(bytes.length).toBeGreaterThanOrEqual(20_480);
    await expect(page.getByTestId("application-checklist")).toContainText("Ready");
    network.assertNoUploads(baseURL!);
  });

  test("reports a failure honestly when the minimum size cannot be reached", async ({ page }) => {
    await page.goto("/tools/photo-signature?label=Signature&type=signature&w=140&h=60&min=10&max=20");
    const card = page.getByTestId("document-signature");
    // A smooth gradient compresses so well that 140×60 px cannot reach 10 KB.
    await card.getByTestId("image-input").setInputFiles(pngFile("sig.png", gradientPng(700, 300)));
    await card.getByRole("button", { name: "Prepare signature" }).click();
    const report = card.getByTestId("validation-report");
    await expect(report).toBeVisible({ timeout: 30_000 });
    await expect(report.locator('[data-finding="min-size"]')).toHaveAttribute("data-status", "fail");
    await expect(report).toContainText("not met");
    await expect(page.getByTestId("application-checklist")).toContainText("1 not met");
  });

  test("walks from organisation to notification and shows sourced requirements", async ({ page }) => {
    await page.goto("/exam");
    await page.getByRole("link", { name: /IBPS Institute of Banking/ }).click();
    await expect(page).toHaveURL(/org=ibps/);
    await page.getByRole("link", { name: "Prepare documents" }).first().click();
    await expect(page).toHaveURL(/\/exam\/ibps-crp-po-mt-xvi/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("IBPS");
    await expect(page.getByText("From official source — not yet re-checked").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Open official document/ })).toHaveAttribute("href", /^https:\/\/www\.ibps\.in\//);
    const photo = page.getByTestId("document-photograph");
    await expect(photo).toContainText("20–50 KB");
    await expect(photo).toContainText("200 × 230 px (preferred)");
    await expect(page.getByTestId("document-live-photograph")).toContainText("Taken inside the application form");
    // Conditional documents stay collapsed until the candidate says they apply.
    const conditional = page.getByTestId("document-scribe-certificate");
    await expect(conditional.getByText("Choose the certificate")).toHaveCount(0);
    await conditional.getByLabel("This applies to me").check();
    await expect(conditional.getByText(/Choose the certificate/)).toBeVisible();
  });

  test("shows a clear warning for an example (unofficial) preset", async ({ page }) => {
    await page.goto("/exam/example-photo-signature");
    const warnings = page.getByTestId("spec-warnings");
    await expect(warnings).toContainText("Example only — not an official requirement");
    await expect(warnings.locator('[data-warning="example"]')).toBeVisible();
    await expect(warnings.locator('[data-warning="missing-source"]')).toBeVisible();
  });

  test("flags gaps instead of inventing limits (UPSC) and live capture (SSC)", async ({ page }) => {
    await page.goto("/exam/upsc-cse-2026");
    await expect(page.getByTestId("document-photograph")).toContainText("does not state the file format");
    await page.goto("/exam/ssc-cgl-2026");
    await expect(page.getByTestId("document-signature")).toContainText("about 6.0 cm × 2.0 cm in para 9.6 but about 4.0 cm × 2.0 cm");
    await expect(page.getByTestId("document-live-photograph")).toContainText("Taken inside the application form");
  });

  test("builds a PDF certificate within the size limit on A4", async ({ page }) => {
    await page.goto("/exam/ibps-crp-po-mt-xvi");
    const card = page.getByTestId("document-class-10-certificate");
    await card.locator('input[type="file"]').setInputFiles(pngFile("certificate.png", gradientPng(1200, 1600)));
    await card.getByRole("button", { name: "Prepare PDF" }).click();
    const report = card.getByTestId("validation-report");
    await expect(report).toBeVisible({ timeout: 30_000 });
    await expect(report.locator('[data-finding="format"]')).toHaveAttribute("data-status", "pass");
    await expect(report.locator('[data-finding="max-size"]')).toHaveAttribute("data-status", "pass");
    await expect(report.locator('[data-finding="page-size"]')).toHaveAttribute("data-status", "pass");
  });
});
