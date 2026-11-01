import { expect, test } from "@playwright/test";

const PAGES = ["/", "/tools/compress-image", "/tools/organize-pdf", "/exam", "/exam/sbi-ja-2026", "/privacy", "/exam/sources"];

test.describe("responsive layout", () => {
  for (const path of PAGES) {
    test(`no horizontal page overflow on ${path}`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("mobile navigation opens and closes", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await toggle.click();
    await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Privacy" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  });
});
