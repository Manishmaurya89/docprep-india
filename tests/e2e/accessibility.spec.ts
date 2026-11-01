import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/tools", "/tools/compress-image", "/tools/merge-pdf", "/tools/photo-signature?w=200&h=230&min=20&max=50", "/exam?org=sbi", "/exam/ibps-crp-po-mt-xvi", "/privacy"];

test.describe("accessibility", () => {
  for (const path of PAGES) {
    test(`no WCAG A/AA violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  test("stays in the light theme even when the system prefers dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).toBe("rgb(245, 246, 248)");
    await expect(page.getByRole("button", { name: /theme/i })).toHaveCount(0);
  });

  test("illustrations stay still for people who prefer reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const moving = await page.evaluate(() =>
      [...document.querySelectorAll(".float-a, .float-b, .float-c, .scroll-spin, .slide-x, .scroll-rise")].filter((el) => getComputedStyle(el).animationName !== "none").length,
    );
    expect(moving).toBe(0);
    await expect(page.getByRole("img", { name: /photo being turned into a 48 KB/ })).toBeVisible();
  });

  test("keyboard: skip link, search shortcut and file input are reachable", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();

    await page.keyboard.press("/");
    await expect(page.getByRole("searchbox", { name: "Search tools" })).toBeFocused();
    await page.keyboard.type("merge");
    await expect(page.getByRole("link", { name: /Merge PDFs/ }).first()).toBeVisible();

    await page.goto("/tools/resize-image");
    const input = page.getByTestId("image-input");
    for (let i = 0; i < 25 && !(await input.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
    await expect(input).toBeFocused();
  });

  test("crop box can be moved with the keyboard", async ({ page }) => {
    const { gradientPng } = await import("../helpers/png");
    await page.goto("/tools/crop-rotate-image");
    await page.getByTestId("image-input").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: Buffer.from(gradientPng(400, 300)) });
    await page.getByLabel("Aspect ratio").selectOption("1:1");
    const box = page.getByRole("group", { name: /^Crop area:/ });
    await expect(box).toHaveAccessibleName(/300 by 300 pixels at 50, 0/);
    await box.focus();
    await page.keyboard.press("ArrowRight");
    await expect(box).toHaveAccessibleName(/at 54, 0/);
    await page.keyboard.press("Shift+ArrowLeft");
    await expect(box).toHaveAccessibleName(/296 by 296 pixels/);
  });
});
