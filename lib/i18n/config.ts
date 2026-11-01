/**
 * Supported languages. English lives at the current URLs; every other
 * language gets a path prefix (/hi/…). The language is chosen only by the
 * URL — it is never stored in a cookie or in browser storage.
 */
export const LOCALES = ["en", "hi"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** BCP 47 tags for <html lang> and hreflang. */
export const LOCALE_TAGS: Record<Locale, string> = { en: "en-IN", hi: "hi-IN" };
export const OPEN_GRAPH_LOCALES: Record<Locale, string> = { en: "en_IN", hi: "hi_IN" };
/** Each language's name in that language, for the language switch. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", hi: "हिन्दी" };

const PREFIXES: Record<Locale, string> = { en: "", hi: "/hi" };

/** Pages that exist in English only (working documents, not landing pages). */
const ENGLISH_ONLY = ["/exam/verify"];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The language a path belongs to: "/hi" and "/hi/…" are Hindi, everything else English. */
export function localeFromPath(pathname: string): Locale {
  for (const locale of LOCALES) {
    const prefix = PREFIXES[locale];
    if (prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`) || pathname.startsWith(`${prefix}#`))) {
      return locale;
    }
  }
  return DEFAULT_LOCALE;
}

/** Removes the language prefix: "/hi/tools" → "/tools", "/hi" → "/". */
export function stripLocale(pathname: string): string {
  const prefix = PREFIXES[localeFromPath(pathname)];
  if (!prefix) return pathname;
  const rest = pathname.slice(prefix.length);
  return rest === "" || rest.startsWith("?") || rest.startsWith("#") ? `/${rest}` : rest;
}

/**
 * Turns a site path written in English form ("/tools#pdf", "/exam?org=ssc")
 * into the same page in `locale`. Links to other sites and English-only
 * pages are returned unchanged.
 */
export function localizePath(path: string, locale: Locale): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const prefix = PREFIXES[locale];
  const base = stripLocale(path);
  const pathname = base.split(/[?#]/, 1)[0]!;
  if (!prefix || ENGLISH_ONLY.includes(pathname)) return base;
  if (pathname === "/") return `${prefix}${base.slice(1)}`;
  return `${prefix}${base}`;
}

/** Whether a page (path without prefix) has a version in every language. */
export function isTranslated(pathname: string): boolean {
  return !ENGLISH_ONLY.includes(stripLocale(pathname).split(/[?#]/, 1)[0]!);
}
