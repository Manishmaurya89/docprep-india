import type { Metadata } from "next";
import Link from "next/link";
import { DocumentArt } from "@/components/illustrations/DocumentArt";
import { HeroArt } from "@/components/illustrations/HeroArt";
import { PrivacyFlow } from "@/components/illustrations/PrivacyFlow";
import { ChooseArt, DownloadArt, PrepareArt } from "@/components/illustrations/StepArt";
import { ToolArt } from "@/components/illustrations/ToolArt";
import { type UseCase, UseCaseArt } from "@/components/illustrations/UseCaseArt";
import { ToolCard } from "@/components/layout/ToolCard";
import { ToolSearch } from "@/components/layout/ToolSearch";
import { TrustStrip } from "@/components/layout/TrustStrip";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { ORGANIZATIONS, specsForOrganization } from "@/data/exam-requirements";
import type { DocumentType } from "@/data/exam-requirements/constants";
import { getMessages, i18n } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import { localizeTool } from "@/lib/tools/localize";
import { type ToolIcon, toolsByCategory } from "@/lib/tools/registry";

type QuickTask = keyof ReturnType<typeof getMessages>["home"]["quick"];

const QUICK_TASKS: { id: QuickTask; href: string; art: ToolIcon }[] = [
  { id: "compress50", href: "/tools/compress-image?target=50&unit=KB", art: "compress" },
  { id: "photoSignature", href: "/tools/photo-signature", art: "id-photo" },
  { id: "imagesToPdf", href: "/tools/images-to-pdf", art: "images-pdf" },
  { id: "pdfToImage", href: "/tools/pdf-to-image", art: "pdf-image" },
  { id: "compressPdf", href: "/tools/compress-pdf", art: "pdf-compress" },
  { id: "merge", href: "/tools/merge-pdf", art: "merge" },
];

/** Who the tools are for. Links go to general tools; no organisation's limits are claimed here. Labels come from `home.useCases[id].links`, in order. */
const USE_CASES: { id: UseCase; links: string[] }[] = [
  { id: "exams", links: ["/exam", "/tools/photo-signature"] },
  { id: "banking", links: ["/tools/photo-signature", "/tools/images-to-pdf", "/tools/compress-pdf"] },
  { id: "passport", links: ["/tools/photo-signature", "/tools/compress-image"] },
  { id: "admissions", links: ["/tools/merge-pdf", "/tools/compress-pdf"] },
  { id: "insurance", links: ["/tools/images-to-pdf", "/tools/merge-pdf"] },
  { id: "office", links: ["/tools/split-pdf", "/tools/organize-pdf", "/tools/convert-image"] },
];

const STEPS = [
  { id: "choose", art: <ChooseArt /> },
  { id: "prepare", art: <PrepareArt /> },
  { id: "download", art: <DownloadArt /> },
] as const;

const DOCUMENTS: { id: keyof ReturnType<typeof getMessages>["home"]["documents"]; type: DocumentType; live?: boolean }[] = [
  { id: "photo", type: "photograph" },
  { id: "signature", type: "signature" },
  { id: "thumb", type: "left-thumb-impression" },
  { id: "declaration", type: "handwritten-declaration" },
  { id: "certificates", type: "educational-certificate" },
  { id: "live", type: "photograph", live: true },
];

export function homeMetadata(locale: Locale): Metadata {
  const t = getMessages(locale);
  const title = t.seo.home(siteConfig.name);
  return { ...pageMetadata({ title, description: t.site.description, path: "/", locale }), title: { absolute: title } };
}

