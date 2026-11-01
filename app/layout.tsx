import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { ToastProvider } from "@/components/ui/Toast";
import { I18nProvider } from "@/lib/i18n/client";
import { DEFAULT_LOCALE, LOCALE_TAGS, isLocale } from "@/lib/i18n/config";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — ${siteConfig.tagline}`, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  referrer: "no-referrer",
  formatDetection: { telephone: false },
  openGraph: { siteName: siteConfig.name, type: "website", locale: "en_IN", title: siteConfig.name, description: siteConfig.description },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Render per request: Next.js applies the proxy's CSP nonce to its scripts only
  // when the page is rendered dynamically (a prerendered page would be blocked).
  await connection();
  // Set by proxy.ts from the URL ("/hi/…" is Hindi). Never from a cookie or storage.
  const requested = (await headers()).get("x-locale");
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;
  return (
    <html lang={LOCALE_TAGS[locale]}>
      <body className="flex min-h-screen flex-col antialiased">
        <I18nProvider>
          <SkipLink />
          <ToastProvider>
            <SiteHeader />
            <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
              {children}
            </main>
            <SiteFooter />
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
