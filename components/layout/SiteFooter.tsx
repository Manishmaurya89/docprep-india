"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { siteConfig } from "@/lib/site-config";
import { BrandMark } from "./Brand";

export function SiteFooter() {
  const { t, href } = useI18n();
  const link = "hover:text-fg hover:underline";
  return (
    <footer className="mt-16 border-t print:hidden border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold text-fg">
            <BrandMark className="h-6 w-6" />
            {siteConfig.name}
          </div>
          <p className="max-w-md text-fg-muted">{t.layout.footerText}</p>
        </div>
        <div>
          <h2 className="mb-2 font-semibold text-fg">{t.layout.footerTools}</h2>
          <ul className="space-y-1.5 text-fg-muted">
            <li><Link className={link} href={href("/exam")}>{t.layout.footerApplication}</Link></li>
            <li><Link className={link} href={href("/tools#image")}>{t.layout.footerImage}</Link></li>
            <li><Link className={link} href={href("/tools#pdf")}>{t.layout.footerPdf}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-2 font-semibold text-fg">{t.layout.footerAbout}</h2>
          <ul className="space-y-1.5 text-fg-muted">
            <li><Link className={link} href={href("/privacy")}>{t.layout.footerPrivacy}</Link></li>
            <li><Link className={link} href={href("/exam/sources")}>{t.layout.footerSources}</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
