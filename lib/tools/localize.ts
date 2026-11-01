import { type Locale, localizePath } from "@/lib/i18n/config";
import type { UiMessages } from "@/lib/i18n/en";
import { TOOLS, type ToolDefinition, type ToolSlug } from "./registry";

/**
 * A tool as shown in `locale`: translated name and summary, a link to the
 * page in that language, and search words in that language. English keywords
 * are kept too, since many people type "pdf 200kb" whatever the page language.
 */
export function localizeTool(tool: ToolDefinition, t: UiMessages, locale: Locale): ToolDefinition {
  const text = t.tools[tool.slug as ToolSlug];
  return {
    ...tool,
    title: text.title,
    summary: text.summary,
    keywords: [...text.keywords, ...tool.keywords],
    href: localizePath(tool.href, locale),
  };
}

export function localizedTools(t: UiMessages, locale: Locale): ToolDefinition[] {
  return TOOLS.map((tool) => localizeTool(tool, t, locale));
}
