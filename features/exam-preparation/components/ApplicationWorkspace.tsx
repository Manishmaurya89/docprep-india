"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { DocumentArt } from "@/components/illustrations/DocumentArt";
import type { ApplicationSpec, DocumentRequirement } from "@/data/exam-requirements/schema";
import { downloadBlob } from "@/lib/file-processing/download";
import { errorText, toProcessingError } from "@/lib/file-processing/errors";
import { useI18n } from "@/lib/i18n/client";
import type { UiMessages } from "@/lib/i18n/en";
import type { PreparedFile } from "../prepare-image";
import { summarizeFindings } from "../validate";
import { ImageDocumentCard } from "./ImageDocumentCard";
import { LiveCaptureNotice } from "./LiveCaptureNotice";
import { PdfDocumentCard } from "./PdfDocumentCard";
import { RequirementSummary } from "./RequirementSummary";

type Prepared = Record<string, PreparedFile | null>;

function statusFor(requirement: DocumentRequirement, prepared: PreparedFile | null | undefined, t: UiMessages) {
  if (requirement.kind === "live-capture") return { tone: "neutral" as const, label: t.exam.inForm };
  if (!prepared) return { tone: "neutral" as const, label: t.exam.notPrepared };
  const summary = summarizeFindings(prepared.findings);
  if (summary.failed) return { tone: "danger" as const, label: t.exam.notMet(summary.failed) };
  if (summary.manual) return { tone: "warning" as const, label: t.exam.readyToCheck(summary.manual) };
  return { tone: "success" as const, label: t.exam.ready };
}

/**
 * The per-notification workspace: one card per required document, a running
 * checklist, and a ZIP of everything prepared. All processing is local.
 */
export function ApplicationWorkspace({ spec, zipName, handoffKey }: { spec: ApplicationSpec; zipName: string; handoffKey?: string }) {
  const { t } = useI18n();
  const [prepared, setPrepared] = useState<Prepared>({});
  const [optedIn, setOptedIn] = useState<Record<string, boolean>>({});
  const [zipping, setZipping] = useState(false);
  const { notify } = useToast();

  const applicable = spec.documents.filter((doc) => doc.required === "required" || optedIn[doc.id]);
  const ready = applicable.filter((doc) => prepared[doc.id]);
  const anyFailures = ready.some((doc) => summarizeFindings(prepared[doc.id]!.findings).failed > 0);
  const toPrepare = applicable.filter((doc) => doc.kind !== "live-capture");

  const setFor = (id: string) => (file: PreparedFile | null) => setPrepared((current) => ({ ...current, [id]: file }));
  // A handed-over photo goes to the first photograph only (never a signature or thumb slot).
  const firstPhotoId = spec.documents.find((doc) => doc.kind === "image" && doc.type === "photograph")?.id;

  const downloadZip = async () => {
    setZipping(true);
    try {
      const { createZip } = await import("@/lib/file-processing/zip");
      const entries = await Promise.all(ready.map(async (doc) => ({ name: prepared[doc.id]!.filename, data: new Uint8Array(await prepared[doc.id]!.blob.arrayBuffer()) })));
      downloadBlob(new Blob([createZip(entries) as BlobPart], { type: "application/zip" }), zipName);
    } catch (error) {
      const { title, hint } = errorText(toProcessingError(error), t.errors);
      notify(`${title} ${hint ?? ""}`.trim(), "danger");
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <ol className="space-y-6" aria-label={t.exam.documents}>
        {spec.documents.map((doc, index) => {
          const optional = doc.required !== "required";
          const active = !optional || optedIn[doc.id];
          const status = statusFor(doc, prepared[doc.id], t);
          return (
            <li key={doc.id} id={`doc-${doc.id}`} data-testid={`document-${doc.id}`}>
              <Card>
                <CardHeader
                  as="h3"
                  title={
                    <span className="flex flex-wrap items-center gap-3">
                      <DocumentArt type={doc.type} live={doc.kind === "live-capture"} className="h-10 w-10 shrink-0" />
                      <span className="tabular text-fg-subtle">{index + 1}.</span> {doc.label}
                      {optional ? <Badge>{doc.required === "conditional" ? t.exam.ifApplicable : t.exam.optional}</Badge> : null}
                    </span>
                  }
                  description={t.documentTypes[doc.type] !== doc.label ? t.documentTypes[doc.type] : undefined}
                  actions={active ? <Badge tone={status.tone}>{status.label}</Badge> : null}
                />
                <CardBody className="space-y-4">
                  {doc.condition ? <p className="text-sm text-fg-muted">{doc.condition}</p> : null}
                  {optional ? (
                    <Checkbox
                      label={t.exam.appliesToMe}
                      checked={Boolean(optedIn[doc.id])}
                      onChange={(e) => {
                        setOptedIn((current) => ({ ...current, [doc.id]: e.target.checked }));
                        if (!e.target.checked) setFor(doc.id)(null);
                      }}
                    />
                  ) : null}
                  <RequirementSummary requirement={doc} />
                  {active ? (
                    doc.kind === "live-capture" ? (
                      <LiveCaptureNotice requirement={doc} />
                    ) : doc.kind === "image" ? (
                      <ImageDocumentCard
                        requirement={doc}
                        onPrepared={setFor(doc.id)}
                        handoffKey={handoffKey && doc.id === firstPhotoId ? handoffKey : undefined}
                      />
                    ) : (
                      <PdfDocumentCard requirement={doc} onPrepared={setFor(doc.id)} />
                    )
                  ) : null}
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ol>

      <aside className="lg:sticky lg:top-20 lg:self-start" aria-label={t.exam.checklist}>
        <Card data-testid="application-checklist">
          <CardHeader title={t.exam.checklist} description={t.exam.preparedCount(ready.length, toPrepare.length)} />
          <CardBody className="space-y-4">
            <ul className="space-y-2 text-sm">
              {applicable.map((doc) => {
                const status = statusFor(doc, prepared[doc.id], t);
                return (
                  <li key={doc.id} className="flex items-start justify-between gap-2">
                    <a href={`#doc-${doc.id}`} className="text-fg hover:underline">
                      {doc.label}
                    </a>
                    <Badge tone={status.tone} className={cn("shrink-0")}>
                      {status.label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
            {anyFailures ? (
              <Alert tone="warning" live={false}>
                {t.exam.failures}
              </Alert>
            ) : null}
            <Button className="w-full" icon="zip" variant="secondary" onClick={downloadZip} disabled={ready.length === 0} loading={zipping}>
              {t.exam.downloadZip}
            </Button>
            <p className="text-xs text-fg-subtle">{t.exam.keptInTab}</p>
          </CardBody>
        </Card>
      </aside>
    </div>
  );
}
