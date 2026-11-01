"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { DocumentArt } from "@/components/illustrations/DocumentArt";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { FileDropzone } from "@/components/workspace/FileDropzone";
import { ProcessingIndicator } from "@/components/workspace/ProcessingIndicator";
import { PageArranger, moveTo } from "@/components/workspace/PageArranger";
import { SelectedFile } from "@/components/workspace/SelectedFile";
import { useProcessingJob } from "@/components/workspace/hooks/useProcessingJob";
import type { DocumentRequirement } from "@/data/exam-requirements/schema";
import { describeImage } from "@/features/image-tools/ImageInputPanel";
import { inspectPdf } from "@/features/pdf-tools/inspect-pdf";
import { detectBlobFormat, isImageFormat } from "@/lib/file-processing/detect";
import { ProcessingError, detail, toProcessingError } from "@/lib/file-processing/errors";
import { formatBytes } from "@/lib/file-processing/format";
import { inspectImageFile } from "@/lib/file-processing/inspect";
import type { PreparedFile } from "../prepare-image";
import type { Rotation } from "@/lib/file-processing/image/geometry";
import { CERTIFICATE_PAGE_LAYOUT, type PdfSource, preparePdfDocument } from "../prepare-pdf";
import { PreparedResult } from "./PreparedResult";
import { useI18n } from "@/lib/i18n/client";

let pageCounter = 0;
const ACCEPT = "application/pdf,.pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

/** Takes a PDF, or photos/scans of the pages, and produces a PDF within the limits. */
export function PdfDocumentCard({ requirement, onPrepared }: { requirement: DocumentRequirement; onPrepared: (file: PreparedFile | null) => void }) {
  const { t } = useI18n();
  const e = t.exam;
  const job = useProcessingJob<PreparedFile>();
  const [source, setSource] = useState<(PdfSource & { label: string; details: string }) | null>(null);
  const [inputError, setInputError] = useState<ProcessingError | null>(null);
  const [checking, setChecking] = useState(false);

  const select = async (files: File[]) => {
    job.reset();
    onPrepared(null);
    setInputError(null);
    setChecking(true);
    try {
      const formats = await Promise.all(files.map(detectBlobFormat));
      if (formats.includes("pdf")) {
        if (files.length > 1) throw new ProcessingError("too-many-files", detail("onePdfOrImages"));
        const pdf = await inspectPdf(files[0]!);
        setSource({ kind: "pdf", bytes: pdf.bytes, name: pdf.file.name, label: pdf.file.name, details: t.pdf.input.details(pdf.pageCount, formatBytes(pdf.size)) });
      } else if (formats.every(isImageFormat)) {
        const images = await Promise.all(files.map((file) => inspectImageFile(file)));
        setSource({
          kind: "images",
          pages: images.map((image) => ({ id: `page-${++pageCounter}`, image, rotation: 0 as Rotation })),
          label: images.length === 1 ? images[0]!.file.name : e.imagesCount(images.length),
          details: images.length === 1 ? describeImage(images[0]!, t.image.input.transparency) : e.pagesToCreate(images.length),
        });
      } else {
        throw new ProcessingError("unsupported-format", detail("pdfOrImages"));
      }
    } catch (error) {
      setSource(null);
      setInputError(toProcessingError(error));
    } finally {
      setChecking(false);
    }
  };

  /** Any change to the pages discards the prepared file, so the checklist never shows a stale result. */
  const updatePages = (pages: Extract<PdfSource, { kind: "images" }>["pages"]) => {
    job.reset();
    onPrepared(null);
    setSource((current) =>
      current?.kind === "images" && pages.length
        ? { ...current, pages, details: e.pagesToCreate(pages.length) }
        : null,
    );
  };

  const prepare = async () => {
    if (!source) return;
    const result = await job.run(({ signal, message }) => preparePdfDocument(source, requirement, { signal, onMessage: message, t }));
    if (result) onPrepared(result);
  };

  return (
    <div className="space-y-4">
      {source ? (
        <SelectedFile
          name={source.label}
          details={source.details}
          onRemove={() => {
            setSource(null);
            job.reset();
            onPrepared(null);
          }}
          disabled={job.running}
        />
      ) : (
        <FileDropzone
          accept={ACCEPT}
          multiple
          onFiles={select}
          title={e.choosePdf(requirement.label)}
          description={e.choosePdfHelp}
          art={<DocumentArt type={requirement.type} className="h-16 w-16" />}
          disabled={checking || job.running}
        />
      )}
      {source?.kind === "images" ? (
        <PageArranger
          label={e.pdfPagesLabel(requirement.label)}
          disabled={job.running}
          layout={CERTIFICATE_PAGE_LAYOUT}
          pages={source.pages.map((page) => ({
            id: page.id,
            name: page.image.file.name,
            status: "ready",
            details: describeImage(page.image, t.image.input.transparency),
            blob: page.image.file,
            width: page.image.width,
            height: page.image.height,
            rotation: page.rotation,
          }))}
          onMove={(id, toIndex) => updatePages(moveTo(source.pages, id, toIndex))}
          onRotate={(id) => updatePages(source.pages.map((page) => (page.id === id ? { ...page, rotation: ((page.rotation + 90) % 360) as Rotation } : page)))}
          onRemove={(id) => updatePages(source.pages.filter((page) => page.id !== id))}
        />
      ) : null}
      {inputError ? <ErrorMessage error={inputError} /> : null}
      {source ? (
        <Button onClick={prepare} loading={job.running}>
          {e.preparePdf}
        </Button>
      ) : null}
      {job.state.status === "running" ? <ProcessingIndicator label={job.state.message ?? e.preparing} onCancel={job.cancel} /> : null}
      {job.state.status === "idle" && job.state.cancelled ? <Alert tone="info">{t.common.cancelled}</Alert> : null}
      {job.state.status === "error" ? <ErrorMessage error={job.state.error} /> : null}
      {job.state.status === "success" ? <PreparedResult prepared={job.state.result} /> : null}
    </div>
  );
}
