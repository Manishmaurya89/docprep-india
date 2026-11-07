"use client";

import { useState } from "react";
import { DocumentArt } from "@/components/illustrations/DocumentArt";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SegmentedControl, TextField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Progress";
import { cn } from "@/components/ui/cn";
import { DownloadButton } from "@/components/workspace/DownloadButton";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { FileDropzone } from "@/components/workspace/FileDropzone";
import { ImagePreview } from "@/components/workspace/ImagePreview";
import { ProcessingIndicator } from "@/components/workspace/ProcessingIndicator";
import { SelectedFile } from "@/components/workspace/SelectedFile";
import { useProcessingJob } from "@/components/workspace/hooks/useProcessingJob";
import { ProcessingError, errorText } from "@/lib/file-processing/errors";
import { baseName } from "@/lib/file-processing/filenames";
import { formatBytes } from "@/lib/file-processing/format";
import { LIMITS } from "@/lib/file-processing/limits";
import { parsePageRanges, rangesToIndices } from "@/lib/file-processing/pdf/page-ranges";
import type { PageImage, PageImageFormat } from "@/lib/file-processing/pdf/to-images";
import { formatKB, maxKBToBytes } from "@/lib/file-processing/size-limits";
import { useI18n } from "@/lib/i18n/client";
import { PDF_ACCEPT } from "./inspect-pdf";
import { PageGrid } from "./PageGrid";
import { PdfThumbnail } from "./PdfThumbnail";
import { useUnlockablePdf } from "./useUnlockablePdf";

type Resolution = "low" | "standard" | "high";
const DPI: Record<Resolution, number> = { low: 72, standard: 150, high: 300 };
const FORMAT_LABEL: Record<PageImageFormat, string> = { jpeg: "JPG", png: "PNG" };

interface ConvertedImage extends PageImage {
  blob: Blob;
  name: string;
}

interface Conversion {
  images: ConvertedImage[];
  zip: Blob | null;
  zipName: string;
  limitLabel: string | null;
}

/** Parses the optional size limit: empty → no limit; otherwise a positive number of KB. */
function parseLimit(value: string): { ok: true; kb: number | null } | { ok: false } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, kb: null };
  const kb = Number(trimmed);
  return Number.isFinite(kb) && kb >= 1 && kb <= 100_000 ? { ok: true, kb } : { ok: false };
}

