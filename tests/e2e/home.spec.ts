import { expect, test } from "@playwright/test";
import { homeTiles } from "@/lib/tools/registry";

const tiles = homeTiles();
const top = async (locator: import("@playwright/test").Locator) => (await locator.boundingBox())!.y;

test.describe("home page", () => {
  test("opens with every editing tool, before the form and government sections", async ({ page }) => {
    await page.goto("/");
    const grid = page.getByTestId("tool-grid");
    await expect(grid.getByRole("link")).toHaveCount(tiles.length);
    for (const tool of tiles) await expect(grid.getByRole("link", { name: new RegExp(`^${tool.title}`) })).toBeVisible();
    // Every tool under /tools/ is offered here, so a new tool cannot be forgotten.
    expect(tiles.map((tool) => tool.slug)).toContain("pdf-to-image");

    // The first tiles are on the first screen, on phones too.
    const viewport = page.viewportSize()!;
    expect(await top(grid.getByRole("link").first())).toBeLessThan(viewport.height);

    // Form help comes after the tools; government forms come last.
    const gridTop = await top(grid);
    const formsTop = await top(page.getByRole("heading", { name: "Made for every online form" }));
    const govTop = await top(page.getByRole("heading", { name: "Government job and exam forms" }));
    expect(gridTop).toBeLessThan(formsTop);
    expect(formsTop).toBeLessThan(govTop);
  });

  test("filters the tiles by kind, and a tile opens its tool", async ({ page }) => {
    await page.goto("/");
    const grid = page.getByTestId("tool-grid");
    const filters = page.getByRole("group", { name: "Show tools" });
    const pdfCount = tiles.filter((tool) => tool.category === "pdf").length;

    await filters.getByRole("button", { name: "PDF tools" }).click();
    await expect(filters.getByRole("button", { name: "PDF tools" })).toHaveAttribute("aria-pressed", "true");
    await expect(grid.getByRole("link")).toHaveCount(pdfCount);
    await expect(grid.getByRole("link", { name: /^Compress image to a size/ })).toBeHidden();

    await filters.getByRole("button", { name: "Image tools" }).click();
    await expect(grid.getByRole("link")).toHaveCount(tiles.length - pdfCount);
    await expect(grid.getByRole("link", { name: /^Photo & signature maker/ })).toBeVisible();

    await filters.getByRole("button", { name: "All tools" }).click();
    await expect(grid.getByRole("link")).toHaveCount(tiles.length);

    await grid.getByRole("link", { name: /^PDF to JPG or PNG/ }).click();
    await expect(page).toHaveURL(/\/tools\/pdf-to-image$/);
    await expect(page.getByRole("heading", { level: 1, name: "PDF to JPG or PNG" })).toBeVisible();
  });

  test("shows the tools in Hindi on the Hindi home page", async ({ page }) => {
    await page.goto("/hi");
    await expect(page.getByRole("heading", { level: 1, name: "अपनी फोटो और PDF को ब्राउजर में ही एडिट करें" })).toBeVisible();
    const grid = page.getByTestId("tool-grid");
    await expect(grid.getByRole("link")).toHaveCount(tiles.length);
    await expect(grid.getByRole("link", { name: /^PDF से JPG या PNG/ })).toHaveAttribute("href", "/hi/tools/pdf-to-image");
    await page.getByRole("group", { name: "टूल दिखाएं" }).getByRole("button", { name: "PDF टूल" }).click();
    await expect(grid.getByRole("link")).toHaveCount(tiles.filter((tool) => tool.category === "pdf").length);
  });
});
