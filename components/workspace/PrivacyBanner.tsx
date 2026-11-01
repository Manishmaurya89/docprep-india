import Link from "next/link";
import { PALETTE as C } from "@/components/illustrations/palette";
import { getMessages } from "@/lib/i18n";
import { type Locale, localizePath } from "@/lib/i18n/config";

/** Shown above every tool: the privacy promise as a picture, not fine print. */
export function PrivacyBanner({ locale = "en" }: { locale?: Locale }) {
  const t = getMessages(locale).privacyBanner;
  return (
    <div className="flex items-center gap-4 rounded-lg border border-success/30 bg-success-soft px-4 py-3" data-testid="privacy-banner">
      <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0" aria-hidden="true">
        <path d="M24 3l17 6v13c0 12-7.5 20.5-17 24C14.5 42.5 7 34 7 22V9z" fill={C.green} />
        <rect x="16.5" y="21" width="15" height="12" rx="2.5" fill={C.white} />
        <path d="M19.5 21v-3.5a4.5 4.5 0 0 1 9 0V21" fill="none" stroke={C.white} strokeWidth="2.6" />
        <circle cx="24" cy="27" r="1.8" fill={C.green} />
      </svg>
      <p className="text-sm text-fg">
        <span className="font-semibold">{t.strong}</span> <span className="text-fg-muted">{t.text}</span>{" "}
        <Link href={localizePath("/privacy", locale)} className="whitespace-nowrap font-medium text-success underline">
          {t.link}
        </Link>
      </p>
    </div>
  );
}
