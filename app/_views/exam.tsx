import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RichText } from "@/components/ui/RichText";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icons";
import { DocumentArt } from "@/components/illustrations/DocumentArt";
import { ORGANIZATIONS, REGISTRY_ISSUES, SPECS, examsForOrganization, getOrganization, getSpec } from "@/data/exam-requirements";
import type { Organization } from "@/data/exam-requirements/schema";
import { ApplicationWorkspace } from "@/features/exam-preparation/components/ApplicationWorkspace";
import { CustomPresetBuilder } from "@/features/exam-preparation/components/CustomPresetBuilder";
import { SpecOverview } from "@/features/exam-preparation/components/SpecOverview";
import { SpecStatusBadge } from "@/features/exam-preparation/components/SpecStatusBadge";
import { STALE_AFTER_DAYS } from "@/features/exam-preparation/spec-status";
import { type Messages, getMessages, i18n } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { SearchParams } from "@/lib/search-params";
import { pageMetadata } from "@/lib/seo";

/**
 * Application-preparation pages, shared by /exam/… and /hi/exam/…. Values
 * from the requirement records (exam names, notification titles, limits,
 * source references) are shown exactly as recorded, in every language.
 */
type SpecParams = Promise<{ specId: string }>;

/** An organisation with its name (and description) in the page language. Official short names stay as they are. */
function localizeOrganization(org: Organization, t: Messages): Organization {
  const text = t.organizations[org.id];
  return { ...org, name: text?.name ?? org.name, description: text?.description ?? org.description, shortName: org.id === "other" ? t.otherShortName : org.shortName };
}

export function examMetadata(locale: Locale): Metadata {
  return pageMetadata({ ...getMessages(locale).seo.exam, path: "/exam", locale });
}

