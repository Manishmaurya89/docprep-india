"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SegmentedControl, TextField } from "@/components/ui/Field";
import { DownloadButton } from "@/components/workspace/DownloadButton";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { ProcessingIndicator } from "@/components/workspace/ProcessingIndicator";
import { useProcessingJob } from "@/components/workspace/hooks/useProcessingJob";
import { ProcessingError, errorText } from "@/lib/file-processing/errors";
import { useI18n } from "@/lib/i18n/client";
import { baseName } from "@/lib/file-processing/filenames";
import { formatBytes } from "@/lib/file-processing/format";
import type { SplitPart } from "@/lib/file-processing/pdf/operations";
import { type PageRange, formatRange, parsePageRanges, rangePageCount, splitEvery } from "@/lib/file-processing/pdf/page-ranges";
import { pdfBlob } from "./PdfResult";
import { PdfInputPanel } from "./PdfInputPanel";
import { usePdfInput } from "./usePdfInput";

type Mode = "ranges" | "every";

export function SplitTool() {
  const { t } = useI18n();
  const text = t.pdf.split;
  const job = useProcessingJob<{ parts: SplitPart[]; zip: Blob | null }>();
  const { reset } = job;
  const input = usePdfInput(reset);
  const { pdf } = input;
  const [mode, setMode] = useState<Mode>("ranges");
  const [ranges, setRanges] = useState("");
  const [every, setEvery] = useState("1");

  const plan = useMemo((): { ok: true; ranges: PageRange[] } | { ok: false; error: string } | null => {
    if (!pdf) return null;
    try {
      if (mode === "ranges") return { ok: true, ranges: parsePageRanges(ranges, pdf.pageCount) };
      return { ok: true, ranges: splitEvery(pdf.pageCount, Number(every)) };
    } catch (error) {
      return { ok: false, error: error instanceof ProcessingError ? errorText(error, t.errors).title : text.invalid };
    }
  }, [pdf, mode, ranges, every, t, text]);

  const start = () => {
    if (!pdf || !plan?.ok) return;
    const selected = plan.ranges;
    void job.run(async ({ signal, progress }) => {
      const { splitPdf } = await import("@/lib/file-processing/pdf/operations");
      const parts = await splitPdf(pdf.bytes, selected, { signal, onProgress: (done, total) => progress({ done, total, label: text.creating }) });
      let zip: Blob | null = null;
      if (parts.length > 1) {
        const { createZip } = await import("@/lib/file-processing/zip");
        const base = baseName(pdf.file.name);
        zip = new Blob([createZip(parts.map((part) => ({ name: `${base}-pages-${part.label}.pdf`, data: part.bytes }))) as BlobPart], {
          type: "application/zip",
        });
      }
      return { parts, zip };
    });
  };

  const base = pdf ? baseName(pdf.file.name) : "document";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <PdfInputPanel {...input} onSelect={input.select} onClear={input.clear} />
        <Card>
          <CardHeader title={t.common.settings} />
          <CardBody className="space-y-5">
            <SegmentedControl
              legend={text.legend}
              value={mode}
              onChange={(value) => {
                setMode(value);
                reset();
              }}
              options={[
                { value: "ranges", label: text.byRanges },
                { value: "every", label: text.everyN },
              ]}
            />
            {mode === "ranges" ? (
              <TextField
                label={text.ranges}
                placeholder={text.rangesPlaceholder}
                value={ranges}
                onChange={(e) => {
                  setRanges(e.target.value);
                  reset();
                }}
                hint={text.rangesHint}
                error={pdf && ranges.trim() && plan && !plan.ok ? plan.error : undefined}
              />
            ) : (
              <TextField
                label={text.perFile}
                type="number"
                min={1}
                value={every}
                onChange={(e) => {
                  setEvery(e.target.value);
                  reset();
                }}
                error={pdf && plan && !plan.ok ? plan.error : undefined}
              />
            )}
            {plan?.ok ? (
              <p className="text-sm text-fg-muted" aria-live="polite">
                {text.creates(plan.ranges.length, `${plan.ranges.slice(0, 6).map(formatRange).join(", ")}${plan.ranges.length > 6 ? ", …" : ""}`)}
              </p>
            ) : null}
            <Button className="w-full" size="lg" onClick={start} disabled={!pdf || !plan?.ok} loading={job.running}>
              {text.button}
            </Button>
          </CardBody>
        </Card>
      </div>

      {job.state.status === "running" ? <ProcessingIndicator label={text.running} progress={job.state.progress} onCancel={job.cancel} /> : null}
      {job.state.status === "idle" && job.state.cancelled ? <Alert tone="info">{text.cancelled}</Alert> : null}
      {job.state.status === "error" ? <ErrorMessage error={job.state.error} /> : null}
      {job.state.status === "success" ? (
        <Card data-testid="split-result">
          <CardHeader
            title={text.created(job.state.result.parts.length)}
            actions={job.state.result.zip ? <DownloadButton blob={job.state.result.zip} filename={`${base}-split.zip`} label={text.downloadZip} /> : null}
          />
          <ul className="divide-y divide-border">
            {job.state.result.parts.map((part) => (
              <li key={part.label} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5" data-testid="split-part">
                <div>
                  <p className="text-sm font-medium text-fg">{text.part(part.label)}</p>
                  <p className="tabular text-xs text-fg-subtle">
                    {t.common.pageCount(rangePageCount(part.range))} · {formatBytes(part.bytes.length)}
                  </p>
                </div>
                <DownloadButton blob={pdfBlob(part.bytes)} filename={`${base}-pages-${part.label}.pdf`} variant="secondary" label={t.common.download} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
