import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readImageMetadata } from "@/lib/file-processing/image-metadata";
import { noisePng } from "../helpers/png";
import { appAlert, downloadFrom, pngFile, recordRequests } from "./helpers";

const HINDI_PAGES = ["/hi", "/hi/tools", "/hi/tools/compress-image", "/hi/tools/compress-pdf/200kb", "/hi/tools/merge-pdf", "/hi/exam?org=sbi", "/hi/exam/ibps-crp-po-mt-xvi", "/hi/privacy"];

test.describe("Hindi site", () => {
  test("compress an image end to end in Hindi", async ({ page, baseURL }) => {
    const network = recordRequests(page);
    await page.goto("/hi/tools/compress-image");
    await expect(page.locator("html")).toHaveAttribute("lang", "hi-IN");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("फोटो का साइज KB में कम करें");

    await page.getByTestId("image-input").setInputFiles(pngFile("noisy.png", noisePng(900, 700)));
    await expect(page.getByText("PNG · 900 × 700 px")).toBeVisible();
    await page.getByRole("button", { name: "50 KB" }).click();
    await page.getByRole("button", { name: "साइज कम करें", exact: true }).click();

    const result = page.getByTestId("image-result");
    await expect(result).toBeVisible({ timeout: 30_000 });
    await expect(result.getByText("आपकी 50 KB की सीमा के अंदर", { exact: false })).toBeVisible();
    const { bytes } = await downloadFrom(page, () => result.getByRole("button", { name: /डाउनलोड करें/ }).click());
    expect(bytes.length).toBeLessThanOrEqual(50_000);
    expect(readImageMetadata(bytes)?.format).toBe("jpeg");
    network.assertNoUploads(baseURL!);
  });

  test("explains a wrong file in Hindi", async ({ page }) => {
    await page.goto("/hi/tools/resize-image");
    await page.getByTestId("image-input").setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not really an image") });
    const alert = appAlert(page);
    await expect(alert).toContainText('"photo.jpg" JPEG, PNG या WebP इमेज नहीं है।');
    await expect(alert).toContainText("एक्सटेंशन");
  });

  test("language switch keeps the page and its presets, and stores nothing", async ({ page, context }) => {
    await page.goto("/tools/compress-image?target=20&unit=KB");
    await page.getByTestId("language-switch").click();
    await expect(page).toHaveURL(/\/hi\/tools\/compress-image\?target=20&unit=KB$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "hi-IN");
    await expect(page.getByLabel("फाइल का अधिकतम साइज")).toHaveValue("20");

    await page.getByTestId("language-switch").click();
    await expect(page).toHaveURL(/\/tools\/compress-image\?target=20&unit=KB$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en-IN");
    await expect(page.getByLabel("Maximum file size")).toHaveValue("20");

    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  });

  test("links within Hindi pages stay in Hindi", async ({ page }) => {
    await page.goto("/hi");
    const links = await page.locator("main a[href^='/']").evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href")!));
    expect(links.length).toBeGreaterThan(10);
    expect(links.filter((href) => href !== "/hi" && !href.startsWith("/hi/") && !href.startsWith("/hi?") && !href.startsWith("/hi#"))).toEqual([]);
  });

  test("unknown Hindi addresses get a Hindi 404", async ({ page }) => {
    const response = await page.goto("/hi/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", "hi-IN");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("यह पेज मौजूद नहीं है");
  });
});

test.describe("Hindi search setup", () => {
  test("English and Hindi pages point at each other with hreflang", async ({ page }) => {
    const alternates = () =>
      page.locator('link[rel="alternate"][hreflang]').evaluateAll((links) => Object.fromEntries(links.map((l) => [l.getAttribute("hreflang"), new URL(l.getAttribute("href")!).pathname])));
    for (const [en, hi] of [
      ["/", "/hi"],
      ["/tools/merge-pdf", "/hi/tools/merge-pdf"],
      ["/tools/compress-pdf/200kb", "/hi/tools/compress-pdf/200kb"],
      ["/exam/ibps-crp-po-mt-xvi", "/hi/exam/ibps-crp-po-mt-xvi"],
    ]) {
      for (const path of [en!, hi!]) {
        await page.goto(path);
        expect(await alternates(), path).toEqual({ "en-IN": en, "hi-IN": hi, "x-default": en });
      }
      await page.goto(hi!);
      expect(new URL((await page.locator('link[rel="canonical"]').getAttribute("href"))!).pathname).toBe(hi);
      expect(await page.locator('meta[property="og:locale"]').getAttribute("content")).toBe("hi_IN");
    }
  });

  test("Hindi titles and descriptions use the words people search for", async ({ page }) => {
    await page.goto("/hi/tools/compress-pdf/200kb");
    await expect(page).toHaveTitle(/PDF का साइज 200 KB करें/);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toContain("पीडीएफ का साइज 200 केबी");
    await page.goto("/hi/tools/compress-image");
    await expect(page).toHaveTitle(/फोटो का साइज KB में कम करें/);
  });

  test("the sitemap lists both languages", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const path of ["/hi", "/hi/tools/compress-image", "/hi/tools/compress-pdf/200kb", "/hi/exam/ibps-crp-po-mt-xvi", "/hi/privacy"]) {
      expect(sitemap).toContain(`${path}</loc>`);
    }
    expect(sitemap).toContain('hreflang="hi-IN"');
    expect(sitemap).not.toContain("/hi/exam/verify");
    expect(sitemap).not.toContain("example-photo-signature");
  });
});

test.describe("Hindi accessibility and layout", () => {
  for (const path of HINDI_PAGES) {
    test(`no WCAG A/AA violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });

    test(`no horizontal overflow at phone width on ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("skip link and menu are in Hindi", async ({ page, isMobile }) => {
    await page.goto("/hi");
    await expect(page.getByRole("link", { name: "सीधे मुख्य हिस्से पर जाएं" })).toBeAttached();
    test.skip(!isMobile, "mobile menu only");
    await page.getByRole("button", { name: "मेन्यू खोलें" }).click();
    await page.getByRole("navigation", { name: "मुख्य" }).getByRole("link", { name: "प्राइवेसी" }).click();
    await expect(page).toHaveURL(/\/hi\/privacy$/);
    await expect(page.getByTestId("privacy-summary")).toContainText("आपके डिवाइस पर ही प्रोसेस करते हैं");
  });
});
