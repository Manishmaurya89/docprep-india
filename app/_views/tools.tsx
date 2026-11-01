import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ToolCard } from "@/components/layout/ToolCard";
import { ToolSearch } from "@/components/layout/ToolSearch";
import { SizeLinks } from "@/components/workspace/SizeLinks";
import { ToolShell } from "@/components/workspace/ToolShell";
import { SPECS, getOrganization } from "@/data/exam-requirements";
import { type DocumentType, DOCUMENT_TYPES } from "@/data/exam-requirements/schema";
import { CustomPresetBuilder, type PresetOption } from "@/features/exam-preparation/components/CustomPresetBuilder";
import type { DraftDocument } from "@/features/exam-preparation/custom-preset";
import { describePixels, describeSize } from "@/features/exam-preparation/plan";
import { CompressTool } from "@/features/image-tools/CompressTool";
import { ConvertTool } from "@/features/image-tools/ConvertTool";
import { CropRotateTool } from "@/features/image-tools/CropRotateTool";
import { ResizeTool } from "@/features/image-tools/ResizeTool";
import { CompressPdfTool } from "@/features/pdf-tools/CompressPdfTool";
import { ExtractTool } from "@/features/pdf-tools/ExtractTool";
import { ImagesToPdfTool } from "@/features/pdf-tools/ImagesToPdfTool";
import { MergeTool } from "@/features/pdf-tools/MergeTool";
import { OrganizeTool } from "@/features/pdf-tools/OrganizeTool";
import { SplitTool } from "@/features/pdf-tools/SplitTool";
import { getMessages, i18n } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { type SearchParams, enumParam, positiveNumberParam } from "@/lib/search-params";
import { pageMetadata, toolMetadata } from "@/lib/seo";
import { localizeTool } from "@/lib/tools/localize";
import { type ToolCategory, type ToolSlug, getTool, toolsByCategory } from "@/lib/tools/registry";
import { type SizeTool, findSizeLanding, sizeLandingText, sizeLandingsFor } from "@/lib/tools/size-landing-pages";

/**
 * Tool pages, shared by the English routes (app/tools/…) and the Hindi ones
 * (app/hi/tools/…). Each route file only picks the language.
 */
type Props = { locale: Locale; searchParams: SearchParams };
type SizeProps = { locale: Locale; params: Promise<{ size: string }> };

export const metadataFor = (slug: ToolSlug, locale: Locale): Metadata => toolMetadata(getTool(slug), locale);

const ORDER: ToolCategory[] = ["application", "image", "pdf"];

export function toolsIndexMetadata(locale: Locale): Metadata {
  return pageMetadata({ ...getMessages(locale).seo.tools, path: "/tools", locale });
}

