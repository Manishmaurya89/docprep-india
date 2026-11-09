import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";
import { readImageMetadata } from "@/lib/file-processing/image-metadata";
import { PORTRAIT_JPEG, regionColor } from "../helpers/portrait";
import { downloadFrom, jpegFile, pngFile, recordRequests } from "./helpers";
import { noisePng } from "../helpers/png";

// The models run on the CPU in WebAssembly; give slow CI machines room.
const RESULT_TIMEOUT = 90_000;

async function openPortrait(page: Page, path = "/tools/photo-background") {
  await page.goto(path);
  await page.getByTestId("image-input").setInputFiles(jpegFile("portrait-astronaut.jpg", PORTRAIT_JPEG));
  const result = page.getByTestId("photo-result");
  await expect(result).toBeVisible({ timeout: RESULT_TIMEOUT });
  // The preview is ready once its size is shown.
  await expect(result.getByText(/× \d+ px ·/)).toBeVisible();
  return result;
}

test.describe("photo background", () => {
  test("cuts the person out on this device and makes a white passport-size photo", async ({ page, baseURL }) => {
    const network = recordRequests(page);
    const result = await openPortrait(page);
    await expect(result.getByText("After · 413 × 531 px")).toBeVisible();

    const { download, bytes } = await downloadFrom(page, () => result.getByRole("button", { name: "Download JPG" }).click());
    expect(download.suggestedFilename()).toBe("portrait-astronaut-white-background.jpg");
    expect(readImageMetadata(bytes)).toMatchObject({ format: "jpeg", width: 413, height: 531, dpi: { x: 300, y: 300 } });

    // The flag (top left) and the studio backdrop (top right) are now plain white…
    for (const corner of [{ x: 0, y: 0 }, { x: 0.88, y: 0 }]) {
      const [r, g, b] = await regionColor(page, bytes, { ...corner, width: 0.12, height: 0.12 });
      expect(Math.min(r, g, b), `corner ${JSON.stringify(corner)}`).toBeGreaterThan(235);
    }
    // …while the face, in the middle of the frame, keeps its own colour.
    const [r, g, b] = await regionColor(page, bytes, { x: 0.45, y: 0.4, width: 0.1, height: 0.08 });
    expect(Math.min(r, g, b)).toBeLessThan(225);
    expect(r - b).toBeGreaterThan(20);

    // Runtime and models come from this site; nothing goes anywhere else.
    const vendor = network.requests.map((request) => new URL(request.url).pathname).filter((path) => path.startsWith("/vendor/mediapipe/"));
    expect(vendor).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^\/vendor\/mediapipe\/\d+\.\d+\.\d+\/wasm\/vision_wasm(_nosimd)?_internal\.wasm$/),
        expect.stringMatching(/\/models\/selfie_segmenter-f16-v1\.tflite$/),
        expect.stringMatching(/\/models\/blaze_face_short_range-f16-v1\.tflite$/),
      ]),
    );
    network.assertNoUploads(baseURL!);
  });

  test("changes the colour and shape instantly, without running the models again", async ({ page }) => {
    const network = recordRequests(page);
    const result = await openPortrait(page);
    const modelRequests = () => network.requests.filter((request) => request.url.endsWith(".tflite")).length;
    const loaded = modelRequests();

    await result.getByText("Red", { exact: true }).click();
    let { bytes } = await downloadFrom(page, () => result.getByRole("button", { name: "Download JPG" }).click());
    const [r, g, b] = await regionColor(page, bytes, { x: 0, y: 0, width: 0.1, height: 0.1 });
    expect(r).toBeGreaterThan(180);
    expect(g).toBeLessThan(90);
    expect(b).toBeLessThan(90);

    await result.getByText("Whole photo", { exact: true }).click();
    await expect(result.getByText("After · 512 × 512 px", { exact: false })).toBeVisible();
    ({ bytes } = await downloadFrom(page, () => result.getByRole("button", { name: "Download JPG" }).click()));
    expect(readImageMetadata(bytes)).toMatchObject({ width: 512, height: 512 });
    await expect(result.getByLabel("Face size")).toHaveCount(0);

    await result.getByText("Square", { exact: true }).click();
    const slider = result.getByLabel("Face size");
    await expect(slider).toBeVisible();
    await slider.fill("45");
    await expect(result.getByText("45% of the height")).toBeVisible();
    ({ bytes } = await downloadFrom(page, () => result.getByRole("button", { name: "Download JPG" }).click()));
    const square = readImageMetadata(bytes)!;
    expect(square.width).toBe(square.height);
    expect(modelRequests()).toBe(loaded);
  });

  test("hands the photo to the photo & signature maker", async ({ page }) => {
    const result = await openPortrait(page);
    await result.getByRole("link", { name: "Make it the exact size and KB" }).click();
    await expect(page).toHaveURL(/\/tools\/photo-signature$/);
    await expect(page.getByTestId("handoff-waiting")).toBeVisible();

    await page.getByLabel("Maximum size").fill("50");
    await page.getByRole("button", { name: "Use these requirements" }).click();
    const card = page.getByTestId("document-photograph");
    await expect(card.getByText("portrait-astronaut-white-background.jpg")).toBeVisible();
    await expect(card.getByRole("group", { name: /^Crop area:/ })).toBeVisible();
  });

  test("the camera is allowed on this page only", async ({ request }) => {
    for (const path of ["/tools/photo-background", "/hi/tools/photo-background"]) {
      const policy = (await request.get(path)).headers()["permissions-policy"];
      expect(policy, path).toContain("camera=(self)");
      expect(policy, path).toContain("microphone=()");
      expect(policy, path).toContain("geolocation=()");
    }
    for (const path of ["/", "/tools/compress-image", "/tools/photo-signature"]) {
      expect((await request.get(path)).headers()["permissions-policy"], path).toContain("camera=()");
    }
  });

  test("start screen and result have no WCAG A/AA violations", async ({ page }) => {
    const axe = async () => {
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    };
    await page.goto("/tools/photo-background");
    await expect(page.getByTestId("open-camera")).toBeVisible();
    await axe();
    await page.getByTestId("image-input").setInputFiles(jpegFile("portrait-astronaut.jpg", PORTRAIT_JPEG));
    await expect(page.getByTestId("photo-result").getByText(/× \d+ px ·/)).toBeVisible({ timeout: RESULT_TIMEOUT });
    await axe();
  });

  test("works in Hindi", async ({ page }) => {
    const result = await openPortrait(page, "/hi/tools/photo-background");
    await expect(page.getByRole("heading", { level: 1, name: "फोटो का बैकग्राउंड बदलें" })).toBeVisible();
    await expect(result.getByText("पासपोर्ट साइज")).toBeVisible();
    await expect(result.getByRole("button", { name: "JPG डाउनलोड करें" })).toBeVisible();
  });

  test("says so when no face is found, and keeps the whole photo", async ({ page }) => {
    await page.goto("/tools/photo-background");
    await page.getByTestId("image-input").setInputFiles(pngFile("pattern.png", noisePng(320, 240, 3)));
    const result = page.getByTestId("photo-result");
    await expect(result.getByText(/No face was found/)).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(result.getByText("After · 320 × 240 px", { exact: false })).toBeVisible();
  });

  test("rejects a file that is not an image", async ({ page }) => {
    await page.goto("/tools/photo-background");
    await page.getByTestId("image-input").setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from("%PDF-1.7 not an image") });
    await expect(page.getByText(/"photo\.jpg" is a PDF/)).toBeVisible();
  });
});
