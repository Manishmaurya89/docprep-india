"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, createContext, useContext, useEffect, useMemo } from "react";
import { LOCALE_TAGS, type Locale, localeFromPath, localizePath } from "./config";
import { type UiMessages, enUi } from "./en";
import { hiUi } from "./hi";

const UI: Record<Locale, UiMessages> = { en: enUi, hi: hiUi };

interface I18nValue {
  locale: Locale;
  t: UiMessages;
  /** Links a site path ("/tools/merge-pdf") to the same page in this language. */
  href: (path: string) => string;
}

const I18nContext = createContext<I18nValue>({ locale: "en", t: enUi, href: (path) => path });

/**
 * Gives client components the page's language. The language comes from the
 * URL alone, so it is right after any navigation and nothing is stored.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = localeFromPath(usePathname() ?? "/");
  const value = useMemo<I18nValue>(() => ({ locale, t: UI[locale], href: (path) => localizePath(path, locale) }), [locale]);

  // <html lang> is set on the server; keep it right if a link switches language without a reload.
  useEffect(() => {
    document.documentElement.lang = LOCALE_TAGS[locale];
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
