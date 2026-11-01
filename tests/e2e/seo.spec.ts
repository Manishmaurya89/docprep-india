import { expect, test } from "@playwright/test";
import { SIZE_LANDING_PAGES } from "@/lib/tools/size-landing-pages";
import { TOOLS } from "@/lib/tools/registry";

const meta = (page: import("@playwright/test").Page, selector: string) => page.locator(selector).first().getAttribute("content");

test.describe("search and sharing", () => {
  test("every tool page has a title, description, canonical link, share image and structured data", async ({ page }) => {
    for (const tool of TOOLS) {
      await page.goto(tool.href);
      expect((await page.title()).length, tool.slug).toBeGreaterThan(10);
      expect(await meta(page, 'meta[name="description"]'), tool.slug).toBeTruthy();
      expect(await page.locator('link[rel="canonical"]').getAttribute("href"), tool.slug).toMatch(new RegExp(`${tool.href}$`));
      expect(await meta(page, 'meta[property="og:image"]'), tool.slug).toMatch(/opengraph-image\.png/);
      if (tool.href.startsWith("/tools/")) {
        const data = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);
        expect(data[0]).toMatchObject({ "@type": "WebApplication", isAccessibleForFree: true });
      }
    }
  });

  test("size pages preset the tool and link to each other", async ({ page }) => {
    const pdf = SIZE_LANDING_PAGES.find((p) => p.path === "/tools/compress-pdf/200kb")!;
    await page.goto(pdf.path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Compress PDF to 200 KB");
    await expect(page.getByLabel("Maximum file size")).toHaveValue("200");
    await expect(page.getByRole("navigation", { name: "Other common sizes" }).getByRole("link", { name: "200 KB" })).toHaveAttribute("aria-current", "page");
    await page.goto("/tools/compress-image/20kb");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Compress image to 20 KB");
    await expect(page.getByLabel("Maximum file size")).toHaveValue("20");
    expect((await page.request.get("/tools/compress-pdf/123kb")).status()).toBe(404);
  });

  test("robots, sitemap and manifest are served", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap:");
    expect(robots).toContain("Disallow: /exam/verify");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const path of ["/tools/merge-pdf", "/tools/compress-pdf/200kb", "/exam/ibps-crp-po-mt-xvi", "/privacy"]) expect(sitemap).toContain(path);
    expect(sitemap).not.toContain("example-photo-signature");
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest).toMatchObject({ display: "standalone", start_url: "/" });
    for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
    expect((await request.get("/opengraph-image.png")).headers()["content-type"]).toBe("image/png");
  });

  test("example presets and the reviewer sheet are kept out of search results", async ({ page }) => {
    for (const path of ["/exam/example-photo-signature", "/exam/verify"]) {
      await page.goto(path);
      expect(await meta(page, 'meta[name="robots"]'), path).toContain("noindex");
    }
  });
});

test("compress PDF to a size limit (scan-heavy PDF under 200 KB)", async ({ page }) => {
  const { browserJpeg, downloadFrom, pdfFile } = await import("./helpers");
  const { PDFDocument } = await import("pdf-lib");
  await page.goto("/tools/compress-pdf/200kb");
  const doc = await PDFDocument.create();
  const image = await doc.embedJpg(await browserJpeg(page, 2000, 2800, 0.95));
  doc.addPage([595.28, 841.89]).drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 });
  await page.getByTestId("pdf-input").setInputFiles(pdfFile("scan.pdf", await doc.save()));
  await page.getByRole("button", { name: "Compress PDF" }).click();
  const result = page.getByTestId("pdf-result");
  await expect(result.getByText(/within your 200 KB limit/)).toBeVisible({ timeout: 60_000 });
  const { bytes } = await downloadFrom(page, () => result.getByRole("button", { name: "Download PDF" }).click());
  expect(bytes.length).toBeLessThanOrEqual(200_000);
});

test("share links contain only the page address", async ({ page }) => {
  await page.goto("/tools/merge-pdf");
  const whatsapp = await page.getByRole("link", { name: "Share on WhatsApp" }).getAttribute("href");
  expect(whatsapp).toMatch(/^https:\/\/wa\.me\/\?text=/);
  expect(decodeURIComponent(whatsapp!)).toMatch(/\/tools\/merge-pdf$/);
});
