import { PDFDocument } from "pdf-lib";
import { expect, test } from "@playwright/test";
import { gradientPng } from "../helpers/png";
import { downloadFrom, pngFile } from "./helpers";

// A portrait "back" and a landscape "front", chosen in the wrong order (as the file
// picker lists them alphabetically). Page orientation in the PDF reveals the order.
const BACK = pngFile("aadhaar back.png", gradientPng(300, 400));
const FRONT = pngFile("aadhaar front.png", gradientPng(500, 300));

async function pageOrientations(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => (page.getWidth() > page.getHeight() ? "landscape" : "portrait"));
}

const pages = (page: import("@playwright/test").Page) => page.getByTestId("arranged-page");

test.describe("arranging pages before creating a PDF", () => {
  test("shows each image as its page and fixes the order by dragging", async ({ page, isMobile }) => {
    test.skip(isMobile, "mouse drag");
    await page.goto("/tools/images-to-pdf");
    await page.getByTestId("image-input").setInputFiles([BACK, FRONT]);
    await expect(page.getByRole("img", { name: "Page 1: aadhaar back.png" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Page 2: aadhaar front.png" })).toBeVisible();

    // Drag the front page onto the first slot.
    const from = await pages(page).nth(1).getByRole("img").boundingBox();
    const to = await pages(page).nth(0).getByRole("img").boundingBox();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByRole("img", { name: "Page 1: aadhaar front.png" })).toBeVisible();

    await page.getByRole("button", { name: "Create PDF" }).click();
    const { bytes } = await downloadFrom(page, () => page.getByTestId("pdf-result").getByRole("button", { name: "Download PDF" }).click());
    expect(await pageOrientations(bytes)).toEqual(["landscape", "portrait"]);
  });

  test("touch: dragging the grip moves the page", async ({ page }) => {
    await page.goto("/tools/images-to-pdf");
    await page.getByTestId("image-input").setInputFiles([BACK, FRONT]);
    await expect(pages(page)).toHaveCount(2);
    await pages(page).first().scrollIntoViewIfNeeded();
    const grip = page.getByRole("button", { name: /Reorder aadhaar front\.png/ });
    const gripBox = (await grip.boundingBox())!;
    const target = (await pages(page).nth(0).getByRole("img").boundingBox())!;
    const touch = { pointerType: "touch", pointerId: 7, isPrimary: true, button: 0, bubbles: true };
    await grip.dispatchEvent("pointerdown", { ...touch, clientX: gripBox.x + 4, clientY: gripBox.y + 4 });
    await grip.dispatchEvent("pointermove", { ...touch, clientX: target.x + target.width / 2, clientY: target.y + target.height / 2 });
    await grip.dispatchEvent("pointerup", { ...touch, clientX: target.x + target.width / 2, clientY: target.y + target.height / 2 });
    await expect(page.getByRole("img", { name: "Page 1: aadhaar front.png" })).toBeVisible();
  });

  test("reorders with the keyboard and the arrow buttons, and rotates a page", async ({ page }) => {
    await page.goto("/tools/images-to-pdf");
    await page.getByTestId("image-input").setInputFiles([BACK, FRONT]);
    await expect(pages(page)).toHaveCount(2);

    await page.getByRole("button", { name: /Reorder aadhaar front\.png, page 2 of 2/ }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("img", { name: "Page 1: aadhaar front.png" })).toBeVisible();
    await expect(page.getByText("aadhaar front.png is now page 1 of 2")).toBeAttached();

    await page.getByRole("button", { name: "Move aadhaar front.png later" }).click();
    await page.getByRole("button", { name: "Move aadhaar front.png earlier" }).click();
    await expect(page.getByRole("img", { name: "Page 1: aadhaar front.png" })).toBeVisible();

    // Rotating the portrait back page makes it landscape, and the preview says so.
    await page.getByRole("button", { name: "Rotate aadhaar back.png" }).click();
    await expect(page.getByRole("img", { name: "Page 2: aadhaar back.png, rotated 90°" })).toBeVisible();

    await page.getByRole("button", { name: "Create PDF" }).click();
    const { bytes } = await downloadFrom(page, () => page.getByTestId("pdf-result").getByRole("button", { name: "Download PDF" }).click());
    expect(await pageOrientations(bytes)).toEqual(["landscape", "landscape"]);
  });

  test("the preview follows the page setup (portrait forced)", async ({ page }) => {
    await page.goto("/tools/images-to-pdf");
    await page.getByTestId("image-input").setInputFiles([FRONT]);
    const frame = pages(page).first().getByRole("img").locator("xpath=../..");
    await expect(frame).toHaveCSS("aspect-ratio", /841\.89 \/ 595\.28/);
    await page.getByText("Portrait", { exact: true }).click();
    await expect(frame).toHaveCSS("aspect-ratio", /595\.28 \/ 841\.89/);
  });

  test("exam certificate: photos of pages can be arranged before the PDF is made", async ({ page }) => {
    await page.goto("/exam/ibps-crp-po-mt-xvi");
    const card = page.getByTestId("document-class-10-certificate");
    await card.locator('input[type="file"]').setInputFiles([BACK, FRONT]);
    await expect(card.getByRole("img", { name: "Page 1: aadhaar back.png" })).toBeVisible();
    await card.getByRole("button", { name: "Move aadhaar front.png earlier" }).click();
    await expect(card.getByRole("img", { name: "Page 1: aadhaar front.png" })).toBeVisible();
    await card.getByRole("button", { name: "Prepare PDF" }).click();
    await expect(card.getByTestId("validation-report")).toBeVisible({ timeout: 30_000 });
    const { bytes } = await downloadFrom(page, () => card.getByRole("button", { name: "Download class-10-certificate.pdf" }).click());
    expect(await pageOrientations(bytes)).toEqual(["landscape", "portrait"]);
  });
});
