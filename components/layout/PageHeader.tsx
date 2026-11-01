import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n";

export interface Crumb {
  href: string;
  label: string;
}

export function PageHeader({
  title,
  description,
  crumbs,
  aside,
  locale = "en",
}: {
  locale?: Locale;
  title: ReactNode;
  description?: ReactNode;
  crumbs?: Crumb[];
  aside?: ReactNode;
}) {
  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {crumbs?.length ? (
          <nav aria-label={getMessages(locale).common.breadcrumb} className="mb-3">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-fg-subtle">
              {crumbs.map((crumb, index) => (
                <li key={crumb.href} className="flex items-center gap-1.5">
                  {index > 0 ? <span aria-hidden="true">/</span> : null}
                  <Link href={crumb.href} className="hover:text-fg hover:underline">
                    {crumb.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold text-fg sm:text-[1.75rem]">{title}</h1>
            {description ? <p className="mt-2 text-fg-muted">{description}</p> : null}
          </div>
          {aside}
        </div>
      </div>
    </div>
  );
}
