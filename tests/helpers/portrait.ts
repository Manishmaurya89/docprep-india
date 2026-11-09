import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";

/**
 * A real portrait for the photo background tests: NASA's official photo of
 * astronaut Eileen Collins (public domain), as shipped with scikit-image
 * (`skimage.data.astronaut()`), re-saved as a 512 × 512 JPEG. It has a busy
 * background (flag, shuttle model), so a replaced background is easy to see.
 */
export const PORTRAIT_JPEG = new Uint8Array(readFileSync(join(process.cwd(), "tests/fixtures/portrait-astronaut.jpg")));

/** Mean [r, g, b] of a region of an image (x, y, width, height as fractions), decoded by the browser. */
export async function regionColor(page: Page, bytes: Uint8Array, region: { x: number; y: number; width: number; height: number }): Promise<[number, number, number]> {
  return page.evaluate(
    async ({ base64, region }) => {
      const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([data], { type: "image/jpeg" }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      const x = Math.floor(region.x * bitmap.width);
      const y = Math.floor(region.y * bitmap.height);
      const w = Math.max(1, Math.floor(region.width * bitmap.width));
      const h = Math.max(1, Math.floor(region.height * bitmap.height));
      const pixels = context.getImageData(x, y, w, h).data;
      const sum = [0, 0, 0];
      for (let i = 0; i < pixels.length; i += 4) for (let c = 0; c < 3; c++) sum[c]! += pixels[i + c]!;
      const count = pixels.length / 4;
      return sum.map((value) => Math.round(value / count)) as [number, number, number];
    },
    { base64: Buffer.from(bytes).toString("base64"), region },
  );
}
