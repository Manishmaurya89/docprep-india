"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { cn } from "@/components/ui/cn";
import { IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_NAMES, LOCALE_TAGS, isTranslated, localizePath, stripLocale } from "@/lib/i18n/config";
import { Brand } from "./Brand";

const NAV = [
  { href: "/exam", key: "exam", match: (p: string) => p.startsWith("/exam") || p === "/tools/photo-signature" },
  { href: "/tools", key: "tools", match: (p: string) => p.startsWith("/tools") && p !== "/tools/photo-signature" },
  { href: "/privacy", key: "privacy", match: (p: string) => p.startsWith("/privacy") },
] as const;

/**
 * Link to the same page in the other language. A full page load (plain <a>)
 * so the server sets <html lang>; the choice lives only in the URL.
 */
function LanguageSwitch({ pathname }: { pathname: string }) {
  const { locale, t } = useI18n();
  if (!isTranslated(pathname)) return null;
  const target = locale === "hi" ? "en" : "hi";
  const href = localizePath(stripLocale(pathname), target);
  return (
    <a
      href={href}
      hrefLang={LOCALE_TAGS[target]}
      lang={LOCALE_TAGS[target]}
      title={t.layout.switchHint}
      data-testid="language-switch"
      // Keep the tool's presets (?target=50…) when switching language.
      onClick={(event) => {
        event.currentTarget.href = `${href}${window.location.search}${window.location.hash}`;
      }}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
    >
      <Icon name="globe" className="h-4 w-4" />
      {LOCALE_NAMES[target]}
    </a>
  );
}

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const { t, href } = useI18n();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const page = stripLocale(pathname);

  // Close the mobile menu after navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const links = NAV.map((item) => {
    const active = item.match(page);
    return (
      <Link
        key={item.href}
        href={href(item.href)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-surface-muted text-fg" : "text-fg-muted hover:bg-surface-muted hover:text-fg",
        )}
      >
        {t.layout.nav[item.key]}
      </Link>
    );
  });

  return (
    <header className="sticky top-0 z-40 print:hidden border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Brand href={href("/")} />
        <nav aria-label={t.layout.mainNav} className="hidden items-center gap-1 md:flex">
          {links}
        </nav>
        <div className="flex items-center gap-1">
          <Link
            href={href("/privacy")}
            className="mr-1 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success hover:underline"
          >
            <Icon name="shield" className="h-4 w-4" />
            <span className="sm:hidden">{t.layout.privateShort}</span>
            <span className="hidden sm:inline">{t.layout.privateLong}</span>
          </Link>
          <LanguageSwitch pathname={pathname} />
          <IconButton
            icon={open ? "x" : "menu"}
            label={open ? t.layout.closeMenu : t.layout.openMenu}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
            size="md"
            className="md:hidden"
          />
        </div>
      </div>
      <nav id={menuId} aria-label={t.layout.mainNav} hidden={!open} className="border-t border-border px-4 pb-3 pt-2 md:hidden">
        <div className="flex flex-col gap-1">{links}</div>
      </nav>
    </header>
  );
}
