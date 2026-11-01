import { getMessages } from "@/lib/i18n";
import { type Locale, localizePath } from "@/lib/i18n/config";

/**
 * Landing pages for the sizes people search for ("compress pdf to 200kb").
 * Each opens the real tool with the size preset. Their text ("typical use"
 * lines are general guidance, not any organisation's requirement) lives in
 * the dictionaries under `sizes`.
 */
export type SizeTool = "compress-image" | "compress-pdf";

export interface SizeLandingPage {
  tool: SizeTool;
  slug: string;
  /** Size in KB (MB sizes are multiples of 1000 KB). */
  kb: number;
  label: string;
  /** English path; see localizePath for other languages. */
  path: string;
}

const label = (kb: number) => (kb >= 1000 ? `${kb / 1000} MB` : `${kb} KB`);
const slugFor = (kb: number) => (kb >= 1000 ? `${kb / 1000}mb` : `${kb}kb`);

const SIZES: Record<SizeTool, number[]> = {
  "compress-image": [10, 20, 30, 50, 100, 200, 300, 500, 1000, 2000],
  "compress-pdf": [100, 200, 300, 500, 1000, 2000],
};

export const SIZE_LANDING_PAGES: readonly SizeLandingPage[] = (Object.keys(SIZES) as SizeTool[]).flatMap((tool) =>
  SIZES[tool].map((kb) => ({ tool, slug: slugFor(kb), kb, label: label(kb), path: `/tools/${tool}/${slugFor(kb)}` })),
);

export function findSizeLanding(tool: SizeTool, slug: string): SizeLandingPage | undefined {
  return SIZE_LANDING_PAGES.find((page) => page.tool === tool && page.slug === slug);
}

export function sizeLandingsFor(tool: SizeTool): SizeLandingPage[] {
  return SIZE_LANDING_PAGES.filter((page) => page.tool === tool);
}

/** Title, heading, intro and description of a size page in `locale`. */
export function sizeLandingText(landing: SizeLandingPage, locale: Locale) {
  const t = getMessages(locale).sizes;
  const pdf = landing.tool === "compress-pdf";
  const uses: Record<number, string> = pdf ? t.pdfUses : t.imageUses;
  const heading = t.heading(pdf, landing.label);
  const intro = t.intro(uses[landing.kb]!, landing.label);
  return {
    title: t.title(pdf, landing.label),
    heading,
    intro,
    description: t.description({ heading, intro, pdf, size: landing.label }),
    path: localizePath(landing.path, locale),
  };
}