function Steps({ current, t }: { current: number; t: Messages }) {
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label={t.examIndex.stepsLabel}>
      {t.examIndex.steps.map((step, i) => (
        <li key={step} className={cn("flex items-center gap-2", i === current ? "font-medium text-fg" : "text-fg-subtle")} aria-current={i === current ? "step" : undefined}>
          <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs", i === current ? "bg-accent text-accent-fg" : i < current ? "bg-success-soft text-success" : "bg-surface-muted")}>
            {i < current ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}

function windowLabel(t: Messages, window?: { opens: string; closes: string }) {
  if (!window) return null;
  const closed = new Date(`${window.closes}T23:59:59+05:30`).getTime() < Date.now();
  return closed ? <Badge>{t.examIndex.closed(window.closes)}</Badge> : <Badge tone="success">{t.examIndex.openUntil(window.closes)}</Badge>;
}

export async function ExamIndexPage({ locale, searchParams }: { locale: Locale; searchParams: SearchParams }) {
  const { t, href } = i18n(locale);
  const params = await searchParams;
  const orgId = typeof params.org === "string" ? params.org : undefined;
  const found = orgId ? getOrganization(orgId) : undefined;
  const organization = found ? localizeOrganization(found, t) : undefined;
  const exams = organization ? examsForOrganization(organization.id) : [];

  return (
    <>
      <PageHeader
        locale={locale}
        title={t.examIndex.title}
        description={t.examIndex.description}
        crumbs={[{ href: href("/"), label: t.common.home }]}
        aside={
          <div className="hidden gap-2 sm:flex" aria-hidden="true">
            <DocumentArt type="photograph" />
            <DocumentArt type="signature" />
            <DocumentArt type="left-thumb-impression" />
            <DocumentArt type="educational-certificate" />
          </div>
        }
      />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <Steps current={organization ? 1 : 0} t={t} />

        <section aria-labelledby="choose-org" className="space-y-3">
          <h2 id="choose-org" className="text-lg font-semibold text-fg">
            {t.examIndex.chooseOrg}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ORGANIZATIONS.map((raw) => {
              const org = localizeOrganization(raw, t);
              const selected = org.id === organization?.id;
              return (
                <li key={org.id}>
                  <Link
                    href={href(`/exam?org=${org.id}#choose-exam`)}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "flex h-full flex-col gap-1 rounded-lg border p-4 transition-colors",
                      selected ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent/50 hover:bg-surface-muted",
                    )}
                  >
                    <span className="text-base font-semibold text-fg">{org.shortName}</span>
                    <span className="text-sm text-fg-muted">{org.name}</span>
                    <span className="mt-1 text-xs text-fg-subtle">{org.description}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {organization ? (
          <section aria-labelledby="choose-exam" id="choose-exam" className="scroll-mt-20 space-y-4">
            <h2 id="choose-exam-title" className="text-lg font-semibold text-fg">
              {t.examIndex.chooseExam(organization.shortName)}
            </h2>
            {organization.id === "other" ? (
              <Card className="space-y-3 p-5">
                <p className="text-sm text-fg-muted">{t.examIndex.otherText}</p>
                <ButtonLink href={href("/exam/custom")} icon="checklist">
                  {t.examIndex.enterCustom}
                </ButtonLink>
              </Card>
            ) : null}
            {exams.map(({ examName, specs }) => (
              <Card key={examName} className="overflow-hidden">
                <h3 className="border-b border-border px-4 py-3 text-base font-semibold text-fg sm:px-5">{examName}</h3>
                <ul className="divide-y divide-border">
                  {specs.map((spec) => (
                    <li key={spec.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-fg">{spec.notificationId ?? spec.notificationTitle}</p>
                        <p className="text-xs text-fg-subtle">{t.examIndex.items(spec.recruitmentCycle, spec.documents.length, spec.notificationDate ?? null)}</p>
                        <div className="flex flex-wrap gap-2">
                          <SpecStatusBadge status={spec.verificationStatus} />
                          {windowLabel(t, spec.applicationWindow)}
                        </div>
                      </div>
                      <ButtonLink href={href(`/exam/${spec.id}`)} variant="secondary" size="sm">
                        {t.examIndex.prepare}
                        <Icon name="arrowRight" className="h-4 w-4" />
                      </ButtonLink>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
            {organization.id !== "other" ? (
              <p className="text-sm text-fg-muted">
                <RichText text={t.examIndex.notListed} locale={locale} />
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </>
  );
}

export async function examSpecMetadata(locale: Locale, params: SpecParams): Promise<Metadata> {
  const t = getMessages(locale);
  const spec = getSpec((await params).specId);
  if (!spec) return { title: t.seo.examSpecMissing };
  const org = getOrganization(spec.organizationId);
  const name = `${org?.shortName ?? ""} ${spec.examName}`.trim();
  const metadata = pageMetadata({
    title: t.seo.examSpec(name, spec.recruitmentCycle),
    description: t.seo.examSpecDescription(`${spec.notificationTitle}${spec.notificationId ? ` (${spec.notificationId})` : ""}`),
    path: `/exam/${spec.id}`,
    locale,
  });
  // Example presets are demonstrations, not something to rank in search.
  return spec.verificationStatus === "example" ? { ...metadata, robots: { index: false, follow: true } } : metadata;
}

export async function ExamSpecPage({ locale, params }: { locale: Locale; params: SpecParams }) {
  const { t, href } = i18n(locale);
  const spec = getSpec((await params).specId);
  if (!spec) notFound();
  const found = getOrganization(spec.organizationId);
  const organization = found ? localizeOrganization(found, t) : undefined;
  return (
    <>
      <PageHeader
        locale={locale}
        title={`${organization?.shortName ? `${organization.shortName}: ` : ""}${spec.examName}`}
        description={spec.notificationTitle}
        crumbs={[
          { href: href("/"), label: t.common.home },
          { href: href("/exam"), label: t.examSpec.applicationPrep },
          { href: href(`/exam?org=${spec.organizationId}#choose-exam`), label: organization?.shortName ?? t.examSpec.organisation },
        ]}
      />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <SpecOverview spec={spec} organization={organization} />
        <section aria-labelledby="documents-heading" className="space-y-4">
          <h2 id="documents-heading" className="text-lg font-semibold text-fg">
            {t.examSpec.prepareHeading}
          </h2>
          <ApplicationWorkspace spec={spec} zipName={`${spec.id}-documents.zip`} />
        </section>
      </div>
    </>
  );
}

export function examCustomMetadata(locale: Locale): Metadata {
  return pageMetadata({ ...getMessages(locale).seo.custom, path: "/exam/custom", locale });
}

export function ExamCustomPage({ locale }: { locale: Locale }) {
  const { t, href } = i18n(locale);
  return (
    <>
      <PageHeader
        locale={locale}
        title={t.examCustom.title}
        description={t.examCustom.description}
        crumbs={[
          { href: href("/"), label: t.common.home },
          { href: href("/exam"), label: t.examSpec.applicationPrep },
        ]}
      />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <CustomPresetBuilder
          initial={[
            { label: t.custom.defaultPhoto, type: "photograph" },
            { label: t.custom.defaultSignature, type: "signature" },
          ]}
        />
      </div>
    </>
  );
}

export function examSourcesMetadata(locale: Locale): Metadata {
  return pageMetadata({ ...getMessages(locale).seo.sources, path: "/exam/sources", locale });
}

export function ExamSourcesPage({ locale }: { locale: Locale }) {
  const { t, href } = i18n(locale);
  const s = t.examSources;
  return (
    <>
      <PageHeader
        locale={locale}
        title={s.title}
        description={s.description}
        crumbs={[
          { href: href("/"), label: t.common.home },
          { href: href("/exam"), label: t.examSpec.applicationPrep },
        ]}
      />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 text-sm sm:px-6 sm:py-8">
        <div className="max-w-3xl space-y-2 text-fg-muted">
          <p>
            <RichText text={s.explain(STALE_AFTER_DAYS)} locale={locale} />
          </p>
          <p>{s.precedence}</p>
          <p>
            <RichText text={s.reviewing} locale={locale} />
          </p>
        </div>
        {REGISTRY_ISSUES.length ? <p className="text-danger">{s.issues(REGISTRY_ISSUES.length)}</p> : null}
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[44rem] text-left">
            <caption className="sr-only">{s.caption}</caption>
            <thead className="border-b border-border bg-surface-muted text-xs text-fg-subtle">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">{s.record}</th>
                <th scope="col" className="px-4 py-2 font-medium">{s.status}</th>
                <th scope="col" className="px-4 py-2 font-medium">{s.source}</th>
                <th scope="col" className="px-4 py-2 font-medium">{s.lastChecked}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SPECS.map((spec) => (
                <tr key={spec.id} className="align-top">
                  <td className="px-4 py-3">
                    <Link href={href(`/exam/${spec.id}`)} className="font-medium text-accent hover:underline">
                      {spec.organizationId === "other" ? t.otherShortName : getOrganization(spec.organizationId)?.shortName} — {spec.examName}
                    </Link>
                    <p className="text-xs text-fg-subtle">{spec.notificationId ?? s.noNotification}</p>
                  </td>
                  <td className="px-4 py-3">
                    <SpecStatusBadge status={spec.verificationStatus} />
                  </td>
                  <td className="px-4 py-3">
                    {spec.source ? (
                      <a href={spec.source.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        {spec.source.title}
                      </a>
                    ) : (
                      <span className="text-fg-subtle">{s.none}</span>
                    )}
                    {spec.source ? <p className="text-xs text-fg-subtle">{spec.source.publisher}</p> : null}
                  </td>
                  <td className="tabular px-4 py-3 text-fg-muted">{spec.lastVerified ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-fg-muted">
          <RichText text={s.mistakes} locale={locale} />
        </p>
      </div>
    </>
  );
}
