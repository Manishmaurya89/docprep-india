import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { siteConfig } from "@/lib/site-config";

const t = getMessages("hi");

/** Defaults for every Hindi page (each page still sets its own title and description). <html lang> is set by the root layout. */
export const metadata: Metadata = {
  title: { default: `${siteConfig.name} — ${t.site.tagline}`, template: `%s · ${siteConfig.name}` },
  description: t.site.description,
  openGraph: { siteName: siteConfig.name, type: "website", locale: "hi_IN", title: siteConfig.name, description: t.site.description },
};

export default function HindiLayout({ children }: { children: ReactNode }) {
  return children;
}
