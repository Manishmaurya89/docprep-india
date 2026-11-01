import { type Locale, localizePath } from "./config";
import { type PageMessages, type UiMessages, enPages, enUi } from "./en";
import { hiPages, hiUi } from "./hi";

export type Messages = UiMessages & PageMessages;
export type { Locale, PageMessages, UiMessages };

const UI: Record<Locale, UiMessages> = { en: enUi, hi: hiUi };
const PAGES: Record<Locale, PageMessages> = { en: enPages, hi: hiPages };

/** Every text for a language. Server components use this; client components use useI18n(). */
export function getMessages(locale: Locale): Messages {
  return { ...UI[locale], ...PAGES[locale], common: { ...UI[locale].common, ...PAGES[locale].common } } as Messages;
}

/** UI text only (what client components can also reach). */
export function getUiMessages(locale: Locale): UiMessages {
  return UI[locale];
}

/** Server-side helpers for a page in `locale`: its text and a link builder. */
export function i18n(locale: Locale) {
  return { locale, t: getMessages(locale), href: (path: string) => localizePath(path, locale) };
}
