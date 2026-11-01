import { expect, test } from "@playwright/test";
import { readImageMetadata } from "@/lib/file-processing/image-metadata";
import { gradientPng, noisePng } from "../helpers/png";
import { downloadFrom, pngFile } from "./helpers";

// Large, incompressible input so the size search runs long enough to interrupt.
const BIG_NOISE = noisePng(2400, 2400, 3);

test.describe("cancellation, stale results and fallbacks", () => {
  test("cancelling a long compression stops it and keeps the original", async ({ page }) => {
    await page.goto("/tools/compress-image");
    await page.getByTestId("image-input").setInputFiles(pngFile("big.png", BIG_NOISE));
    await expect(page.getByText("PNG · 2400 × 2400 px")).toBeVisible();
    await page.getByLabel("Maximum file size").fill("3");
    await page.getByRole("button", { name: "Compress image" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Cancelled. Your original file is unchanged.")).toBeVisible();
    await expect(page.getByTestId("image-result")).toHaveCount(0);
  });

  test("choosing a new file during processing discards the old result", async ({ page }) => {
    await page.goto("/tools/compress-image");
    await page.getByTestId("image-input").setInputFiles(pngFile("big.png", BIG_NOISE));
    await page.getByLabel("Maximum file size").fill("3");
    await page.getByRole("button", { name: "Compress image" }).click();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    // Replace the file while the first job is still running.
    await page.getByRole("button", { name: "Remove" }).click();
    await page.getByTestId("image-input").setInputFiles(pngFile("small.png", gradientPng(320, 240)));
    await expect(page.getByText("small.png")).toBeVisible();
    await page.getByLabel("Maximum file size").fill("50");
    await page.getByRole("button", { name: "Compress image" }).click();
    const result = page.getByTestId("image-result");
    await expect(result).toBeVisible({ timeout: 30_000 });
    await expect(result).toHaveAttribute("data-output-width", "320");
    // Give the abandoned job time to finish if it had not been stopped; its result must never appear.
    await page.waitForTimeout(1500);
    await expect(result).toHaveAttribute("data-output-width", "320");
    await expect(page.getByTestId("image-result")).toHaveCount(1);
  });

  test("falls back to the main thread when Web Workers are unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      // Simulates a browser where the worker cannot be created.
      Object.defineProperty(window, "Worker", { value: undefined, configurable: true });
    });
    await page.goto("/tools/resize-image");
    await page.getByTestId("image-input").setInputFiles(pngFile("p.png", gradientPng(640, 480)));
    await page.getByLabel("Width", { exact: true }).fill("320");
    await page.getByRole("button", { name: "Resize image" }).click();
    const result = page.getByTestId("image-result");
    await expect(result).toHaveAttribute("data-engine", "main-thread");
    await expect(result).toContainText("Processed on the main page thread");
    const { bytes } = await downloadFrom(page, () => result.getByRole("button", { name: /Download/ }).click());
    expect(readImageMetadata(bytes)).toMatchObject({ width: 320, height: 240 });
  });

  test("worker script failure also falls back", async ({ page }) => {
    // Block worker chunks so the worker fails to load after creation.
    await page.route(/turbopack-worker|image\.worker/, (route) => route.abort());
    await page.goto("/tools/convert-image");
    await page.getByTestId("image-input").setInputFiles(pngFile("p.png", gradientPng(200, 100, true)));
    await page.getByRole("button", { name: /Convert to JPEG/ }).click();
    const result = page.getByTestId("image-result");
    await expect(result).toBeVisible({ timeout: 30_000 });
    await expect(result).toHaveAttribute("data-engine", "main-thread");
  });
});
