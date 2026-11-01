import type { ReactNode } from "react";
import { ToolArt } from "@/components/illustrations/ToolArt";
import { JsonLd } from "@/components/layout/JsonLd";
import { PageHeader } from "@/components/layout/PageHeader";
import { RichText } from "@/components/ui/RichText";
import { getMessages } from "@/lib/i18n";
import { type Locale, localizePath } from "@/lib/i18n/config";
import { toolStructuredData } from "@/lib/seo";
import { localizeTool } from "@/lib/tools/localize";
import type { ToolDefinition, ToolSlug } from "@/lib/tools/registry";
import { PrivacyBanner } from "./PrivacyBanner";
import { ShareTool } from "./ShareTool";

/**
 * Standard tool page: header with a picture of the tool, the privacy banner,
 * the workspace, then the tool's "Good to know" notes from the dictionary.
 */
export function ToolShell({
  tool: base,
  locale = "en",
  children,
  heading,
  intro,
  path,
  artTarget,
}: {
  tool: ToolDefinition;
  locale?: Locale;
  children: ReactNode;
  /** Overrides for landing pages such as "Compress PDF to 200 KB" (already in `locale`). */
  heading?: string;
  intro?: string;
  /** The landing page's path in `locale`. */
  path?: string;
  /** Result size shown in the header picture on size pages. */
  artTarget?: string;
}) {
  const t = getMessages(locale);
  const tool = localizeTool(base, t, locale);
  const category = t.categories[tool.category];
  const categoryHref = localizePath(tool.category === "application" ? "/exam" : `/tools#${tool.category}`, locale);
  const page = heading && path ? { ...tool, title: heading, summary: intro ?? tool.summary, href: path } : tool;
  const notes = t.notes[base.slug as ToolSlug];
  return (
    <>
      <JsonLd data={toolStructuredData(page, category, categoryHref, locale)} />
      <PageHeader
        locale={locale}
        title={page.title}
        description={page.summary}
        crumbs={[
          { href: localizePath("/", locale), label: t.common.home },
          { href: categoryHref, label: category },
          ...(path ? [{ href: tool.href, label: tool.title }] : []),
        ]}
        aside={<ToolArt icon={tool.icon} target={artTarget} className="hidden h-24 w-36 sm:block" />}
      />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* Only local tools exist today; a server tool must replace this with its own disclosure. */}
        {tool.processing === "local" ? <PrivacyBanner locale={locale} /> : null}
        {children}
        <ShareTool title={page.title} path={page.href} />
        {notes.length ? (
          <section aria-labelledby="tool-notes" className="max-w-3xl border-t border-border pt-6 text-sm text-fg-muted">
            <h2 id="tool-notes" className="mb-2 text-base font-semibold text-fg">
              {t.common.goodToKnow}
            </h2>
            <ul className="space-y-2 [&_li]:ml-5 [&_li]:list-disc">
              {notes.map((note) => (
                <li key={note}>
                  <RichText text={note} locale={locale} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
