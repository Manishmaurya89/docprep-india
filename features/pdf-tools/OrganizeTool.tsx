"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { ProcessingIndicator } from "@/components/workspace/ProcessingIndicator";
import { useProcessingJob } from "@/components/workspace/hooks/useProcessingJob";
import { outputName } from "@/lib/file-processing/filenames";
import type { PageRotation, PdfOutput } from "@/lib/file-processing/pdf/operations";
import { PageGrid } from "./PageGrid";
import { PdfInputPanel } from "./PdfInputPanel";
import { PdfResult } from "./PdfResult";
import { PdfThumbnail } from "./PdfThumbnail";
import { usePdfDocument } from "./usePdfDocument";
import { usePdfInput } from "./usePdfInput";
import { useI18n } from "@/lib/i18n/client";

interface PageState {
  sourceIndex: number;
  rotation: PageRotation;
  deleted: boolean;
}

const initialPages = (count: number): PageState[] => Array.from({ length: count }, (_, i) => ({ sourceIndex: i, rotation: 0, deleted: false }));
const turn = (rotation: PageRotation, delta: number) => ((((rotation + delta) % 360) + 360) % 360) as PageRotation;

export function OrganizeTool() {
  const { t } = useI18n();
  const text = t.pdf.organize;
  const job = useProcessingJob<PdfOutput>();
  const { reset } = job;
  const [pages, setPages] = useState<PageState[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const input = usePdfInput(reset);
  const { pdf } = input;
  const preview = usePdfDocument(pdf?.bytes ?? null);

  const [seenPdf, setSeenPdf] = useState(pdf);
  if (pdf !== seenPdf) {
    setSeenPdf(pdf);
    setPages(pdf ? initialPages(pdf.pageCount) : []);
  }

  const update = (next: PageState[], message: string) => {
    setPages(next);
    setAnnouncement(message);
    reset();
  };
  const move = (position: number, delta: -1 | 1) => {
    const target = position + delta;
    if (target < 0 || target >= pages.length) return;
    const next = [...pages];
    [next[position], next[target]] = [next[target]!, next[position]!];
    update(next, text.moved(pages[position]!.sourceIndex + 1, target + 1));
  };
  const rotate = (position: number, delta: number) => {
    const next = pages.map((p, i) => (i === position ? { ...p, rotation: turn(p.rotation, delta) } : p));
    update(next, text.rotated(pages[position]!.sourceIndex + 1, next[position]!.rotation));
  };
  const toggleDelete = (position: number) => {
    const page = pages[position]!;
    update(
      pages.map((p, i) => (i === position ? { ...p, deleted: !p.deleted } : p)),
      page.deleted ? text.restored(page.sourceIndex + 1) : text.marked(page.sourceIndex + 1),
    );
  };

  const kept = pages.filter((p) => !p.deleted);
  const changed = pages.some((p, i) => p.sourceIndex !== i || p.rotation !== 0 || p.deleted);

  const start = () => {
    if (!pdf) return;
    void job.run(async () => {
      const { organizePdf } = await import("@/lib/file-processing/pdf/operations");
      return organizePdf(pdf.bytes, kept.map(({ sourceIndex, rotation }) => ({ sourceIndex, rotation })));
    });
  };

  return (
    <div className="space-y-6">
      <PdfInputPanel {...input} onSelect={input.select} onClear={input.clear} />
      {pdf ? (
        <Card>
          <CardHeader
            title={text.pages}
            description={text.kept(kept.length, pages.length)}
            actions={
              <>
                <Button size="sm" variant="secondary" icon="rotateCcw" onClick={() => update(pages.map((p) => ({ ...p, rotation: turn(p.rotation, -90) })), text.allRotatedLeft)}>
                  {text.allLeft}
                </Button>
                <Button size="sm" variant="secondary" icon="rotateCw" onClick={() => update(pages.map((p) => ({ ...p, rotation: turn(p.rotation, 90) })), text.allRotatedRight)}>
                  {text.allRight}
                </Button>
                <Button size="sm" variant="ghost" icon="reset" disabled={!changed} onClick={() => update(initialPages(pdf.pageCount), text.changesReset)}>
                  {t.common.reset}
                </Button>
              </>
            }
          />
          <CardBody className="space-y-4">
            <PageGrid doc={preview.doc} loading={preview.loading} error={preview.error} label={text.gridLabel}>
              {(doc) =>
                pages.map((page, position) => (
                  <li
                    key={page.sourceIndex}
                    data-testid="page-card"
                    className={cn("flex flex-col items-center gap-2 rounded-lg border p-2", page.deleted ? "border-danger/40 bg-danger-soft opacity-70" : "border-border bg-surface")}
                  >
                    <div className="relative">
                      <PdfThumbnail doc={doc} pageNumber={page.sourceIndex + 1} rotation={page.rotation} width={140} />
                      {page.deleted ? (
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-danger">{text.willDelete}</span>
                      ) : null}
                    </div>
                    <p className="tabular text-xs text-fg-muted">
                      <span className="font-medium text-fg">#{position + 1}</span> · {text.originalPage(page.sourceIndex + 1)}
                      {page.rotation ? ` · ${page.rotation}°` : ""}
                    </p>
                    <div className="flex flex-wrap justify-center">
                      <IconButton icon="arrowLeft" label={text.moveEarlier(page.sourceIndex + 1)} disabled={position === 0} onClick={() => move(position, -1)} />
                      <IconButton icon="arrowRight" label={text.moveLater(page.sourceIndex + 1)} disabled={position === pages.length - 1} onClick={() => move(position, 1)} />
                      <IconButton icon="rotateCcw" label={text.rotateLeft(page.sourceIndex + 1)} onClick={() => rotate(position, -90)} />
                      <IconButton icon="rotateCw" label={text.rotateRight(page.sourceIndex + 1)} onClick={() => rotate(position, 90)} />
                      <IconButton
                        icon={page.deleted ? "reset" : "trash"}
                        label={page.deleted ? text.restore(page.sourceIndex + 1) : text.delete(page.sourceIndex + 1)}
                        aria-pressed={page.deleted}
                        onClick={() => toggleDelete(position)}
                      />
                    </div>
                  </li>
                ))
              }
            </PageGrid>
            <p aria-live="polite" className="sr-only">
              {announcement}
            </p>
            {kept.length === 0 ? <Alert tone="warning">{text.allDeleted}</Alert> : null}
            <Button size="lg" onClick={start} disabled={kept.length === 0 || !changed} loading={job.running}>
              {text.save}
            </Button>
          </CardBody>
        </Card>
      ) : null}
      {job.state.status === "running" ? <ProcessingIndicator label={text.running} onCancel={job.cancel} /> : null}
      {job.state.status === "error" ? <ErrorMessage error={job.state.error} /> : null}
      {job.state.status === "success" && pdf ? (
        <PdfResult bytes={job.state.result.bytes} pageCount={job.state.result.pageCount} filename={outputName(pdf.file.name, "organized", "pdf")} originalSize={pdf.size} />
      ) : null}
    </div>
  );
}
