import type { MetadataRoute } from "next";
import { SPECS } from "@/data/exam-requirements";
import { LOCALES, localizePath } from "@/lib/i18n/config";
import { languageAlternates } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import { TOOLS } from "@/lib/tools/registry";
import { SIZE_LANDING_PAGES } from "@/lib/tools/size-landing-pages";

type Entry = Omit<MetadataRoute.Sitemap[number], "url"> & { path: string };

/**
 * Every indexable page, in every language, each listing its other language
 * versions. Example presets and the reviewer sheet are left out on purpose.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${siteConfig.url}${path}`;
  const pages: Entry[] = [
    ...["/", "/tools", "/exam", "/exam/custom", "/exam/sources", "/privacy"].map((path) => ({
      path,
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.7,
    })),
    ...TOOLS.filter((tool) => tool.href.startsWith("/tools/")).map((tool) => ({ path: tool.href, changeFrequency: "monthly" as const, priority: 0.9 })),
    ...SIZE_LANDING_PAGES.map((landing) => ({ path: landing.path, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...SPECS.filter((spec) => spec.verificationStatus !== "example").map((spec) => ({
      path: `/exam/${spec.id}`,
      lastModified: spec.lastVerified ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
  return pages.flatMap(({ path, ...entry }) => {
    const languages = Object.fromEntries(Object.entries(languageAlternates(path) ?? {}).map(([tag, href]) => [tag, url(href)]));
    return LOCALES.map((locale) => ({ ...entry, url: url(localizePath(path, locale)), alternates: { languages } }));
  });
}
