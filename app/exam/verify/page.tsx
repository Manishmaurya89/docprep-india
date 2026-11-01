import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { DOCUMENT_TYPE_LABELS } from "@/data/exam-requirements/constants";
import { SPECS, getOrganization } from "@/data/exam-requirements";
import type { DocumentRequirement } from "@/data/exam-requirements/schema";
import { SpecStatusBadge } from "@/features/exam-preparation/components/SpecStatusBadge";
import { pageMetadata } from "@/lib/seo";
import { describePixels, describeSize } from "@/features/exam-preparation/plan";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Requirement Verification Sheet",
    description: "Every value in the requirements registry next to its official source, for independent review.",
    path: "/exam/verify",
  }),
  // A working document for reviewers, not a search landing page.
  robots: { index: false, follow: true },
};

const FORMAT_NAMES = { jpeg: "JPG / JPEG", png: "PNG", pdf: "PDF" } as const;

/** The values a reviewer must compare with the source, exactly as the app uses them. */
function rowsFor(doc: DocumentRequirement): [string, string][] {
  const rows: [string, string][] = [["Required", doc.required === "conditional" ? `Only if: ${doc.condition}` : doc.required]];
  if (doc.kind === "live-capture") rows.push(["Kind", "Captured live in the portal (no file prepared)"]);
  else rows.push(["Kind", doc.kind === "pdf" ? "PDF file" : "Image file"]);
  if (doc.formats.length) rows.push(["Format", doc.formats.map((f) => FORMAT_NAMES[f]).join(" or ")]);
  const size = describeSize(doc.fileSize);
  if (size) rows.push(["File size", size]);
  const pixels = describePixels(doc.pixels);
  if (pixels) rows.push(["Pixel dimensions", pixels]);
  if (doc.physical) rows.push(["Physical size", `${doc.physical.approximate ? "about " : ""}${doc.physical.widthMm} × ${doc.physical.heightMm} mm (width × height)`]);
  if (doc.pageSize) rows.push(["Page size", "A4"]);
  doc.conditions.forEach((condition, i) => rows.push([`Condition ${i + 1}`, condition]));
  doc.specificationGaps.forEach((gap, i) => rows.push([`Recorded gap ${i + 1}`, gap]));
  return rows;
}

export default function VerifyPage() {
  const specs = SPECS.filter((spec) => spec.verificationStatus !== "example");
  return (
    <>
      <PageHeader
        title="Requirement verification sheet"
        description="For a reviewer: compare every value below with the official document and tick it. Ticks are not saved — print this page or save it as PDF to keep a record."
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/exam", label: "Application preparation" },
          { href: "/exam/sources", label: "Sources" },
        ]}
      />
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-6 text-sm sm:px-6 sm:py-8">
        <ol className="max-w-3xl list-decimal space-y-1 pl-5 text-fg-muted print:hidden">
          <li>Open the official document with the link on each record.</li>
          <li>Find the section given in “Source reference” and compare each value, including words like “preferred”, “about” and “less than”.</li>
          <li>
            If everything matches, a maintainer changes the record to <code className="font-mono text-xs">verified</code> with your name and today’s date
            (see <code className="font-mono text-xs">docs/MAINTAINING_REQUIREMENTS.md</code>). If anything differs, report the record id and the value.
          </li>
        </ol>
        {specs.map((spec) => {
          const org = getOrganization(spec.organizationId);
          return (
            <section key={spec.id} aria-labelledby={`verify-${spec.id}`} className="space-y-4 break-inside-avoid-page" data-testid="verify-record">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h2 id={`verify-${spec.id}`} className="text-base font-semibold text-fg">
                    {org?.shortName} — {spec.examName}
                  </h2>
                  <p className="text-fg-muted">
                    {spec.notificationId} · notified {spec.notificationDate ?? "—"}
                    {spec.applicationWindow ? ` · applications ${spec.applicationWindow.opens} to ${spec.applicationWindow.closes}` : ""} · last checked{" "}
                    {spec.lastVerified ?? "—"} · record id <code className="font-mono text-xs">{spec.id}</code>
                  </p>
                  {spec.source ? (
                    <a href={spec.source.url} target="_blank" rel="noopener noreferrer" className="break-all text-accent underline">
                      {spec.source.title} ({spec.source.publisher})
                    </a>
                  ) : null}
                </div>
                <SpecStatusBadge status={spec.verificationStatus} />
              </div>
              {spec.documents.map((doc) => (
                <div key={doc.id} className="overflow-x-auto rounded-lg border border-border bg-surface">
                  <table className="w-full min-w-[40rem] text-left">
                    <caption className="border-b border-border bg-surface-muted px-4 py-2 text-left font-medium text-fg">
                      {doc.label} <span className="font-normal text-fg-subtle">({DOCUMENT_TYPE_LABELS[doc.type]})</span>
                      {doc.sourceReference ? <span className="block text-xs font-normal text-fg-subtle">Source reference: {doc.sourceReference}</span> : null}
                    </caption>
                    <thead className="sr-only">
                      <tr>
                        <th scope="col">Field</th>
                        <th scope="col">Value used by the app</th>
                        <th scope="col">Matches source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rowsFor(doc).map(([field, value]) => (
                        <tr key={field} className="align-top">
                          <th scope="row" className="w-44 px-4 py-2 font-normal text-fg-subtle">
                            {field}
                          </th>
                          <td className="px-4 py-2 text-fg">{value}</td>
                          <td className="w-28 px-4 py-2">
                            <label className="inline-flex items-center gap-2 text-fg-muted">
                              <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" aria-label={`${spec.id} ${doc.label} ${field} matches the source`} />
                              <span aria-hidden="true">Matches</span>
                            </label>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              {spec.notes.length ? (
                <ul className="list-disc space-y-1 pl-5 text-fg-muted">
                  {spec.notes.map((note) => (
                    <li key={note}>Note: {note}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
        <p className="text-fg-muted print:hidden">
          Back to <Link href="/exam/sources" className="text-accent underline">all sources</Link>.
        </p>
      </div>
    </>
  );
}
