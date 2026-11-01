import { expect, test } from "@playwright/test";
import { readImageMetadata } from "@/lib/file-processing/image-metadata";
import { gradientPng, noisePng } from "../helpers/png";
import { downloadFrom, pngFile, recordRequests } from "./helpers";

test.describe("image tools", () => {
  test("resize an image and download it", async ({ page, baseURL }) => {
    const network = recordRequests(page);
    await page.goto("/tools/resize-image");
    await page.getByTestId("image-input").setInputFiles(pngFile("sample.png", gradientPng(800, 600)));
    await expect(page.getByText("PNG · 800 × 600 px")).toBeVisible();

    await page.getByLabel("Width", { exact: true }).fill("400");
    await expect(page.getByLabel("Height", { exact: true })).toHaveValue("300");
    await expect(page.getByTestId("resize-preview-dimensions")).toHaveText("400 × 300 px");
    await page.getByRole("button", { name: "Resize image" }).click();

    const result = page.getByTestId("image-result");
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute("data-engine", "worker");
    const { download, bytes } = await downloadFrom(page, () => result.getByRole("button", { name: /Download/ }).click());
    expect(download.suggestedFilename()).toBe("sample-400x300.png");
    expect(readImageMetadata(bytes)).toMatchObject({ format: "png", width: 400, height: 300 });
    network.assertNoUploads(baseURL!);
  });

  test("compress an image to a target size", async ({ page, baseURL }) => {
    const network = recordRequests(page);
    await page.goto("/tools/compress-image");
    await page.getByTestId("image-input").setInputFiles(pngFile("noisy.png", noisePng(900, 700)));
    await expect(page.getByText("PNG · 900 × 700 px")).toBeVisible();
    await page.getByRole("button", { name: "50 KB" }).click();
    await page.getByRole("button", { name: "Compress image" }).click();

    const result = page.getByTestId("image-result");
    await expect(result).toBeVisible({ timeout: 30_000 });
    await expect(result.getByText(/within your 50 KB limit/)).toBeVisible();
    const { bytes } = await downloadFrom(page, () => result.getByRole("button", { name: /Download/ }).click());
    expect(bytes.length).toBeLessThanOrEqual(50_000);
    expect(readImageMetadata(bytes)?.format).toBe("jpeg");
    expect(Number(await result.getAttribute("data-output-size"))).toBe(bytes.length);
    network.assertNoUploads(baseURL!);
  });
});
