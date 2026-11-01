import { expect, test } from "@playwright/test";
import { appAlert } from "./helpers";

test.describe("input validation", () => {
  test("rejects a renamed non-image with a specific explanation", async ({ page }) => {
    await page.goto("/tools/resize-image");
    await page.getByTestId("image-input").setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not really an image") });
    const alert = appAlert(page);
    await expect(alert).toContainText('"photo.jpg" is not a JPEG, PNG or WebP image.');
    await expect(alert).toContainText("Renaming a file's extension does not change its format");
  });

  test("explains HEIC photos and empty files", async ({ page }) => {
    await page.goto("/tools/compress-image");
    const heic = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic"), Buffer.alloc(32)]);
    await page.getByTestId("image-input").setInputFiles({ name: "IMG_0001.HEIC", mimeType: "image/heic", buffer: heic });
    await expect(appAlert(page)).toContainText("Most Compatible");

    await page.reload();
    await page.getByTestId("image-input").setInputFiles({ name: "empty.png", mimeType: "image/png", buffer: Buffer.alloc(0) });
    await expect(appAlert(page)).toContainText("is empty (0 bytes)");
  });

  test("rejects a truncated image that cannot be decoded", async ({ page }) => {
    await page.goto("/tools/convert-image");
    // A valid PNG header (so the type is detected) followed by nothing decodable.
    const header = Buffer.from("89504e470d0a1a0a0000000d49484452000000640000006408060000001f15c4890000", "hex");
    await page.getByTestId("image-input").setInputFiles({ name: "cut.png", mimeType: "image/png", buffer: header });
    await expect(appAlert(page)).toContainText(/could not be decoded|damaged/);
  });
});
