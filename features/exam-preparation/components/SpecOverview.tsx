"use client";

import { Icon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_TAGS, type Locale } from "@/lib/i18n/config";
import type { ApplicationSpec, Organization } from "@/data/exam-requirements/schema";
import { getSpecWarnings } from "../spec-status";
import { SpecStatusBadge } from "./SpecStatusBadge";
import { SpecWarnings } from "./SpecWarnings";

function formatDate(iso: string | null | undefined, locale: Locale, missing: string): string {
  if (!iso) return missing;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(LOCALE_TAGS[locale], { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Where the requirements come from and how much to trust them. */
export function SpecOverview({ spec, organization }: { spec: ApplicationSpec; organization?: Organization }) {
  const { locale, t } = useI18n();
  const e = t.exam;
  const date = (iso: string | null | undefined) => formatDate(iso, locale, e.notRecorded);
  const warnings = getSpecWarnings(spec, undefined, t);
  const rows: [string, string][] = [
    [e.organisation, organization ? `${organization.name} (${organization.shortName})` : "—"],
    [e.notification, [spec.notificationId, spec.notificationTitle].filter(Boolean).join(" — ")],
    [e.cycle, spec.recruitmentCycle],
    [e.notificationDate, date(spec.notificationDate)],
  ];
  if (spec.applicationWindow) rows.push([e.onlineApplications, e.dateRange(date(spec.applicationWindow.opens), date(spec.applicationWindow.closes))]);
  rows.push([e.lastChecked, date(spec.lastVerified)]);

  return (
    <section aria-labelledby="spec-overview" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="spec-overview" className="text-lg font-semibold text-fg">
          {e.overviewTitle}
        </h2>
        <SpecStatusBadge status={spec.verificationStatus} />
      </div>
      <SpecWarnings warnings={warnings} />
      <div className="grid gap-4 rounded-lg border border-border bg-surface p-4 md:grid-cols-[1fr_auto]">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-fg-subtle">{label}</dt>
              <dd className="text-fg">{value}</dd>
            </div>
          ))}
        </dl>
        {spec.source ? (
          <a
            href={spec.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-start gap-2 self-start rounded-md border border-border px-3 py-2 text-sm text-accent hover:bg-surface-muted"
          >
            <Icon name="external" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="block font-medium">{e.openOfficial}</span>
              <span className="block max-w-[16rem] text-xs text-fg-subtle">{spec.source.publisher}</span>
            </span>
          </a>
        ) : null}
      </div>
      {spec.notes.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
          {spec.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
