import { describe, expect, it } from "vitest";
import { moveTo } from "@/components/workspace/PageArranger";
import { layoutImagePage } from "@/lib/file-processing/pdf/page-layout";

describe("layoutImagePage", () => {
  const a4 = { pageSize: "a4", orientation: "auto", margin: 18 } as const;

  it("picks the page orientation from the image in auto mode and centres it without stretching", () => {
    const portrait = layoutImagePage(905, 1280, a4);
    expect([portrait.pageWidth, portrait.pageHeight]).toEqual([595.28, 841.89]);
    expect(portrait.drawWidth / portrait.drawHeight).toBeCloseTo(905 / 1280, 6);
    const landscape = layoutImagePage(1132, 702, a4);
    expect([landscape.pageWidth, landscape.pageHeight]).toEqual([841.89, 595.28]);
    expect(landscape.x).toBeCloseTo((landscape.pageWidth - landscape.drawWidth) / 2, 6);
    expect(landscape.y).toBeCloseTo((landscape.pageHeight - landscape.drawHeight) / 2, 6);
  });

  it("keeps every image inside the margins", () => {
    for (const [w, h] of [[100, 4000], [4000, 100], [800, 800]] as const) {
      const box = layoutImagePage(w, h, a4);
      expect(box.x).toBeGreaterThanOrEqual(18 - 1e-9);
      expect(box.y).toBeGreaterThanOrEqual(18 - 1e-9);
      expect(box.x + box.drawWidth).toBeLessThanOrEqual(box.pageWidth - 18 + 1e-9);
      expect(box.y + box.drawHeight).toBeLessThanOrEqual(box.pageHeight - 18 + 1e-9);
    }
  });

  it("honours a forced orientation and image-sized pages", () => {
    expect(layoutImagePage(1132, 702, { ...a4, orientation: "portrait" }).pageWidth).toBe(595.28);
    const sized = layoutImagePage(96, 192, { pageSize: "image", orientation: "auto", margin: 0 });
    expect([sized.pageWidth, sized.pageHeight]).toEqual([72, 144]);
    expect(() => layoutImagePage(100, 100, { ...a4, margin: 400 })).toThrow(/margin is too large/);
  });
});

describe("moveTo", () => {
  const items = ["a", "b", "c", "d"].map((id) => ({ id }));
  const ids = (list: { id: string }[]) => list.map((i) => i.id).join("");

  it("moves an item to a new index, in both directions", () => {
    expect(ids(moveTo(items, "a", 2))).toBe("bcad");
    expect(ids(moveTo(items, "d", 0))).toBe("dabc");
    expect(ids(moveTo(items, "b", 1))).toBe("abcd");
  });

  it("ignores invalid moves and never mutates the input", () => {
    expect(moveTo(items, "zz", 1)).toBe(items);
    expect(moveTo(items, "a", 9)).toBe(items);
    expect(moveTo(items, "a", -1)).toBe(items);
    moveTo(items, "a", 3);
    expect(ids(items)).toBe("abcd");
  });
});
