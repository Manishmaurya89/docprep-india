import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n";
import { LOCALES, LOCALE_TAGS, type Locale, OPEN_GRAPH_LOCALES, isTranslated, localizePath, stripLocale } from "@/lib/i18n/config";
import { siteConfig } from "@/lib/site-config";
import type { ToolDefinition, ToolSlug } from "@/lib/tools/registry";

/**
 * The share image is named explicitly: a page that sets its own openGraph
 * fields would otherwise lose the image inherited from app/opengraph-image.png.
 */
const shareImage = (locale: Locale) => ({
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: getMessages(locale).site.shareAlt(siteConfig.name),
});

/**
 * hreflang links between the language versions of a page (`path` in its
 * English form). English is also the x-default for other languages.
 */
export function languageAlternates(path: string): Record<string, string> | undefined {
  const base = stripLocale(path);
  if (!isTranslated(base)) return undefined;
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) languages[LOCALE_TAGS[locale]] = localizePath(base, locale);
  languages["x-default"] = base;
  return languages;
}

export function pageMetadata({ title, description, path, locale = "en" }: { title: string; description: string; path: string; locale?: Locale }): Metadata {
  const url = localizePath(path, locale);
  const image = shareImage(locale);
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      type: "website",
      locale: OPEN_GRAPH_LOCALES[locale],
      alternateLocale: LOCALES.filter((other) => other !== locale).map((other) => OPEN_GRAPH_LOCALES[other]),
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export function toolMetadata(tool: ToolDefinition, locale: Locale = "en"): Metadata {
  const t = getMessages(locale);
  const slug = tool.slug as ToolSlug;
  return pageMetadata({
    title: t.seo.toolTitles[slug] ?? t.tools[slug].title,
    description: `${t.tools[slug].summary} ${t.seo.privacyClaim}`,
    path: tool.href,
    locale,
  });
}

/** schema.org data for a tool page: a free web application plus its breadcrumb. `tool` is already in `locale`. */
export function toolStructuredData(tool: ToolDefinition, categoryName: string, categoryPath: string, locale: Locale = "en") {
  const url = `${siteConfig.url}${tool.href}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: tool.title,
      url,
      description: tool.summary,
      inLanguage: LOCALE_TAGS[locale],
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any (runs in a web browser)",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: getMessages(locale).common.home, item: `${siteConfig.url}${localizePath("/", locale)}` },
        { "@type": "ListItem", position: 2, name: categoryName, item: `${siteConfig.url}${categoryPath}` },
        { "@type": "ListItem", position: 3, name: tool.title, item: url },
      ],
    },
  ];
}
