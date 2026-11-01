import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { getMessages, i18n } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { BROWSER_STORAGE, NETWORK_USE, allToolsLocal, toolsByProcessing } from "@/lib/privacy/disclosures";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import { localizeTool } from "@/lib/tools/localize";
import { TOOLS } from "@/lib/tools/registry";

export function privacyMetadata(locale: Locale): Metadata {
  return pageMetadata({ ...getMessages(locale).seo.privacy, path: "/privacy", locale });
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-lg font-semibold text-fg">
        {title}
      </h2>
      <div className="space-y-3 text-fg-muted">{children}</div>
    </section>
  );
}

/** Generated from the same lists that control each tool, so it reflects how the tools actually work. */
export function PrivacyPage({ locale }: { locale: Locale }) {
  const { t, href } = i18n(locale);
  const p = t.privacy;
  const serverTools = toolsByProcessing("server");
  return (
    <>
      <PageHeader locale={locale} title={p.title} description={p.description(siteConfig.name)} crumbs={[{ href: href("/"), label: t.common.home }]} />
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 text-[0.95rem] sm:px-6">
        <Section id="summary" title={p.summary}>
          {allToolsLocal() ? (
            <p data-testid="privacy-summary">
              <strong className="text-fg">{p.allLocalStrong(TOOLS.length)}</strong> {p.allLocalText}
            </p>
          ) : (
            <p data-testid="privacy-summary">{p.someServer(serverTools.length)}</p>
          )}
        </Section>

        <Section id="where" title={p.where}>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{p.whereCaption}</caption>
              <thead className="border-b border-border bg-surface-muted text-xs text-fg-subtle">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">{p.toolColumn}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{p.whereColumn}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {TOOLS.map((tool) => localizeTool(tool, t, locale)).map((tool) => (
                  <tr key={tool.slug}>
                    <td className="px-4 py-2">
                      <Link href={tool.href} className="text-accent hover:underline">
                        {tool.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={tool.processing === "local" ? "success" : "warning"}>{p.processing[tool.processing].badge}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>{p.workers}</p>
        </Section>

        <Section id="storage" title={p.storage}>
          <p>{p.memoryOnly}</p>
          {BROWSER_STORAGE.length ? (
            <ul className="list-disc space-y-1 pl-5">
              {BROWSER_STORAGE.map((item) => (
                <li key={item.name}>
                  <code className="font-mono text-sm text-fg">{item.name}</code> in {item.location}: {item.contents}. {item.purpose}
                </li>
              ))}
            </ul>
          ) : (
            <p data-testid="no-storage">{p.noStorage}</p>
          )}
        </Section>

        <Section id="network" title={p.network}>
          <ul className="list-disc space-y-1 pl-5">
            {NETWORK_USE.map((use) => {
              const text = p.networkUse[use.id] ?? use;
              return <li key={use.id}>{p.networkItem(text.what, text.when, use.includesFileData)}</li>;
            })}
          </ul>
          <p>{p.csp}</p>
          <p>{p.checkYourself}</p>
        </Section>

        <Section id="downloads" title={p.downloads}>
          <p>{p.downloadsText}</p>
        </Section>

        <Section id="limits" title={p.limits}>
          <ul className="list-disc space-y-1 pl-5">
            {p.limitItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section id="future" title={p.future}>
          <p>{p.futureText}</p>
        </Section>
      </div>
    </>
  );
}
