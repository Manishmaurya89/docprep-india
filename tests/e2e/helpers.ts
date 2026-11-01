import { readFileSync } from "node:fs";
import { type Download, type Page, expect } from "@playwright/test";

export async function readDownload(download: Download): Promise<Uint8Array> {
  const path = await download.path();
  if (!path) throw new Error("Download has no path");
  return new Uint8Array(readFileSync(path));
}

export async function downloadFrom(page: Page, click: () => Promise<void>): Promise<{ download: Download; bytes: Uint8Array }> {
  const pending = page.waitForEvent("download");
  await click();
  const download = await pending;
  return { download, bytes: await readDownload(download) };
}

/**
 * Records every request the page makes so privacy tests can assert that no
 * file data leaves the browser.
 */
export function recordRequests(page: Page) {
  const requests: { url: string; method: string; hasBody: boolean }[] = [];
  page.on("request", (request) => {
    requests.push({ url: request.url(), method: request.method(), hasBody: Boolean(request.postDataBuffer()?.length) });
  });
  return {
    requests,
    assertNoUploads(origin: string) {
      const offending = requests.filter((r) => !r.url.startsWith(origin) && !r.url.startsWith("blob:") && !r.url.startsWith("data:"));
      expect(offending, `requests to other origins: ${offending.map((r) => r.url).join(", ")}`).toEqual([]);
      const withBodies = requests.filter((r) => r.hasBody || (r.method !== "GET" && r.method !== "HEAD"));
      expect(withBodies, `requests with bodies: ${withBodies.map((r) => `${r.method} ${r.url}`).join(", ")}`).toEqual([]);
    },
  };
}

export const pngFile = (name: string, buffer: Uint8Array) => ({ name, mimeType: "image/png", buffer: Buffer.from(buffer) });
export const pdfFile = (name: string, buffer: Uint8Array) => ({ name, mimeType: "application/pdf", buffer: Buffer.from(buffer) });

/** The app's own alerts (Next.js also renders an empty route announcer with role="alert"). */
export const appAlert = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');

/** Encodes a noisy, photo-like JPEG in the page's own canvas (no files on disk). */
export async function browserJpeg(page: Page, width: number, height: number, quality = 0.92): Promise<Uint8Array> {
  const base64 = await page.evaluate(
    async ({ width, height, quality }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      const image = ctx.createImageData(width, height);
      let seed = 7;
      for (let i = 0; i < image.data.length; i += 4) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const n = seed >>> 24;
        image.data[i] = (i / 4) % width / width * 255 * 0.6 + n * 0.4;
        image.data[i + 1] = n;
        image.data[i + 2] = 255 - n;
        image.data[i + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
      const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", quality));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(binary);
    },
    { width, height, quality },
  );
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/** Adds an EXIF APP1 segment with the given orientation right after SOI. */
export function withExifOrientation(jpeg: Uint8Array, orientation: number): Uint8Array {
  const tiff = [0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
  const payload = [...Buffer.from("Exif"), 0, 0, ...tiff];
  const length = payload.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 0xff, ...payload, ...jpeg.subarray(2)]);
}

export const jpegFile = (name: string, buffer: Uint8Array) => ({ name, mimeType: "image/jpeg", buffer: Buffer.from(buffer) });
