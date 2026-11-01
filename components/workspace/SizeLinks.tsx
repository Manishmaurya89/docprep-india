import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { getMessages } from "@/lib/i18n";
import { type Locale, localizePath } from "@/lib/i18n/config";
import { type SizeTool, sizeLandingsFor } from "@/lib/tools/size-landing-pages";

/** Quick links to the same tool preset to other common sizes. */
export function SizeLinks({ tool, current, locale = "en" }: { tool: SizeTool; current?: string; locale?: Locale }) {
  const t = getMessages(locale).sizes;
  return (
    <nav aria-label={t.nav} className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-fg-subtle">{t.common}</span>
      {sizeLandingsFor(tool).map((page) => (
        <Link
          key={page.slug}
          href={localizePath(page.path, locale)}
          aria-current={page.slug === current ? "page" : undefined}
          className={cn(
            "rounded-full border px-3 py-1",
            page.slug === current ? "border-accent bg-accent-soft font-medium text-accent" : "border-border bg-surface text-fg-muted hover:border-accent/50 hover:text-fg",
          )}
        >
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
