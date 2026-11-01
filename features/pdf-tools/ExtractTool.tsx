"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { cn } from "@/components/ui/cn";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { ProcessingIndicator } from "@/components/workspace/ProcessingIndicator";
import { useProcessingJob } from "@/components/workspace/hooks/useProcessingJob";
import { ProcessingError, errorText } from "@/lib/file-processing/errors";
import { useI18n } from "@/lib/i18n/client";
import { outputName } from "@/lib/file-processing/filenames";
import type { PdfOutput } from "@/lib/file-processing/pdf/operations";
import { parsePageRanges, rangesToIndices } from "@/lib/file-processing/pdf/page-ranges";
import { PageGrid } from "./PageGrid";
import { PdfInputPanel } from "./PdfInputPanel";
import { PdfResult } from "./PdfResult";
import { PdfThumbnail } from "./PdfThumbnail";
import { usePdfDocument } from "./usePdfDocument";
import { usePdfInput } from "./usePdfInput";

export function ExtractTool() {
  const { t } = useI18n();
  const text = t.pdf.extract;
  const job = useProcessingJob<PdfOutput>();
  const { reset } = job;
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rangeText, setRangeText] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const input = usePdfInput(() => {
    reset();
    setSelected(new Set());
    setRangeText("");
  });
  const { pdf } = input;
  const preview = usePdfDocument(pdf?.bytes ?? null);

  const toggle = (index: number) => {
    reset();
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const applyRange = () => {
    if (!pdf) return;
    try {
      setSelected(new Set(rangesToIndices(parsePageRanges(rangeText, pdf.pageCount))));
      setRangeError(null);
      reset();
    } catch (error) {
      setRangeError(error instanceof ProcessingError ? errorText(error, t.errors).title : text.invalid);
    }
  };

  const indices = [...selected].sort((a, b) => a - b);
  const start = () => {
    if (!pdf || indices.length === 0) return;
    void job.run(async () => {
      const { extractPages } = await import("@/lib/file-processing/pdf/operations");
      return extractPages(pdf.bytes, indices);
    });
  };

  return (
    <div className="space-y-6">
      <PdfInputPanel {...input} onSelect={input.select} onClear={input.clear} />
      {pdf ? (
        <Card>
          <CardHeader
            title={text.choose}
            description={text.selected(indices.length, pdf.pageCount)}
            actions={
              <>
                <Button size="sm" variant="secondary" onClick={() => { setSelected(new Set(Array.from({ length: pdf.pageCount }, (_, i) => i))); reset(); }}>
                  {text.selectAll}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setSelected(new Set()); reset(); }}>
                  {t.common.clear}
                </Button>
              </>
            }
          />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <TextField
                fieldClassName="min-w-[14rem] flex-1"
                label={text.byNumbers}
                placeholder={text.placeholder}
                value={rangeText}
                onChange={(e) => setRangeText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyRange()}
                error={rangeError ?? undefined}
              />
              <Button variant="secondary" onClick={applyRange} className={cn(rangeError ? "mb-5" : undefined)}>
                {t.common.apply}
              </Button>
            </div>
            <PageGrid doc={preview.doc} loading={preview.loading} error={preview.error} label={t.common.pages}>
              {(doc) =>
                Array.from({ length: pdf.pageCount }, (_, index) => {
                  const checked = selected.has(index);
                  return (
                    <li key={index}>
                      <label
                        className={cn(
                          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-2 transition-colors focus-within:outline-2 focus-within:outline-focus",
                          checked ? "border-accent bg-accent-soft" : "border-border bg-surface hover:bg-surface-muted",
                        )}
                      >
                        <PdfThumbnail doc={doc} pageNumber={index + 1} width={140} />
                        <span className="flex items-center gap-2 text-sm text-fg">
                          <input type="checkbox" checked={checked} onChange={() => toggle(index)} className="h-4 w-4 accent-[var(--accent)]" />
                          {text.page(index + 1)}
                        </span>
                      </label>
                    </li>
                  );
                })
              }
            </PageGrid>
            <Button size="lg" onClick={start} disabled={indices.length === 0} loading={job.running}>
              {text.button(indices.length)}
            </Button>
          </CardBody>
        </Card>
      ) : null}
      {job.state.status === "running" ? <ProcessingIndicator label={text.running} onCancel={job.cancel} /> : null}
      {job.state.status === "error" ? <ErrorMessage error={job.state.error} /> : null}
      {job.state.status === "idle" && job.state.cancelled ? <Alert tone="info">{t.common.cancelled}</Alert> : null}
      {job.state.status === "success" && pdf ? (
        <PdfResult bytes={job.state.result.bytes} pageCount={job.state.result.pageCount} filename={outputName(pdf.file.name, "extract", "pdf")} />
      ) : null}
    </div>
  );
}