export function HomePage({ locale }: { locale: Locale }) {
  const { t, href } = i18n(locale);
  const h = t.home;
  const organizations = ORGANIZATIONS.filter((org) => org.id !== "other");
  return (
    <div>
      <section className="scroll-scope overflow-hidden bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-x-10 gap-y-5 px-4 pt-6 pb-6 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-12 lg:pb-10">
          <div className="space-y-4 lg:col-start-1 lg:row-start-1 lg:self-end">
            <p className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1 text-sm font-medium text-success">
              <Icon name="shield" className="h-4 w-4" />
              {h.badge}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-[2.6rem] sm:leading-[1.15]">{h.heading}</h1>
            <p className="max-w-xl text-lg text-fg-muted">{h.intro(siteConfig.name)}</p>
            <ul className="flex flex-wrap gap-2" aria-label={h.usedFor}>
              {USE_CASES.map((useCase) => (
                <li key={useCase.id}>
                  <a
                    href={`#use-${useCase.id}`}
                    className="inline-flex rounded-full border border-border bg-canvas px-3 py-1 text-sm text-fg-muted hover:border-accent/50 hover:text-fg"
                  >
                    {h.useCases[useCase.id].chip}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {/* On phones the picture comes right after the headline, before the buttons. */}
          <HeroArt locale={locale} className="mx-auto h-auto w-full max-w-[22rem] sm:max-w-md lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-w-none" />
          <div className="space-y-4 lg:col-start-1 lg:row-start-2 lg:self-start">
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={href("/tools")} size="lg" icon="search">
                {h.findTool}
              </ButtonLink>
              <ButtonLink href={href("/exam")} size="lg" variant="secondary" icon="checklist">
                {h.examForms}
              </ButtonLink>
            </div>
            <div className="max-w-xl">
              <ToolSearch />
            </div>
          </div>
        </div>
      </section>

      <TrustStrip locale={locale} />

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12 sm:px-6">
        <section aria-labelledby="use-cases" className="space-y-5">
          <div className="max-w-2xl">
            <h2 id="use-cases" className="text-xl font-semibold text-fg">
              {h.useCasesTitle}
            </h2>
            <p className="mt-1 text-fg-muted">{h.useCasesText}</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((useCase) => {
              const text = h.useCases[useCase.id];
              return (
                <li key={useCase.id} id={`use-${useCase.id}`} className="scroll-rise scroll-mt-24">
                  <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-center gap-4">
                      <UseCaseArt useCase={useCase.id} className="h-16 w-24 shrink-0" />
                      <h3 className="font-semibold text-fg">{text.title}</h3>
                    </div>
                    <p className="text-sm text-fg-muted">{text.text}</p>
                    <div className="mt-auto flex flex-wrap gap-2">
                      {useCase.links.map((path, index) => (
                        <Link
                          key={path}
                          href={href(path)}
                          className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2.5 py-1 text-sm font-medium text-accent hover:bg-accent hover:text-accent-fg"
                        >
                          {text.links[index]}
                          <Icon name="arrowRight" className="h-3.5 w-3.5" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="quick-tasks" className="space-y-5">
          <h2 id="quick-tasks" className="text-xl font-semibold text-fg">
            {h.quickTitle}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_TASKS.map((task) => (
              <li key={task.id} className="scroll-rise">
                <Link href={href(task.href)} className="lift flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/50">
                  <ToolArt icon={task.art} className="mx-auto h-28 w-auto max-w-full" />
                  <span className="flex items-center justify-between gap-2">
                    <span>
                      <span className="block font-semibold text-fg">{h.quick[task.id].title}</span>
                      <span className="block text-sm text-fg-muted">{h.quick[task.id].detail}</span>
                    </span>
                    <Icon name="arrowRight" className="h-5 w-5 shrink-0 text-accent" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how-it-works" className="scroll-scope space-y-6">
          <h2 id="how-it-works" className="text-xl font-semibold text-fg">
            {h.howTitle}
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.id} className="scroll-rise rounded-xl border border-border bg-surface p-5 text-center">
                <div className="mx-auto max-w-[12rem]">{step.art}</div>
                <p className="mt-3 text-sm font-semibold text-accent">{h.step(i + 1)}</p>
                <h3 className="mt-1 font-semibold text-fg">{h.steps[step.id].title}</h3>
                <p className="mt-1 text-sm text-fg-muted">{h.steps[step.id].text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="gov-prep" className="space-y-6 rounded-2xl border border-border bg-surface p-5 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h2 id="gov-prep" className="text-xl font-semibold text-fg">
                {h.govTitle}
              </h2>
              <p className="mt-1 text-fg-muted">{h.govText}</p>
            </div>
            <Link href={href("/exam/sources")} className="text-sm font-medium text-accent hover:underline">
              {h.govSources}
            </Link>
          </div>
          <ul className="flex flex-wrap gap-4" aria-label={h.documentsLabel}>
            {DOCUMENTS.map((doc) => (
              <li key={doc.id} className="flex flex-col items-center gap-1.5">
                <DocumentArt type={doc.type} live={doc.live} className="h-16 w-16" />
                <span className="text-xs font-medium text-fg-muted">{h.documents[doc.id]}</span>
              </li>
            ))}
          </ul>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => {
              const count = specsForOrganization(org.id).length;
              return (
                <li key={org.id} className="scroll-rise">
                  <Link href={href(`/exam?org=${org.id}#choose-exam`)} className="lift flex h-full items-center gap-3 rounded-lg border border-border bg-canvas p-4 hover:border-accent/50">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">{org.shortName}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-fg">{t.organizations[org.id]?.name ?? org.name}</span>
                      <span className="block text-xs text-fg-subtle">{h.notifications(count)}</span>
                    </span>
                    <Icon name="arrowRight" className="h-4 w-4 text-fg-subtle" />
                  </Link>
                </li>
              );
            })}
            <li className="scroll-rise">
              <Link href={href("/exam/custom")} className="lift flex h-full items-center gap-3 rounded-lg border border-dashed border-border-strong bg-canvas p-4 hover:border-accent/50">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
                  <Icon name="checklist" className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold text-fg">{h.otherForm}</span>
                  <span className="block text-xs text-fg-subtle">{h.otherFormText}</span>
                </span>
              </Link>
            </li>
          </ul>
        </section>

        <section aria-labelledby="privacy-summary" className="space-y-6">
          <div className="max-w-2xl">
            <h2 id="privacy-summary" className="text-xl font-semibold text-fg">
              {h.privacyTitle}
            </h2>
            <p className="mt-1 text-fg-muted">{h.privacyText}</p>
          </div>
          <PrivacyFlow locale={locale} />
          <p className="text-center text-sm">
            <Link href={href("/privacy")} className="font-medium text-accent hover:underline">
              {h.privacyLink}
            </Link>
          </p>
        </section>

        {(["image", "pdf"] as const).map((category) => (
          <section key={category} aria-labelledby={`${category}-tools`} className="space-y-4">
            <h2 id={`${category}-tools`} className="text-xl font-semibold text-fg">
              {t.categories[category]}
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {toolsByCategory(category).map((tool) => (
                <li key={tool.slug} className="scroll-rise">
                  <ToolCard tool={localizeTool(tool, t, locale)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
