import { describe, expect, it } from "vitest";
import { formatRange, parsePageRanges, rangesToIndices, splitEvery } from "@/lib/file-processing/pdf/page-ranges";

describe("parsePageRanges", () => {
  it("parses single pages, ranges and open-ended ranges", () => {
    expect(parsePageRanges("1-3, 5, 8-", 10)).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 5 },
      { start: 8, end: 10 },
    ]);
    expect(parsePageRanges(" 2 – 4 ; 7 ", 9)).toEqual([
      { start: 2, end: 4 },
      { start: 7, end: 7 },
    ]);
    expect(parsePageRanges("-2", 5)).toEqual([{ start: 1, end: 2 }]);
  });

  it("explains what is wrong", () => {
    expect(() => parsePageRanges("", 5)).toThrow(/at least one page/);
    expect(() => parsePageRanges("abc", 5)).toThrow(/"abc" is not a page/);
    expect(() => parsePageRanges("0", 5)).toThrow(/start at 1/);
    expect(() => parsePageRanges("4-9", 5)).toThrow(/beyond the last page.*5 pages/);
    expect(() => parsePageRanges("5-2", 5)).toThrow(/must not be after/);
    expect(() => parsePageRanges("1.5", 5)).toThrow(/not a page/);
    expect(() => parsePageRanges("1", 0)).toThrow(/no pages/);
  });

  it("converts to unique 0-based indices in order", () => {
    expect(rangesToIndices(parsePageRanges("3, 1-2, 2", 3))).toEqual([2, 0, 1]);
  });

  it("splits every N pages", () => {
    expect(splitEvery(7, 3)).toEqual([
      { start: 1, end: 3 },
      { start: 4, end: 6 },
      { start: 7, end: 7 },
    ]);
    expect(() => splitEvery(7, 0)).toThrow();
    expect(formatRange({ start: 4, end: 4 })).toBe("4");
    expect(formatRange({ start: 4, end: 6 })).toBe("4-6");
  });
});
