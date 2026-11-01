import { ProcessingError, detail } from "../errors";

/** 1-based, inclusive. */
export interface PageRange {
  start: number;
  end: number;
}

const TOKEN = /^(\d+)?\s*(?:(-|–|—|to)\s*(\d+)?)?$/i;

/**
 * Parses "1-3, 5, 8-" style input. Open-ended ranges ("8-") run to the last page.
 * Errors name the offending part so users can fix it.
 */
export function parsePageRanges(input: string, pageCount: number): PageRange[] {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new ProcessingError("page-range", detail("documentHasNoPages"));
  }
  const parts = input
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    throw new ProcessingError("page-range", detail("enterPageOrRange"));
  }

  return parts.map((part) => {
    const match = TOKEN.exec(part);
    if (!match || (!match[1] && !match[3])) {
      throw new ProcessingError("page-range", detail("notAPageRange", { part }));
    }
    const [, startText, dash, endText] = match;
    const start = startText ? Number(startText) : 1;
    const end = dash ? (endText ? Number(endText) : pageCount) : start;
    if (start < 1 || end < 1) {
      throw new ProcessingError("page-range", detail("pageStartsAtOne", { part }));
    }
    if (start > pageCount || end > pageCount) {
      throw new ProcessingError("page-range", detail("beyondLastPage", { part, count: pageCount }));
    }
    if (start > end) {
      throw new ProcessingError("page-range", detail("firstAfterLast", { part }));
    }
    return { start, end };
  });
}

/** Converts ranges to 0-based page indices, keeping order and removing duplicates. */
export function rangesToIndices(ranges: PageRange[]): number[] {
  const seen = new Set<number>();
  const indices: number[] = [];
  for (const { start, end } of ranges) {
    for (let page = start; page <= end; page++) {
      if (!seen.has(page)) {
        seen.add(page);
        indices.push(page - 1);
      }
    }
  }
  return indices;
}

export function splitEvery(pageCount: number, size: number): PageRange[] {
  if (!Number.isInteger(size) || size < 1) {
    throw new ProcessingError("page-range", detail("pagesPerFile"));
  }
  const ranges: PageRange[] = [];
  for (let start = 1; start <= pageCount; start += size) {
    ranges.push({ start, end: Math.min(pageCount, start + size - 1) });
  }
  return ranges;
}

export function formatRange({ start, end }: PageRange): string {
  return start === end ? `${start}` : `${start}-${end}`;
}

export function rangePageCount({ start, end }: PageRange): number {
  return end - start + 1;
}
