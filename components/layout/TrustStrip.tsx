import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { Icon, type IconName } from "@/components/ui/icons";
import { getMessages } from "@/lib/i18n";
import { type Locale, localizePath } from "@/lib/i18n/config";

const ITEMS: { id: "device" | "uploads" | "account" | "free"; icon: IconName; tone: string }[] = [
  { id: "device", icon: "shield", tone: "bg-success-soft text-success" },
  { id: "uploads", icon: "cloudOff", tone: "bg-success-soft text-success" },
  { id: "account", icon: "userX", tone: "bg-accent-soft text-accent" },
  { id: "free", icon: "tag", tone: "bg-warning-soft text-warning" },
];

/** Big, picture-led promises; each one is true of how the site works (see /privacy). */
export function TrustStrip({ className, locale = "en" }: { className?: string; locale?: Locale }) {
  const t = getMessages(locale).trust;
  return (
    <section aria-label={t.label} className={cn("border-y border-border bg-surface", className)}>
      <ul className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {ITEMS.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full", item.tone)}>
              <Icon name={item.icon} className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-fg">{t.items[item.id].title}</span>
              <span className="block text-xs text-fg-muted">{t.items[item.id].text}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="pb-4 text-center text-xs text-fg-subtle">
        <Link href={localizePath("/privacy", locale)} className="underline hover:text-fg">
          {t.check}
        </Link>
      </p>
    </section>
  );
}