export function PdfToImageTool() {
  const { t } = useI18n();
  const text = t.pdf.toImages;
  const pages = t.pdf.extract;
  const job = useProcessingJob<Conversion>();
  const { reset } = job;
  const input = useUnlockablePdf(reset);
  const { pdf, locked } = input;
  const [password, setPassword] = useState("");
  const [format, setFormat] = useState<PageImageFormat>("jpeg");
  const [resolution, setResolution] = useState<Resolution>("standard");
  const [limitText, setLimitText] = useState("");
  const [selection, setSelection] = useState<{ id: string; pages: Set<number> } | null>(null);
  const [rangeText, setRangeText] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Every page is selected when a PDF opens, until the user changes it.
  const selected = pdf ? (selection?.id === pdf.id ? selection.pages : new Set(Array.from({ length: pdf.pageCount }, (_, i) => i))) : new Set<number>();
  const indices = [...selected].sort((a, b) => a - b);
  const limit = parseLimit(limitText);
  const limitKB = format === "jpeg" && limit.ok ? limit.kb : null;

  const choose = (next: Set<number>) => {
    if (!pdf) return;
    reset();
    setSelection({ id: pdf.id, pages: next });
  };

  const toggle = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    choose(next);
  };

  const applyRange = () => {
    if (!pdf) return;
    try {
      choose(new Set(rangesToIndices(parsePageRanges(rangeText, pdf.pageCount))));
      setRangeError(null);
    } catch (error) {
      setRangeError(error instanceof ProcessingError ? errorText(error, t.errors).title : pages.invalid);
    }
  };

  const unlock = () => {
    if (!password) return;
    void input.unlock(password).then(() => setPassword(""));
  };

  const start = () => {
    if (!pdf || indices.length === 0 || (format === "jpeg" && !limit.ok)) return;
    const options = {
      pages: indices.map((index) => index + 1),
      format,
      dpi: DPI[resolution],
      maxBytes: limitKB ? maxKBToBytes(limitKB) : undefined,
    };
    const base = baseName(pdf.file.name);
    const limitLabel = limitKB ? formatKB(limitKB) : null;
    void job.run(async ({ signal, progress }) => {
      const { pageImageName, pdfToImages } = await import("@/lib/file-processing/pdf/to-images");
      const made = await pdfToImages(pdf.doc, {
        ...options,
        signal,
        onProgress: (done, total) => progress({ done, total, label: text.rendering }),
      });
      const images = made.map((image) => ({
        ...image,
        blob: new Blob([image.bytes as BlobPart], { type: image.format === "jpeg" ? "image/jpeg" : "image/png" }),
        name: pageImageName(base, image.pageNumber, pdf.pageCount, image.format),
      }));
      let zip: Blob | null = null;
      if (images.length > 1) {
        const { createZip } = await import("@/lib/file-processing/zip");
        zip = new Blob([createZip(images.map((image) => ({ name: image.name, data: image.bytes }))) as BlobPart], { type: "application/zip" });
      }
      return { images, zip, zipName: `${base}-${FORMAT_LABEL[format].toLowerCase()}.zip`, limitLabel };
    });
  };

  const result = job.state.status === "success" ? job.state.result : null;
  const warnings = result
    ? [
        ...result.images.filter((image) => image.limited).map((image) => text.limited(image.pageNumber, image.dpi)),
        ...result.images
          .filter((image) => image.target === "unreachable" && result.limitLabel)
          .map((image) => text.missed(image.pageNumber, result.limitLabel!, formatBytes(image.bytes.length))),
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {pdf || locked ? (
          <SelectedFile
            name={(pdf ?? locked)!.file.name}
            details={
              pdf
                ? `${t.pdf.input.details(pdf.pageCount, formatBytes(pdf.file.size))}${pdf.unlocked ? ` · ${text.unlocked}` : ""}`
                : `PDF · ${formatBytes(locked!.file.size)}`
            }
            onRemove={() => {
              setPassword("");
              input.clear();
            }}
            disabled={job.running}
          />
        ) : (
          <FileDropzone
            accept={PDF_ACCEPT}
            onFiles={input.select}
            title={t.pdf.input.title}
            description={text.description(formatBytes(LIMITS.pdfMaxBytes, 0))}
            disabled={input.busy}
            inputTestId="pdf-input"
            art={<DocumentArt type="other" className="h-16 w-16" />}
          />
        )}
        {input.busy && !locked ? (
          <p role="status" className="flex items-center gap-2 text-sm text-fg-muted">
            <Spinner className="h-4 w-4" /> {text.reading}
          </p>
        ) : null}
        {input.error ? <ErrorMessage error={input.error} /> : null}
      </div>

      {locked ? (
        <Card data-testid="pdf-password">
          <CardHeader title={text.lockedTitle} description={text.lockedText} />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <TextField
                fieldClassName="min-w-[14rem] flex-1"
                label={text.password}
                type="password"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && unlock()}
                error={locked.wrongPassword ? text.wrongPassword : undefined}
              />
              <Button onClick={unlock} disabled={!password} loading={input.busy} className={cn(locked.wrongPassword ? "mb-5" : undefined)}>
                {text.unlock}
              </Button>
            </div>
            <p className="text-sm text-fg-muted">{text.aadhaarHint}</p>
          </CardBody>
        </Card>
      ) : null}

      {pdf ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className="lg:order-2 lg:self-start">
            <CardHeader title={text.settings} />
            <CardBody className="space-y-5">
              <SegmentedControl
                legend={text.format}
                value={format}
                onChange={(value) => {
                  setFormat(value);
                  reset();
                }}
                options={[
                  { value: "jpeg", label: "JPG" },
                  { value: "png", label: "PNG" },
                ]}
                hint={text.formatHint[format]}
              />
              <SegmentedControl
                legend={text.resolution}
                value={resolution}
                onChange={(value) => {
                  setResolution(value);
                  reset();
                }}
                options={(["low", "standard", "high"] as const).map((value) => ({ value, label: text.dpiLabels[value] }))}
                hint={text.dpiHints[resolution]}
              />
              {format === "jpeg" ? (
                <TextField
                  label={text.maxSize}
                  inputMode="decimal"
                  suffix="KB"
                  value={limitText}
                  onChange={(e) => {
                    setLimitText(e.target.value);
                    reset();
                  }}
                  hint={text.maxSizeHint}
                  error={limit.ok ? undefined : text.maxSizeInvalid}
                />
              ) : (
                <p className="text-xs text-fg-subtle">{text.pngNoLimit}</p>
              )}
              <Button className="w-full" size="lg" onClick={start} disabled={indices.length === 0 || (format === "jpeg" && !limit.ok)} loading={job.running}>
                {text.button(indices.length, FORMAT_LABEL[format])}
              </Button>
            </CardBody>
          </Card>

          <Card className="lg:order-1">
            <CardHeader
              title={text.choose}
              description={text.selected(indices.length, pdf.pageCount)}
              actions={
                pdf.pageCount > 1 ? (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => choose(new Set(Array.from({ length: pdf.pageCount }, (_, i) => i)))}>
                      {pages.selectAll}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => choose(new Set())}>
                      {t.common.clear}
                    </Button>
                  </>
                ) : null
              }
            />
            <CardBody className="space-y-4">
              {pdf.pageCount > 1 ? (
                <div className="flex flex-wrap items-end gap-3">
                  <TextField
                    fieldClassName="min-w-[12rem] flex-1"
                    label={pages.byNumbers}
                    placeholder={pages.placeholder}
                    value={rangeText}
                    onChange={(e) => setRangeText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyRange()}
                    error={rangeError ?? undefined}
                  />
                  <Button variant="secondary" onClick={applyRange} className={cn(rangeError ? "mb-5" : undefined)}>
                    {t.common.apply}
                  </Button>
                </div>
              ) : null}
              <PageGrid doc={pdf.doc} loading={false} error={null} label={t.common.pages}>
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
                            {pages.page(index + 1)}
                          </span>
                        </label>
                      </li>
                    );
                  })
                }
              </PageGrid>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {job.state.status === "running" ? <ProcessingIndicator label={text.running} progress={job.state.progress} onCancel={job.cancel} /> : null}
      {job.state.status === "idle" && job.state.cancelled ? <Alert tone="info">{text.cancelled}</Alert> : null}
      {job.state.status === "error" ? <ErrorMessage error={job.state.error} /> : null}
      {result ? (
        <Card data-testid="pdf-image-result">
          <CardHeader
            title={text.created(result.images.length)}
            description={text.check}
            actions={result.zip ? <DownloadButton blob={result.zip} filename={result.zipName} label={text.downloadZip} /> : null}
          />
          <CardBody className="space-y-4">
            {warnings.length ? (
              <Alert tone="warning">
                <ul className="list-disc space-y-1 pl-5">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.images.map((image) => (
                <li key={image.pageNumber} className="space-y-2" data-testid="pdf-image">
                  <ImagePreview
                    blob={image.blob}
                    alt={text.imageAlt(image.pageNumber)}
                    caption={text.imageDetails(image.width, image.height, image.dpi, formatBytes(image.bytes.length))}
                    maxHeight="14rem"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-fg">{pages.page(image.pageNumber)}</span>
                    <DownloadButton blob={image.blob} filename={image.name} variant={result.images.length > 1 ? "secondary" : "primary"} />
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
