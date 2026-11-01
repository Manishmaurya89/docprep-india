"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { DocumentArt } from "@/components/illustrations/DocumentArt";
import { FileDropzone } from "@/components/workspace/FileDropzone";
import { ProcessingIndicator } from "@/components/workspace/ProcessingIndicator";
import { ReorderableList, moveItem } from "@/components/workspace/ReorderableList";
import { useProcessingJob } from "@/components/workspace/hooks/useProcessingJob";
import { errorText, toProcessingError } from "@/lib/file-processing/errors";
import { useI18n } from "@/lib/i18n/client";
import { formatBytes } from "@/lib/file-processing/format";
import { LIMITS } from "@/lib/file-processing/limits";
import type { PdfOutput } from "@/lib/file-processing/pdf/operations";
import { type InspectedPdf, PDF_ACCEPT, inspectPdf } from "./inspect-pdf";
import { PdfResult } from "./PdfResult";

interface Entry {
  id: string;
  file: File;
  status: "checking" | "ready" | "error";
  pdf?: InspectedPdf;
  error?: string;
}

let entryCounter = 0;

export function MergeTool() {
  const { t } = useI18n();
  const text = t.pdf.merge;
  const job = useProcessingJob<PdfOutput>();
  const [entries, setEntries] = useState<Entry[]>([]);

  const add = (files: File[]) => {
    job.reset();
    const room = LIMITS.maxBatchFiles - entries.length;
    const accepted = files.slice(0, Math.max(0, room));
    const fresh: Entry[] = accepted.map((file) => ({ id: `m-${++entryCounter}`, file, status: "checking" }));
    setEntries((current) => [...current, ...fresh]);
    for (const entry of fresh) {
      inspectPdf(entry.file)
        .then((pdf) => setEntries((current) => current.map((e) => (e.id === entry.id ? { ...e, status: "ready", pdf } : e))))
        .catch((error) => {
          const message = errorText(toProcessingError(error), t.errors).title;
          setEntries((current) => current.map((e) => (e.id === entry.id ? { ...e, status: "error", error: message } : e)));
        });
    }
  };

  const ready = entries.filter((e) => e.status === "ready" && e.pdf);
  const hasErrors = entries.some((e) => e.status === "error");
  const checking = entries.some((e) => e.status === "checking");
  const totalBytes = ready.reduce((sum, e) => sum + e.file.size, 0);
  const totalPages = ready.reduce((sum, e) => sum + (e.pdf?.pageCount ?? 0), 0);
  const tooLarge = totalBytes > LIMITS.pdfBatchMaxBytes;

  const merge = () => {
    void job.run(async ({ signal, progress }) => {
      const { mergePdfs } = await import("@/lib/file-processing/pdf/operations");
      return mergePdfs(
        ready.map((e) => ({ name: e.file.name, bytes: e.pdf!.bytes })),
        { signal, onProgress: (done, total) => progress({ done, total, label: text.adding }) },
      );
    });
  };

  return (
    <div className="space-y-6">
      <FileDropzone
        accept={PDF_ACCEPT}
        multiple
        onFiles={add}
        compact={entries.length > 0}
        title={entries.length ? text.addMore : text.choose}
        description={text.description(LIMITS.maxBatchFiles, formatBytes(LIMITS.pdfBatchMaxBytes, 0))}
        disabled={job.running}
        inputTestId="pdf-input"
        art={<DocumentArt type="other" className="h-16 w-16" />}
      />
      {entries.length ? (
        <>
          <ReorderableList
            label={text.listLabel}
            disabled={job.running}
            items={entries.map((e) => ({
              id: e.id,
              name: e.file.name,
              status: e.status,
              error: e.error,
              details: e.pdf ? `${t.common.pageCount(e.pdf.pageCount)} · ${formatBytes(e.file.size)}` : undefined,
            }))}
            onMove={(id, delta) => {
              job.reset();
              setEntries((current) => moveItem(current, id, delta));
            }}
            onRemove={(id) => {
              job.reset();
              setEntries((current) => current.filter((e) => e.id !== id));
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="tabular text-sm text-fg-muted">
              {text.summary(ready.length, totalPages, formatBytes(totalBytes))}
            </p>
            <Button size="lg" onClick={merge} disabled={ready.length < 2 || hasErrors || checking || tooLarge} loading={job.running}>
              {text.button(ready.length)}
            </Button>
          </div>
          {hasErrors ? <Alert tone="warning">{text.removeRed}</Alert> : null}
          {ready.length === 1 && !hasErrors && !checking ? <Alert tone="info">{text.addOneMore}</Alert> : null}
          {tooLarge ? <Alert tone="danger">{text.tooLarge(formatBytes(totalBytes), formatBytes(LIMITS.pdfBatchMaxBytes, 0))}</Alert> : null}
        </>
      ) : null}

      {job.state.status === "running" ? <ProcessingIndicator label={text.running} progress={job.state.progress} onCancel={job.cancel} /> : null}
      {job.state.status === "idle" && job.state.cancelled ? <Alert tone="info">{text.cancelled}</Alert> : null}
      {job.state.status === "error" ? <ErrorMessage error={job.state.error} /> : null}
      {job.state.status === "success" ? (
        <PdfResult bytes={job.state.result.bytes} pageCount={job.state.result.pageCount} filename="merged.pdf">
          <p className="text-sm text-fg-muted">{text.orderNote}</p>
        </PdfResult>
      ) : null}
    </div>
  );
}