export function ToolsIndexPage({ locale }: { locale: Locale }) {
  const { t, href } = i18n(locale);
  return (
    <>
      <PageHeader locale={locale} title={t.toolsPage.title} description={t.toolsPage.description} crumbs={[{ href: href("/"), label: t.common.home }]} />
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-6 sm:px-6 sm:py-8">
        <div className="max-w-xl">
          <ToolSearch size="md" />
        </div>
        {ORDER.map((category) => (
          <section key={category} id={category} aria-labelledby={`${category}-heading`} className="scroll-mt-20 space-y-3">
            <h2 id={`${category}-heading`} className="text-lg font-semibold text-fg">
              {t.categories[category]}
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {toolsByCategory(category).map((tool) => (
                <li key={tool.slug}>
                  <ToolCard tool={localizeTool(tool, t, locale)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

export async function CompressImagePage({ locale, searchParams }: Props) {
  const params = await searchParams;
  return (
    <ToolShell tool={getTool("compress-image")} locale={locale}>
      <SizeLinks tool="compress-image" locale={locale} />
      <CompressTool initialTarget={positiveNumberParam(params.target, 100_000)} initialUnit={enumParam(params.unit, ["KB", "MB"] as const)} />
    </ToolShell>
  );
}

export function CompressPdfPage({ locale }: { locale: Locale }) {
  return (
    <ToolShell tool={getTool("compress-pdf")} locale={locale}>
      <SizeLinks tool="compress-pdf" locale={locale} />
      <CompressPdfTool />
    </ToolShell>
  );
}

/** Size landing pages ("Compress PDF to 200 KB"). Only the listed sizes exist. */
export const sizeStaticParams = (tool: SizeTool) => sizeLandingsFor(tool).map((landing) => ({ size: landing.slug }));

export async function sizeMetadata(tool: SizeTool, { locale, params }: SizeProps): Promise<Metadata> {
  const landing = findSizeLanding(tool, (await params).size);
  if (!landing) return {};
  const text = sizeLandingText(landing, locale);
  return pageMetadata({ title: text.title, description: text.description, path: landing.path, locale });
}

export async function SizePage({ tool, locale, params }: SizeProps & { tool: SizeTool }) {
  const landing = findSizeLanding(tool, (await params).size);
  if (!landing) notFound();
  const text = sizeLandingText(landing, locale);
  return (
    <ToolShell tool={getTool(tool)} locale={locale} heading={text.heading} intro={text.intro} path={text.path} artTarget={landing.label}>
      <SizeLinks tool={tool} current={landing.slug} locale={locale} />
      {tool === "compress-image" ? (
        <CompressTool key={landing.slug} initialTarget={landing.kb >= 1000 ? landing.kb / 1000 : landing.kb} initialUnit={landing.kb >= 1000 ? "MB" : "KB"} />
      ) : (
        <CompressPdfTool key={landing.slug} initialTargetKB={landing.kb} />
      )}
    </ToolShell>
  );
}

export async function ConvertImagePage({ locale, searchParams }: Props) {
  const params = await searchParams;
  return (
    <ToolShell tool={getTool("convert-image")} locale={locale}>
      <ConvertTool initialFormat={enumParam(params.to, ["jpeg", "png", "webp"] as const)} />
    </ToolShell>
  );
}

export function CropRotatePage({ locale }: { locale: Locale }) {
  return (
    <ToolShell tool={getTool("crop-rotate-image")} locale={locale}>
      <CropRotateTool />
    </ToolShell>
  );
}

export function ExtractPagesPage({ locale }: { locale: Locale }) {
  return (
    <ToolShell tool={getTool("extract-pdf-pages")} locale={locale}>
      <ExtractTool />
    </ToolShell>
  );
}

export function ImagesToPdfPage({ locale }: { locale: Locale }) {
  return (
    <ToolShell tool={getTool("images-to-pdf")} locale={locale}>
      <ImagesToPdfTool />
    </ToolShell>
  );
}

export function MergePdfPage({ locale }: { locale: Locale }) {
  return (
    <ToolShell tool={getTool("merge-pdf")} locale={locale}>
      <MergeTool />
    </ToolShell>
  );
}

export function OrganizePdfPage({ locale }: { locale: Locale }) {
  return (
    <ToolShell tool={getTool("organize-pdf")} locale={locale}>
      <OrganizeTool />
    </ToolShell>
  );
}

export function SplitPdfPage({ locale }: { locale: Locale }) {
  return (
    <ToolShell tool={getTool("split-pdf")} locale={locale}>
      <SplitTool />
    </ToolShell>
  );
}

export async function ResizeImagePage({ locale, searchParams }: Props) {
  const params = await searchParams;
  const width = positiveNumberParam(params.w, 10_000);
  const height = positiveNumberParam(params.h, 10_000);
  return (
    <ToolShell tool={getTool("resize-image")} locale={locale}>
      <ResizeTool initialWidth={width ? Math.round(width) : undefined} initialHeight={height ? Math.round(height) : undefined} />
    </ToolShell>
  );
}

/** Limits from every registry record, offered as starting points. Names and values stay exactly as the records give them. */
function presetOptions(locale: Locale): PresetOption[] {
  const t = getMessages(locale);
  return SPECS.flatMap((spec) =>
    spec.documents
      .filter((doc) => doc.kind === "image" && (doc.fileSize || doc.pixels))
      .map((doc) => {
        const org = spec.organizationId === "other" ? t.otherShortName : (getOrganization(spec.organizationId)?.shortName ?? "");
        const name = `${org} ${spec.notificationId ?? spec.examName}`.trim();
        const limits = [describeSize(doc.fileSize, t), describePixels(doc.pixels, t)].filter(Boolean).join(", ");
        return {
          value: `${spec.id}:${doc.id}`,
          label: `${name} — ${doc.label} (${limits})`,
          source: `${name} (${locale === "en" ? t.status.labels[spec.verificationStatus].toLowerCase() : t.status.labels[spec.verificationStatus]})`,
          requirement: doc,
        };
      }),
  );
}

export async function PhotoSignaturePage({ locale, searchParams }: Props) {
  const t = getMessages(locale);
  const params = await searchParams;
  const width = positiveNumberParam(params.w, 10_000);
  const height = positiveNumberParam(params.h, 10_000);
  const type = enumParam(params.type, DOCUMENT_TYPES) as DocumentType | undefined;
  const fromQuery = Boolean(width || height || params.min || params.max);
  const initial: Partial<DraftDocument>[] | undefined = fromQuery
    ? [
        {
          label: typeof params.label === "string" ? params.label.slice(0, 60) : type === "signature" ? t.custom.defaultSignature : t.custom.defaultPhoto,
          type: type ?? "photograph",
          minKB: positiveNumberParam(params.min, 100_000)?.toString() ?? "",
          maxKB: positiveNumberParam(params.max, 100_000)?.toString() ?? "",
          dimensions: width && height ? "exact" : "none",
          width: width ? String(Math.round(width)) : "",
          height: height ? String(Math.round(height)) : "",
        },
      ]
    : undefined;

  return (
    <ToolShell tool={getTool("photo-signature")} locale={locale}>
      <CustomPresetBuilder initial={initial} presets={presetOptions(locale)} allowMultiple={false} />
    </ToolShell>
  );
}
