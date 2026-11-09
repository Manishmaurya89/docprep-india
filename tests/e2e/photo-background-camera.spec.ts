import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { readImageMetadata } from "@/lib/file-processing/image-metadata";
import { regionColor } from "../helpers/portrait";
import { downloadFrom } from "./helpers";

/*
 * Chromium's fake camera plays a file instead of a real camera. A single
 * JPEG is a valid one-frame MJPEG stream, so the "camera" shows the test
 * portrait. Runs in Chromium only (the flags are Chromium's).
 */
const fakeCamera = join(process.cwd(), "test-results", "fake-camera.mjpeg");
mkdirSync(join(process.cwd(), "test-results"), { recursive: true });
copyFileSync(join(process.cwd(), "tests/fixtures/portrait-astronaut.jpg"), fakeCamera);

test.use({
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-video-capture=${fakeCamera}`] },
  permissions: ["camera"],
});

test.describe("photo background: live camera", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium's fake camera");

  test("shows the new background live, gives tips, and takes the photo", async ({ page, baseURL }) => {
    const external: string[] = [];
    page.on("request", (request) => !request.url().startsWith(baseURL!) && !request.url().startsWith("blob:") && !request.url().startsWith("data:") && external.push(request.url()));
    await page.goto("/tools/photo-background");
    await page.getByTestId("open-camera").click();

    const camera = page.getByTestId("live-camera");
    const take = camera.getByRole("button", { name: "Take photo" });
    await expect(take).toBeEnabled({ timeout: 90_000 });
    await expect(camera.getByRole("img", { name: "Camera preview with the new background" })).toBeVisible();
    // A framing tip appears once a face has been looked for.
    await expect(camera.getByRole("status")).toHaveText(/\S/, { timeout: 30_000 });

    // The live preview really replaces the background: the top-left corner of the frame is white.
    const corner = await page.getByTestId("camera-preview").evaluate((canvas: HTMLCanvasElement) => {
      const pixel = canvas.getContext("2d")!.getImageData(4, 4, 1, 1).data;
      return [pixel[0], pixel[1], pixel[2]];
    });
    expect(Math.min(...(corner as number[]))).toBeGreaterThan(235);

    await take.click();
    const result = page.getByTestId("photo-result");
    await expect(result.getByText("After · 413 × 531 px")).toBeVisible({ timeout: 90_000 });
    // The camera is switched off once the photo is taken.
    await expect(page.locator("video")).toHaveCount(0);
    await expect(result.getByRole("button", { name: "Retake" })).toBeVisible();

    const { download, bytes } = await downloadFrom(page, () => result.getByRole("button", { name: "Download JPG" }).click());
    expect(download.suggestedFilename()).toBe("live-photo-white-background.jpg");
    expect(readImageMetadata(bytes)).toMatchObject({ format: "jpeg", width: 413, height: 531 });
    const [r, g, b] = await regionColor(page, bytes, { x: 0, y: 0, width: 0.12, height: 0.12 });
    expect(Math.min(r, g, b)).toBeGreaterThan(235);
    expect(external).toEqual([]);
  });

  test("uses the colour picked while the camera is on, and closes cleanly", async ({ page }) => {
    await page.goto("/tools/photo-background");
    await page.getByText("Blue", { exact: true }).click();
    await page.getByTestId("open-camera").click();
    const camera = page.getByTestId("live-camera");
    await expect(camera.getByRole("button", { name: "Take photo" })).toBeEnabled({ timeout: 90_000 });
    await expect
      .poll(() =>
        page.getByTestId("camera-preview").evaluate((canvas: HTMLCanvasElement) => {
          const [r, g, b] = canvas.getContext("2d")!.getImageData(4, 4, 1, 1).data;
          return b! > 180 && r! < 90 && g! < 140;
        }),
      )
      .toBe(true);
    await camera.getByRole("button", { name: "Close camera" }).click();
    await expect(page.locator("video")).toHaveCount(0);
    await expect(page.getByTestId("open-camera")).toBeVisible();
  });
});
