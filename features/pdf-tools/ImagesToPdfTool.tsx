"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SegmentedControl, SelectField } from "@/components/ui/Field";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { DocumentArt } from "@/components/illustrations/DocumentArt";
import { FileDropzone } from "@/components/workspace/FileDropzone";
import { ProcessingIndicator } from "@/components/workspace/ProcessingIndicator";
import { PageArranger, moveTo } from "@/components/workspace/PageArranger";
import { useProcessingJob } from "@/components/workspace/hooks/useProcessingJob";
import { describeImage, IMAGE_ACCEPT } from "@/features/image-tools/ImageInputPanel";
import { errorText, toProcessingError } from "@/lib/file-processing/errors";
import { useI18n } from "@/lib/i18n/client";
import type { Rotation } from "@/lib/file-processing/image/geometry";
import { type InspectedImage, inspectImageFile } from "@/lib/file-processing/inspect";
import { LIMITS } from "@/lib/file-processing/limits";
import type { PdfOrientation, PdfOutput, PdfPageSize } from "@/lib/file-processing/pdf/operations";
import { PdfResult } from "./PdfResult";
import { prepareImageForPdf } from "./prepare-images";

interface Entry {
  id: string;
  file: File;
  status: "checking" | "ready" | "error";
  image?: InspectedImage;
  error?: string;
  rotation: Rotation;
}

const MARGINS = { none: 0, small: 18, normal: 36 } as const;
type Margin = keyof typeof MARGINS;
let entryCounter = 0;

export function ImagesToPdfTool() {
  const { t } = useI18n();
  const text = t.pdf.images;
  const job = useProcessingJob<PdfOutput>();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pageSize, setPageSize] = useState<PdfPageSize>("a4");
  const [orientation, setOrientation] = useState<PdfOrientation>("auto");
  const [margin, setMargin] = useState<Margin>("small");

  const add = (files: File[]) => {
    job.reset();
    const fresh: Entry[] = files.slice(0, Math.max(0, LIMITS.maxBatchFiles - entries.length)).map((file): Entry => ({ id: `i-${++entryCounter}`, file, status: "checking", rotation: 0 }));
    setEntries((current) => [...current, ...fresh]);
    for (const entry of fresh) {
      inspectImageFile(entry.file)
        .then((image) => setEntries((current) => current.map((e) => (e.id === entry.id ? { ...e, status: "ready", image } : e))))
        .catch((error) => {
          const message = errorText(toProcessingError(error), t.errors).title;
          setEntries((current) => current.map((e) => (e.id === entry.id ? { ...e, status: "error", error: message } : e)));
        });
    }
  };

  const ready = entries.filter((e) => e.status === "ready" && e.image);
  const blocked = entries.some((e) => e.status !== "ready");

  const start = () => {
    void job.run(async ({ signal, progress }) => {
      const prepared = [];
      for (let i = 0; i < ready.length; i++) {
        progress({ done: i, total: ready.length, label: text.preparing });
        prepared.push(await prepareImageForPdf(ready[i]!.image!, signal, ready[i]!.rotation));
      }
      const { imagesToPdf } = await import("@/lib/file-processing/pdf/operations");
      return imagesToPdf(prepared, {
        pageSize,
        orientation,
        margin: MARGINS[margin],
        signal,
        onProgress: (done, total) => progress({ done, total, label: text.adding }),
      });
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <FileDropzone
            accept={IMAGE_ACCEPT}
            multiple
            onFiles={add}
            compact={entries.length > 0}
            title={entries.length ? text.addMore : text.choose}
            description={text.description}
            disabled={job.running}
            inputTestId="image-input"
            art={<DocumentArt type="photograph" className="h-16 w-16" />}
          />
          {entries.length ? (
            <PageArranger
              label={text.pagesLabel}
              disabled={job.running}
              layout={{ pageSize, orientation, margin: MARGINS[margin] }}
              pages={entries.map((e) => ({
                id: e.id,
                name: e.file.name,
                status: e.status,
                error: e.error,
                details: e.image ? describeImage(e.image, t.image.input.transparency) : undefined,
                blob: e.image?.file,
                width: e.image?.width,
                height: e.image?.height,
                rotation: e.rotation,
              }))}
              onMove={(id, toIndex) => {
                job.reset();
                setEntries((current) => moveTo(current, id, toIndex));
              }}
              onRotate={(id) => {
                job.reset();
                setEntries((current) => current.map((e) => (e.id === id ? { ...e, rotation: (((e.rotation + 90) % 360) as Rotation) } : e)));
              }}
              onRemove={(id) => {
                job.reset();
                setEntries((current) => current.filter((e) => e.id !== id));
              }}
            />
          ) : null}
        </div>
        <Card>
          <CardHeader title={text.setup} />
          <CardBody className="space-y-5">
            <SelectField label={text.pageSize} value={pageSize} onChange={(e) => { setPageSize(e.target.value as PdfPageSize); job.reset(); }}>
              <option value="a4">{text.a4}</option>
              <option value="letter">{text.letter}</option>
              <option value="image">{text.sameAsImage}</option>
            </SelectField>
            {pageSize !== "image" ? (
              <SegmentedControl
                legend={text.orientation}
                value={orientation}
                onChange={(v) => { setOrientation(v); job.reset(); }}
                options={[
                  { value: "auto", label: text.auto },
                  { value: "portrait", label: text.portrait },
                  { value: "landscape", label: text.landscape },
                ]}
              />
            ) : null}
            <SegmentedControl
              legend={text.margin}
              value={margin}
              onChange={(v) => { setMargin(v); job.reset(); }}
              options={[
                { value: "none", label: text.none },
                { value: "small", label: text.small },
                { value: "normal", label: text.normal },
              ]}
            />
            <p className="text-xs text-fg-subtle">{text.fitNote}</p>
            <Button className="w-full" size="lg" onClick={start} disabled={ready.length === 0 || blocked} loading={job.running}>
              {text.button}
            </Button>
          </CardBody>
        </Card>
      </div>
      {entries.some((e) => e.status === "error") ? <Alert tone="warning">{t.common.removeRedFiles}</Alert> : null}
      {job.state.status === "running" ? <ProcessingIndicator label={text.running} progress={job.state.progress} onCancel={job.cancel} /> : null}
      {job.state.status === "idle" && job.state.cancelled ? <Alert tone="info">{t.common.cancelled}</Alert> : null}
      {job.state.status === "error" ? <ErrorMessage error={job.state.error} /> : null}
      {job.state.status === "success" ? <PdfResult bytes={job.state.result.bytes} pageCount={job.state.result.pageCount} filename="images.pdf" /> : null}
    </div>
  );
}
